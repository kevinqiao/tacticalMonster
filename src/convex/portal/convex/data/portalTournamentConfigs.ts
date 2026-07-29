/**
 * Portal 锦标配表：单人 P75 + 多人竞技（积分桌 / 金币桌）。
 * title 为默认文案；玩家端按 tournamentId 走
 * `portal.player` → `tournaments.{tournamentId}.title`（见 portalTournamentLocalize）。
 */

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

export type PortalPointsConfig = {
  success: number;
  fail: number;
};

export type PortalRankPointsConfig = Record<number, number>;

export type PortalTournamentCoinRewards = {
  /** Solo: coins on success / fail (optional). */
  soloSuccess?: number;
  soloFail?: number;
  /** Multi: coins by rank (string keys "1".."5"). */
  rankCoins?: Record<string, number>;
};

export interface PortalTournamentDefinition {
  tournamentId: string;
  title: string;
  gameType: string;
  matchType: "solo_p75" | "multi_ranked";
  status: string;
  maxPlayers: number;
  entry: EntryCost;
  /** 单人挑战积分 */
  soloPoints?: PortalPointsConfig;
  /** 多人按名次积分 */
  rankPoints?: PortalRankPointsConfig;
  /** Optional coin rewards (template defaults; lobby offering may override). */
  coinRewards?: PortalTournamentCoinRewards;
  seedQuantileSuccess?: { quantile: "p75" };
  rankRates?: PortalRankRateEntry[];
  referenceScoreQuantiles?: PortalReferenceScoreQuantiles;
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

/** Merge template rewards with optional lobby offering override. */
export function resolveEffectiveTournamentRewards(
  def: PortalTournamentDefinition,
  rewardsOverride?: {
    soloPoints?: PortalPointsConfig;
    rankPoints?: Record<string, number>;
    coins?: PortalTournamentCoinRewards;
  } | null
) {
  const soloPoints = rewardsOverride?.soloPoints ?? def.soloPoints;
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

export const PORTAL_SOLO_POINTS: PortalPointsConfig = { success: 3, fail: -1 };

export const PORTAL_MULTI_RANK_POINTS: PortalRankPointsConfig = {
  1: 5,
  2: 3,
  3: 1,
  4: -1,
  5: -2,
};

const CASUAL_RANK_RATES_5 = [
  { rank: 1, odd: 30 },
  { rank: 2, odd: 25 },
  { rank: 3, odd: 20 },
  { rank: 4, odd: 15 },
  { rank: 5, odd: 10 },
] as const;

const CASUAL_RANK_RATES_4 = [
  { rank: 1, odd: 35 },
  { rank: 2, odd: 28 },
  { rank: 3, odd: 22 },
  { rank: 4, odd: 15 },
] as const;

/** 5 人金币竞技：入场 20，奖励 45 / 25 / 15 / 5（第 5 名无金币） */
export const PORTAL_MULTI_COIN_ENTRY = 20;
export const PORTAL_MULTI_COIN_RANK_REWARDS: Record<string, number> = {
  "1": 45,
  "2": 25,
  "3": 15,
  "4": 5,
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
    seedQuantileSuccess: { quantile: "p75" },
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
    entry: { kind: "coins", amount: PORTAL_MULTI_COIN_ENTRY },
    rankPoints: { ...PORTAL_MULTI_RANK_POINTS },
    coinRewards: { rankCoins: { ...PORTAL_MULTI_COIN_RANK_REWARDS } },
    rankRates: [...CASUAL_RANK_RATES_5],
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

export function portalSoloPointDelta(
  def: PortalTournamentDefinition,
  score: number,
  seedScoreThreshold?: number,
  rewardsOverride?: {
    soloPoints?: PortalPointsConfig;
  } | null
): number {
  const { soloPoints } = resolveEffectiveTournamentRewards(def, rewardsOverride);
  const pts = soloPoints ?? PORTAL_SOLO_POINTS;
  return isPortalP75Success(def, score, seedScoreThreshold) ? pts.success : pts.fail;
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
