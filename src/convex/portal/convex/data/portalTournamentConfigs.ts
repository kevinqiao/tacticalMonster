/** Portal 锦标配表：单人 P75 + 5 人多人竞技，纯积分无钱包 */

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
  seedQuantileSuccess?: { quantile: "p75" };
  rankRates?: PortalRankRateEntry[];
  referenceScoreQuantiles?: PortalReferenceScoreQuantiles;
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

export const PORTAL_TOURNAMENT_DEFINITIONS: PortalTournamentDefinition[] = [
  soloDef("solitaire", "Solitaire"),
  multiDef("solitaire", "Solitaire"),
  soloDef("block_blast", "Block Blast"),
  multiDef("block_blast", "Block Blast"),
  soloDef("match_3", "Match-3"),
  multiDef("match_3", "Match-3"),
  soloDef("tower_arena", "Tower Arena"),
  multiDef("tower_arena", "Tower Arena"),
  soloDef("yatz", "Yatz"),
  multiDef("yatz", "Yatz"),
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
  rank: number
): number {
  if (!def.rankPoints) return 0;
  return def.rankPoints[rank] ?? 0;
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
  seedScoreThreshold?: number
): number {
  const pts = def.soloPoints ?? PORTAL_SOLO_POINTS;
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
