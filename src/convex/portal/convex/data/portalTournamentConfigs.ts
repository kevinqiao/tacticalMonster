/**
 * Portal 锦标配表：单人 P75 + 多人竞技（积分桌 / 金币桌）。
 * title 为默认文案；玩家端按 tournamentId 走
 * `portal.player` → `tournaments.{tournamentId}.title`（见 portalTournamentLocalize）。
 * 共享奖励常数 ← portalEconomyGenerated（SSOT: portal-economy.json）。
 */

import {
  PORTAL_SOLO_POINTS as GENERATED_SOLO_POINTS,
  PORTAL_MULTI_RANK_POINTS as GENERATED_MULTI_RANK_POINTS,
  PORTAL_MULTI_COIN_ENTRY as GENERATED_MULTI_COIN_ENTRY,
  PORTAL_MULTI_COIN_RANK_REWARDS as GENERATED_MULTI_COIN_RANK_REWARDS,
  PORTAL_RANK_RATES_5,
} from "./portalEconomyGenerated";

export type EntryCost = { kind: "none" } | { kind: "coins"; amount: number } | { kind: "gems"; amount: number };

export type PortalReferenceScoreQuantiles = {
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

export type PortalRankRateEntry = { rank: number; odd: number };

/** Newbie solo ladder segment (A/B) or merged main (C). */
export type PortalSoloSegment = "ritual_a" | "transition_b" | "merged_c";

export type PortalSoloRewardTierKind = "fail" | "success";

/**
 * Single-target solo points (SSOT: portal-economy.json).
 * On hit: success + clearBonus; on miss: fail.
 */
export type PortalPointsConfig = {
  fail: number;
  success: number;
  clearBonus: number;
};

/** Legacy lobby override shapes still accepted by normalize. */
export type PortalPointsConfigLegacy = {
  success: number;
  fail: number;
  clearBonus?: number;
};

/** Pre–single-target segmented override (lobby snapshots). */
export type PortalPointsConfigSegmentedLegacy = {
  fail: number;
  ritual_a: { clear: number; bonus: number };
  transition_b: { clear: number; bonus: number };
  merged_c: { p75: number; p90: number };
};

export type PortalSoloPointsOverride =
  | PortalPointsConfig
  | PortalPointsConfigLegacy
  | PortalPointsConfigSegmentedLegacy;

export type PortalRankPointsConfig = Record<number, number>;

export type PortalTournamentCoinRewards = {
  /** Solo: coins on success / fail (optional). */
  soloSuccess?: number;
  soloFail?: number;
  /** Multi: coins by rank (string keys "1".."5"). */
  rankCoins?: Record<string, number>;
};

export type PortalTournamentTimingMode = "sync" | "async";

/**
 * Solo-bot 名次推荐用的难度分轨：
 * - `default`：低分 quantile + ≥p50 走全局 BOT_DIFFICULTY_RULES
 * - `none`：整条链路只走该桌 rankRates（+ 个人 rankCounts 平衡）；金币竞技用
 */
export type PortalBotDifficultyProfileId = "default" | "none";

export interface PortalTournamentDefinition {
  tournamentId: string;
  title: string;
  gameType: string;
  matchType: "solo_p75" | "multi_ranked";
  status: string;
  maxPlayers: number;
  entry: EntryCost;
  /**
   * Multi only: `async` = join-or-create open tables (no queue);
   * `sync` = classic matchmaking queue. Solo ignores this.
   */
  timingMode?: PortalTournamentTimingMode;
  /** Hide from play lobby listings when true. */
  omitFromPlayLobby?: boolean;
  /** 单人挑战积分 */
  soloPoints?: PortalPointsConfig;
  /** 多人按名次积分 */
  rankPoints?: PortalRankPointsConfig;
  /** Optional coin rewards (template defaults; lobby offering may override). */
  coinRewards?: PortalTournamentCoinRewards;
  /**
   * Solo 成功线：取种子分位后再可选乘 scoreMultiplier（Block Blast 用来抬通关难度）。
   * 仪式段 binding 的 p50 默认不乘 scoreMultiplier（见 ritualScoreMultiplier，缺省 1）。
   */
  seedQuantileSuccess?: {
    quantile: "p75" | "p90";
    scoreMultiplier?: number;
    /** 仪式 A（successQuantile=p50）专用系数；缺省 1，不抬线。 */
    ritualScoreMultiplier?: number;
  };
  rankRates?: PortalRankRateEntry[];
  /** Solo-bot 难度分轨；缺省 `default`。 */
  botDifficultyProfile?: PortalBotDifficultyProfileId;
  referenceScoreQuantiles?: PortalReferenceScoreQuantiles;
}

export type PortalSeedQuantileSuccessConfig = NonNullable<
  PortalTournamentDefinition["seedQuantileSuccess"]
>;

/** 与 blockBlastOneLineClearScore(8) 对齐：BB 仪式段 A 消一行/列。 */
export const BLOCK_BLAST_RITUAL_ONE_LINE_CLEAR_SCORE = 8;

export type PortalSeedSuccessQuantile = "p25" | "p50" | "p75" | "p90";

/**
 * p25 / p50（新手阶梯）→ ritualScoreMultiplier ?? 1；
 * p75/p90 → scoreMultiplier（缺省 1）。
 */
export function resolveScoreMultiplierForSuccessQuantile(
  seedQuantileSuccess:
    | Pick<PortalSeedQuantileSuccessConfig, "scoreMultiplier" | "ritualScoreMultiplier">
    | null
    | undefined,
  quantile: PortalSeedSuccessQuantile | null | undefined
): number {
  if (quantile === "p25" || quantile === "p50") {
    const ritual = seedQuantileSuccess?.ritualScoreMultiplier;
    if (typeof ritual === "number" && Number.isFinite(ritual) && ritual > 0) return ritual;
    return 1;
  }
  const mult = seedQuantileSuccess?.scoreMultiplier;
  if (typeof mult === "number" && Number.isFinite(mult) && mult > 0) return mult;
  return 1;
}

/** 从种子分位 + 模板系数解析 Solo 通关线。 */
export function resolveSeedSuccessThresholdFromQuantiles(
  quantiles: Partial<Record<PortalSeedSuccessQuantile, number>> | null | undefined,
  quantile: PortalSeedSuccessQuantile | null | undefined,
  scoreMultiplier?: number | null
): number | undefined {
  if (
    !quantiles ||
    (quantile !== "p25" &&
      quantile !== "p50" &&
      quantile !== "p75" &&
      quantile !== "p90")
  ) {
    return undefined;
  }
  const raw = quantiles[quantile];
  if (typeof raw !== "number" || !Number.isFinite(raw)) return undefined;
  const mult =
    typeof scoreMultiplier === "number" &&
    Number.isFinite(scoreMultiplier) &&
    scoreMultiplier > 0
      ? scoreMultiplier
      : 1;
  return Math.max(0, Math.floor(raw * mult));
}

/** BB 仪式一消，或分位×系数。 */
export function resolveSoloSeedSuccessThreshold(args: {
  gameType: string;
  ritualOneLineClear?: boolean;
  quantiles?: Partial<Record<PortalSeedSuccessQuantile, number>> | null;
  successQuantile?: PortalSeedSuccessQuantile | null;
  seedQuantileSuccess?:
    | Pick<PortalSeedQuantileSuccessConfig, "scoreMultiplier" | "ritualScoreMultiplier">
    | null;
}): number | undefined {
  if (args.ritualOneLineClear && args.gameType === "block_blast") {
    return BLOCK_BLAST_RITUAL_ONE_LINE_CLEAR_SCORE;
  }
  const q = args.successQuantile;
  const mult = resolveScoreMultiplierForSuccessQuantile(args.seedQuantileSuccess, q);
  return resolveSeedSuccessThresholdFromQuantiles(args.quantiles, q, mult);
}

export function applySeedSuccessScoreMultiplier(
  rawThreshold: number,
  scoreMultiplier?: number | null
): number {
  const mult =
    typeof scoreMultiplier === "number" &&
    Number.isFinite(scoreMultiplier) &&
    scoreMultiplier > 0
      ? scoreMultiplier
      : 1;
  return Math.max(0, Math.floor(rawThreshold * mult));
}

/**
 * Free → ad → ticket daily ladder only applies to unpaid templates.
 * Coin / gem entry tables are paid separately and must not consume that quota.
 */
export function portalTournamentUsesPlayEntryLadder(
  def: Pick<PortalTournamentDefinition, "entry">
): boolean {
  return def.entry.kind === "none";
}

function isCanonicalSoloPoints(raw: unknown): raw is PortalPointsConfig {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Record<string, unknown>;
  return (
    typeof o.fail === "number" &&
    Number.isFinite(o.fail) &&
    typeof o.success === "number" &&
    Number.isFinite(o.success) &&
    typeof o.clearBonus === "number" &&
    Number.isFinite(o.clearBonus) &&
    o.ritual_a == null &&
    o.merged_c == null
  );
}

function isLegacySoloPoints(raw: unknown): raw is PortalPointsConfigLegacy {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Record<string, unknown>;
  return (
    typeof o.success === "number" &&
    Number.isFinite(o.success) &&
    typeof o.fail === "number" &&
    Number.isFinite(o.fail) &&
    o.ritual_a == null &&
    o.merged_c == null &&
    (o.clearBonus == null ||
      (typeof o.clearBonus === "number" && Number.isFinite(o.clearBonus)))
  );
}

function isSegmentedSoloPoints(
  raw: unknown
): raw is PortalPointsConfigSegmentedLegacy {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Record<string, unknown>;
  const a = o.ritual_a as Record<string, unknown> | undefined;
  const b = o.transition_b as Record<string, unknown> | undefined;
  const c = o.merged_c as Record<string, unknown> | undefined;
  return (
    typeof o.fail === "number" &&
    Number.isFinite(o.fail) &&
    !!a &&
    typeof a.clear === "number" &&
    typeof a.bonus === "number" &&
    !!b &&
    typeof b.clear === "number" &&
    typeof b.bonus === "number" &&
    !!c &&
    typeof c.p75 === "number" &&
    typeof c.p90 === "number"
  );
}

/** Points granted when the single challenge target is hit. */
export function portalSoloSuccessTotal(pts: PortalPointsConfig): number {
  return Math.floor(pts.success) + Math.floor(pts.clearBonus);
}

/** Normalize overrides into `{ fail, success, clearBonus }`. */
export function normalizePortalSoloPoints(
  raw: PortalSoloPointsOverride | null | undefined
): PortalPointsConfig {
  const base: PortalPointsConfig = {
    fail: GENERATED_SOLO_POINTS.fail,
    success: GENERATED_SOLO_POINTS.success,
    clearBonus: GENERATED_SOLO_POINTS.clearBonus,
  };
  if (!raw) return base;
  if (isCanonicalSoloPoints(raw)) {
    return {
      fail: Math.floor(raw.fail),
      success: Math.floor(raw.success),
      clearBonus: Math.floor(raw.clearBonus),
    };
  }
  if (isLegacySoloPoints(raw)) {
    return {
      fail: Math.floor(raw.fail),
      success: Math.floor(raw.success),
      clearBonus:
        typeof raw.clearBonus === "number" && Number.isFinite(raw.clearBonus)
          ? Math.floor(raw.clearBonus)
          : base.clearBonus,
    };
  }
  if (!isSegmentedSoloPoints(raw)) return base;
  // Legacy dual-tier snapshots → single success line from clear / p75.
  return {
    fail: Math.floor(raw.fail),
    success: Math.floor(raw.merged_c.p75),
    clearBonus: base.clearBonus,
  };
}

/** Merge template rewards with optional lobby offering override. */
export function resolveEffectiveTournamentRewards(
  def: PortalTournamentDefinition,
  rewardsOverride?: {
    soloPoints?: PortalSoloPointsOverride;
    rankPoints?: Record<string, number>;
    coins?: PortalTournamentCoinRewards;
  } | null
) {
  const soloPoints = normalizePortalSoloPoints(
    rewardsOverride?.soloPoints ?? def.soloPoints
  );
  const rankPoints = rewardsOverride?.rankPoints
    ? Object.fromEntries(
        Object.entries(rewardsOverride.rankPoints).map(([k, v]) => [Number(k), v])
      )
    : def.rankPoints;
  const coinRewards = {
    ...(def.coinRewards ?? {}),
    ...(rewardsOverride?.coins ?? {}),
  };
  return { soloPoints, rankPoints, coinRewards };
}

/** 奖励常数 ← portalEconomyGenerated（SSOT: portal-economy.json） */
export const PORTAL_SOLO_POINTS: PortalPointsConfig =
  normalizePortalSoloPoints(GENERATED_SOLO_POINTS);

export const PORTAL_MULTI_RANK_POINTS: PortalRankPointsConfig = {
  ...GENERATED_MULTI_RANK_POINTS,
};

const CASUAL_RANK_RATES_5 = PORTAL_RANK_RATES_5;

const CASUAL_RANK_RATES_4 = [
  { rank: 1, odd: 35 },
  { rank: 2, odd: 28 },
  { rank: 3, odd: 22 },
  { rank: 4, odd: 15 },
] as const;

/** 5 人金币竞技：入场 / 名次币 ← generated */
export const PORTAL_MULTI_COIN_ENTRY = GENERATED_MULTI_COIN_ENTRY;
export const PORTAL_MULTI_COIN_RANK_REWARDS: Record<string, number> = {
  ...GENERATED_MULTI_COIN_RANK_REWARDS,
};

function soloDef(gameType: string, title: string): PortalTournamentDefinition {
  return {
    tournamentId: `portal_solo_p75_${gameType}`,
    title: `${title} · 单人挑战`,
    gameType,
    matchType: "solo_p75",
    status: "open",
    maxPlayers: 1,
    entry: { kind: "none" },
    soloPoints: PORTAL_SOLO_POINTS,
    // BB bot 分位相对真人偏低：合并后通关线 = p75 × 1.2；仪式 A 的 p50 不抬（ritualScoreMultiplier 缺省 1）
    seedQuantileSuccess:
      gameType === "block_blast"
        ? { quantile: "p75", scoreMultiplier: 1.2, ritualScoreMultiplier: 1 }
        : { quantile: "p75" },
  };
}

function multiDef(gameType: string, title: string): PortalTournamentDefinition {
  return {
    tournamentId: `portal_multi_${gameType}`,
    title: `${title} · 多人竞技`,
    gameType,
    matchType: "multi_ranked",
    status: "open",
    maxPlayers: 5,
    timingMode: "async",
    entry: { kind: "none" },
    rankPoints: PORTAL_MULTI_RANK_POINTS,
    rankRates: [...CASUAL_RANK_RATES_5],
  };
}

/**
 * 金币入场多人桌（与免费积分桌并存；Lobby offerings 勾选后出现）。
 * 周积分与免费桌相同（PORTAL_MULTI_RANK_POINTS）；另按名次发金币。
 */
function multiCoinDef(gameType: string, title: string): PortalTournamentDefinition {
  return {
    tournamentId: `portal_multi_coin_${gameType}`,
    title: `${title} · 金币竞技`,
    gameType,
    matchType: "multi_ranked",
    status: "open",
    maxPlayers: 5,
    timingMode: "async",
    entry: { kind: "coins", amount: PORTAL_MULTI_COIN_ENTRY },
    rankPoints: { ...PORTAL_MULTI_RANK_POINTS },
    coinRewards: { rankCoins: { ...PORTAL_MULTI_COIN_RANK_REWARDS } },
    rankRates: [...CASUAL_RANK_RATES_5],
    /** 金币桌：solo-bot 名次只走 rankRates，不做体验难度保护 */
    botDifficultyProfile: "none",
  };
}

export const PORTAL_TOURNAMENT_DEFINITIONS: PortalTournamentDefinition[] = [
  soloDef("solitaire", "Solitaire"),
  multiDef("solitaire", "Solitaire"),
  multiCoinDef("solitaire", "Solitaire"),
  soloDef("block_blast", "Block Blast"),
  multiDef("block_blast", "Block Blast"),
  multiCoinDef("block_blast", "Block Blast"),
  soloDef("match_3", "Match-3"),
  multiDef("match_3", "Match-3"),
  multiCoinDef("match_3", "Match-3"),
  soloDef("tower_arena", "Tower Arena"),
  multiDef("tower_arena", "Tower Arena"),
  multiCoinDef("tower_arena", "Tower Arena"),
  soloDef("yatz", "Yatz"),
  multiDef("yatz", "Yatz"),
  multiCoinDef("yatz", "Yatz"),
];

const byId = new Map(PORTAL_TOURNAMENT_DEFINITIONS.map((d) => [d.tournamentId, d]));

export function getPortalTournamentDefinition(tournamentId: string): PortalTournamentDefinition | null {
  return byId.get(tournamentId) ?? null;
}

export function listPortalTournamentsForGame(gameType: string): PortalTournamentDefinition[] {
  return PORTAL_TOURNAMENT_DEFINITIONS.filter((d) => d.gameType === gameType);
}

export function portalTournamentIdForMode(
  gameType: string,
  mode: "solo" | "multi"
): string | null {
  const suffix = mode === "solo" ? `portal_solo_p75_${gameType}` : `portal_multi_${gameType}`;
  return byId.has(suffix) ? suffix : null;
}

/** @deprecated compat for copied casual code */
export const getTournamentDefinition = getPortalTournamentDefinition;
export type CasualTournamentDefinition = PortalTournamentDefinition;

export function effectiveGameSequence(def: PortalTournamentDefinition): string[] {
  return [def.gameType];
}

export function seatGameTypeForTemplate(def: PortalTournamentDefinition, _gameIndex: number): string {
  return def.gameType;
}

export function isPeriodScopedTournament(_def: PortalTournamentDefinition): boolean {
  return false;
}

export function isDeprecatedDailySoloTournament(_id: string): boolean {
  return false;
}

export function effectiveEntryBilling(_def: PortalTournamentDefinition): "per_match" {
  return "per_match";
}

export function applyScaledCurrencyCost(base: number, _mult?: number, _delta?: number): number {
  return base;
}

export function applyVoucherCost(base: number, _mult?: number, _delta?: number): number {
  return base;
}

export function portalRankPointDelta(
  def: PortalTournamentDefinition,
  rank: number,
  rewardsOverride?: {
    rankPoints?: Record<string, number>;
  } | null
): number {
  const { rankPoints } = resolveEffectiveTournamentRewards(def, rewardsOverride);
  if (!rankPoints) return 0;
  return rankPoints[rank] ?? 0;
}

/** Multi coin table payout for a final rank (0 if none). */
export function portalRankCoinReward(
  def: PortalTournamentDefinition,
  rank: number,
  rewardsOverride?: {
    coins?: PortalTournamentCoinRewards;
  } | null
): number {
  const { coinRewards } = resolveEffectiveTournamentRewards(def, rewardsOverride);
  const raw = coinRewards.rankCoins?.[String(rank)];
  if (typeof raw !== "number" || !Number.isFinite(raw)) return 0;
  return Math.max(0, Math.floor(raw));
}

export function isPortalP75Success(
  def: PortalTournamentDefinition,
  score: number,
  seedScoreThreshold?: number
): boolean {
  if (def.matchType !== "solo_p75") return false;
  if (typeof seedScoreThreshold !== "number" || !Number.isFinite(seedScoreThreshold)) return false;
  return score >= seedScoreThreshold;
}

/** Infer A/B/C when seedBinding.segment is missing (legacy rows). */
export function inferSoloSegmentFromBinding(binding?: {
  segment?: PortalSoloSegment | string | null;
  ritualOneLineClear?: boolean;
  successQuantile?: string | null;
} | null): PortalSoloSegment {
  if (
    binding?.segment === "ritual_a" ||
    binding?.segment === "transition_b" ||
    binding?.segment === "merged_c"
  ) {
    return binding.segment;
  }
  if (binding?.ritualOneLineClear) return "ritual_a";
  if (binding?.successQuantile === "p25" || binding?.successQuantile === "p50") {
    return "transition_b";
  }
  return "merged_c";
}

export type PortalSoloRewardTierResult = {
  delta: number;
  tier: PortalSoloRewardTierKind;
  challengeSuccess: boolean;
  reason: string;
  segment: PortalSoloSegment;
};

/**
 * Single-target solo rewards:
 * hit clearThreshold → success + clearBonus; miss → fail.
 */
export function portalSoloRewardTier(args: {
  def: PortalTournamentDefinition;
  score: number;
  clearThreshold?: number;
  segment?: PortalSoloSegment;
  quantiles?: Partial<Record<PortalSeedSuccessQuantile, number>> | null;
  rewardsOverride?: {
    soloPoints?: PortalSoloPointsOverride;
  } | null;
}): PortalSoloRewardTierResult {
  const { soloPoints: pts } = resolveEffectiveTournamentRewards(
    args.def,
    args.rewardsOverride
  );
  const segment = args.segment ?? "merged_c";
  const challengeSuccess = isPortalP75Success(
    args.def,
    args.score,
    args.clearThreshold
  );

  if (!challengeSuccess) {
    return {
      delta: pts.fail,
      tier: "fail",
      challengeSuccess: false,
      reason: "solo_fail",
      segment,
    };
  }

  return {
    delta: portalSoloSuccessTotal(pts),
    tier: "success",
    challengeSuccess: true,
    reason: "solo_success",
    segment,
  };
}

/** Display / bot helper: single-target delta. */
export function portalSoloPointDelta(
  def: PortalTournamentDefinition,
  score: number,
  seedScoreThreshold?: number,
  rewardsOverride?: {
    soloPoints?: PortalSoloPointsOverride;
  } | null,
  opts?: {
    segment?: PortalSoloSegment;
    quantiles?: Partial<Record<PortalSeedSuccessQuantile, number>> | null;
  }
): number {
  return portalSoloRewardTier({
    def,
    score,
    clearThreshold: seedScoreThreshold,
    segment: opts?.segment ?? "merged_c",
    quantiles: opts?.quantiles,
    rewardsOverride,
  }).delta;
}

/** Stub for copied score effects */
export function findCasualRankRewardEntry(): undefined {
  return undefined;
}

export function findHighestScoreTierReward(): undefined {
  return undefined;
}

export function resolveAsyncScoreTierRewards(): undefined {
  return undefined;
}

export function casualSettleBaseCoins(): number {
  return 0;
}

export function casualSettleBaseGems(): number {
  return 0;
}

export type CasualReferenceScoreQuantiles = PortalReferenceScoreQuantiles;
export type CasualRankRateEntry = PortalRankRateEntry;

export function isJoinableCasualTournament(def: PortalTournamentDefinition): boolean {
  return def.status === "open";
}

/** Multi async: join existing open table or create; never enqueue. */
export function isPortalAsyncMultiTemplate(
  def: Pick<PortalTournamentDefinition, "maxPlayers" | "timingMode" | "matchType">
): boolean {
  if (def.maxPlayers <= 1) return false;
  if (def.timingMode === "sync") return false;
  if (def.timingMode === "async") return true;
  // Default multi_ranked (pre-field) behaves as async.
  return def.matchType === "multi_ranked";
}

/** Multi sync: classic matchmaking queue. */
export function isPortalSyncMultiTemplate(
  def: Pick<PortalTournamentDefinition, "maxPlayers" | "timingMode" | "matchType">
): boolean {
  return def.maxPlayers > 1 && def.timingMode === "sync";
}

export function shouldAppearInCasualPlayLobby(def: PortalTournamentDefinition): boolean {
  return def.matchType === "solo_p75" || def.matchType === "multi_ranked";
}

export function listPlayCasualTournaments(): Array<{
  tournamentId: string;
  title: string;
  gameType: string;
  matchType: string;
  maxPlayers: number;
}> {
  return PORTAL_TOURNAMENT_DEFINITIONS.filter(shouldAppearInCasualPlayLobby).map((t) => ({
    tournamentId: t.tournamentId,
    title: t.title,
    gameType: t.gameType,
    matchType: t.matchType,
    maxPlayers: t.maxPlayers,
  }));
}

export function listPortalTournamentsForGameType(gameType: string) {
  return listPlayCasualTournaments().filter((t) => t.gameType === gameType);
}

export function applyPassXpFromModifiers(base: number): number {
  return base;
}

export function effectiveScoreAggregation(): "single_match" {
  return "single_match";
}

export function listTournamentDefinitions(): PortalTournamentDefinition[] {
  return PORTAL_TOURNAMENT_DEFINITIONS;
}

export function getTournamentRankRates(def: PortalTournamentDefinition): PortalRankRateEntry[] {
  return def.rankRates ?? [];
}

export function getTournamentBotDifficultyProfile(
  def: Pick<PortalTournamentDefinition, "botDifficultyProfile">
): PortalBotDifficultyProfileId {
  return def.botDifficultyProfile ?? "default";
}
