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

export interface CasualTournamentDefinition {
  tournamentId: string;
  title: string;
  gameType: string;
  matchType: "tournament_a" | "tournament_b" | "tournament_c" | "season_challenge";
  status: string;
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
  /** 每场结算固定 Pass XP（含 A/B/C/专场/日榜；不受当日钱包递减影响） */
  seasonXpOnSettle: number;
  seasonPointsMultiplier: number;
  /** 真 · 专场可不展示异步排行榜（仍写入 score 供运营/扩展） */
  hideLeaderboard?: boolean;
  /** 日榜单人挑战等：仅 Play 专区入口，不出现在多人竞技列表 */
  omitFromPlayLobby?: boolean;
  /** score >= p50 且画像权重为空时，与 DB 名次累计（1–4 档）平衡后抽样；缺省见 CASUAL_RANK_RATES_4B */
  rankRates?: CasualRankRateEntry[];
  /** Block Blast 等无 pool 时开桌 bind 写入 seedBinding 的静态分位 */
  referenceScoreQuantiles?: CasualReferenceScoreQuantiles;
}

/** Play「日榜单人挑战」· Solitaire */
export const CASUAL_DAILY_SOLO_CHALLENGE_SOLITAIRE_ID =
  "casual_daily_solo_challenge_solitaire" as const;
/** Play「日榜单人挑战」· Block Blast */
export const CASUAL_DAILY_SOLO_CHALLENGE_BLOCK_BLAST_ID =
  "casual_daily_solo_challenge_block_blast" as const;
/** Play「日榜单人挑战」· Tower Arena */
export const CASUAL_DAILY_SOLO_CHALLENGE_TOWER_ARENA_ID =
  "casual_daily_solo_challenge_tower_arena" as const;
/** Play「日榜单人挑战」· Match-3 */
export const CASUAL_DAILY_SOLO_CHALLENGE_MATCH_3_ID =
  "casual_daily_solo_challenge_match_3" as const;

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

export function isPeriodScopedTournament(def: CasualTournamentDefinition): boolean {
  return effectiveInstanceScope(def) !== "single_match";
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
/** Tower Arena 赛季专场 tournamentId */
export const CASUAL_SEASON_CHALLENGE_TOWER_ARENA_ID = "season_challenge_tower_arena_1";

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
 * 异步 A/B/C 名次赛季分：同档位跨 `solitaire` / `block_blast` 必须一致（避免 A 场末名有时 -1 有时 -3）。
 */
const CASUAL_ASYNC_RANK_SEASON_POINTS_A_3P: CasualRankRewardEntry[] = [
  { rankRange: [1, 1], multiplier: 1, seasonPoints: 6 },
  { rankRange: [2, 2], multiplier: 1, seasonPoints: 2 },
  { rankRange: [3, 3], multiplier: 1, seasonPoints: -3 },
];
const CASUAL_ASYNC_RANK_SEASON_POINTS_B_4P: CasualRankRewardEntry[] = [
  { rankRange: [1, 1], multiplier: 1, seasonPoints: 10 },
  { rankRange: [2, 2], multiplier: 1, seasonPoints: 5 },
  { rankRange: [3, 3], multiplier: 1, seasonPoints: 2 },
  { rankRange: [4, 4], multiplier: 1, seasonPoints: -5 },
];
const CASUAL_ASYNC_RANK_SEASON_POINTS_C_5P: CasualRankRewardEntry[] = [
  { rankRange: [1, 1], multiplier: 1, seasonPoints: 14 },
  { rankRange: [2, 2], multiplier: 1, seasonPoints: 8 },
  { rankRange: [3, 3], multiplier: 1, seasonPoints: 5 },
  { rankRange: [4, 4], multiplier: 1, seasonPoints: 2 },
  { rankRange: [5, 5], multiplier: 1, seasonPoints: -8 },
];

/**
 * 单场 A/B/C 分位奖（叠加在底奖 + 名次奖之上，每局按本局终分发放）。
 * 阈值刻意取较低值并跨 4 玩法通用（BB/纸牌/塔防/消除分制不同），便于核查发奖是否生效：
 * - A：最低档 minScore=1 必中 +3 金；越界往上叠到 +8 / +15。
 * - B：+5 / +12 / +25 金。
 * - C：+1 / +2 / +4 钻。
 * 上线正式调参时按各玩法实际分位（见 `CASUAL_BB_QUANTILES_*`）替换阈值即可。
 */
const CASUAL_ASYNC_SCORE_TIER_A: CasualScoreTierRewardEntry[] = [
  { minScore: 1, coins: 3 },
  { minScore: 300, coins: 8 },
  { minScore: 1000, coins: 15 },
];
const CASUAL_ASYNC_SCORE_TIER_B: CasualScoreTierRewardEntry[] = [
  { minScore: 1, coins: 5 },
  { minScore: 800, coins: 12 },
  { minScore: 2500, coins: 25 },
];
const CASUAL_ASYNC_SCORE_TIER_C: CasualScoreTierRewardEntry[] = [
  { minScore: 1, gems: 1 },
  { minScore: 1500, gems: 2 },
  { minScore: 5000, gems: 4 },
];

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

const CASUAL_BB_QUANTILES_A: CasualReferenceScoreQuantiles = {
  p10: 3_000,
  p25: 4_500,
  p30: 5_500,
  p33: 6_000,
  p50: 7_000,
  p66: 8_500,
  p70: 9_500,
  p75: 10_500,
  p90: 12_000,
};
const CASUAL_BB_QUANTILES_B: CasualReferenceScoreQuantiles = {
  p10: 2_000,
  p25: 3_500,
  p30: 4_500,
  p33: 5_000,
  p50: 9_000,
  p66: 11_000,
  p70: 12_500,
  p75: 13_500,
  p90: 15_000,
};
const CASUAL_BB_QUANTILES_C: CasualReferenceScoreQuantiles = {
  p10: 1_000,
  p25: 2_500,
  p30: 3_500,
  p33: 4_000,
  p50: 6_500,
  p66: 9_000,
  p70: 10_000,
  p75: 11_000,
  p90: 18_000,
};
const CASUAL_BB_QUANTILES_SEASON_4P: CasualReferenceScoreQuantiles = {
  p10: 1_500,
  p25: 3_000,
  p30: 4_000,
  p33: 4_500,
  p50: 8_000,
  p66: 10_000,
  p70: 11_000,
  p75: 12_000,
  p90: 14_000,
};

/** Play 异步 A/B/C：`maxPlayers` 3 / 4 / 5；多人赛季分按名次 `rankRewards.seasonPoints`（可负）；日榜单机仍用 `seasonPointsMultiplier`。 */
const TOURNAMENT_DEFS: CasualTournamentDefinition[] = [
  {
    tournamentId: "casual_async_a_bb",
    title: "A · Block Blast (金币入门)",
    gameType: "block_blast",
    matchType: "tournament_a",
    status: "open",
    maxPlayers: 3,
    entry: { kind: "coins", amount: 30 },
    rewards: {
      type: "by_rank",
      baseRewards: { coins: 22, gems: 0 },
      rankRewards: [...CASUAL_ASYNC_RANK_SEASON_POINTS_A_3P],
      scoreTierRewards: [...CASUAL_ASYNC_SCORE_TIER_A],
    },
    seasonXpOnSettle: 12,
    seasonPointsMultiplier: 0,
    referenceScoreQuantiles: CASUAL_BB_QUANTILES_A,
  },
  {
    tournamentId: "casual_async_b_bb",
    title: "B · Block Blast (coins in / pool)",
    gameType: "block_blast",
    matchType: "tournament_b",
    status: "open",
    maxPlayers: 4,
    entry: { kind: "coins", amount: 40 },
    rewards: {
      type: "by_rank",
      baseRewards: { coins: 58, gems: 1 },
      rankRewards: [...CASUAL_ASYNC_RANK_SEASON_POINTS_B_4P],
      scoreTierRewards: [...CASUAL_ASYNC_SCORE_TIER_B],
    },
    seasonXpOnSettle: 18,
    seasonPointsMultiplier: 0,
    referenceScoreQuantiles: CASUAL_BB_QUANTILES_B,
  },
  {
    tournamentId: "casual_async_c_bb",
    title: "C · Block Blast (gems in / pool)",
    gameType: "block_blast",
    matchType: "tournament_c",
    status: "open",
    maxPlayers: 5,
    entry: { kind: "gems", amount: 5 },
    rewards: {
      type: "by_rank",
      baseRewards: { coins: 0, gems: 8 },
      rankRewards: [...CASUAL_ASYNC_RANK_SEASON_POINTS_C_5P],
      scoreTierRewards: [...CASUAL_ASYNC_SCORE_TIER_C],
    },
    seasonXpOnSettle: 28,
    seasonPointsMultiplier: 0,
    referenceScoreQuantiles: CASUAL_BB_QUANTILES_C,
  },
  {
    tournamentId: "casual_async_a_solitaire",
    title: "A · Solitaire (金币入门)",
    gameType: "solitaire",
    matchType: "tournament_a",
    status: "open",
    maxPlayers: 3,
    entry: { kind: "coins", amount: 30 },
    rewards: {
      type: "by_rank",
      baseRewards: { coins: 22, gems: 0 },
      rankRewards: [...CASUAL_ASYNC_RANK_SEASON_POINTS_A_3P],
      scoreTierRewards: [...CASUAL_ASYNC_SCORE_TIER_A],
    },
    seasonXpOnSettle: 12,
    seasonPointsMultiplier: 0,
  },
  {
    tournamentId: "casual_async_b_solitaire",
    title: "B · Solitaire (coins in / pool)",
    gameType: "solitaire",
    matchType: "tournament_b",
    status: "open",
    maxPlayers: 4,
    entry: { kind: "coins", amount: 40 },
    rewards: {
      type: "by_rank",
      baseRewards: { coins: 58, gems: 1 },
      rankRewards: [...CASUAL_ASYNC_RANK_SEASON_POINTS_B_4P],
      scoreTierRewards: [...CASUAL_ASYNC_SCORE_TIER_B],
    },
    seasonXpOnSettle: 18,
    seasonPointsMultiplier: 0,
  },
  {
    tournamentId: "casual_async_c_solitaire",
    title: "C · Solitaire (gems in / pool)",
    gameType: "solitaire",
    matchType: "tournament_c",
    status: "open",
    maxPlayers: 5,
    entry: { kind: "gems", amount: 5 },
    rewards: {
      type: "by_rank",
      baseRewards: { coins: 0, gems: 8 },
      rankRewards: [...CASUAL_ASYNC_RANK_SEASON_POINTS_C_5P],
      scoreTierRewards: [...CASUAL_ASYNC_SCORE_TIER_C],
    },
    seasonXpOnSettle: 28,
    seasonPointsMultiplier: 0,
  },
  {
    tournamentId: "casual_async_a_match_3",
    title: "A · Match-3 (金币入门)",
    gameType: "match_3",
    matchType: "tournament_a",
    status: "open",
    maxPlayers: 3,
    entry: { kind: "coins", amount: 30 },
    rewards: {
      type: "by_rank",
      baseRewards: { coins: 22, gems: 0 },
      rankRewards: [...CASUAL_ASYNC_RANK_SEASON_POINTS_A_3P],
      scoreTierRewards: [...CASUAL_ASYNC_SCORE_TIER_A],
    },
    seasonXpOnSettle: 12,
    seasonPointsMultiplier: 0,
  },
  {
    tournamentId: "casual_async_b_match_3",
    title: "B · Match-3 (coins in / pool)",
    gameType: "match_3",
    matchType: "tournament_b",
    status: "open",
    maxPlayers: 4,
    entry: { kind: "coins", amount: 40 },
    rewards: {
      type: "by_rank",
      baseRewards: { coins: 58, gems: 1 },
      rankRewards: [...CASUAL_ASYNC_RANK_SEASON_POINTS_B_4P],
      scoreTierRewards: [...CASUAL_ASYNC_SCORE_TIER_B],
    },
    seasonXpOnSettle: 18,
    seasonPointsMultiplier: 0,
  },
  {
    tournamentId: "casual_async_c_match_3",
    title: "C · Match-3 (gems in / pool)",
    gameType: "match_3",
    matchType: "tournament_c",
    status: "open",
    maxPlayers: 5,
    entry: { kind: "gems", amount: 5 },
    rewards: {
      type: "by_rank",
      baseRewards: { coins: 0, gems: 8 },
      rankRewards: [...CASUAL_ASYNC_RANK_SEASON_POINTS_C_5P],
      scoreTierRewards: [...CASUAL_ASYNC_SCORE_TIER_C],
    },
    seasonXpOnSettle: 28,
    seasonPointsMultiplier: 0,
  },
  {
    tournamentId: "casual_async_a_tower_arena",
    title: "A · Tower Defense (金币入门)",
    gameType: "tower_arena",
    matchType: "tournament_a",
    status: "open",
    maxPlayers: 3,
    entry: { kind: "coins", amount: 30 },
    rewards: {
      type: "by_rank",
      baseRewards: { coins: 22, gems: 0 },
      rankRewards: [...CASUAL_ASYNC_RANK_SEASON_POINTS_A_3P],
      scoreTierRewards: [...CASUAL_ASYNC_SCORE_TIER_A],
    },
    seasonXpOnSettle: 12,
    seasonPointsMultiplier: 0,
  },
  {
    tournamentId: "casual_async_b_tower_arena",
    title: "B · Tower Defense (coins in / pool)",
    gameType: "tower_arena",
    matchType: "tournament_b",
    status: "open",
    maxPlayers: 4,
    entry: { kind: "coins", amount: 40 },
    rewards: {
      type: "by_rank",
      baseRewards: { coins: 58, gems: 1 },
      rankRewards: [...CASUAL_ASYNC_RANK_SEASON_POINTS_B_4P],
      scoreTierRewards: [...CASUAL_ASYNC_SCORE_TIER_B],
    },
    seasonXpOnSettle: 18,
    seasonPointsMultiplier: 0,
  },
  {
    tournamentId: "casual_async_c_tower_arena",
    title: "C · Tower Defense (gems in / pool)",
    gameType: "tower_arena",
    matchType: "tournament_c",
    status: "open",
    maxPlayers: 5,
    entry: { kind: "gems", amount: 5 },
    rewards: {
      type: "by_rank",
      baseRewards: { coins: 0, gems: 8 },
      rankRewards: [...CASUAL_ASYNC_RANK_SEASON_POINTS_C_5P],
      scoreTierRewards: [...CASUAL_ASYNC_SCORE_TIER_C],
    },
    seasonXpOnSettle: 28,
    seasonPointsMultiplier: 0,
  },
  {
    tournamentId: CASUAL_DAILY_SOLO_CHALLENGE_SOLITAIRE_ID,
    title: "Daily · Solitaire 日榜最高分",
    gameType: "solitaire",
    matchType: "tournament_a",
    status: "open",
    instanceScope: "daily",
    scoreAggregation: "best_score",
    entryBilling: "per_instance",
    instanceTimezone: "UTC",
    maxPlayers: 1,
    entry: { kind: "none" },
    rewards: {
      type: "by_performance",
      baseRewards: { coins: 10, gems: 0 },
      rankRewards: [
        { rankRange: [1, 1], multiplier: 1, coins: 80, gems: 0 },
        { rankRange: [2, 3], multiplier: 1, coins: 50, gems: 0 },
        { rankRange: [4, 10], multiplier: 1, coins: 30, gems: 0 },
        { rankRange: [11, 50], multiplier: 1, coins: 15, gems: 0 },
        { rankRange: [51, 999_999], multiplier: 1, coins: 5, gems: 0 },
      ],
      scoreTierRewardsGrantTiming: "on_each_run_settled",
      scoreTierRewards: [
        { minScore: 800, coins: 40, gems: 0 },
        { minScore: 600, coins: 25, gems: 0 },
        { minScore: 400, coins: 15, gems: 0 },
        { minScore: 200, coins: 5, gems: 0 },
      ],
    },
    seasonXpOnSettle: 8,
    seasonPointsMultiplier: 0.5,
    omitFromPlayLobby: true,
  },
  {
    tournamentId: CASUAL_DAILY_SOLO_CHALLENGE_BLOCK_BLAST_ID,
    title: "Daily · Block Blast 日榜最高分",
    gameType: "block_blast",
    matchType: "tournament_a",
    status: "open",
    instanceScope: "daily",
    scoreAggregation: "best_score",
    entryBilling: "per_instance",
    instanceTimezone: "UTC",
    maxPlayers: 1,
    entry: { kind: "none" },
    rewards: {
      type: "by_performance",
      baseRewards: { coins: 10, gems: 0 },
      rankRewards: [
        { rankRange: [1, 1], multiplier: 1, coins: 100, gems: 0 },
        { rankRange: [2, 3], multiplier: 1, coins: 60, gems: 0 },
        { rankRange: [4, 10], multiplier: 1, coins: 35, gems: 0 },
        { rankRange: [11, 50], multiplier: 1, coins: 18, gems: 0 },
        { rankRange: [51, 999_999], multiplier: 1, coins: 6, gems: 0 },
      ],
      scoreTierRewardsGrantTiming: "on_each_run_settled",
      scoreTierRewards: [
        { minScore: 800, coins: 50, gems: 0 },
        { minScore: 600, coins: 35, gems: 0 },
        { minScore: 400, coins: 20, gems: 0 },
        { minScore: 200, coins: 8, gems: 0 },
      ],
    },
    seasonXpOnSettle: 8,
    seasonPointsMultiplier: 0.5,
    omitFromPlayLobby: true,
  },
  {
    tournamentId: CASUAL_DAILY_SOLO_CHALLENGE_TOWER_ARENA_ID,
    title: "Daily · Tower Defense 日榜最高分",
    gameType: "tower_arena",
    matchType: "tournament_a",
    status: "open",
    instanceScope: "daily",
    scoreAggregation: "best_score",
    entryBilling: "per_instance",
    instanceTimezone: "UTC",
    maxPlayers: 1,
    entry: { kind: "none" },
    rewards: {
      type: "by_performance",
      baseRewards: { coins: 10, gems: 0 },
      rankRewards: [
        { rankRange: [1, 1], multiplier: 1, coins: 90, gems: 0 },
        { rankRange: [2, 3], multiplier: 1, coins: 55, gems: 0 },
        { rankRange: [4, 10], multiplier: 1, coins: 32, gems: 0 },
        { rankRange: [11, 50], multiplier: 1, coins: 16, gems: 0 },
        { rankRange: [51, 999_999], multiplier: 1, coins: 6, gems: 0 },
      ],
      scoreTierRewardsGrantTiming: "on_each_run_settled",
      scoreTierRewards: [
        { minScore: 2500, coins: 45, gems: 0 },
        { minScore: 1800, coins: 30, gems: 0 },
        { minScore: 1200, coins: 18, gems: 0 },
        { minScore: 600, coins: 8, gems: 0 },
      ],
    },
    seasonXpOnSettle: 8,
    seasonPointsMultiplier: 0.5,
    omitFromPlayLobby: true,
  },
  {
    tournamentId: CASUAL_DAILY_SOLO_CHALLENGE_MATCH_3_ID,
    title: "Daily · Match-3 日榜最高分",
    gameType: "match_3",
    matchType: "tournament_a",
    status: "open",
    instanceScope: "daily",
    scoreAggregation: "best_score",
    entryBilling: "per_instance",
    instanceTimezone: "UTC",
    maxPlayers: 1,
    entry: { kind: "none" },
    rewards: {
      type: "by_performance",
      baseRewards: { coins: 10, gems: 0 },
      rankRewards: [
        { rankRange: [1, 1], multiplier: 1, coins: 85, gems: 0 },
        { rankRange: [2, 3], multiplier: 1, coins: 52, gems: 0 },
        { rankRange: [4, 10], multiplier: 1, coins: 30, gems: 0 },
        { rankRange: [11, 50], multiplier: 1, coins: 15, gems: 0 },
        { rankRange: [51, 999_999], multiplier: 1, coins: 5, gems: 0 },
      ],
      scoreTierRewardsGrantTiming: "on_each_run_settled",
      scoreTierRewards: [
        { minScore: 1200, coins: 42, gems: 0 },
        { minScore: 900, coins: 28, gems: 0 },
        { minScore: 600, coins: 16, gems: 0 },
        { minScore: 300, coins: 6, gems: 0 },
      ],
    },
    seasonXpOnSettle: 8,
    seasonPointsMultiplier: 0.5,
    omitFromPlayLobby: true,
  },
  /** 赛季专场：赛季券入场、异步匹配同档 4 人桌；赛季分按名次，不参与挑战点/代金券档位 */
  {
    tournamentId: CASUAL_SEASON_CHALLENGE_BB_TOURNAMENT_ID,
    title: "专场对局 · Block Blast",
    gameType: "block_blast",
    matchType: "season_challenge",
    status: "open",
    maxPlayers: 4,
    entry: { kind: "seasonVouchers", amount: 2 },
    rewards: {
      type: "by_rank",
      baseRewards: { coins: 0, gems: 0 },
      rankRewards: [
        { rankRange: [1, 1], multiplier: 1, seasonPoints: 12 },
        { rankRange: [2, 2], multiplier: 1, seasonPoints: 7 },
        { rankRange: [3, 3], multiplier: 1, seasonPoints: 3 },
        { rankRange: [4, 4], multiplier: 1, seasonPoints: -6 },
      ],
    },
    seasonXpOnSettle: 18,
    seasonPointsMultiplier: 0,
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
    entry: { kind: "seasonVouchers", amount: 2 },
    rewards: {
      type: "by_rank",
      baseRewards: { coins: 0, gems: 0 },
      rankRewards: [
        { rankRange: [1, 1], multiplier: 1, seasonPoints: 12 },
        { rankRange: [2, 2], multiplier: 1, seasonPoints: 7 },
        { rankRange: [3, 3], multiplier: 1, seasonPoints: 3 },
        { rankRange: [4, 4], multiplier: 1, seasonPoints: -6 },
      ],
    },
    seasonXpOnSettle: 18,
    seasonPointsMultiplier: 0,
    hideLeaderboard: true,
  },
  {
    tournamentId: CASUAL_SEASON_CHALLENGE_TOWER_ARENA_ID,
    title: "专场对局 · Tower Defense",
    gameType: "tower_arena",
    matchType: "season_challenge",
    status: "open",
    maxPlayers: 4,
    entry: { kind: "seasonVouchers", amount: 2 },
    rewards: {
      type: "by_rank",
      baseRewards: { coins: 0, gems: 0 },
      rankRewards: [
        { rankRange: [1, 1], multiplier: 1, seasonPoints: 12 },
        { rankRange: [2, 2], multiplier: 1, seasonPoints: 7 },
        { rankRange: [3, 3], multiplier: 1, seasonPoints: 3 },
        { rankRange: [4, 4], multiplier: 1, seasonPoints: -6 },
      ],
    },
    seasonXpOnSettle: 18,
    seasonPointsMultiplier: 0,
    hideLeaderboard: true,
  },
];

/** Block Blast 异步 A 档：演示 / 默认入口 */
export const DEFAULT_CASUAL_TOURNAMENT_ID = "casual_async_a_bb";

export function getTournamentDefinition(
  tournamentId: string
): CasualTournamentDefinition | null {
  return TOURNAMENT_DEFS.find((t) => t.tournamentId === tournamentId) ?? null;
}

export function listTournamentDefinitions(): CasualTournamentDefinition[] {
  return TOURNAMENT_DEFS;
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
  return TOURNAMENT_DEFS.filter(
    (t) =>
      t.matchType !== "season_challenge" &&
      !t.omitFromPlayLobby &&
      isCasualGameLobbyVisible(t.gameType)
  ).map((t) => ({
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

/**
 * 赛季竞技积分增量（日榜 `seasonPointsMultiplier` 路径）；持久化见 `casual_player_season_ladder`。
 * 高分仍按「千分位 × 倍率」拉开差距；终局分 < 1000 时原先恒为 0，赛季榜会长期空白，
 * 故在「有正分且倍率 > 0」且 floor 为 0 时记 1 点，保证每场有贡献的结算都会上榜。
 */
export function seasonPointsFromScore(score: number, multiplier: number): number {
  const clamped = Math.max(0, Math.min(score, 10_000_000));
  const mult = Math.max(0, multiplier);
  if (clamped <= 0 || mult <= 0) return 0;
  const floored = Math.floor((clamped / 1000) * mult);
  return floored > 0 ? floored : 1;
}
