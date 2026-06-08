/**
 * Post-score / settlement helpers: synthetic opponents for session-sized async leaderboards
 *（Solitaire / Block Blast 共用：按 `maxPlayers` 与开局真人数量补虚拟 `casual_run_player_matches`）。
 */
import { v } from "convex/values";
import type { CasualTournamentDefinition } from "../../data/casualTournamentConfigs";
import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { internalMutation } from "../../_generated/server";
import { readCasualMatchSeedBinding } from "./casualMatchSeedBinding";
import {
  assignMixedRanks,
  assignRanksByScoreDesc,
  generateNeutralGapBotScores,
  generateSoloBotScores,
  hashSessionSeed,
  recommendSoloEffectiveRank,
  resolvePlayerBotStrategyContext,
} from "./casualBotDifficultyService";
import {
  deriveRankScoreFloorsFromQuantiles,
  type RankScoreFloorsByRank,
} from "./casualRankQuantiles";
import {
  pickDurationFallbackMs,
  planBotRevealSchedule,
  resolveAsyncLeaderboardRowState,
} from "../../data/casualBotFillStaggerConfig";
import { canonicalCasualRunSessionExternalId } from "./casualRunSession";

export function resolveRankFloorsFromMatchDoc(
  matchDoc: { seedBinding?: unknown },
  maxPlayers: number
): RankScoreFloorsByRank | null {
  const binding = readCasualMatchSeedBinding(matchDoc);
  if (!binding) return null;
  return deriveRankScoreFloorsFromQuantiles(binding.scoreQuantiles, maxPlayers);
}

/** @alias resolveRankFloorsFromMatchDoc */
export const deriveRankFloorsForMatch = resolveRankFloorsFromMatchDoc;

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
  matchId: string,
  uid: string
): Promise<number | null> {
  const rows = await ctx.db
    .query("casual_run_player_matches")
    .withIndex("by_match_uid", (q) => q.eq("matchId", matchId))
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

export { resolveAsyncLeaderboardRowState } from "../../data/casualBotFillStaggerConfig";

/** 本桌一行（真人/机器人同一套展示字段） */
export type CasualAsyncTableLeaderboardRow = {
  rank: number;
  score?: number;
  rowState?: "scored" | "playing" | "matching";
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

type PlayerMatchRow = Doc<"casual_run_player_matches">;

function buildPartialAsyncTableSummaryRows(args: {
  rows: PlayerMatchRow[];
  uid: string;
  maxPlayers: number;
  humanCountPlanned: number;
  now: number;
}): CasualAsyncTableLeaderboardRow[] {
  const { rows, uid, maxPlayers, humanCountPlanned, now } = args;
  const targetBotCount = casualAsyncVirtualOpponentCount(maxPlayers, humanCountPlanned);

  const scoredEntries: Array<{ uid: string; score: number }> = [];
  const playingRows: CasualAsyncTableLeaderboardRow[] = [];
  let matchingSlots = 0;
  let humanPeerIdx = 0;
  let botPeerIdx = 0;

  const humans = rows.filter((r) => !isCasualAsyncVirtualOpponentUid(r.uid));
  const bots = rows
    .filter((r) => isCasualAsyncVirtualOpponentUid(r.uid))
    .sort((a, b) => a.uid.localeCompare(b.uid));

  for (const h of humans) {
    const state = resolveAsyncLeaderboardRowState({ kind: "human", status: h.status }, now);
    const isYou = h.uid === uid;
    if (state === "scored" && h.score != null && Number.isFinite(h.score)) {
      scoredEntries.push({ uid: h.uid, score: h.score as number });
      continue;
    }
    if (state === "playing") {
      playingRows.push({
        rank: 0,
        rowState: "playing",
        displayLabel: isYou ? "你" : `同桌 ${++humanPeerIdx}`,
        isYou,
      });
    }
  }

  for (const b of bots) {
    const state = resolveAsyncLeaderboardRowState(
      {
        kind: "bot",
        revealAt: b.revealAt,
        duration: b.duration,
      },
      now
    );
    if (state === "matching") {
      matchingSlots += 1;
      continue;
    }
    const label = `补位 ${++botPeerIdx}`;
    if (state === "playing") {
      playingRows.push({
        rank: 0,
        rowState: "playing",
        displayLabel: label,
        isBot: true,
        isYou: false,
      });
      continue;
    }
    if (b.score != null && Number.isFinite(b.score)) {
      scoredEntries.push({ uid: b.uid, score: b.score as number });
    }
  }

  const unrevealedFromTarget = Math.max(0, targetBotCount - bots.length);
  matchingSlots += unrevealedFromTarget;

  const outRows = buildLeaderboardRowsFromScored(scoredEntries, uid);
  outRows.push(...playingRows);
  for (let i = 0; i < matchingSlots; i++) {
    outRows.push({
      rank: 0,
      rowState: "matching",
      displayLabel: "正在匹配中",
      isBot: true,
      isYou: false,
    });
  }
  return outRows;
}

export async function buildCasualAsyncTableSummary(
  ctx: QueryCtx,
  args: {
    templateId: string;
    uid: string;
    maxPlayers: number;
    matchId: string;
    /** false：未全员 settled；已交分真人仍展示分数/暂名，仅 open/replaying 等为 Playing */
    allHumansSettled?: boolean;
  }
): Promise<CasualAsyncTableSummary | null> {
  const { templateId, uid, maxPlayers, matchId } = args;
  const allHumansSettled = args.allHumansSettled === true;

  if (!matchId.trim()) return null;
  const rows = await ctx.db
    .query("casual_run_player_matches")
    .withIndex("by_match_uid", (q) => q.eq("matchId", matchId))
    .collect();

  const viewerRow = rows.find((r) => r.uid === uid);
  if (!viewerRow) return null;

  if (!allHumansSettled && maxPlayers > 1) {
    let humanCountPlanned = 1;
    if (matchId?.trim()) {
      const matchDoc = await ctx.db.get(matchId as Id<"casual_run_matches">);
      const humansWithScore = rows.filter(
        (r) => !isCasualAsyncVirtualOpponentUid(r.uid) && r.score != null
      );
      humanCountPlanned = Math.max(
        1,
        matchDoc?.humanPlayerCount ?? humansWithScore.length ?? 1
      );
    }

    const outRows = buildPartialAsyncTableSummaryRows({
      rows,
      uid,
      maxPlayers,
      humanCountPlanned,
      now: Date.now(),
    });
    const hasContent = outRows.some(
      (r) => r.rowState === "scored" || r.rowState === "playing" || r.rowState === "matching"
    );
    if (!hasContent) return null;
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
  const matchDoc = await ctx.db.get(args.matchId as Id<"casual_run_matches">);
  if (!matchDoc) return;
  const rankFloors = resolveRankFloorsFromMatchDoc(matchDoc, args.def.maxPlayers);
  if (!rankFloors) return;
  await patchRanksForAsyncMatch(ctx, {
    matchId: args.matchId,
    def: args.def,
    rankFloors,
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

export type AsyncBotFill = {
  rank: number;
  score: number;
  duration?: number;
  rolloutIndex?: number;
};

export type SeedVirtualOpponentArgs = {
  templateId: string;
  runTournamentId: string;
  matchId: string;
  matchGameType: "solitaire" | "block_blast";
  /** 每个 bot 的目标名次槽与分数 */
  botFills: AsyncBotFill[];
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
        updatedAt,
        ...(fill.duration != null ? { duration: fill.duration } : {}),
        rolloutIndex: fill.rolloutIndex,
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
      score,
      status: "settled",
      ...(fill.duration != null ? { duration: fill.duration } : {}),
      ...(fill.rolloutIndex != null ? { rolloutIndex: fill.rolloutIndex } : {}),
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
    matchGameType: v.union(v.literal("solitaire"), v.literal("block_blast")),
    botFills: v.array(
      v.object({
        rank: v.number(),
        score: v.number(),
        duration: v.optional(v.number()),
        rolloutIndex: v.optional(v.number()),
      })
    ),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    await seedCasualAsyncVirtualOpponentsCore(ctx, args);
    return { ok: true as const };
  },
});

type BotFill = AsyncBotFill;

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
  rankFloors: RankScoreFloorsByRank;
  gameType: "solitaire" | "block_blast";
  sessionSeed: number;
}): BotFill[] {
  const sorted = [...args.fills].sort((a, b) => a.rank - b.rank);
  const occupied = new Set(sorted.map((f) => f.rank));
  const eps = args.gameType === "block_blast" ? 50 : 5;
  for (let r = 1; r <= args.maxPlayers && sorted.length < args.botCount; r++) {
    if (occupied.has(r)) continue;
    const low = args.rankFloors[r] ?? 0;
    sorted.push({
      rank: r,
      score: low + eps,
      duration: pickDurationFallbackMs(args.sessionSeed, r),
    });
    occupied.add(r);
  }
  return sorted.slice(0, args.botCount);
}

export async function buildBotFillsForAsyncMatch(
  ctx: QueryCtx | MutationCtx,
  args: {
    def: CasualTournamentDefinition;
    templateId: string;
    sessionExternalId: string;
    humanRows: Array<{ uid: string; score: number }>;
    rankFloors: RankScoreFloorsByRank;
    seedBinding: NonNullable<ReturnType<typeof readCasualMatchSeedBinding>>;
    botCount: number;
    /** planned 真人数；≥2 走 mixed，≤1 走 solo */
    humanCountPlanned: number;
  }
): Promise<BotFillBuildResult> {
  const gt =
    args.def.gameType === "block_blast" || args.def.gameType === "solitaire"
      ? args.def.gameType
      : "solitaire";
  const sessionSeed = hashSessionSeed(`${args.templateId}|${args.sessionExternalId}`);
  let botFills: BotFill[];
  let soloPlan: SoloBotPlan | undefined;

  const isSoloTable = args.humanCountPlanned <= 1;

  if (isSoloTable && args.humanRows.length >= 1) {
    const human = args.humanRows[0]!;
    const profile = await resolvePlayerBotStrategyContext(ctx, {
      uid: human.uid,
      templateId: args.templateId,
      def: args.def,
    });
    const recommended = await recommendSoloEffectiveRank(ctx, {
      humanScore: human.score,
      seedBinding: args.seedBinding,
      def: args.def,
      profile,
      sessionSeed,
      uid: human.uid,
      templateId: args.templateId,
    });
    soloPlan = { humanUid: human.uid, effectiveRank: recommended.effectiveRank };
    botFills = generateSoloBotScores({
      humanUid: human.uid,
      humanScore: human.score,
      effectiveRank: recommended.effectiveRank,
      rankFloors: args.rankFloors,
      maxPlayers: args.def.maxPlayers,
      gameType: gt,
      sessionSeed,
    });
  } else {
    botFills = generateNeutralGapBotScores({
      humanScores: args.humanRows.map((h) => ({ uid: h.uid, score: h.score })),
      rankFloors: args.rankFloors,
      maxPlayers: args.def.maxPlayers,
      gameType: gt,
      sessionSeed,
    });
  }

  return {
    botFills: padBotFillsToCount({
      fills: botFills.map((f, i) => ({
        ...f,
        duration: f.duration ?? pickDurationFallbackMs(sessionSeed, f.rank + i),
      })),
      botCount: args.botCount,
      maxPlayers: args.def.maxPlayers,
      rankFloors: args.rankFloors,
      gameType: gt,
      sessionSeed,
    }),
    soloPlan,
  };
}

async function patchRanksForAsyncMatch(
  ctx: MutationCtx,
  args: {
    matchId: string;
    def: CasualTournamentDefinition;
    rankFloors: RankScoreFloorsByRank;
    updatedAt: number;
    soloPlan?: SoloBotPlan;
    botFills?: BotFill[];
  }
): Promise<number> {
  const rows = await ctx.db
    .query("casual_run_player_matches")
    .withIndex("by_match_uid", (q) => q.eq("matchId", args.matchId))
    .collect();

  let rankMap: Map<string, number>;
  if (args.soloPlan && args.botFills?.length) {
    const entities = rows
      .filter((r) => r.score != null && Number.isFinite(r.score))
      .map((r) => ({
        uid: r.uid,
        score: r.score as number,
        isBot: isCasualAsyncVirtualOpponentUid(r.uid),
      }));
    rankMap = assignRanksByScoreDesc(entities);
  } else {
    const entities = rows
      .filter((r) => r.score != null && Number.isFinite(r.score))
      .map((r) => ({
        uid: r.uid,
        score: r.score as number,
        isBot: isCasualAsyncVirtualOpponentUid(r.uid),
      }));
    rankMap = assignMixedRanks({
      entities,
      rankFloors: args.rankFloors,
      maxPlayers: args.def.maxPlayers,
    });
  }

  for (const row of rows) {
    const rr = rankMap.get(row.uid);
    if (rr == null) continue;
    await ctx.db.patch(row._id, {
      rank: rr,
      updatedAt: args.updatedAt,
    });
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
    args.def.gameType === "block_blast" || args.def.gameType === "solitaire"
      ? args.def.gameType
      : null;
  if (!gt || args.def.maxPlayers <= 1) return;

  const matchDoc = await ctx.db.get(args.matchId as Id<"casual_run_matches">);
  if (!matchDoc) return;
  const rankFloors = resolveRankFloorsFromMatchDoc(matchDoc, args.def.maxPlayers);
  if (!rankFloors) return;

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
  const humanCountPlanned = Math.max(
    1,
    matchDoc.humanPlayerCount ?? humansWithScore.length
  );
  const targetBotCount = casualAsyncVirtualOpponentCount(
    args.def.maxPlayers,
    humanCountPlanned
  );
  if (targetBotCount <= 0) return;

  const totalScored = humansWithScore.length + virtualWithScore.length;
  if (virtualWithScore.length >= targetBotCount && totalScored >= args.def.maxPlayers) {
    return;
  }

  const needBots = targetBotCount - virtualWithScore.length;
  if (needBots <= 0) return;

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
    rankFloors,
    seedBinding: readCasualMatchSeedBinding(matchDoc)!,
    botCount: needBots,
    humanCountPlanned,
  });

  await seedCasualAsyncVirtualOpponentsCore(ctx, {
    templateId: args.templateId,
    runTournamentId: args.runTournamentId,
    matchId: args.matchId,
    matchGameType: gt,
    botFills,
    updatedAt: args.updatedAt,
    replaceAllVirtual: true,
  });

  await patchRanksForAsyncMatch(ctx, {
    matchId: args.matchId,
    def: args.def,
    rankFloors,
    updatedAt: args.updatedAt,
    soloPlan,
    botFills,
  });
}

/** reveal 计划 seed：含再战 epoch + 本次提交时刻，避免同桌榜 bot 分布永远固定 */
export function buildAsyncBotRevealPlanSeedKey(args: {
  templateId: string;
  sessionExternalId: string;
  replayEpoch?: number;
  anchorAt: number;
}): string {
  const re = args.replayEpoch ?? 0;
  return `${args.templateId}|${args.sessionExternalId}|re${re}|t${args.anchorAt}`;
}

async function resolveHumanReplayEpochForMatch(
  ctx: MutationCtx,
  matchId: string
): Promise<number> {
  const rows = await ctx.db
    .query("casual_run_player_matches")
    .withIndex("by_match_uid", (q) => q.eq("matchId", matchId))
    .collect();
  const humans = rows.filter((r) => !isCasualAsyncVirtualOpponentUid(r.uid));
  if (humans.length === 0) return 0;
  return Math.max(0, ...humans.map((h) => h.replayEpoch ?? 0));
}

/** 虚拟 bot 分批入场：写入 revealAt + 注册 scheduler */
export async function installAsyncBotRevealPlan(
  ctx: MutationCtx,
  args: {
    templateId: string;
    matchId: string;
    sessionExternalId: string;
    updatedAt: number;
    planSeedKey?: string;
    /** 真人再次交分时重排 reveal（再战后同桌榜不应沿用旧时间线） */
    forceReplan?: boolean;
  }
): Promise<void> {
  const rows = await ctx.db
    .query("casual_run_player_matches")
    .withIndex("by_match_uid", (q) => q.eq("matchId", args.matchId))
    .collect();
  const virtualRows = rows.filter(
    (r) =>
      isCasualAsyncVirtualOpponentUid(r.uid) &&
      r.score != null &&
      Number.isFinite(r.score)
  );
  if (virtualRows.length === 0) return;
  if (!args.forceReplan && virtualRows.some((r) => r.revealAt != null)) return;

  if (args.forceReplan) {
    for (const row of virtualRows) {
      await ctx.db.patch(row._id, {
        revealAt: undefined,
        botRevealed: undefined,
        updatedAt: args.updatedAt,
      });
    }
  }

  const sessionSeed = hashSessionSeed(
    args.planSeedKey ?? `${args.templateId}|${args.sessionExternalId}`
  );
  const schedule = planBotRevealSchedule({
    virtualUids: virtualRows.map((r) => r.uid),
    sessionSeed,
    now: args.updatedAt,
  });
  const byUid = new Map(virtualRows.map((r) => [r.uid, r]));

  for (const entry of schedule) {
    const row = byUid.get(entry.uid);
    if (!row) continue;
    const patch: {
      revealAt: number;
      updatedAt: number;
      botRevealed?: boolean;
    } = {
      revealAt: entry.revealAt,
      updatedAt: args.updatedAt,
    };
    if (entry.revealAt <= args.updatedAt) {
      patch.botRevealed = true;
    }
    await ctx.db.patch(row._id, patch);

    if (entry.revealAt > args.updatedAt) {
      await ctx.scheduler.runAfter(
        entry.revealAt - args.updatedAt,
        internal.service.tournament.casualRunSettlementFill.fireAsyncBotReveal,
        { playerMatchId: row._id }
      );
    }
  }
}

/** 真人已交分且 bot 已 seed：按本次提交重排 reveal（partial 榜用 Date.now() 实时三态） */
export async function replanAsyncBotRevealOnHumanSubmit(
  ctx: MutationCtx,
  args: {
    templateId: string;
    matchId: string;
    sessionExternalId: string;
    updatedAt: number;
  }
): Promise<boolean> {
  const rows = await ctx.db
    .query("casual_run_player_matches")
    .withIndex("by_match_uid", (q) => q.eq("matchId", args.matchId))
    .collect();
  const hasVirtualScores = rows.some(
    (r) =>
      isCasualAsyncVirtualOpponentUid(r.uid) &&
      r.score != null &&
      Number.isFinite(r.score)
  );
  if (!hasVirtualScores) return false;

  const replayEpoch = await resolveHumanReplayEpochForMatch(ctx, args.matchId);
  await installAsyncBotRevealPlan(ctx, {
    ...args,
    forceReplan: true,
    planSeedKey: buildAsyncBotRevealPlanSeedKey({
      templateId: args.templateId,
      sessionExternalId: args.sessionExternalId,
      replayEpoch,
      anchorAt: args.updatedAt,
    }),
  });
  return true;
}

export const fireAsyncBotReveal = internalMutation({
  args: { playerMatchId: v.id("casual_run_player_matches") },
  handler: async (ctx, { playerMatchId }) => {
    const row = await ctx.db.get(playerMatchId);
    if (!row || !isCasualAsyncVirtualOpponentUid(row.uid)) return;
    if (row.botRevealed === true) return;
    await ctx.db.patch(playerMatchId, {
      botRevealed: true,
      updatedAt: Date.now(),
    });
  },
});

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
    botFills: AsyncBotFill[];
    soloPlan?: { humanUid: string; effectiveRank: number };
    updatedAt: number;
    replaceAllVirtual?: boolean;
  }
): Promise<void> {
  const matchDoc = await ctx.db.get(args.matchId as Id<"casual_run_matches">);
  if (!matchDoc) return;
  const rankFloors = resolveRankFloorsFromMatchDoc(matchDoc, args.def.maxPlayers);
  if (!rankFloors) return;

  await seedCasualAsyncVirtualOpponentsCore(ctx, {
    templateId: args.templateId,
    runTournamentId: args.runTournamentId,
    matchId: args.matchId,
    matchGameType: args.matchGameType,
    botFills: args.botFills,
    updatedAt: args.updatedAt,
    replaceAllVirtual: args.replaceAllVirtual ?? true,
  });
  await patchRanksForAsyncMatch(ctx, {
    matchId: args.matchId,
    def: args.def,
    rankFloors,
    updatedAt: args.updatedAt,
    soloPlan: args.soloPlan,
    botFills: args.botFills,
  });
  if (!matchDoc.botsSeeded) {
    await ctx.db.patch(matchDoc._id, {
      botsSeeded: true,
      updatedAt: args.updatedAt,
    });
  }

  if (args.def.maxPlayers > 1) {
    const replayEpoch = await resolveHumanReplayEpochForMatch(ctx, args.matchId);
    await installAsyncBotRevealPlan(ctx, {
      templateId: args.templateId,
      matchId: args.matchId,
      sessionExternalId: args.sessionExternalId,
      updatedAt: args.updatedAt,
      planSeedKey: buildAsyncBotRevealPlanSeedKey({
        templateId: args.templateId,
        sessionExternalId: args.sessionExternalId,
        replayEpoch,
        anchorAt: args.updatedAt,
      }),
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
  if (args.def.gameType !== "solitaire" || args.botCount <= 0) return false;
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

/** 多人结算：规则引擎 / 中性槽位填 bot，再按本场 quantile floors 定全员名次。 */
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
  const gt = args.def.gameType;
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

  const botCount = casualAsyncVirtualOpponentCount(
    args.def.maxPlayers,
    args.humanCountPlanned
  );
  if (botCount <= 0) return false;

  const matchDoc = await ctx.db.get(args.matchId as Id<"casual_run_matches">);
  if (!matchDoc) return false;
  const seedBinding = readCasualMatchSeedBinding(matchDoc);
  if (!seedBinding) {
    const bindGraceMs = 15_000;
    const tooEarlyForMissingSeed =
      matchDoc.createdAt != null && args.updatedAt - matchDoc.createdAt < bindGraceMs;
    if (!matchDoc.seedResolveError && !tooEarlyForMissingSeed) {
      await ctx.db.patch(matchDoc._id, {
        seedResolveError: "missing_seed_binding",
        updatedAt: args.updatedAt,
      });
    }
    return false;
  }
  const rankFloors = deriveRankScoreFloorsFromQuantiles(
    seedBinding.scoreQuantiles,
    args.def.maxPlayers
  );
  const useRollouts =
    gt === "solitaire" && seedBinding != null;

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

  const { botFills, soloPlan } = await buildBotFillsForAsyncMatch(ctx, {
    def: args.def,
    templateId: args.templateId,
    sessionExternalId: args.sessionExternalId,
    humanRows,
    rankFloors,
    seedBinding,
    botCount,
    humanCountPlanned: args.humanCountPlanned,
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

