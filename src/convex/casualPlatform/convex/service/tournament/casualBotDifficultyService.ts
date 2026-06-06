import {
  findCasualRankRewardEntry,
  getTournamentDefinition,
  getTournamentRankRates,
  type CasualRankRateEntry,
  type CasualTournamentDefinition,
} from "../../data/casualTournamentConfigs";
import {
  BOT_DIFFICULTY_RULES,
  CASUAL_CONSECUTIVE_LOSS_THRESHOLD,
  CASUAL_LOSS_STREAK_LOOKBACK_MAX,
  CASUAL_NEAR_MISS_GAP_RATIO,
  CASUAL_DEFAULT_EFFECTIVE_HUMANS,
  isCasualMultiplayerAsyncTemplate,
  MATCHMAKING_RULES,
  type BotRankDistribution,
  type BotStrategyPlayerContext,
  type CasualGameIdForBot,
  type CasualTableMode,
} from "../../data/casualBotDifficultyConfig";
import type { Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { RUN_PLAYER_TOURNAMENT_COMPLETED } from "./casualTournamentJoinCore";
import { isCasualAsyncVirtualOpponentUid } from "./casualRunSettlementFill";
import type { CasualMatchSeedBinding } from "./casualMatchSeedBinding";
import { loadPlayerTournamentRankCounts } from "./casualPlayerTournamentRankStats";
import {
  CASUAL_RANK_STAT_BUCKET_MAX,
  expandStatBucketToTargetRank,
} from "./casualRankStatBuckets";
import {
  deriveRankScoreFloorsFromQuantiles,
  recommendTargetRankFromQuantileProximity,
  type RankScoreFloorsByRank,
} from "./casualRankQuantiles";

async function activeSeasonId(ctx: QueryCtx | MutationCtx): Promise<string | null> {
  const seasons = await ctx.db.query("casual_seasons").collect();
  const s = seasons.find((r) => r.active) ?? seasons[0];
  return s?.seasonId ?? null;
}

export { CASUAL_NEAR_MISS_GAP_RATIO } from "../../data/casualBotDifficultyConfig";

export function resolveCasualTableMode(humanPlayerCount: number): CasualTableMode {
  return Math.max(1, humanPlayerCount) >= 2 ? "mixed_human" : "solo_bot";
}

/** 该名次是否视为「无奖励失败」（连续失败 streak） */
export function isCasualMultiplayerRankLoss(
  def: CasualTournamentDefinition,
  rank: number
): boolean {
  const rr = findCasualRankRewardEntry(def.rewards.rankRewards, rank);
  if (rr) {
    const seasonPoints = rr.seasonPoints ?? 0;
    const coins = (rr as { coins?: number }).coins ?? 0;
    const gems = rr.gems ?? 0;
    const hasPositiveRankReward = seasonPoints > 0 || coins > 0 || gems > 0;
    return !hasPositiveRankReward;
  }
  const penalty = def.rewards.seasonPointsRankMissPenalty ?? 0;
  return penalty <= 0;
}

export type { RankScoreFloorsByRank } from "./casualRankQuantiles";

export function eligibleMaxRank(
  score: number,
  rankFloors: RankScoreFloorsByRank,
  maxPlayers: number
): number {
  let best = 0;
  for (let r = 1; r <= maxPlayers; r++) {
    const minS = rankFloors[r];
    if (minS != null && score >= minS) best = r;
  }
  return best;
}

export function clampTargetRank(
  targetRank: number,
  humanScore: number,
  rankFloors: RankScoreFloorsByRank,
  maxPlayers: number
): number {
  const cap = eligibleMaxRank(humanScore, rankFloors, maxPlayers);
  if (cap <= 0) return maxPlayers;
  return Math.min(Math.max(1, targetRank), cap);
}

export function evaluateBotDifficultyRulesWithMeta(
  ctx: BotStrategyPlayerContext
): { strategy: BotRankDistribution | null; matchedRuleId: string | null } {
  const sorted = [...BOT_DIFFICULTY_RULES].sort((a, b) => b.priority - a.priority);
  for (const rule of sorted) {
    if (rule.condition(ctx)) {
      return { strategy: rule.strategy, matchedRuleId: rule.id };
    }
  }
  return { strategy: null, matchedRuleId: null };
}

export function evaluateBotDifficultyRules(
  ctx: BotStrategyPlayerContext
): BotRankDistribution | null {
  return evaluateBotDifficultyRulesWithMeta(ctx).strategy;
}

export function buildBalancedRankWeights(args: {
  rankRates: CasualRankRateEntry[];
  rankCounts: Record<number, number>;
}): BotRankDistribution {
  const { rankRates, rankCounts } = args;
  const oddsByRank = new Map<number, number>();
  for (const entry of rankRates) {
    if (
      entry.rank >= 1 &&
      entry.rank <= CASUAL_RANK_STAT_BUCKET_MAX &&
      entry.odd > 0
    ) {
      oddsByRank.set(entry.rank, entry.odd);
    }
  }

  let oddSum = 0;
  for (let r = 1; r <= CASUAL_RANK_STAT_BUCKET_MAX; r++) {
    oddSum += oddsByRank.get(r) ?? 0;
  }
  if (oddSum <= 0) {
    return { weights: { 1: 1 } };
  }

  let total = 0;
  for (let r = 1; r <= CASUAL_RANK_STAT_BUCKET_MAX; r++) {
    total += rankCounts[r] ?? 0;
  }
  const denom = Math.max(total, 1);

  const weights: Record<number, number> = {};
  for (let r = 1; r <= CASUAL_RANK_STAT_BUCKET_MAX; r++) {
    const odd = oddsByRank.get(r) ?? 0;
    if (odd <= 0) continue;
    const targetShare = odd / oddSum;
    const expected = targetShare * denom;
    const deficit = expected - (rankCounts[r] ?? 0);
    weights[r] = Math.max(1, odd * (1 + deficit / denom));
  }
  return { weights };
}

export type SoloRankRecommendSource = "quantile" | "profile" | "rank_rates";

export type SoloRankRecommendResult = {
  targetRank: number;
  effectiveRank: number;
  source: SoloRankRecommendSource;
  matchedRuleId?: string;
};

export async function recommendSoloEffectiveRank(
  ctx: QueryCtx | MutationCtx,
  args: {
    humanScore: number;
    seedBinding: CasualMatchSeedBinding;
    def: CasualTournamentDefinition;
    profile: BotStrategyPlayerContext;
    sessionSeed: number;
    uid: string;
    templateId: string;
  }
): Promise<SoloRankRecommendResult> {
  const { humanScore, seedBinding, def, profile, sessionSeed, uid, templateId } = args;
  const rankFloors = deriveRankScoreFloorsFromQuantiles(
    seedBinding.scoreQuantiles,
    def.maxPlayers
  );
  const p50 = seedBinding.scoreQuantiles.p50;

  let targetRank: number;
  let source: SoloRankRecommendSource;
  let matchedRuleId: string | undefined;

  if (humanScore < p50) {
    targetRank = recommendTargetRankFromQuantileProximity(
      humanScore,
      seedBinding.scoreQuantiles,
      def.maxPlayers
    );
    source = "quantile";
  } else {
    const { strategy, matchedRuleId: ruleId } = evaluateBotDifficultyRulesWithMeta(profile);
    if (strategy != null) {
      targetRank = sampleTargetRank(strategy, def.maxPlayers, sessionSeed);
      source = "profile";
      matchedRuleId = ruleId ?? undefined;
    } else {
      const rankCounts = await loadPlayerTournamentRankCounts(ctx, uid, templateId);
      const balanced = buildBalancedRankWeights({
        rankRates: getTournamentRankRates(def),
        rankCounts,
      });
      const statBucket = sampleTargetRank(
        balanced,
        CASUAL_RANK_STAT_BUCKET_MAX,
        sessionSeed
      );
      targetRank = expandStatBucketToTargetRank(statBucket, def.maxPlayers, sessionSeed);
      source = "rank_rates";
    }
  }

  const effectiveRank = clampTargetRank(targetRank, humanScore, rankFloors, def.maxPlayers);
  return { targetRank, effectiveRank, source, matchedRuleId };
}

export function sampleTargetRank(
  dist: BotRankDistribution | null,
  maxPlayers: number,
  sessionSeed: number
): number {
  if (!dist) return Math.ceil(maxPlayers / 2);
  const weights: Array<{ rank: number; w: number }> = [];
  let total = 0;
  for (let r = 1; r <= maxPlayers; r++) {
    const w = dist.weights[r] ?? 0;
    if (w > 0) {
      weights.push({ rank: r, w });
      total += w;
    }
  }
  if (total <= 0) return 1;
  let x = pseudoUnit(sessionSeed, 17) * total;
  for (const { rank, w } of weights) {
    x -= w;
    if (x <= 0) return rank;
  }
  return weights[weights.length - 1]!.rank;
}

export type RankedEntity = {
  uid: string;
  score: number;
  isBot: boolean;
};

function sortRankedEntitiesByScoreDesc(entities: RankedEntity[]): RankedEntity[] {
  return [...entities].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.uid.localeCompare(b.uid);
  });
}

/** 全部真人低于 rank2 floor → 低档桌（mixed 纯分数序） */
export function isLowTierMixedTable(
  entities: RankedEntity[],
  rankFloors: RankScoreFloorsByRank,
  maxPlayers: number
): boolean {
  const humans = entities.filter((e) => !e.isBot);
  if (humans.length === 0) return false;
  const threshold = maxPlayers >= 2 ? rankFloors[2] : rankFloors[1];
  if (threshold == null || !Number.isFinite(threshold)) return false;
  return humans.every((h) => h.score < threshold);
}

export function assignRanksWithMinScores(args: {
  entities: RankedEntity[];
  rankFloors: RankScoreFloorsByRank;
  maxPlayers: number;
}): Map<string, number> {
  const { entities, rankFloors, maxPlayers } = args;
  const sorted = sortRankedEntitiesByScoreDesc(entities);
  const remaining = new Set<number>();
  for (let r = 1; r <= maxPlayers; r++) remaining.add(r);

  const out = new Map<string, number>();
  for (const e of sorted) {
    const eligible = [...remaining]
      .filter((r) => e.score >= (rankFloors[r] ?? 0))
      .sort((a, b) => a - b);
    const pick = eligible[0] ?? Math.max(...remaining);
    out.set(e.uid, pick);
    remaining.delete(pick);
  }
  return out;
}

/** mixed 统一排位：低档纯分数序；否则 floor 贪心（maxPlayers 2..9） */
export function assignMixedRanks(args: {
  entities: RankedEntity[];
  rankFloors: RankScoreFloorsByRank;
  maxPlayers: number;
}): Map<string, number> {
  const { entities, rankFloors, maxPlayers } = args;
  if (isLowTierMixedTable(entities, rankFloors, maxPlayers)) {
    const sorted = sortRankedEntitiesByScoreDesc(entities);
    const out = new Map<string, number>();
    for (let i = 0; i < sorted.length && i < maxPlayers; i++) {
      out.set(sorted[i]!.uid, i + 1);
    }
    return out;
  }
  return assignRanksWithMinScores(args);
}

function assignHumanRanksForGapSlots(args: {
  humanScores: Array<{ uid: string; score: number }>;
  rankFloors: RankScoreFloorsByRank;
  maxPlayers: number;
}): Map<string, number> {
  const entities: RankedEntity[] = args.humanScores.map((h) => ({
    uid: h.uid,
    score: h.score,
    isBot: false,
  }));
  return assignMixedRanks({
    entities,
    rankFloors: args.rankFloors,
    maxPlayers: args.maxPlayers,
  });
}

function scoreEpsilon(gameType: CasualGameIdForBot): number {
  return gameType === "block_blast" ? 50 : 5;
}

function pseudoUnit(seed: number, i: number): number {
  let x = Math.imul(seed ^ (i * 374761393), 2654435761);
  x ^= x >>> 13;
  x ^= x << 17;
  x ^= x >>> 5;
  return (x >>> 0) / 4294967296;
}

export function scoreForRankSlot(
  low: number,
  high: number,
  botIndex: number,
  seed: number,
  gameType: CasualGameIdForBot
): number {
  const eps = scoreEpsilon(gameType);
  if (high - low <= eps) {
    const mid = low + Math.floor((high - low) * (botIndex % 2 === 0 ? 0.6 : 0.4));
    return Math.max(low + 1, Math.min(mid, high - 1));
  }
  const r = pseudoUnit(seed, botIndex);
  const margin = 0.15;
  return Math.floor(low + (high - low) * (margin + (1 - 2 * margin) * r));
}

type Occupant = { uid: string; score: number; assignedRank: number; isBot: boolean };

function boundsForRankSlot(
  r: number,
  occupants: Occupant[],
  rankFloors: RankScoreFloorsByRank,
  gameType: CasualGameIdForBot
): { low: number; high: number } {
  const eps = scoreEpsilon(gameType);
  let low = rankFloors[r] ?? 0;
  let high = Number.POSITIVE_INFINITY;

  const better = occupants.filter((o) => o.assignedRank < r);
  if (better.length) {
    high = Math.min(...better.map((o) => o.score)) - eps;
  }

  const worse = occupants.filter((o) => o.assignedRank > r);
  if (worse.length) {
    low = Math.max(low, Math.max(...worse.map((o) => o.score)) + eps);
  }

  if (low >= high) {
    high = low + eps;
  }
  return { low, high };
}

export type BotScoreSlot = { rank: number; low: number; high: number };

/** solo：每个 bot 名次槽的分数区间（供 rollouts HTTP 查询） */
export function computeSoloBotScoreSlots(args: {
  humanScore: number;
  effectiveRank: number;
  rankFloors: RankScoreFloorsByRank;
  maxPlayers: number;
  gameType: CasualGameIdForBot;
}): BotScoreSlot[] {
  const { humanScore, effectiveRank, rankFloors, maxPlayers, gameType } = args;
  const eps = scoreEpsilon(gameType);
  const span = gameType === "block_blast" ? 5000 : 500;
  const slots: BotScoreSlot[] = [];
  for (let r = 1; r <= maxPlayers; r++) {
    if (r === effectiveRank) continue;
    const minS = rankFloors[r] ?? 0;
    let low: number;
    let high: number;
    if (r < effectiveRank) {
      low = Math.max(minS, humanScore + eps);
      high = low + Math.max(eps * 20, span);
    } else {
      low = minS;
      high = Math.max(minS + eps, humanScore - eps);
      if (high <= low) high = low + eps;
    }
    slots.push({ rank: r, low, high });
  }
  return slots;
}

/** mixed_human：空名次槽的分数区间 */
export function computeNeutralGapBotScoreSlots(args: {
  humanScores: Array<{ uid: string; score: number }>;
  rankFloors: RankScoreFloorsByRank;
  maxPlayers: number;
  gameType: CasualGameIdForBot;
}): BotScoreSlot[] {
  const { humanScores, rankFloors, maxPlayers, gameType } = args;
  const rankMap = assignHumanRanksForGapSlots({
    humanScores,
    rankFloors,
    maxPlayers,
  });
  const remaining = new Set<number>();
  for (let r = 1; r <= maxPlayers; r++) remaining.add(r);
  const occupants: Occupant[] = [];
  for (const h of humanScores) {
    const pick = rankMap.get(h.uid);
    if (pick == null) continue;
    occupants.push({
      uid: h.uid,
      score: h.score,
      assignedRank: pick,
      isBot: false,
    });
    remaining.delete(pick);
  }
  const slots: BotScoreSlot[] = [];
  for (const r of [...remaining].sort((a, b) => a - b)) {
    const { low, high } = boundsForRankSlot(r, occupants, rankFloors, gameType);
    slots.push({ rank: r, low, high });
  }
  return slots;
}

/** mixed_human：真人先占坑，再为空名次槽生成 bot 分 */
export function generateNeutralGapBotScores(args: {
  humanScores: Array<{ uid: string; score: number }>;
  rankFloors: RankScoreFloorsByRank;
  maxPlayers: number;
  gameType: CasualGameIdForBot;
  sessionSeed: number;
}): Array<{ rank: number; score: number }> {
  const { humanScores, rankFloors, maxPlayers, gameType, sessionSeed } = args;
  const rankMap = assignHumanRanksForGapSlots({
    humanScores,
    rankFloors,
    maxPlayers,
  });
  const occupants: Occupant[] = humanScores
    .filter((h) => rankMap.has(h.uid))
    .map((h) => ({
      uid: h.uid,
      score: h.score,
      assignedRank: rankMap.get(h.uid)!,
      isBot: false,
    }));

  const slots = computeNeutralGapBotScoreSlots({
    humanScores,
    rankFloors,
    maxPlayers,
    gameType,
  });
  const botFills: Array<{ rank: number; score: number }> = [];
  let botIdx = 0;
  for (const slot of slots) {
    const score = scoreForRankSlot(slot.low, slot.high, botIdx, sessionSeed, gameType);
    botFills.push({ rank: slot.rank, score });
    occupants.push({
      uid: `__bot_${slot.rank}`,
      score,
      assignedRank: slot.rank,
      isBot: true,
    });
    botIdx++;
  }
  return botFills;
}

/** solo_bot：为每个非真人名次槽生成分数（优于真人 / 劣于真人），供直接写 rank */
export function generateSoloBotScores(args: {
  humanUid: string;
  humanScore: number;
  effectiveRank: number;
  rankFloors: RankScoreFloorsByRank;
  maxPlayers: number;
  gameType: CasualGameIdForBot;
  sessionSeed: number;
}): Array<{ rank: number; score: number }> {
  const { humanScore, effectiveRank, rankFloors, maxPlayers, gameType, sessionSeed } =
    args;

  const slots = computeSoloBotScoreSlots({
    humanScore,
    effectiveRank,
    rankFloors,
    maxPlayers,
    gameType,
  });
  const fills: Array<{ rank: number; score: number }> = [];
  let botIdx = 0;
  for (const slot of slots) {
    const score = scoreForRankSlot(slot.low, slot.high, botIdx, sessionSeed, gameType);
    fills.push({ rank: slot.rank, score });
    botIdx++;
  }
  return fills;
}

/** solo 桌按规划名次写 rank（勿用 assignRanksWithMinScores，否则会挤掉前排 bot） */
export function buildSoloTableRankMap(args: {
  humanUid: string;
  effectiveRank: number;
  botFills: Array<{ rank: number }>;
  botUidForSlot: (slotRank: number) => string;
}): Map<string, number> {
  const out = new Map<string, number>();
  out.set(args.humanUid, args.effectiveRank);
  for (const fill of args.botFills) {
    out.set(args.botUidForSlot(fill.rank), fill.rank);
  }
  return out;
}

export function hashSessionSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export async function computeConsecutiveLossStreak(
  ctx: QueryCtx,
  uid: string
): Promise<number> {
  const rows = await ctx.db
    .query("casual_run_player_matches")
    .withIndex("by_uid", (q) => q.eq("uid", uid))
    .collect();

  const settled = rows
    .filter((r) => r.status === "settled" && r.rank != null && !isCasualAsyncVirtualOpponentUid(r.uid))
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, CASUAL_LOSS_STREAK_LOOKBACK_MAX);

  let streak = 0;
  for (const row of settled) {
    const def = getTournamentDefinition(row.templateId);
    if (!def || !isCasualMultiplayerAsyncTemplate(def)) continue;
    const rank = row.rank as number;
    if (!isCasualMultiplayerRankLoss(def, rank)) break;
    streak++;
  }
  return streak;
}

export async function resolvePlayerBotStrategyContext(
  ctx: QueryCtx,
  args: {
    uid: string;
    templateId: string;
    def: CasualTournamentDefinition;
  }
): Promise<BotStrategyPlayerContext> {
  const { uid, templateId, def } = args;
  const gameId =
    def.gameId === "block_blast" || def.gameId === "solitaire"
      ? def.gameId
      : "solitaire";

  let seasonLadderPoints = 0;
  const seasonId = await activeSeasonId(ctx);
  if (seasonId) {
    const ladder = await ctx.db
      .query("casual_player_season_ladder")
      .withIndex("by_season_uid", (q) => q.eq("seasonId", seasonId).eq("uid", uid))
      .unique();
    seasonLadderPoints = ladder?.points ?? 0;
  }

  const player = await ctx.db
    .query("casual_players")
    .withIndex("by_uid", (q) => q.eq("uid", uid))
    .unique();

  let passLevel = 0;
  let passTrack: BotStrategyPlayerContext["passTrack"] = "none";
  if (seasonId) {
    const pass = await ctx.db
      .query("casual_pass_progress")
      .withIndex("by_uid_season", (q) => q.eq("uid", uid).eq("seasonId", seasonId))
      .unique();
    passLevel = pass?.level ?? 0;
    if (pass?.tracksPurchased?.deluxe) passTrack = "deluxe";
    else if (pass?.tracksPurchased?.standard) passTrack = "standard";
  }

  const ptRows = await ctx.db
    .query("casual_run_player_tournaments")
    .withIndex("by_uid_template", (q) => q.eq("uid", uid))
    .collect();
  let completedMultiplayerMatches = 0;
  for (const pt of ptRows) {
    const d = getTournamentDefinition(pt.templateId);
    if (d && isCasualMultiplayerAsyncTemplate(d) && pt.status === RUN_PLAYER_TOURNAMENT_COMPLETED) {
      completedMultiplayerMatches++;
    }
  }

  const matchRows = await ctx.db
    .query("casual_run_player_matches")
    .withIndex("by_uid", (q) => q.eq("uid", uid))
    .collect();
  const humanSettled = matchRows
    .filter((r) => r.status === "settled" && !isCasualAsyncVirtualOpponentUid(r.uid))
    .sort((a, b) => b.updatedAt - a.updatedAt);
  const last = humanSettled[0];
  const daysSinceLastMatch = last
    ? Math.floor((Date.now() - last.updatedAt) / (24 * 60 * 60 * 1000))
    : 999;

  const consecutiveLossStreak = await computeConsecutiveLossStreak(ctx, uid);

  return {
    uid,
    tournamentId: templateId,
    templateId,
    matchType: def.matchType,
    gameId,
    maxPlayers: def.maxPlayers,
    seasonLadderPoints,
    completedMultiplayerMatches,
    coinsBalance: player?.coins ?? 0,
    daysSinceLastMatch,
    passLevel,
    passTrack,
    consecutiveLossStreak,
  };
}

export function isNearMissTableSummary(
  summary: { rows: Array<{ rank: number; score: number; isYou: boolean }> } | null | undefined
): boolean {
  if (!summary?.rows?.length) return false;
  const you = summary.rows.find((r) => r.isYou);
  const first = summary.rows.find((r) => r.rank === 1);
  if (!you || !first || you.rank === 1) return false;
  if (first.score <= 0) return false;
  const gap = (first.score - you.score) / first.score;
  return gap >= 0 && gap <= CASUAL_NEAR_MISS_GAP_RATIO;
}

/** join 时按玩家画像决定开桌所需真人数（MATCHMAKING_RULES；未命中 → default） */
export function evaluateEffectiveHumans(
  ctx: BotStrategyPlayerContext,
  def: CasualTournamentDefinition
): { effectiveHumans: number; matchedRuleId: string | null } {
  const cap = Math.max(1, def.maxPlayers);
  const sorted = [...MATCHMAKING_RULES].sort((a, b) => b.priority - a.priority);
  for (const rule of sorted) {
    if (!rule.condition(ctx)) continue;
    const effective = Math.min(cap, Math.max(1, rule.effectiveHumans));
    return { effectiveHumans: effective, matchedRuleId: rule.id };
  }
  const effective = Math.min(cap, Math.max(1, CASUAL_DEFAULT_EFFECTIVE_HUMANS));
  return { effectiveHumans: effective, matchedRuleId: "default" };
}

/** @deprecated 使用 evaluateEffectiveHumans */
export function evaluateEffectiveMatchmakingMinHumans(
  ctx: BotStrategyPlayerContext,
  def: CasualTournamentDefinition
): { effectiveHumans: number; matchedRuleId: string | null } {
  return evaluateEffectiveHumans(ctx, def);
}

/** join 画像规则评估结果（Convex dashboard / `npx convex dev` 日志） */
export function logJoinMatchmakingProfileResult(args: {
  uid: string;
  templateId: string;
  profile: BotStrategyPlayerContext;
  effectiveHumans: number;
  matchedRuleId: string | null;
  source: "enqueue" | "existing_open";
}): void {
  const { uid, templateId, profile, effectiveHumans, matchedRuleId, source } = args;
  console.log(
    "[casual][join-matchmaking]",
    JSON.stringify({
      source,
      uid,
      templateId,
      matchType: profile.matchType,
      maxPlayers: profile.maxPlayers,
      profile: {
        seasonLadderPoints: profile.seasonLadderPoints,
        completedMultiplayerMatches: profile.completedMultiplayerMatches,
        coinsBalance: profile.coinsBalance,
        daysSinceLastMatch: profile.daysSinceLastMatch,
        passLevel: profile.passLevel,
        passTrack: profile.passTrack,
        consecutiveLossStreak: profile.consecutiveLossStreak,
      },
      result: {
        effectiveHumans,
        matchedRuleId,
        waitingForPeer: effectiveHumans > 1,
      },
    })
  );
}

export async function countUnusedReplayTokens(ctx: QueryCtx, uid: string): Promise<number> {
  const rows = await ctx.db
    .query("casual_replay_tokens")
    .withIndex("by_uid", (q) => q.eq("uid", uid))
    .collect();
  return rows.filter((r) => r.usedAt == null).length;
}

export async function consumeReplayToken(
  ctx: MutationCtx,
  args: { uid: string; tokenId: Id<"casual_replay_tokens">; tournamentId: string }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const row = await ctx.db.get(args.tokenId);
  if (!row || row.uid !== args.uid) return { ok: false, error: "token_invalid" };
  if (row.usedAt != null) return { ok: false, error: "token_used" };
  await ctx.db.patch(args.tokenId, {
    usedAt: Date.now(),
    usedForTournamentId: args.tournamentId,
  });
  return { ok: true };
}

export async function grantReplayTokens(
  ctx: MutationCtx,
  uid: string,
  count: number
): Promise<void> {
  const n = Math.min(Math.max(count, 0), 50);
  const now = Date.now();
  for (let i = 0; i < n; i++) {
    await ctx.db.insert("casual_replay_tokens", {
      uid,
      createdAt: now,
    });
  }
}
