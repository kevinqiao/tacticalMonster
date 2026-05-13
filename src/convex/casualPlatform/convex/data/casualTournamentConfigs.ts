import type { CasualPlatformRewardConfig } from "./casualTournamentRewardTypes";

export type {
  CasualPlatformRewardConfig,
  CasualRankRewardEntry,
  CasualScoreTierRewardEntry,
  CasualScoreTierRewardsGrantTiming,
} from "./casualTournamentRewardTypes";

/** 静态锦标配置；join / submit 结算与 DB 种子共用 */

export type EntryCost =
  | { kind: "none" }
  | { kind: "coins"; amount: number }
  | { kind: "gems"; amount: number }
  /** 赛季专场入场：走 `joinCasualRunCore` / run 表，扣 `seasonVouchers`（活动修正见 join） */
  | { kind: "seasonVouchers"; amount: number };

export type CasualInstanceScope = "single_match" | "daily" | "weekly" | "season";
export type CasualScoreAggregation = "single_match" | "best_score" | "sum_scores";
export type CasualEntryBilling = "per_match" | "per_instance";

export interface CasualTournamentDefinition {
  tournamentId: string;
  title: string;
  gameId: string;
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
  /**
   * 匹配服开桌所需最少真人：测试阶段可设 1（队列里有一个真人就建局并补机器人至 maxPlayers）；
   * 上线后可改为与 maxPlayers 相同或配合定时器凑满再开。
   */
  matchmakingMinHumans: number;
  entry: EntryCost;
  /** 与 TacticalMonster 锦标赛 `RewardConfig` 同构；休闲扩展见 `CasualPlatformRewardConfig` */
  rewards: CasualPlatformRewardConfig;
  /** Pass / 赛季积分（TM 奖励模型外，休闲赛季专用） */
  seasonXpOnSettle: number;
  seasonPointsMultiplier: number;
  /** 真 · 专场可不展示异步排行榜（仍写入 score 供运营/扩展） */
  hideLeaderboard?: boolean;
  /** 仅「单人挑战」等入口 join，不出现在多人竞技锦标列表 */
  omitFromPlayLobby?: boolean;
}

/** Play「单人挑战」日榜最高分 · Solitaire */
export const CASUAL_DAILY_SOLO_CHALLENGE_SOLITAIRE_ID = "casual_daily_solo_challenge_solitaire" as const;
/** Play「单人挑战」日榜最高分 · Block Blast */
export const CASUAL_DAILY_SOLO_CHALLENGE_BLOCK_BLAST_ID = "casual_daily_solo_challenge_block_blast" as const;

export function effectiveInstanceScope(def: CasualTournamentDefinition): CasualInstanceScope {
  return def.instanceScope ?? "single_match";
}

export function effectiveScoreAggregation(def: CasualTournamentDefinition): CasualScoreAggregation {
  return def.scoreAggregation ?? "single_match";
}

export function effectiveEntryBilling(def: CasualTournamentDefinition): CasualEntryBilling {
  return def.entryBilling ?? "per_match";
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

/** Block Blast 默认赛季挑战专场 tournamentId */
export const CASUAL_SEASON_CHALLENGE_BB_TOURNAMENT_ID = "season_challenge_bb_1";

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

/** 测试方便：Play 异步场 A/B/C 档 `maxPlayers` 暂为 3 / 4 / 5（BB 与 Solitaire 对齐）；赛季专场仍为单人。 */
const TOURNAMENT_DEFS: CasualTournamentDefinition[] = [
  {
    tournamentId: "casual_async_a_bb",
    title: "A · Block Blast (金币入门)",
    gameId: "block_blast",
    matchType: "tournament_a",
    status: "open",
    maxPlayers: 3,
    matchmakingMinHumans: 1,
    entry: { kind: "coins", amount: 25 },
    rewards: {
      type: "by_performance",
      baseRewards: { coins: 25, gems: 0 },
    },
    seasonXpOnSettle: 12,
    seasonPointsMultiplier: 0.8,
  },
  {
    tournamentId: "casual_async_b_bb",
    title: "B · Block Blast (coins in / pool)",
    gameId: "block_blast",
    matchType: "tournament_b",
    status: "open",
    maxPlayers: 4,
    matchmakingMinHumans: 1,
    entry: { kind: "coins", amount: 40 },
    rewards: {
      type: "by_performance",
      baseRewards: { coins: 70, gems: 1 },
    },
    seasonXpOnSettle: 18,
    seasonPointsMultiplier: 1.2,
  },
  {
    tournamentId: "casual_async_c_bb",
    title: "C · Block Blast (gems in / pool)",
    gameId: "block_blast",
    matchType: "tournament_c",
    status: "open",
    maxPlayers: 5,
    matchmakingMinHumans: 1,
    entry: { kind: "gems", amount: 5 },
    rewards: {
      type: "by_performance",
      baseRewards: { coins: 0, gems: 8 },
    },
    seasonXpOnSettle: 28,
    seasonPointsMultiplier: 2,
  },
  {
    tournamentId: "casual_async_a_solitaire",
    title: "A · Solitaire (金币入门)",
    gameId: "solitaire",
    matchType: "tournament_a",
    status: "open",
    maxPlayers: 3,
    matchmakingMinHumans: 1,
    entry: { kind: "coins", amount: 25 },
    rewards: {
      type: "by_performance",
      baseRewards: { coins: 25, gems: 0 },
    },
    seasonXpOnSettle: 12,
    seasonPointsMultiplier: 0.8,
  },
  {
    tournamentId: "casual_async_b_solitaire",
    title: "B · Solitaire (coins in / pool)",
    gameId: "solitaire",
    matchType: "tournament_b",
    status: "open",
    maxPlayers: 4,
    matchmakingMinHumans: 1,
    entry: { kind: "coins", amount: 40 },
    rewards: {
      type: "by_performance",
      baseRewards: { coins: 70, gems: 1 },
    },
    seasonXpOnSettle: 18,
    seasonPointsMultiplier: 1.2,
  },
  {
    tournamentId: "casual_async_c_solitaire",
    title: "C · Solitaire (gems in / pool)",
    gameId: "solitaire",
    matchType: "tournament_c",
    status: "open",
    maxPlayers: 5,
    matchmakingMinHumans: 1,
    entry: { kind: "gems", amount: 5 },
    rewards: {
      type: "by_performance",
      baseRewards: { coins: 0, gems: 8 },
    },
    seasonXpOnSettle: 28,
    seasonPointsMultiplier: 2,
  },
  {
    tournamentId: CASUAL_DAILY_SOLO_CHALLENGE_SOLITAIRE_ID,
    title: "Daily · Solitaire 单人最高分",
    gameId: "solitaire",
    matchType: "tournament_a",
    status: "open",
    instanceScope: "daily",
    scoreAggregation: "best_score",
    entryBilling: "per_instance",
    instanceTimezone: "UTC",
    maxPlayers: 1,
    matchmakingMinHumans: 1,
    entry: { kind: "none" },
    rewards: {
      type: "by_performance",
      baseRewards: { coins: 10, gems: 0 },
      /** 日榜周期收尾：按当日桶内名次叠加（与 `scoreTierRewards` 独立，结算时合并） */
      rankRewards: [
        { rankRange: [1, 1], multiplier: 1, coins: 80, gems: 0 },
        { rankRange: [2, 3], multiplier: 1, coins: 50, gems: 0 },
        { rankRange: [4, 10], multiplier: 1, coins: 30, gems: 0 },
        { rankRange: [11, 50], multiplier: 1, coins: 15, gems: 0 },
        { rankRange: [51, 999_999], multiplier: 1, coins: 5, gems: 0 },
      ],
      scoreTierRewardsGrantTiming: "on_each_run_settled",
      scoreTierRewards: [
        { minScore: 5000, coins: 40, gems: 0 },
        { minScore: 3000, coins: 25, gems: 0 },
        { minScore: 1500, coins: 15, gems: 0 },
        { minScore: 500, coins: 5, gems: 0 },
      ],
    },
    seasonXpOnSettle: 8,
    seasonPointsMultiplier: 0.5,
    omitFromPlayLobby: true,
  },
  {
    tournamentId: CASUAL_DAILY_SOLO_CHALLENGE_BLOCK_BLAST_ID,
    title: "Daily · Block Blast 单人最高分",
    gameId: "block_blast",
    matchType: "tournament_a",
    status: "open",
    instanceScope: "daily",
    scoreAggregation: "best_score",
    entryBilling: "per_instance",
    instanceTimezone: "UTC",
    maxPlayers: 1,
    matchmakingMinHumans: 1,
    entry: { kind: "none" },
    rewards: {
      type: "by_performance",
      baseRewards: { coins: 10, gems: 0 },
      /** 日榜周期收尾：按名次叠加（与 Solitaire 日榜可分别调数值） */
      rankRewards: [
        { rankRange: [1, 1], multiplier: 1, coins: 100, gems: 0 },
        { rankRange: [2, 3], multiplier: 1, coins: 60, gems: 0 },
        { rankRange: [4, 10], multiplier: 1, coins: 35, gems: 0 },
        { rankRange: [11, 50], multiplier: 1, coins: 18, gems: 0 },
        { rankRange: [51, 999_999], multiplier: 1, coins: 6, gems: 0 },
      ],
      scoreTierRewardsGrantTiming: "on_each_run_settled",
      scoreTierRewards: [
        { minScore: 100_000, coins: 50, gems: 0 },
        { minScore: 50_000, coins: 35, gems: 0 },
        { minScore: 20_000, coins: 20, gems: 0 },
        { minScore: 5000, coins: 8, gems: 0 },
      ],
    },
    seasonXpOnSettle: 8,
    seasonPointsMultiplier: 0.5,
    omitFromPlayLobby: true,
  },
  /** 赛季专场：锦标模型 join → submitScore，入场扣赛季券，结算 Pass XP（无赛季积分榜展示） */
  {
    tournamentId: CASUAL_SEASON_CHALLENGE_BB_TOURNAMENT_ID,
    title: "专场对局 · Block Blast",
    gameId: "block_blast",
    matchType: "season_challenge",
    status: "open",
    maxPlayers: 1,
    matchmakingMinHumans: 1,
    entry: { kind: "seasonVouchers", amount: 2 },
    rewards: {
      type: "by_performance",
      baseRewards: {},
    },
    seasonXpOnSettle: 15,
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
  gameId: string;
  matchType: string;
  status: string;
  instanceScope?: CasualInstanceScope;
  scoreAggregation?: CasualScoreAggregation;
  entryBilling?: CasualEntryBilling;
}> {
  return TOURNAMENT_DEFS.filter(
    (t) => t.matchType !== "season_challenge" && !t.omitFromPlayLobby
  ).map((t) => ({
    tournamentId: t.tournamentId,
    title: t.title,
    gameId: t.gameId,
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
  return TOURNAMENT_DEFS.filter((t) => t.matchType === "season_challenge").map((t) => ({
    matchId: t.tournamentId,
    title: t.title,
    voucherCost: t.entry.kind === "seasonVouchers" ? t.entry.amount : 0,
  }));
}

export function seasonPointsFromScore(
  score: number,
  multiplier: number
): number {
  const clamped = Math.max(0, Math.min(score, 10_000_000));
  return Math.floor((clamped / 1000) * multiplier);
}
