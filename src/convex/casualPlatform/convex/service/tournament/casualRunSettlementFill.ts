/**
 * Post-score / settlement helpers: synthetic opponents for session-sized async leaderboards
 *（Solitaire / Block Blast 共用：按 `maxPlayers` 与开局真人数量补虚拟 `casual_run_player_matches`）。
 */
import { v } from "convex/values";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { CasualTournamentDefinition } from "../../data/casualTournamentConfigs";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { internalMutation } from "../../_generated/server";

/** `uid` 前缀；本场虚拟对手，不参与全局异步榜 */
export const CASUAL_SOLITAIRE_BOT_UID_PREFIX = "__vp_solitaire:";
/** Block Blast 异步场虚拟对手（与接龙分列前缀，便于排查） */
export const CASUAL_BLOCK_BLAST_BOT_UID_PREFIX = "__vp_block_blast:";

/** 真人以外：异步虚拟补位行（接龙 + Block Blast） */
export function isCasualSolitaireVirtualUid(uid: string): boolean {
  return (
    uid.startsWith(CASUAL_SOLITAIRE_BOT_UID_PREFIX) ||
    uid.startsWith(CASUAL_BLOCK_BLAST_BOT_UID_PREFIX)
  );
}

/** Slots to fill with virtual rows = maxPlayers − planned humans (≥1 human slot). */
export function casualSolitaireVirtualOpponentCount(
  defMaxPlayers: number,
  matchHumanPlayerCount: number
): number {
  const humanCountPlanned = Math.max(1, matchHumanPlayerCount);
  return Math.max(0, defMaxPlayers - humanCountPlanned);
}

function hashSessionSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pseudoUnit(seed: number, i: number): number {
  let x = Math.imul(seed ^ (i * 374761393), 2654435761);
  x ^= x >>> 13;
  x ^= x << 17;
  x ^= x >>> 5;
  return (x >>> 0) / 4294967296;
}

export async function computeSolitaireRankForSession(
  ctx: QueryCtx,
  templateId: string,
  sessionExternalId: string,
  uid: string
): Promise<number | null> {
  const rows = await ctx.db
    .query("casual_run_player_matches")
    .withIndex("by_template_external", (q) =>
      q.eq("templateId", templateId).eq("externalGameId", sessionExternalId)
    )
    .collect();
  const withScore = rows
    .filter((r) => r.score != null)
    .map((r) => ({ uid: r.uid, score: r.score as number }));
  if (withScore.length === 0) return null;
  withScore.sort((a, b) => b.score - a.score);
  const idx = withScore.findIndex((e) => e.uid === uid);
  return idx >= 0 ? idx + 1 : null;
}

export const seedSolitaireVirtualOpponents = internalMutation({
  args: {
    templateId: v.string(),
    runTournamentId: v.string(),
    matchId: v.string(),
    externalGameId: v.string(),
    humanScore: v.number(),
    botCount: v.number(),
    /** 与 `casual_run_player_matches.gameType` 一致；决定虚拟行 `uid` 前缀与 `gameType` 字段 */
    matchGameType: v.union(v.literal("solitaire"), v.literal("block_blast")),
  },
  handler: async (ctx, args) => {
    const {
      templateId,
      runTournamentId,
      matchId,
      externalGameId,
      humanScore,
      botCount,
      matchGameType,
    } = args;
    const n = Math.min(Math.max(botCount, 0), 50);
    const seedBase = hashSessionSeed(`${templateId}|${externalGameId}`);
    const spreadCap = matchGameType === "block_blast" ? 120_000 : 8000;
    const spread = Math.max(
      200,
      Math.min(Math.floor(humanScore * 0.35 + 280), spreadCap)
    );
    const now = Date.now();
    const uidPrefix =
      matchGameType === "block_blast"
        ? CASUAL_BLOCK_BLAST_BOT_UID_PREFIX
        : CASUAL_SOLITAIRE_BOT_UID_PREFIX;
    for (let i = 0; i < n; i++) {
      const uid = `${uidPrefix}${externalGameId}:${i}`;
      /** 勿使用 `game_*` 前缀，以免客户端 `loadGame` 误判为休闲 run；接龙保留旧 `vp_${matchId}_${i}` 以兼容已存数据 */
      const gameId =
        matchGameType === "block_blast" ? `vp_${matchId}_bb_${i}` : `vp_${matchId}_${i}`;
      const existing = await ctx.db
        .query("casual_run_player_matches")
        .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
        .unique();
      if (existing) continue;
      const r = pseudoUnit(seedBase, i);
      const delta = Math.floor((r - 0.5) * 2 * spread);
      const score = Math.max(0, Math.floor(humanScore + delta));
      await ctx.db.insert("casual_run_player_matches", {
        matchId,
        tournamentId: runTournamentId,
        templateId,
        uid,
        gameId,
        gameType: matchGameType,
        externalGameId,
        score,
        status: "settled",
        createdAt: now,
        updatedAt: now,
      });
    }
    return { ok: true as const };
  },
});

/** 多人结算：播种虚拟对手后按会话成绩重算真人 rank。 */
export async function fillSolitaireVirtualLeaderboardAndRerankHumans(
  ctx: MutationCtx,
  args: {
    def: CasualTournamentDefinition;
    templateId: string;
    matchId: string;
    runTournamentId: string;
    sessionExternalId: string;
    humanCountPlanned: number;
    referenceHumanScore: number;
    humanRows: Array<{ _id: Id<"casual_run_player_matches">; uid: string }>;
    updatedAt: number;
  }
): Promise<void> {
  const botCount = casualSolitaireVirtualOpponentCount(
    args.def.maxPlayers,
    args.humanCountPlanned
  );
  const gt = args.def.gameId;
  if ((gt !== "solitaire" && gt !== "block_blast") || botCount <= 0 || !args.sessionExternalId) return;

  await ctx.runMutation(internal.service.tournament.casualRunSettlementFill.seedSolitaireVirtualOpponents, {
    templateId: args.templateId,
    runTournamentId: args.runTournamentId,
    matchId: args.matchId,
    externalGameId: args.sessionExternalId,
    humanScore: args.referenceHumanScore,
    botCount,
    matchGameType: gt,
  });

  for (const hp of args.humanRows) {
    const rr = await computeSolitaireRankForSession(
      ctx,
      args.templateId,
      args.sessionExternalId,
      hp.uid
    );
    if (rr != null) {
      await ctx.db.patch(hp._id, { rank: rr, updatedAt: args.updatedAt });
    }
  }
}
