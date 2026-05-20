/**
 * Post-score / settlement helpers: synthetic opponents for session-sized async leaderboards
 *（Solitaire / Block Blast 共用：按 `maxPlayers` 与开局真人数量补虚拟 `casual_run_player_matches`）。
 */
import { v } from "convex/values";
import { internal } from "../../_generated/api";
import type { CasualTournamentDefinition } from "../../data/casualTournamentConfigs";
import type { Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { internalMutation } from "../../_generated/server";
import { getCasualRankMinScores } from "../../data/casualBotDifficultyConfig";
import {
  assignRanksWithMinScores,
  clampTargetRank,
  evaluateBotDifficultyRules,
  generateNeutralGapBotScores,
  generateSoloBotScores,
  hashSessionSeed,
  resolveCasualTableMode,
  resolvePlayerBotStrategyContext,
  sampleTargetRank,
} from "./casualBotDifficultyService";

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
  const row = rows.find((r) => r.uid === uid);
  if (row?.rank != null) return row.rank;
  const withScore = rows
    .filter((r) => r.score != null)
    .map((r) => ({ uid: r.uid, score: r.score as number, rank: r.rank }));
  if (withScore.length === 0) return null;
  withScore.sort((a, b) => {
    const ar = a.rank ?? 999;
    const br = b.rank ?? 999;
    if (ar !== br) return ar - br;
    if (b.score !== a.score) return b.score - a.score;
    return a.uid.localeCompare(b.uid);
  });
  const idx = withScore.findIndex((e) => e.uid === uid);
  return idx >= 0 ? (withScore[idx]!.rank ?? idx + 1) : null;
}

/** 本桌一行（真人/机器人同一套展示字段） */
export type CasualAsyncTableLeaderboardRow = {
  rank: number;
  score: number;
  /** 已本地化：「你」或「同桌 n」，不暴露 uid */
  displayLabel: string;
  isYou: boolean;
};

/** 本会话异步桌结算结果（赛后 UI：完整名次表） */
export type CasualAsyncTableSummary = {
  maxPlayers: number;
  rows: CasualAsyncTableLeaderboardRow[];
};

export function casualTableSummarySolo(maxPlayers: number, score: number): CasualAsyncTableSummary {
  return {
    maxPlayers,
    rows: [{ rank: 1, score, displayLabel: "你", isYou: true }],
  };
}

export async function buildCasualAsyncTableSummary(
  ctx: QueryCtx,
  args: {
    templateId: string;
    sessionExternalId: string;
    uid: string;
    maxPlayers: number;
  }
): Promise<CasualAsyncTableSummary | null> {
  const { templateId, sessionExternalId, uid, maxPlayers } = args;
  if (!sessionExternalId.trim()) return null;

  const rows = await ctx.db
    .query("casual_run_player_matches")
    .withIndex("by_template_external", (q) =>
      q.eq("templateId", templateId).eq("externalGameId", sessionExternalId)
    )
    .collect();

  const withScore = rows
    .filter((r) => r.score != null && Number.isFinite(r.score))
    .map((r) => ({
      uid: r.uid,
      score: r.score as number,
      rank: typeof r.rank === "number" && r.rank >= 1 ? r.rank : 999,
    }));
  if (withScore.length === 0) return null;

  withScore.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    if (b.score !== a.score) return b.score - a.score;
    return a.uid.localeCompare(b.uid);
  });

  if (withScore.findIndex((e) => e.uid === uid) < 0) return null;

  let peerIdx = 0;
  const outRows: CasualAsyncTableLeaderboardRow[] = withScore.map((e) => {
    const isYou = e.uid === uid;
    const displayLabel = isYou ? "你" : `同桌 ${++peerIdx}`;
    return {
      rank: e.rank < 999 ? e.rank : withScore.indexOf(e) + 1,
      score: e.score,
      displayLabel,
      isYou,
    };
  });

  return {
    maxPlayers,
    rows: outRows,
  };
}

export const seedSolitaireVirtualOpponents = internalMutation({
  args: {
    templateId: v.string(),
    runTournamentId: v.string(),
    matchId: v.string(),
    externalGameId: v.string(),
    matchGameType: v.union(v.literal("solitaire"), v.literal("block_blast")),
    /** 按槽位写入的 bot 分数（与 `rank` 顺序一致，仅分数用于入库） */
    botScores: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    const { templateId, runTournamentId, matchId, externalGameId, matchGameType, botScores } =
      args;
    const now = Date.now();
    const uidPrefix =
      matchGameType === "block_blast"
        ? CASUAL_BLOCK_BLAST_BOT_UID_PREFIX
        : CASUAL_SOLITAIRE_BOT_UID_PREFIX;
    for (let i = 0; i < botScores.length; i++) {
      const score = botScores[i]!;
      const uid = `${uidPrefix}${externalGameId}:${i}`;
      const gameId =
        matchGameType === "block_blast" ? `vp_${matchId}_bb_${i}` : `vp_${matchId}_${i}`;
      const existing = await ctx.db
        .query("casual_run_player_matches")
        .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
        .unique();
      if (existing) continue;
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

/** 多人结算：规则引擎 / 中性槽位填 bot，再按 rankMinScores 定全员名次。 */
export async function fillSolitaireVirtualLeaderboardAndRerankHumans(
  ctx: MutationCtx,
  args: {
    def: CasualTournamentDefinition;
    templateId: string;
    matchId: string;
    runTournamentId: string;
    sessionExternalId: string;
    humanCountPlanned: number;
    humanRows: Array<{ _id: Id<"casual_run_player_matches">; uid: string; score: number }>;
    updatedAt: number;
  }
): Promise<void> {
  const gt = args.def.gameId;
  if (gt !== "solitaire" && gt !== "block_blast") return;
  if (!args.sessionExternalId) return;

  const botCount = casualSolitaireVirtualOpponentCount(
    args.def.maxPlayers,
    args.humanCountPlanned
  );
  if (botCount <= 0) return;

  const rankMinScores = getCasualRankMinScores(args.def);
  const sessionSeed = hashSessionSeed(`${args.templateId}|${args.sessionExternalId}`);
  const tableMode = resolveCasualTableMode(args.humanCountPlanned);

  let botFills: Array<{ rank: number; score: number }>;

  if (tableMode === "solo_bot" && args.humanRows.length === 1) {
    const human = args.humanRows[0]!;
    const profile = await resolvePlayerBotStrategyContext(ctx, {
      uid: human.uid,
      templateId: args.templateId,
      def: args.def,
    });
    const dist = evaluateBotDifficultyRules(profile);
    const target = sampleTargetRank(dist, args.def.maxPlayers, sessionSeed);
    const effectiveRank = clampTargetRank(
      target,
      human.score,
      rankMinScores,
      args.def.maxPlayers
    );
    botFills = generateSoloBotScores({
      humanUid: human.uid,
      humanScore: human.score,
      effectiveRank,
      rankMinScores,
      maxPlayers: args.def.maxPlayers,
      gameType: gt,
      sessionSeed,
    });
  } else {
    botFills = generateNeutralGapBotScores({
      humanScores: args.humanRows.map((h) => ({ uid: h.uid, score: h.score })),
      rankMinScores,
      maxPlayers: args.def.maxPlayers,
      gameType: gt,
      sessionSeed,
    });
  }

  await ctx.runMutation(internal.service.tournament.casualRunSettlementFill.seedSolitaireVirtualOpponents, {
    templateId: args.templateId,
    runTournamentId: args.runTournamentId,
    matchId: args.matchId,
    externalGameId: args.sessionExternalId,
    matchGameType: gt,
    botScores: botFills.sort((a, b) => a.rank - b.rank).map((f) => f.score),
  });

  const allRows = await ctx.db
    .query("casual_run_player_matches")
    .withIndex("by_template_external", (q) =>
      q.eq("templateId", args.templateId).eq("externalGameId", args.sessionExternalId)
    )
    .collect();

  const entities = allRows
    .filter((r) => r.score != null && Number.isFinite(r.score))
    .map((r) => ({
      uid: r.uid,
      score: r.score as number,
      isBot: isCasualSolitaireVirtualUid(r.uid),
    }));

  const rankMap = assignRanksWithMinScores({
    entities,
    rankMinScores,
    maxPlayers: args.def.maxPlayers,
  });

  for (const row of allRows) {
    const rr = rankMap.get(row.uid);
    if (rr != null) {
      await ctx.db.patch(row._id, { rank: rr, updatedAt: args.updatedAt });
    }
  }
}
