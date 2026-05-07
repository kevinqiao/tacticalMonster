/** 静态锦标配置；join / submit 结算与 DB 种子共用 */

export type EntryCost =
  | { kind: "none" }
  | { kind: "coins"; amount: number }
  | { kind: "gems"; amount: number }
  /** 赛季专场入场：走 `casual_entries`，扣 `seasonVouchers`（活动修正见 join） */
  | { kind: "seasonVouchers"; amount: number };

export interface CasualTournamentDefinition {
  tournamentId: string;
  title: string;
  gameId: string;
  matchType: "tournament_a" | "tournament_b" | "tournament_c" | "season_challenge";
  status: string;
  entry: EntryCost;
  seasonXpOnSettle: number;
  seasonPointsMultiplier: number;
  rewardCoinsOnSettle: number;
  rewardGemsOnSettle: number;
  /** 真 · 专场可不展示异步排行榜（仍写入 score 供运营/扩展） */
  hideLeaderboard?: boolean;
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

const TOURNAMENT_DEFS: CasualTournamentDefinition[] = [
  {
    tournamentId: "casual_async_a_bb",
    title: "A · Block Blast (金币入门)",
    gameId: "block_blast",
    matchType: "tournament_a",
    status: "open",
    entry: { kind: "coins", amount: 25 },
    seasonXpOnSettle: 12,
    seasonPointsMultiplier: 0.8,
    rewardCoinsOnSettle: 25,
    rewardGemsOnSettle: 0,
  },
  {
    tournamentId: "casual_async_b_bb",
    title: "B · Block Blast (coins in / pool)",
    gameId: "block_blast",
    matchType: "tournament_b",
    status: "open",
    entry: { kind: "coins", amount: 40 },
    seasonXpOnSettle: 18,
    seasonPointsMultiplier: 1.2,
    rewardCoinsOnSettle: 70,
    rewardGemsOnSettle: 1,
  },
  {
    tournamentId: "casual_async_c_bb",
    title: "C · Block Blast (gems in / pool)",
    gameId: "block_blast",
    matchType: "tournament_c",
    status: "open",
    entry: { kind: "gems", amount: 5 },
    seasonXpOnSettle: 28,
    seasonPointsMultiplier: 2,
    rewardCoinsOnSettle: 0,
    rewardGemsOnSettle: 8,
  },
  /** 赛季专场：锦标模型 join → submitScore，入场扣赛季券，结算 Pass XP（无赛季积分榜展示） */
  {
    tournamentId: CASUAL_SEASON_CHALLENGE_BB_TOURNAMENT_ID,
    title: "专场对局 · Block Blast",
    gameId: "block_blast",
    matchType: "season_challenge",
    status: "open",
    entry: { kind: "seasonVouchers", amount: 2 },
    seasonXpOnSettle: 15,
    seasonPointsMultiplier: 0,
    rewardCoinsOnSettle: 0,
    rewardGemsOnSettle: 0,
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
}> {
  return TOURNAMENT_DEFS.filter((t) => t.matchType !== "season_challenge").map(
    ({ tournamentId, title, gameId, matchType, status }) => ({
      tournamentId,
      title,
      gameId,
      matchType,
      status,
    })
  );
}

/** 语义同 listPlayCasualTournaments（不含专场） */
export function getDefaultCasualTournaments(): Array<{
  tournamentId: string;
  title: string;
  gameId: string;
  matchType: string;
  status: string;
}> {
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
