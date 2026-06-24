import type {
  CasualPlatformRewardConfig,
  CasualRankRewardEntry,
  CasualScoreTierRewardEntry,
} from "./casualTournamentRewardTypes";
import { isCasualGameLobbyVisible } from "./casualGameRegistry";

export type {
  CasualPlatformRewardConfig,
  CasualRankRewardEntry,
  CasualScoreTierRewardEntry,
  CasualScoreTierRewardsGrantTiming
} from "./casualTournamentRewardTypes";

/** 静态锦标配置；join / submit 结算与 DB 种子共用 */

export type EntryCost =
  | { kind: "none" }
  | { kind: "coins"; amount: number }
  | { kind: "gems"; amount: number }
  /** 赛季专场入场：与同模板异步匹配，`joinTournament` 入队后扣 `seasonVouchers`（活动修正见 join） */
  | { kind: "seasonVouchers"; amount: number };

export type CasualInstanceScope = "single_match" | "daily" | "weekly" | "season";
export type CasualScoreAggregation = "single_match" | "best_score" | "sum_scores";
export type CasualEntryBilling = "per_match" | "per_instance";

/** 与 seedBinding.scoreQuantiles 同构；Block Blast 静态 bind 用 */
export type CasualReferenceScoreQuantiles = {
  p10: number;
  p25: number;
  p30: number;
  p33: number;
  p50: number;
  p66: number;
  p70: number;
  p75: number;
  p90: number;
};

export type CasualRankRateEntry = { rank: number; odd: number };

/** seed 动态分位达标奖励：本局分数 >= 该 seed `scoreQuantiles[quantile]` 时额外发放 */
export type CasualSeedQuantileSuccessReward = {
  quantile: "p75";
  coins?: number;
  gems?: number;
};

/** 异步 A/B/C 分位奖：阈值取自 seed / 参考分位，奖励额固定 */
export type CasualScoreTierQuantileSpec = {
  quantile: keyof CasualReferenceScoreQuantiles;
  coins?: number;
  gems?: number;
};

export interface CasualTournamentDefinition {
  tournamentId: string;
  title: string;
  gameType: string;
  matchType:
    | "tournament_a"
    | "tournament_b"
    | "tournament_c"
    | "triathlon_a"
    | "triathlon_b"
    | "triathlon_c"
    | "season_challenge"
    | "solo_p75_challenge";
  status: string;
  /** 有序玩法列表；缺省视为 `[gameType]`（单局） */
  gameSequence?: string[];
  /** 多局总分聚合；缺省 raw_sum */
  sessionScoreMode?: "raw_sum" | "normalized_percentile";
  /** 周期桶；缺省 `single_match` 与现网一致 */
  instanceScope?: CasualInstanceScope;
  /** 周期榜聚合；缺省 `single_match` */
  scoreAggregation?: CasualScoreAggregation;
  /** 入场扣费：按局或按周期实例首局；缺省 `per_match` */
  entryBilling?: CasualEntryBilling;
  /** 日/周界：`UTC` 或 `Asia/Shanghai`（与任务运营周期一致）；缺省 UTC */
  instanceTimezone?: string;
  /** 单场容量上限（真人 + 机器人合计）；机器人数量 = maxPlayers - 本场真人开局数 */
  maxPlayers: number;
  entry: EntryCost;
  /** 与 TacticalMonster 锦标赛 `RewardConfig` 同构；休闲扩展见 `CasualPlatformRewardConfig` */
  rewards: CasualPlatformRewardConfig;
  /** 每场结算固定 Pass XP（对局 + 任务共同喂满 Pass；见 casualSeasonEconomyConstants） */
  seasonXpOnSettle: number;
  /** 真 · 专场可不展示异步排行榜（仍写入 score 供运营/扩展） */
  hideLeaderboard?: boolean;
  /** 日榜单人挑战等：仅 Play 专区入口，不出现在多人竞技列表 */
  omitFromPlayLobby?: boolean;
  /** score >= p50 且画像权重为空时，与 DB 名次累计（1–4 档）平衡后抽样；缺省见 CASUAL_RANK_RATES_4B */
  rankRates?: CasualRankRateEntry[];
  /** Block Blast 等无 pool 时开桌 bind 写入 seedBinding 的静态分位 */
  referenceScoreQuantiles?: CasualReferenceScoreQuantiles;
  /**
   * 单人 p75 挑战：本局分数 >= 该 seed `scoreQuantiles[quantile]` 视为成功，额外发放此奖励。
   * 阈值由游戏服交分时按 seed 解析后经 `seedScoreThreshold` 带入结算。
   */
  seedQuantileSuccess?: CasualSeedQuantileSuccessReward;
}

/** @deprecated 日榜已下线；仅历史 run / 回放解析保留 ID */
export const CASUAL_DAILY_SOLO_CHALLENGE_SOLITAIRE_ID =
  "casual_daily_solo_challenge_solitaire" as const;
/** @deprecated 日榜已下线 */
export const CASUAL_DAILY_SOLO_CHALLENGE_BLOCK_BLAST_ID =
  "casual_daily_solo_challenge_block_blast" as const;
/** @deprecated 日榜已下线 */
export const CASUAL_DAILY_SOLO_CHALLENGE_TOWER_ARENA_ID =
  "casual_daily_solo_challenge_tower_arena" as const;
/** @deprecated 日榜已下线 */
export const CASUAL_DAILY_SOLO_CHALLENGE_MATCH_3_ID =
  "casual_daily_solo_challenge_match_3" as const;

/** Play「p75 单人挑战」（非周期、单人无 bot；达 seed p75 发成功奖）· 四玩法 */
export const CASUAL_SOLO_P75_CHALLENGE_SOLITAIRE_ID = "casual_solo_p75_solitaire" as const;
export const CASUAL_SOLO_P75_CHALLENGE_BLOCK_BLAST_ID = "casual_solo_p75_block_blast" as const;
export const CASUAL_SOLO_P75_CHALLENGE_MATCH_3_ID = "casual_solo_p75_match_3" as const;
export const CASUAL_SOLO_P75_CHALLENGE_TOWER_ARENA_ID = "casual_solo_p75_tower_arena" as const;
export const CASUAL_SOLO_P75_CHALLENGE_YATZ_ID = "casual_solo_p75_yatz" as const;

export function effectiveInstanceScope(def: CasualTournamentDefinition): CasualInstanceScope {
  return def.instanceScope ?? "single_match";
}

export function effectiveScoreAggregation(def: CasualTournamentDefinition): CasualScoreAggregation {
  return def.scoreAggregation ?? "single_match";
}

export function effectiveEntryBilling(def: CasualTournamentDefinition): CasualEntryBilling {
  return def.entryBilling ?? "per_match";
}

export function findCasualRankRewardEntry(
  rankRewards: CasualRankRewardEntry[] | undefined,
  rank: number
): CasualRankRewardEntry | undefined {
  if (!rankRewards?.length) return undefined;
  return rankRewards.find((rw) => {
    const [minR, maxR] = rw.rankRange;
    return rank >= minR && rank <= maxR;
  });
}

/**
 * 单场（single_match）分位奖：按本局终分命中「最高满足档」（`minScore` 从高到低首个 `score >= minScore`）。
 * 与周期实例 `findScoreTierRewardEntry` 同语义；供 `applyCasualTemplateScoreEffects` 每局结算调用。
 */
export function findHighestScoreTierReward(
  tiers: CasualScoreTierRewardEntry[] | undefined,
  score: number
): CasualScoreTierRewardEntry | undefined {
  if (!tiers?.length) return undefined;
  const sorted = [...tiers].sort((a, b) => b.minScore - a.minScore);
  return sorted.find((t) => score >= t.minScore);
}

const CASUAL_ASYNC_SCORE_TIER_SPEC_A: CasualScoreTierQuantileSpec[] = [
  { quantile: "p63", coins: 3 },
  { quantile: "p66", coins: 16 },
  { quantile: "p90", coins: 30 },
];
const CASUAL_ASYNC_SCORE_TIER_SPEC_B: CasualScoreTierQuantileSpec[] = [
  { quantile: "p33", coins: 10 },
  { quantile: "p66", coins: 24 },
  { quantile: "p90", coins: 50 },
];
const CASUAL_ASYNC_SCORE_TIER_SPEC_C: CasualScoreTierQuantileSpec[] = [
  { quantile: "p33", gems: 2 },
  { quantile: "p66", gems: 4 },
  { quantile: "p90", gems: 6 },
];

export function buildScoreTierRewardsFromQuantiles(
  quantiles: CasualReferenceScoreQuantiles,
  spec: CasualScoreTierQuantileSpec[]
): CasualScoreTierRewardEntry[] {
  return spec
    .map((s) => ({
      minScore: quantiles[s.quantile],
      ...(s.coins != null ? { coins: s.coins } : {}),
      ...(s.gems != null ? { gems: s.gems } : {}),
    }))
    .filter((t) => Number.isFinite(t.minScore) && t.minScore > 0);
}

function scoreTierQuantileSpecForMatchType(
  matchType: CasualTournamentDefinition["matchType"]
): CasualScoreTierQuantileSpec[] | undefined {
  switch (matchType) {
    case "tournament_a":
      return CASUAL_ASYNC_SCORE_TIER_SPEC_A;
    case "tournament_b":
      return CASUAL_ASYNC_SCORE_TIER_SPEC_B;
    case "tournament_c":
      return CASUAL_ASYNC_SCORE_TIER_SPEC_C;
    default:
      return undefined;
  }
}

/** 结算分位奖：优先 seed 分位，其次配表 `referenceScoreQuantiles`；仅命中最高一档。 */
export function resolveAsyncScoreTierRewards(
  def: CasualTournamentDefinition,
  quantiles?: CasualReferenceScoreQuantiles | null
): CasualScoreTierRewardEntry[] | undefined {
  const spec = scoreTierQuantileSpecForMatchType(def.matchType);
  const q = quantiles ?? def.referenceScoreQuantiles;
  if (spec && q) {
    return buildScoreTierRewardsFromQuantiles(q, spec);
  }
  return def.rewards.scoreTierRewards;
}

function asyncScoreTiersFromReference(
  matchType: "tournament_a" | "tournament_b" | "tournament_c",
  quantiles: CasualReferenceScoreQuantiles
): CasualScoreTierRewardEntry[] {
  const spec = scoreTierQuantileSpecForMatchType(matchType)!;
  return buildScoreTierRewardsFromQuantiles(quantiles, spec);
}

export function isPeriodScopedTournament(def: CasualTournamentDefinition): boolean {
  return effectiveInstanceScope(def) !== "single_match";
}

const DEPRECATED_DAILY_SOLO_TEMPLATE_IDS: ReadonlySet<string> = new Set([
  CASUAL_DAILY_SOLO_CHALLENGE_SOLITAIRE_ID,
  CASUAL_DAILY_SOLO_CHALLENGE_BLOCK_BLAST_ID,
  CASUAL_DAILY_SOLO_CHALLENGE_TOWER_ARENA_ID,
  CASUAL_DAILY_SOLO_CHALLENGE_MATCH_3_ID,
]);

/** 已下线的四玩法 UTC 日榜；不可 join，仅 `getTournamentDefinition` 供历史 run 解析。 */
export function isDeprecatedDailySoloTournament(tournamentId: string): boolean {
  return DEPRECATED_DAILY_SOLO_TEMPLATE_IDS.has(tournamentId);
}

export function isJoinableCasualTournament(def: CasualTournamentDefinition): boolean {
  if (isDeprecatedDailySoloTournament(def.tournamentId)) return false;
  return def.status === "open";
}

/** 结算时「参与即得」金币（当前取自 `rewards.baseRewards.coins`） */
export function casualSettleBaseCoins(def: CasualTournamentDefinition): number {
  return Math.max(0, def.rewards.baseRewards.coins ?? 0);
}

/** 结算时「参与即得」钻石（`baseRewards.gems`，休闲扩展字段） */
export function casualSettleBaseGems(def: CasualTournamentDefinition): number {
  return Math.max(0, def.rewards.baseRewards.gems ?? 0);
}

/** Block Blast 赛季专场 tournamentId */
export const CASUAL_SEASON_CHALLENGE_BB_TOURNAMENT_ID = "season_challenge_bb_1";
/** Solitaire 赛季专场 tournamentId */
export const CASUAL_SEASON_CHALLENGE_SOLITAIRE_ID = "season_challenge_solitaire_1";
/** Match-3 赛季专场 tournamentId */
export const CASUAL_SEASON_CHALLENGE_MATCH_3_ID = "season_challenge_match_3_1";
/** Tower Arena 赛季专场 tournamentId */
export const CASUAL_SEASON_CHALLENGE_TOWER_ARENA_ID = "season_challenge_tower_arena_1";
export const CASUAL_SEASON_CHALLENGE_YATZ_ID = "season_challenge_yatz_1";

/** 通用：`floor(base * multiplier + delta)`，下限 0（入场券 / Pass XP / 金币钻扣除共用） */
export function applyScaledCurrencyCost(base: number, multiplier: number, delta: number): number {
  const n = Math.floor(base * multiplier + delta);
  return Math.max(0, n);
}

export function applyVoucherCost(base: number, multiplier: number, delta: number): number {
  return applyScaledCurrencyCost(base, multiplier, delta);
}

export function applyPassXpFromModifiers(base: number, multiplier: number, delta: number): number {
  return applyScaledCurrencyCost(base, multiplier, delta);
}

/**
 * 专场 / 异步 A/B/C 钱包结算仅看 baseRewards + scoreTierRewards（无 rankRewards.seasonPoints）。
 * 分位阈值：本局 seed `scoreQuantiles`（或 BB 参考分位）的 p33 / p66 / p90；仅命中最高一档。
 */

const CASUAL_RANK_RATES_4B = [
  { rank: 1, odd: 35 },
  { rank: 2, odd: 30 },
  { rank: 3, odd: 20 },
  { rank: 4, odd: 15 },
] as const satisfies readonly CasualRankRateEntry[];

export { CASUAL_RANK_RATES_4B };

export function getTournamentRankRates(_def?: CasualTournamentDefinition): CasualRankRateEntry[] {
  return [...CASUAL_RANK_RATES_4B];
}

/** v3 池 burst 计分 rollout 分位（easy tier，2026-06 regen） */
const CASUAL_BB_QUANTILES_A: CasualReferenceScoreQuantiles = {
  p10: 24,
  p25: 48,
  p30: 64,
  p33: 72,
  p50: 104,
  p66: 152,
  p70: 168,
  p75: 203,
  p90: 304,
};
const CASUAL_BB_QUANTILES_B: CasualReferenceScoreQuantiles = {
  p10: 16,
  p25: 40,
  p30: 48,
  p33: 56,
  p50: 80,
  p66: 120,
  p70: 139,
  p75: 168,
  p90: 307,
};
const CASUAL_BB_QUANTILES_C: CasualReferenceScoreQuantiles = {
  p10: 16,
  p25: 24,
  p30: 32,
  p33: 32,
  p50: 56,
  p66: 96,
  p70: 120,
  p75: 155,
  p90: 307,
};
const CASUAL_BB_QUANTILES_SEASON_4P: CasualReferenceScoreQuantiles = {
  p10: 16,
  p25: 32,
  p30: 40,
  p33: 48,
  p50: 80,
  p66: 128,
  p70: 144,
  p75: 176,
  p90: 307,
};

/** Play 异步 A/B/C：`maxPlayers` 3 / 4 / 5；钱包=底奖+分位奖；League XP 按名次（见 weeklyLeague）。 */
const TOURNAMENT_DEFS: CasualTournamentDefinition[] = [
  {
    tournamentId: "casual_async_a_bb",
    title: "A · Block Blast (金币入门)",
    gameType: "block_blast",
    matchType: "tournament_a",
    status: "open",
    maxPlayers: 3,
    entry: { kind: "coins", amount: 70 },
    rewards: {
      type: "by_rank",
      baseRewards: { coins: 36, gems: 0 },
      scoreTierRewards: asyncScoreTiersFromReference("tournament_a", CASUAL_BB_QUANTILES_A),
    },
    seasonXpOnSettle: 4,
    referenceScoreQuantiles: CASUAL_BB_QUANTILES_A,
  },
  {
    tournamentId: "casual_async_b_bb",
    title: "B · Block Blast (coins in / pool)",
    gameType: "block_blast",
    matchType: "tournament_b",
    status: "open",
    maxPlayers: 4,
    entry: { kind: "coins", amount: 90 },
    rewards: {
      type: "by_rank",
      baseRewards: { coins: 103, gems: 0 },
      scoreTierRewards: asyncScoreTiersFromReference("tournament_b", CASUAL_BB_QUANTILES_B),
    },
    seasonXpOnSettle: 5,
    referenceScoreQuantiles: CASUAL_BB_QUANTILES_B,
  },
  {
    tournamentId: "casual_async_c_bb",
    title: "C · Block Blast (gems in / pool)",
    gameType: "block_blast",
    matchType: "tournament_c",
    status: "open",
    maxPlayers: 5,
    entry: { kind: "gems", amount: 24 },
    rewards: {
      type: "by_rank",
      baseRewards: { coins: 0, gems: 24 },
      scoreTierRewards: asyncScoreTiersFromReference("tournament_c", CASUAL_BB_QUANTILES_C),
    },
    seasonXpOnSettle: 8,
    referenceScoreQuantiles: CASUAL_BB_QUANTILES_C,
  },
  {
    tournamentId: "casual_async_a_solitaire",
    title: "A · Solitaire (金币入门)",
    gameType: "solitaire",
    matchType: "tournament_a",
    status: "open",
    maxPlayers: 3,
    entry: { kind: "coins", amount: 70 },
    rewards: {
      type: "by_rank",
      baseRewards: { coins: 36, gems: 0 },
    },
    seasonXpOnSettle: 4,
  },
  {
    tournamentId: "casual_async_b_solitaire",
    title: "B · Solitaire (coins in / pool)",
    gameType: "solitaire",
    matchType: "tournament_b",
    status: "open",
    maxPlayers: 4,
    entry: { kind: "coins", amount: 90 },
    rewards: {
      type: "by_rank",
      baseRewards: { coins: 103, gems: 0 },
    },
    seasonXpOnSettle: 5,
  },
  {
    tournamentId: "casual_async_c_solitaire",
    title: "C · Solitaire (gems in / pool)",
    gameType: "solitaire",
    matchType: "tournament_c",
    status: "open",
    maxPlayers: 5,
    entry: { kind: "gems", amount: 24 },
    rewards: {
      type: "by_rank",
      baseRewards: { coins: 0, gems: 24 },
    },
    seasonXpOnSettle: 8,
  },
  {
    tournamentId: "casual_async_a_match_3",
    title: "A · Match-3 (金币入门)",
    gameType: "match_3",
    matchType: "tournament_a",
    status: "open",
    maxPlayers: 3,
    entry: { kind: "coins", amount: 70 },
    rewards: {
      type: "by_rank",
      baseRewards: { coins: 36, gems: 0 },
    },
    seasonXpOnSettle: 4,
  },
  {
    tournamentId: "casual_async_b_match_3",
    title: "B · Match-3 (coins in / pool)",
    gameType: "match_3",
    matchType: "tournament_b",
    status: "open",
    maxPlayers: 4,
    entry: { kind: "coins", amount: 90 },
    rewards: {
      type: "by_rank",
      baseRewards: { coins: 103, gems: 0 },
    },
    seasonXpOnSettle: 5,
  },
  {
    tournamentId: "casual_async_c_match_3",
    title: "C · Match-3 (gems in / pool)",
    gameType: "match_3",
    matchType: "tournament_c",
    status: "open",
    maxPlayers: 5,
    entry: { kind: "gems", amount: 24 },
    rewards: {
      type: "by_rank",
      baseRewards: { coins: 0, gems: 24 },
    },
    seasonXpOnSettle: 8,
  },
  {
    tournamentId: "casual_async_a_yatz",
    title: "A · Yatz (金币入门)",
    gameType: "yatz",
    matchType: "tournament_a",
    status: "open",
    maxPlayers: 3,
    entry: { kind: "coins", amount: 70 },
    rewards: {
      type: "by_rank",
      baseRewards: { coins: 36, gems: 0 },
    },
    seasonXpOnSettle: 4,
  },
  {
    tournamentId: "casual_async_b_yatz",
    title: "B · Yatz (coins in / pool)",
    gameType: "yatz",
    matchType: "tournament_b",
    status: "open",
    maxPlayers: 4,
    entry: { kind: "coins", amount: 90 },
    rewards: {
      type: "by_rank",
      baseRewards: { coins: 103, gems: 0 },
    },
    seasonXpOnSettle: 5,
  },
  {
    tournamentId: "casual_async_c_yatz",
    title: "C · Yatz (gems in / pool)",
    gameType: "yatz",
    matchType: "tournament_c",
    status: "open",
    maxPlayers: 5,
    entry: { kind: "gems", amount: 24 },
    rewards: {
      type: "by_rank",
      baseRewards: { coins: 0, gems: 24 },
    },
    seasonXpOnSettle: 8,
  },
  {
    tournamentId: "casual_async_a_tower_arena",
    title: "A · Tower Defense (金币入门)",
    gameType: "tower_arena",
    matchType: "tournament_a",
    status: "open",
    maxPlayers: 3,
    entry: { kind: "coins", amount: 70 },
    rewards: {
      type: "by_rank",
      baseRewards: { coins: 36, gems: 0 },
    },
    seasonXpOnSettle: 4,
  },
  {
    tournamentId: "casual_async_b_tower_arena",
    title: "B · Tower Defense (coins in / pool)",
    gameType: "tower_arena",
    matchType: "tournament_b",
    status: "open",
    maxPlayers: 4,
    entry: { kind: "coins", amount: 90 },
    rewards: {
      type: "by_rank",
      baseRewards: { coins: 103, gems: 0 },
    },
    seasonXpOnSettle: 5,
  },
  {
    tournamentId: "casual_async_c_tower_arena",
    title: "C · Tower Defense (gems in / pool)",
    gameType: "tower_arena",
    matchType: "tournament_c",
    status: "open",
    maxPlayers: 5,
    entry: { kind: "gems", amount: 24 },
    rewards: {
      type: "by_rank",
      baseRewards: { coins: 0, gems: 24 },
    },
    seasonXpOnSettle: 8,
  },
  /** p75 单人挑战：非周期、单人无 bot；本局分数 >= 该 seed p75 视为成功，发参与奖 + 成功奖 */
  {
    tournamentId: CASUAL_SOLO_P75_CHALLENGE_SOLITAIRE_ID,
    title: "p75 挑战 · Solitaire",
    gameType: "solitaire",
    matchType: "solo_p75_challenge",
    status: "open",
    maxPlayers: 1,
    entry: { kind: "none" },
    rewards: {
      type: "by_performance",
      baseRewards: { coins: 2, gems: 0 },
    },
    seedQuantileSuccess: { quantile: "p75", coins: 16 },
    seasonXpOnSettle: 2,
  },
  {
    tournamentId: CASUAL_SOLO_P75_CHALLENGE_BLOCK_BLAST_ID,
    title: "p75 挑战 · Block Blast",
    gameType: "block_blast",
    matchType: "solo_p75_challenge",
    status: "open",
    maxPlayers: 1,
    entry: { kind: "none" },
    rewards: {
      type: "by_performance",
      baseRewards: { coins: 2, gems: 0 },
    },
    seedQuantileSuccess: { quantile: "p75", coins: 16 },
    seasonXpOnSettle: 2,
  },
  {
    tournamentId: CASUAL_SOLO_P75_CHALLENGE_MATCH_3_ID,
    title: "p75 挑战 · Match-3",
    gameType: "match_3",
    matchType: "solo_p75_challenge",
    status: "open",
    maxPlayers: 1,
    entry: { kind: "none" },
    rewards: {
      type: "by_performance",
      baseRewards: { coins: 2, gems: 0 },
    },
    seedQuantileSuccess: { quantile: "p75", coins: 16 },
    seasonXpOnSettle: 2,
  },
  {
    tournamentId: CASUAL_SOLO_P75_CHALLENGE_TOWER_ARENA_ID,
    title: "p75 挑战 · Tower Defense",
    gameType: "tower_arena",
    matchType: "solo_p75_challenge",
    status: "open",
    maxPlayers: 1,
    entry: { kind: "none" },
    rewards: {
      type: "by_performance",
      baseRewards: { coins: 2, gems: 0 },
    },
    seedQuantileSuccess: { quantile: "p75", coins: 16 },
    seasonXpOnSettle: 2,
  },
  {
    tournamentId: CASUAL_SOLO_P75_CHALLENGE_YATZ_ID,
    title: "p75 挑战 · Yatz",
    gameType: "yatz",
    matchType: "solo_p75_challenge",
    status: "open",
    maxPlayers: 1,
    entry: { kind: "none" },
    rewards: {
      type: "by_performance",
      baseRewards: { coins: 2, gems: 0 },
    },
    seedQuantileSuccess: { quantile: "p75", coins: 16 },
    seasonXpOnSettle: 2,
  },
  /** 赛季专场：赛季券入场、异步 4 人桌；零钱包，专产 Pass + League XP */
  {
    tournamentId: CASUAL_SEASON_CHALLENGE_BB_TOURNAMENT_ID,
    title: "专场对局 · Block Blast",
    gameType: "block_blast",
    matchType: "season_challenge",
    status: "open",
    maxPlayers: 4,
    entry: { kind: "seasonVouchers", amount: 3 },
    rewards: {
      type: "by_rank",
      baseRewards: { coins: 0, gems: 0 },
    },
    seasonXpOnSettle: 14,
    hideLeaderboard: true,
    referenceScoreQuantiles: CASUAL_BB_QUANTILES_SEASON_4P,
  },
  {
    tournamentId: CASUAL_SEASON_CHALLENGE_SOLITAIRE_ID,
    title: "专场对局 · Solitaire",
    gameType: "solitaire",
    matchType: "season_challenge",
    status: "open",
    maxPlayers: 4,
    entry: { kind: "seasonVouchers", amount: 3 },
    rewards: {
      type: "by_rank",
      baseRewards: { coins: 0, gems: 0 },
    },
    seasonXpOnSettle: 14,
    hideLeaderboard: true,
  },
  {
    tournamentId: CASUAL_SEASON_CHALLENGE_TOWER_ARENA_ID,
    title: "专场对局 · Tower Defense",
    gameType: "tower_arena",
    matchType: "season_challenge",
    status: "open",
    maxPlayers: 4,
    entry: { kind: "seasonVouchers", amount: 3 },
    rewards: {
      type: "by_rank",
      baseRewards: { coins: 0, gems: 0 },
    },
    seasonXpOnSettle: 14,
    hideLeaderboard: true,
  },
  {
    tournamentId: CASUAL_SEASON_CHALLENGE_MATCH_3_ID,
    title: "专场对局 · Match-3",
    gameType: "match_3",
    matchType: "season_challenge",
    status: "open",
    maxPlayers: 4,
    entry: { kind: "seasonVouchers", amount: 3 },
    rewards: {
      type: "by_rank",
      baseRewards: { coins: 0, gems: 0 },
    },
    seasonXpOnSettle: 14,
    hideLeaderboard: true,
  },
  {
    tournamentId: CASUAL_SEASON_CHALLENGE_YATZ_ID,
    title: "专场对局 · Yatz",
    gameType: "yatz",
    matchType: "season_challenge",
    status: "open",
    maxPlayers: 4,
    entry: { kind: "seasonVouchers", amount: 3 },
    rewards: {
      type: "by_rank",
      baseRewards: { coins: 0, gems: 0 },
    },
    seasonXpOnSettle: 14,
    hideLeaderboard: true,
  },
  {
    tournamentId: "casual_triathlon_a",
    title: "三场合战 · A",
    gameType: "triathlon",
    matchType: "triathlon_a",
    status: "open",
    maxPlayers: 3,
    gameSequence: ["block_blast", "solitaire", "match_3"],
    entry: { kind: "coins", amount: 70 },
    rewards: {
      type: "by_rank",
      baseRewards: { coins: 36, gems: 0 },
    },
    seasonXpOnSettle: 4,
  },
  {
    tournamentId: "casual_triathlon_b",
    title: "三场合战 · B",
    gameType: "triathlon",
    matchType: "triathlon_b",
    status: "open",
    maxPlayers: 4,
    gameSequence: ["block_blast", "solitaire", "match_3"],
    entry: { kind: "coins", amount: 90 },
    rewards: {
      type: "by_rank",
      baseRewards: { coins: 103, gems: 0 },
    },
    seasonXpOnSettle: 5,
  },
  {
    tournamentId: "casual_triathlon_c",
    title: "三场合战 · C",
    gameType: "triathlon",
    matchType: "triathlon_c",
    status: "open",
    maxPlayers: 5,
    gameSequence: ["block_blast", "solitaire", "match_3"],
    entry: { kind: "gems", amount: 24 },
    rewards: {
      type: "by_rank",
      baseRewards: { coins: 0, gems: 24 },
    },
    seasonXpOnSettle: 8,
  },
];

/** 已下线日榜模板（只读；不参与 list/join） */
const DEPRECATED_DAILY_SOLO_TOURNAMENT_DEFS: CasualTournamentDefinition[] = [
  {
    tournamentId: CASUAL_DAILY_SOLO_CHALLENGE_SOLITAIRE_ID,
    title: "[已下线] Daily · Solitaire",
    gameType: "solitaire",
    matchType: "tournament_a",
    status: "closed",
    instanceScope: "daily",
    scoreAggregation: "best_score",
    entryBilling: "per_instance",
    instanceTimezone: "UTC",
    maxPlayers: 1,
    entry: { kind: "none" },
    rewards: { type: "by_performance", baseRewards: { coins: 20, gems: 0 } },
    seasonXpOnSettle: 4,
    omitFromPlayLobby: true,
  },
  {
    tournamentId: CASUAL_DAILY_SOLO_CHALLENGE_BLOCK_BLAST_ID,
    title: "[已下线] Daily · Block Blast",
    gameType: "block_blast",
    matchType: "tournament_a",
    status: "closed",
    instanceScope: "daily",
    scoreAggregation: "best_score",
    entryBilling: "per_instance",
    instanceTimezone: "UTC",
    maxPlayers: 1,
    entry: { kind: "none" },
    rewards: { type: "by_performance", baseRewards: { coins: 20, gems: 0 } },
    seasonXpOnSettle: 4,
    omitFromPlayLobby: true,
  },
  {
    tournamentId: CASUAL_DAILY_SOLO_CHALLENGE_TOWER_ARENA_ID,
    title: "[已下线] Daily · Tower Defense",
    gameType: "tower_arena",
    matchType: "tournament_a",
    status: "closed",
    instanceScope: "daily",
    scoreAggregation: "best_score",
    entryBilling: "per_instance",
    instanceTimezone: "UTC",
    maxPlayers: 1,
    entry: { kind: "none" },
    rewards: { type: "by_performance", baseRewards: { coins: 20, gems: 0 } },
    seasonXpOnSettle: 4,
    omitFromPlayLobby: true,
  },
  {
    tournamentId: CASUAL_DAILY_SOLO_CHALLENGE_MATCH_3_ID,
    title: "[已下线] Daily · Match-3",
    gameType: "match_3",
    matchType: "tournament_a",
    status: "closed",
    instanceScope: "daily",
    scoreAggregation: "best_score",
    entryBilling: "per_instance",
    instanceTimezone: "UTC",
    maxPlayers: 1,
    entry: { kind: "none" },
    rewards: { type: "by_performance", baseRewards: { coins: 20, gems: 0 } },
    seasonXpOnSettle: 4,
    omitFromPlayLobby: true,
  },
];

/** Block Blast 异步 A 档：演示 / 默认入口 */
export const DEFAULT_CASUAL_TOURNAMENT_ID = "casual_async_a_bb";

export function getTournamentDefinition(
  tournamentId: string
): CasualTournamentDefinition | null {
  return (
    TOURNAMENT_DEFS.find((t) => t.tournamentId === tournamentId) ??
    DEPRECATED_DAILY_SOLO_TOURNAMENT_DEFS.find((t) => t.tournamentId === tournamentId) ??
    null
  );
}

export function effectiveGameSequence(def: CasualTournamentDefinition): string[] {
  if (def.gameSequence && def.gameSequence.length > 0) {
    return [...def.gameSequence];
  }
  return [def.gameType];
}

export function isTriathlonTemplate(def: CasualTournamentDefinition): boolean {
  return effectiveGameSequence(def).length > 1;
}

export function seatGameTypeForTemplate(def: CasualTournamentDefinition): string {
  return isTriathlonTemplate(def) ? "triathlon" : def.gameType;
}

const TRIATHLON_LOBBY_MATCH_TYPES = ["triathlon_a", "triathlon_b", "triathlon_c"] as const;
export type TriathlonLobbyMatchType = (typeof TRIATHLON_LOBBY_MATCH_TYPES)[number];

/** 三场合战 Play 大厅 A/B/C 列表（不依赖 DB `casual_tournaments`） */
export function listTriathlonLobbyTemplates(): Array<{
  tournamentId: string;
  title: string;
  matchType: TriathlonLobbyMatchType;
  status: string;
}> {
  return TOURNAMENT_DEFS.filter(
    (t): t is CasualTournamentDefinition & { matchType: TriathlonLobbyMatchType } =>
      t.gameType === "triathlon" &&
      !t.omitFromPlayLobby &&
      (TRIATHLON_LOBBY_MATCH_TYPES as readonly string[]).includes(t.matchType)
  ).map((t) => ({
    tournamentId: t.tournamentId,
    title: t.title,
    matchType: t.matchType,
    status: t.status,
  }));
}

export function listTournamentDefinitions(): CasualTournamentDefinition[] {
  return TOURNAMENT_DEFS;
}

/** Play 单款游戏锦标赛列表：不含日榜、不含 `omitFromPlayLobby`、不含 season 专场（专场由 modal 单独注入） */
export function shouldAppearInCasualPlayLobby(
  def: CasualTournamentDefinition | null | undefined
): boolean {
  if (!def) return false;
  if (def.omitFromPlayLobby) return false;
  if (def.instanceScope === "daily") return false;
  if (def.matchType === "season_challenge") return false;
  if (!isCasualGameLobbyVisible(def.gameType)) return false;
  return (
    def.matchType === "tournament_a" ||
    def.matchType === "tournament_b" ||
    def.matchType === "tournament_c" ||
    def.matchType === "solo_p75_challenge"
  );
}

/** Play 大厅异步锦标列表（不含赛季专场；专场由 `listSeasonChallengeMatches` 单独露出） */
export function listPlayCasualTournaments(): Array<{
  tournamentId: string;
  title: string;
  gameType: string;
  matchType: string;
  status: string;
  instanceScope?: CasualInstanceScope;
  scoreAggregation?: CasualScoreAggregation;
  entryBilling?: CasualEntryBilling;
}> {
  return TOURNAMENT_DEFS.filter((t) => shouldAppearInCasualPlayLobby(t)).map((t) => ({
    tournamentId: t.tournamentId,
    title: t.title,
    gameType: t.gameType,
    matchType: t.matchType,
    status: t.status,
    ...(t.instanceScope ? { instanceScope: t.instanceScope } : {}),
    ...(t.scoreAggregation ? { scoreAggregation: t.scoreAggregation } : {}),
    ...(t.entryBilling ? { entryBilling: t.entryBilling } : {}),
  }));
}

/** 语义同 listPlayCasualTournaments（不含专场） */
export function getDefaultCasualTournaments(): ReturnType<typeof listPlayCasualTournaments> {
  return listPlayCasualTournaments();
}

export function listSeasonChallengeMatchCatalog(): Array<{
  matchId: string;
  title: string;
  voucherCost: number;
}> {
  return TOURNAMENT_DEFS.filter(
    (t) => t.matchType === "season_challenge" && isCasualGameLobbyVisible(t.gameType)
  ).map((t) => ({
    matchId: t.tournamentId,
    title: t.title,
    voucherCost: t.entry.kind === "seasonVouchers" ? t.entry.amount : 0,
  }));
}

