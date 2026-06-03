/**
 * Post-score / settlement helpers: synthetic opponents for session-sized async leaderboards
 *（Solitaire / Block Blast 共用：按 `maxPlayers` 与开局真人数量补虚拟 `casual_run_player_matches`）。
 */
import { v } from "convex/values";
import type { CasualTournamentDefinition } from "../../data/casualTournamentConfigs";
import type { Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { internalMutation } from "../../_generated/server";
import { readCasualMatchSeedBinding } from "./casualMatchSeedBinding";
import { getCasualRankMinScores } from "../../data/casualBotDifficultyConfig";
import {
  assignRanksWithMinScores,
  buildSoloTableRankMap,
  clampTargetRank,
  evaluateBotDifficultyRules,
  generateNeutralGapBotScores,
  generateSoloBotScores,
  hashSessionSeed,
  resolvePlayerBotStrategyContext,
  sampleTargetRank,
} from "./casualBotDifficultyService";
import { isHumanSubmittedStatus } from "./casualPlayerMatchStatus";

/** `uid` 前缀；本场虚拟对手，不参与全局异步榜 */
/** Solitaire 异步场虚拟对手 uid 前缀（DB 存量数据依赖此字符串） */
export const CASUAL_ASYNC_VIRTUAL_BOT_UID_SOLITAIRE = "__vp_solitaire:";
/** Block Blast 异步场虚拟对手 uid 前缀 */
export const CASUAL_ASYNC_VIRTUAL_BOT_UID_BLOCK_BLAST = "__vp_block_blast:";

/** 真人以外：异步虚拟补位行（solitaire + block_blast） */
export function isCasualAsyncVirtualOpponentUid(uid: string): boolean {
  return (
    uid.startsWith(CASUAL_ASYNC_VIRTUAL_BOT_UID_SOLITAIRE) ||
    uid.startsWith(CASUAL_ASYNC_VIRTUAL_BOT_UID_BLOCK_BLAST)
  );
}

/** Slots to fill with virtual rows = maxPlayers − planned humans (≥1 human slot). */
export function casualAsyncVirtualOpponentCount(
  defMaxPlayers: number,
  matchHumanPlayerCount: number
): number {
  const humanCountPlanned = Math.max(1, matchHumanPlayerCount);
  return Math.max(0, defMaxPlayers - humanCountPlanned);
}

export async function computeCasualAsyncSessionRank(
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
  score?: number;
  rowState?: "scored" | "playing";
  /** 已本地化：「你」/「同桌 n」（真人）/「补位 n」（系统对手），不暴露 uid */
  displayLabel: string;
  isBot?: boolean;
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

/** 赛后 UI 暂名表：按当前分数降序展示名次（勿用 DB `rank`，再战后 bot 仍保留首次 seed 的名次槽） */
function sortScoredUidsByScoreDesc(
  entries: Array<{ uid: string; score: number }>
): Array<{ uid: string; score: number }> {
  return [...entries].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.uid.localeCompare(b.uid);
  });
}

function buildLeaderboardRowsFromScored(
  scored: Array<{ uid: string; score: number }>,
  uid: string
): CasualAsyncTableLeaderboardRow[] {
  const sorted = sortScoredUidsByScoreDesc(scored);
  let humanPeerIdx = 0;
  let botPeerIdx = 0;
  return sorted.map((e, idx) => {
    const isYou = e.uid === uid;
    const isBot = isCasualAsyncVirtualOpponentUid(e.uid);
    let displayLabel: string;
    if (isYou) {
      displayLabel = "你";
    } else if (isBot) {
      displayLabel = `补位 ${++botPeerIdx}`;
    } else {
      displayLabel = `同桌 ${++humanPeerIdx}`;
    }
    return {
      rank: idx + 1,
      score: e.score,
      rowState: "scored" as const,
      displayLabel,
      isYou,
      ...(isBot ? { isBot: true as const } : {}),
    };
  });
}

export async function buildCasualAsyncTableSummary(
  ctx: QueryCtx,
  args: {
    templateId: string;
    sessionExternalId: string;
    uid: string;
    maxPlayers: number;
    /** 优先按 match 拉全桌（真人 externalGameId 可能与 bot 的 casual_sess 不一致） */
    matchId?: string;
    /** false：未全员 settled；已交分真人仍展示分数/暂名，仅 open/replaying 等为 Playing */
    allHumansSettled?: boolean;
  }
): Promise<CasualAsyncTableSummary | null> {
  const { templateId, sessionExternalId, uid, maxPlayers, matchId } = args;
  const allHumansSettled = args.allHumansSettled === true;

  let rows;
  if (matchId && matchId.trim().length > 0) {
    rows = await ctx.db
      .query("casual_run_player_matches")
      .withIndex("by_match_uid", (q) => q.eq("matchId", matchId))
      .collect();
  } else if (sessionExternalId.trim().length > 0) {
    rows = await ctx.db
      .query("casual_run_player_matches")
      .withIndex("by_template_external", (q) =>
        q.eq("templateId", templateId).eq("externalGameId", sessionExternalId)
      )
      .collect();
  } else {
    return null;
  }

  const viewerRow = rows.find((r) => r.uid === uid);
  if (!viewerRow) return null;

  if (!allHumansSettled && maxPlayers > 1) {
    const scored = rows
      .filter((r) => {
        if (isCasualAsyncVirtualOpponentUid(r.uid)) {
          return r.score != null && Number.isFinite(r.score);
        }
        return (
          isHumanSubmittedStatus(r.status) &&
          r.score != null &&
          Number.isFinite(r.score)
        );
      })
      .map((r) => ({
        uid: r.uid,
        score: r.score as number,
      }));
    if (scored.length === 0) return null;

    const scoredUidSet = new Set(scored.map((e) => e.uid));
    const outRows = buildLeaderboardRowsFromScored(scored, uid);

    let humanPeerIdx = 0;
    for (const h of rows) {
      if (scoredUidSet.has(h.uid) || isCasualAsyncVirtualOpponentUid(h.uid)) continue;
      outRows.push({
        rank: 0,
        rowState: "playing",
        displayLabel: `同桌 ${++humanPeerIdx}`,
        isYou: false,
      });
    }

    return { maxPlayers, rows: outRows };
  }

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

  let humanPeerIdx = 0;
  let botPeerIdx = 0;
  const outRows: CasualAsyncTableLeaderboardRow[] = withScore.map((e) => {
    const isYou = e.uid === uid;
    const isBot = isCasualAsyncVirtualOpponentUid(e.uid);
    let displayLabel: string;
    if (isYou) {
      displayLabel = "你";
    } else if (isBot) {
      displayLabel = `补位 ${++botPeerIdx}`;
    } else {
      displayLabel = `同桌 ${++humanPeerIdx}`;
    }
    return {
      rank: e.rank < 999 ? e.rank : withScore.indexOf(e) + 1,
      score: e.score,
      rowState: "scored" as const,
      displayLabel,
      isYou,
      ...(isBot ? { isBot: true as const } : {}),
    };
  });

  return {
    maxPlayers,
    rows: outRows,
  };
}

/** 终检补位后构建同桌榜（dedupe / 并发提交共用） */
export async function finalizeCasualAsyncTableSummaryForPlayer(
  ctx: MutationCtx,
  args: {
    def: CasualTournamentDefinition;
    templateId: string;
    matchId: string;
    runTournamentId: string;
    sessionExternalId: string;
    uid: string;
    updatedAt: number;
  }
): Promise<CasualAsyncTableSummary | null> {
  if (args.def.maxPlayers > 1 && args.sessionExternalId.trim().length > 0) {
    await ensureAsyncMatchRosterFull(ctx, {
      def: args.def,
      templateId: args.templateId,
      matchId: args.matchId,
      runTournamentId: args.runTournamentId,
      sessionExternalId: args.sessionExternalId,
      updatedAt: args.updatedAt,
    });
  }
  const matchRows = await ctx.db
    .query("casual_run_player_matches")
    .withIndex("by_match_uid", (q) => q.eq("matchId", args.matchId))
    .collect();
  const humanRows = matchRows.filter((r) => !isCasualAsyncVirtualOpponentUid(r.uid));
  const allHumansSettled =
    humanRows.length > 0 && humanRows.every((r) => r.status === "settled");

  return await buildCasualAsyncTableSummary(ctx, {
    templateId: args.templateId,
    sessionExternalId: args.sessionExternalId,
    uid: args.uid,
    maxPlayers: args.def.maxPlayers,
    matchId: args.matchId,
    allHumansSettled,
  });
}

/** 虚拟对手已存在时仅重算名次，不重新 seed */
export async function rerankCasualAsyncMatchScores(
  ctx: MutationCtx,
  args: {
    matchId: string;
    sessionExternalId: string;
    def: CasualTournamentDefinition;
    updatedAt: number;
  }
): Promise<void> {
  if (!args.sessionExternalId.trim()) return;
  const rankMinScores = getCasualRankMinScores(args.def);
  await patchRanksForAsyncMatch(ctx, {
    matchId: args.matchId,
    sessionExternalId: args.sessionExternalId,
    def: args.def,
    rankMinScores,
    updatedAt: args.updatedAt,
  });
}

/** 首个真人提交时 seed bot 并 freeze；后续提交仅 rerank */
export async function ensureBotsSeededForPartialSubmit(
  ctx: MutationCtx,
  args: {
    def: CasualTournamentDefinition;
    templateId: string;
    matchId: string;
    runTournamentId: string;
    sessionExternalId: string;
    humanCountPlanned: number;
    updatedAt: number;
    matchDoc: { _id: Id<"casual_run_matches">; botsSeeded?: boolean };
  }
): Promise<void> {
  if (args.def.maxPlayers <= 1) return;
  if (!args.sessionExternalId.trim()) return;

  const matchRows = await ctx.db
    .query("casual_run_player_matches")
    .withIndex("by_match_uid", (q) => q.eq("matchId", args.matchId))
    .collect();
  const humanRows = matchRows
    .filter(
      (r) =>
        !isCasualAsyncVirtualOpponentUid(r.uid) &&
        r.score != null &&
        Number.isFinite(r.score)
    )
    .map((r) => ({ _id: r._id, uid: r.uid, score: r.score as number }));

  if (humanRows.length === 0) return;

  if (!args.matchDoc.botsSeeded) {
    const filled = await fillCasualAsyncVirtualLeaderboardAndRerankHumans(ctx, {
      def: args.def,
      templateId: args.templateId,
      matchId: args.matchId,
      runTournamentId: args.runTournamentId,
      sessionExternalId: args.sessionExternalId,
      humanCountPlanned: args.humanCountPlanned,
      humanRows,
      updatedAt: args.updatedAt,
      deferRolloutsToHttpSync: true,
    });
    if (filled) {
      await ctx.db.patch(args.matchDoc._id, {
        botsSeeded: true,
        updatedAt: args.updatedAt,
      });
    }
    return;
  }

  await rerankCasualAsyncMatchScores(ctx, {
    matchId: args.matchId,
    sessionExternalId: args.sessionExternalId,
    def: args.def,
    updatedAt: args.updatedAt,
  });
}

export type SeedVirtualOpponentArgs = {
  templateId: string;
  runTournamentId: string;
  matchId: string;
  externalGameId: string;
  matchGameType: "solitaire" | "block_blast";
  /** 每个 bot 的目标名次槽与分数 */
  botFills: Array<{ rank: number; score: number }>;
  updatedAt: number;
  /** 默认 true：先删本 match 全部虚拟行再写入；false：仅 upsert 传入槽位（供 topUp 追加） */
  replaceAllVirtual?: boolean;
};

/** 同 mutation 内写入虚拟对手（勿 `runMutation`，否则父事务读榜可能缺行） */
export async function seedCasualAsyncVirtualOpponentsCore(
  ctx: MutationCtx,
  args: SeedVirtualOpponentArgs
): Promise<void> {
  const {
    templateId,
    runTournamentId,
    matchId,
    externalGameId,
    matchGameType,
    botFills,
    updatedAt,
    replaceAllVirtual = true,
  } = args;
  const uidPrefix =
    matchGameType === "block_blast"
      ? CASUAL_ASYNC_VIRTUAL_BOT_UID_BLOCK_BLAST
      : CASUAL_ASYNC_VIRTUAL_BOT_UID_SOLITAIRE;

  if (replaceAllVirtual) {
    const prior = await ctx.db
      .query("casual_run_player_matches")
      .withIndex("by_match_uid", (q) => q.eq("matchId", matchId))
      .collect();
    for (const row of prior) {
      if (isCasualAsyncVirtualOpponentUid(row.uid)) {
        await ctx.db.delete(row._id);
      }
    }
  }

  for (const fill of botFills) {
    const slot = fill.rank;
    const score = fill.score;
    const uid = `${uidPrefix}${matchId}:r${slot}`;
    const gameId =
      matchGameType === "block_blast"
        ? `vp_${matchId}_bb_r${slot}`
        : `vp_${matchId}_r${slot}`;
    const existing = await ctx.db
      .query("casual_run_player_matches")
      .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        score,
        status: "settled",
        externalGameId,
        updatedAt,
      });
      continue;
    }
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
      createdAt: updatedAt,
      updatedAt,
    });
  }
}

export const seedCasualAsyncVirtualOpponents = internalMutation({
  args: {
    templateId: v.string(),
    runTournamentId: v.string(),
    matchId: v.string(),
    externalGameId: v.string(),
    matchGameType: v.union(v.literal("solitaire"), v.literal("block_blast")),
    botFills: v.array(v.object({ rank: v.number(), score: v.number() })),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    await seedCasualAsyncVirtualOpponentsCore(ctx, args);
    return { ok: true as const };
  },
});

type BotFill = { rank: number; score: number };

type SoloBotPlan = { humanUid: string; effectiveRank: number };

type BotFillBuildResult = {
  botFills: BotFill[];
  soloPlan?: SoloBotPlan;
};

function botUidForMatchSlot(
  matchGameType: "solitaire" | "block_blast",
  matchId: string,
  slotRank: number
): string {
  const prefix =
    matchGameType === "block_blast"
      ? CASUAL_ASYNC_VIRTUAL_BOT_UID_BLOCK_BLAST
      : CASUAL_ASYNC_VIRTUAL_BOT_UID_SOLITAIRE;
  return `${prefix}${matchId}:r${slotRank}`;
}

export function padBotFillsToCount(args: {
  fills: BotFill[];
  botCount: number;
  maxPlayers: number;
  rankMinScores: ReturnType<typeof getCasualRankMinScores>;
  gameType: "solitaire" | "block_blast";
}): BotFill[] {
  const sorted = [...args.fills].sort((a, b) => a.rank - b.rank);
  const occupied = new Set(sorted.map((f) => f.rank));
  const eps = args.gameType === "block_blast" ? 50 : 5;
  for (let r = 1; r <= args.maxPlayers && sorted.length < args.botCount; r++) {
    if (occupied.has(r)) continue;
    const low = args.rankMinScores[r] ?? 0;
    sorted.push({ rank: r, score: low + eps });
    occupied.add(r);
  }
  return sorted.slice(0, args.botCount);
}

async function buildBotFillsForAsyncMatch(
  ctx: MutationCtx,
  args: {
    def: CasualTournamentDefinition;
    templateId: string;
    sessionExternalId: string;
    humanRows: Array<{ uid: string; score: number }>;
    rankMinScores: ReturnType<typeof getCasualRankMinScores>;
    botCount: number;
  }
): Promise<BotFillBuildResult> {
  const gt =
    args.def.gameId === "block_blast" || args.def.gameId === "solitaire"
      ? args.def.gameId
      : "solitaire";
  const sessionSeed = hashSessionSeed(`${args.templateId}|${args.sessionExternalId}`);
  let botFills: BotFill[];
  let soloPlan: SoloBotPlan | undefined;

  if (args.humanRows.length === 1) {
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
      args.rankMinScores,
      args.def.maxPlayers
    );
    soloPlan = { humanUid: human.uid, effectiveRank };
    botFills = generateSoloBotScores({
      humanUid: human.uid,
      humanScore: human.score,
      effectiveRank,
      rankMinScores: args.rankMinScores,
      maxPlayers: args.def.maxPlayers,
      gameType: gt,
      sessionSeed,
    });
  } else {
    botFills = generateNeutralGapBotScores({
      humanScores: args.humanRows.map((h) => ({ uid: h.uid, score: h.score })),
      rankMinScores: args.rankMinScores,
      maxPlayers: args.def.maxPlayers,
      gameType: gt,
      sessionSeed,
    });
  }

  return {
    botFills: padBotFillsToCount({
      fills: botFills,
      botCount: args.botCount,
      maxPlayers: args.def.maxPlayers,
      rankMinScores: args.rankMinScores,
      gameType: gt,
    }),
    soloPlan,
  };
}

async function patchRanksForAsyncMatch(
  ctx: MutationCtx,
  args: {
    matchId: string;
    sessionExternalId: string;
    def: CasualTournamentDefinition;
    rankMinScores: ReturnType<typeof getCasualRankMinScores>;
    updatedAt: number;
    soloPlan?: SoloBotPlan;
    botFills?: BotFill[];
  }
): Promise<number> {
  const rows = await ctx.db
    .query("casual_run_player_matches")
    .withIndex("by_match_uid", (q) => q.eq("matchId", args.matchId))
    .collect();

  const gt =
    args.def.gameId === "block_blast" || args.def.gameId === "solitaire"
      ? args.def.gameId
      : "solitaire";

  let rankMap: Map<string, number>;
  if (args.soloPlan && args.botFills?.length) {
    rankMap = buildSoloTableRankMap({
      humanUid: args.soloPlan.humanUid,
      effectiveRank: args.soloPlan.effectiveRank,
      botFills: args.botFills,
      botUidForSlot: (slotRank) => botUidForMatchSlot(gt, args.matchId, slotRank),
    });
  } else {
    const entities = rows
      .filter((r) => r.score != null && Number.isFinite(r.score))
      .map((r) => ({
        uid: r.uid,
        score: r.score as number,
        isBot: isCasualAsyncVirtualOpponentUid(r.uid),
      }));
    rankMap = assignRanksWithMinScores({
      entities,
      rankMinScores: args.rankMinScores,
      maxPlayers: args.def.maxPlayers,
    });
  }

  for (const row of rows) {
    const rr = rankMap.get(row.uid);
    const patch: { rank?: number; externalGameId?: string; updatedAt: number } = {
      updatedAt: args.updatedAt,
    };
    if (rr != null) patch.rank = rr;
    if (row.externalGameId !== args.sessionExternalId) {
      patch.externalGameId = args.sessionExternalId;
    }
    if (patch.rank != null || patch.externalGameId != null) {
      await ctx.db.patch(row._id, patch);
    }
  }

  return rows.filter((r) => r.score != null && Number.isFinite(r.score)).length;
}

/** 终检：真人 + 补位 bot 计分行数必须达到 maxPlayers */
export async function ensureAsyncMatchRosterFull(
  ctx: MutationCtx,
  args: {
    def: CasualTournamentDefinition;
    templateId: string;
    matchId: string;
    runTournamentId: string;
    sessionExternalId: string;
    updatedAt: number;
  }
): Promise<void> {
  const gt =
    args.def.gameId === "block_blast" || args.def.gameId === "solitaire"
      ? args.def.gameId
      : null;
  if (!gt || args.def.maxPlayers <= 1) return;

  const rankMinScores = getCasualRankMinScores(args.def);
  const rows = await ctx.db
    .query("casual_run_player_matches")
    .withIndex("by_match_uid", (q) => q.eq("matchId", args.matchId))
    .collect();

  const humansWithScore = rows.filter(
    (r) => !isCasualAsyncVirtualOpponentUid(r.uid) && r.score != null && Number.isFinite(r.score)
  );
  const virtualWithScore = rows.filter(
    (r) => isCasualAsyncVirtualOpponentUid(r.uid) && r.score != null && Number.isFinite(r.score)
  );
  const needBots = args.def.maxPlayers - humansWithScore.length;
  if (needBots <= 0) return;

  const totalScored = humansWithScore.length + virtualWithScore.length;
  if (virtualWithScore.length >= needBots && totalScored >= args.def.maxPlayers) {
    return;
  }

  const humanRows = humansWithScore.map((r) => ({
    uid: r.uid,
    score: r.score as number,
  }));
  const scheduled = await scheduleRolloutBotFillsIfNeeded(ctx, {
    def: args.def,
    templateId: args.templateId,
    matchId: args.matchId,
    runTournamentId: args.runTournamentId,
    sessionExternalId: args.sessionExternalId,
    humanScores: humanRows,
    botCount: needBots,
    updatedAt: args.updatedAt,
    replaceAllVirtual: true,
  });
  if (scheduled) return;

  const { botFills, soloPlan } = await buildBotFillsForAsyncMatch(ctx, {
    def: args.def,
    templateId: args.templateId,
    sessionExternalId: args.sessionExternalId,
    humanRows,
    rankMinScores,
    botCount: needBots,
  });

  await seedCasualAsyncVirtualOpponentsCore(ctx, {
    templateId: args.templateId,
    runTournamentId: args.runTournamentId,
    matchId: args.matchId,
    externalGameId: args.sessionExternalId,
    matchGameType: gt,
    botFills,
    updatedAt: args.updatedAt,
    replaceAllVirtual: true,
  });

  await patchRanksForAsyncMatch(ctx, {
    matchId: args.matchId,
    sessionExternalId: args.sessionExternalId,
    def: args.def,
    rankMinScores,
    updatedAt: args.updatedAt,
    soloPlan,
    botFills,
  });
}

/** 写入 bot 分并 rerank（本地或 rollouts action 共用） */
export async function applyAsyncBotFillPlanToMatch(
  ctx: MutationCtx,
  args: {
    def: CasualTournamentDefinition;
    templateId: string;
    matchId: string;
    runTournamentId: string;
    sessionExternalId: string;
    matchGameType: "solitaire" | "block_blast";
    botFills: Array<{ rank: number; score: number }>;
    soloPlan?: { humanUid: string; effectiveRank: number };
    updatedAt: number;
    replaceAllVirtual?: boolean;
  }
): Promise<void> {
  const rankMinScores = getCasualRankMinScores(args.def);
  await seedCasualAsyncVirtualOpponentsCore(ctx, {
    templateId: args.templateId,
    runTournamentId: args.runTournamentId,
    matchId: args.matchId,
    externalGameId: args.sessionExternalId,
    matchGameType: args.matchGameType,
    botFills: args.botFills,
    updatedAt: args.updatedAt,
    replaceAllVirtual: args.replaceAllVirtual ?? true,
  });
  await patchRanksForAsyncMatch(ctx, {
    matchId: args.matchId,
    sessionExternalId: args.sessionExternalId,
    def: args.def,
    rankMinScores,
    updatedAt: args.updatedAt,
    soloPlan: args.soloPlan,
    botFills: args.botFills,
  });
  const matchDoc = await ctx.db.get(args.matchId as Id<"casual_run_matches">);
  if (matchDoc && !matchDoc.botsSeeded) {
    await ctx.db.patch(matchDoc._id, {
      botsSeeded: true,
      updatedAt: args.updatedAt,
    });
  }
}

async function scheduleRolloutBotFillsIfNeeded(
  ctx: MutationCtx,
  args: {
    def: CasualTournamentDefinition;
    templateId: string;
    matchId: string;
    runTournamentId: string;
    sessionExternalId: string;
    humanScores: Array<{ uid: string; score: number }>;
    botCount: number;
    updatedAt: number;
    replaceAllVirtual?: boolean;
    /** 首个真人提交走 HTTP action 同步填分，避免与 scheduler 重复 */
    skipSchedule?: boolean;
  }
): Promise<boolean> {
  if (args.skipSchedule) return false;
  if (args.def.gameId !== "solitaire" || args.botCount <= 0) return false;
  const matchDoc = await ctx.db.get(args.matchId as Id<"casual_run_matches">);
  if (!matchDoc || !readCasualMatchSeedBinding(matchDoc)) return false;
  await ctx.scheduler.runAfter(
    0,
    internal.service.tournament.casualMatchSeedRolloutsAction.computeAndApplyAsyncBotFills,
    {
      templateId: args.templateId,
      matchId: args.matchId,
      runTournamentId: args.runTournamentId,
      sessionExternalId: args.sessionExternalId,
      humanScores: args.humanScores,
      botCount: args.botCount,
      updatedAt: args.updatedAt,
      replaceAllVirtual: args.replaceAllVirtual,
    }
  );
  return true;
}

/** 多人结算：规则引擎 / 中性槽位填 bot，再按 rankMinScores 定全员名次。 */
export async function fillCasualAsyncVirtualLeaderboardAndRerankHumans(
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
    /** 首个真人提交：由 HTTP `syncRolloutBotsAfterScoreSubmit` 同步拉 rollouts */
    deferRolloutsToHttpSync?: boolean;
  }
): Promise<boolean> {
  const gt = args.def.gameId;
  if (gt !== "solitaire" && gt !== "block_blast") return false;
  if (!args.sessionExternalId) return false;

  /** 以 DB 为准重读真人分，避免并发提交传入过时的 humanRows */
  const matchRows = await ctx.db
    .query("casual_run_player_matches")
    .withIndex("by_match_uid", (q) => q.eq("matchId", args.matchId))
    .collect();
  const humanRows = matchRows
    .filter(
      (r) =>
        !isCasualAsyncVirtualOpponentUid(r.uid) &&
        r.score != null &&
        Number.isFinite(r.score)
    )
    .map((r) => ({ uid: r.uid, score: r.score as number }));

  const actualHumanCount = Math.max(1, humanRows.length);
  const botCount = casualAsyncVirtualOpponentCount(args.def.maxPlayers, actualHumanCount);
  if (botCount <= 0) return false;

  const matchDoc = await ctx.db.get(args.matchId as Id<"casual_run_matches">);
  const useRollouts =
    gt === "solitaire" && matchDoc != null && readCasualMatchSeedBinding(matchDoc) != null;

  const scheduled = await scheduleRolloutBotFillsIfNeeded(ctx, {
    def: args.def,
    templateId: args.templateId,
    matchId: args.matchId,
    runTournamentId: args.runTournamentId,
    sessionExternalId: args.sessionExternalId,
    humanScores: humanRows,
    botCount,
    updatedAt: args.updatedAt,
    replaceAllVirtual: true,
    skipSchedule: args.deferRolloutsToHttpSync,
  });
  if (scheduled) return false;
  if (useRollouts && args.deferRolloutsToHttpSync) return false;

  const rankMinScores = getCasualRankMinScores(args.def);
  const { botFills, soloPlan } = await buildBotFillsForAsyncMatch(ctx, {
    def: args.def,
    templateId: args.templateId,
    sessionExternalId: args.sessionExternalId,
    humanRows,
    rankMinScores,
    botCount,
  });

  await applyAsyncBotFillPlanToMatch(ctx, {
    def: args.def,
    templateId: args.templateId,
    matchId: args.matchId,
    runTournamentId: args.runTournamentId,
    sessionExternalId: args.sessionExternalId,
    matchGameType: gt,
    botFills,
    soloPlan,
    updatedAt: args.updatedAt,
    replaceAllVirtual: true,
  });

  await ensureAsyncMatchRosterFull(ctx, {
    def: args.def,
    templateId: args.templateId,
    matchId: args.matchId,
    runTournamentId: args.runTournamentId,
    sessionExternalId: args.sessionExternalId,
    updatedAt: args.updatedAt,
  });
  return true;
}

