import type { CasualTournamentDefinition } from "./casualTournamentConfigs";

/** 连续「无名次奖励」场数达到此值 → 优先 solo 开桌 + 规则 110 */
export const CASUAL_CONSECUTIVE_LOSS_THRESHOLD = 3;

export const CASUAL_LOSS_STREAK_LOOKBACK_MAX = 10;

/** 再战令：与第 1 名分差比例 ≤ 此值视为近失 */
export const CASUAL_NEAR_MISS_GAP_RATIO = 0.1;

/** `false`：有再战令且在窗口内即可 `canReplay`（便于测试）；上线可改 `true` 恢复近失 */
export const CASUAL_REPLAY_REQUIRE_NEAR_MISS = false;

/** Convex 环境变量 `CASUAL_DEV_AUTO_REPLAY_TOKENS=1` 时，异步场 join/结算自动补再战令（仅本地调试） */
export function isCasualDevAutoReplayTokensEnabled(): boolean {
  const v = (process.env.CASUAL_DEV_AUTO_REPLAY_TOKENS ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/** 多人匹配队列：仅 effectiveMinHumans > 1 时生效（与前端 CASUAL_MATCH_OPEN_TIMEOUT_MS 对齐） */
export const CASUAL_MATCH_QUEUE_TIMEOUT_MS = 90_000;

/** 无规则命中时，按 matchType 的默认开桌所需真人数 */
export const BASELINE_EFFECTIVE_MIN_HUMANS_BY_MATCH_TYPE: Record<
  CasualTournamentDefinition["matchType"],
  number
> = {
  tournament_a: 1,
  tournament_b: 2,
  tournament_c: 1,
  season_challenge: 1,
};

export function getBaselineEffectiveMinHumans(
  matchType: CasualTournamentDefinition["matchType"]
): number {
  return BASELINE_EFFECTIVE_MIN_HUMANS_BY_MATCH_TYPE[matchType] ?? 1;
}

export type MatchmakingRule = {
  id: string;
  priority: number;
  condition: (ctx: BotStrategyPlayerContext) => boolean;
  effectiveMinHumans: number;
};

export const MATCHMAKING_RULES: MatchmakingRule[] = [
  {
    id: "consecutive_loss_solo_table",
    priority: 110,
    condition: (ctx) => ctx.consecutiveLossStreak >= CASUAL_CONSECUTIVE_LOSS_THRESHOLD,
    effectiveMinHumans: 1,
  },
  {
    id: "returning_player_solo",
    priority: 100,
    condition: (ctx) => ctx.daysSinceLastMatch > 14,
    effectiveMinHumans: 1,
  },
  {
    id: "early_game_solo",
    priority: 50,
    condition: (ctx) =>
      ctx.completedMultiplayerMatches <= 3 && ctx.seasonLadderPoints <= 20,
    effectiveMinHumans: 1,
  },
  {
    id: "tournament_b_multi_default",
    priority: 10,
    condition: (ctx) => ctx.matchType === "tournament_b",
    effectiveMinHumans: 2,
  },
];

export type CasualTableMode = "solo_bot" | "mixed_human";

export type CasualGameIdForBot = "solitaire" | "block_blast";

export type RankMinScoresByRank = Record<number, number>;

export type BotRankDistribution = {
  weights: Record<number, number>;
};

export type BotStrategyPlayerContext = {
  uid: string;
  tournamentId: string;
  templateId: string;
  matchType: CasualTournamentDefinition["matchType"];
  gameId: CasualGameIdForBot;
  maxPlayers: number;
  seasonLadderPoints: number;
  completedMultiplayerMatches: number;
  coinsBalance: number;
  daysSinceLastMatch: number;
  passLevel: number;
  passTrack: "none" | "standard" | "deluxe";
  consecutiveLossStreak: number;
};

export type BotDifficultyRule = {
  id: string;
  priority: number;
  condition: (ctx: BotStrategyPlayerContext) => boolean;
  strategy: BotRankDistribution | null;
};

const RANK_MIN_SOLITAIRE: Record<CasualTournamentDefinition["matchType"], RankMinScoresByRank> = {
  tournament_a: { 1: 450, 2: 280, 3: 120 },
  tournament_b: { 1: 500, 2: 320, 3: 180, 4: 80 },
  tournament_c: { 1: 550, 2: 380, 3: 240, 4: 120, 5: 40 },
  season_challenge: { 1: 480, 2: 300, 3: 150, 4: 60 },
};

const RANK_MIN_BLOCK_BLAST: Record<CasualTournamentDefinition["matchType"], RankMinScoresByRank> = {
  tournament_a: { 1: 12_000, 2: 7_000, 3: 3_000 },
  tournament_b: { 1: 15_000, 2: 9_000, 3: 5_000, 4: 2_000 },
  tournament_c: { 1: 18_000, 2: 11_000, 3: 6_500, 4: 3_500, 5: 1_000 },
  season_challenge: { 1: 14_000, 2: 8_000, 3: 4_000, 4: 1_500 },
};

export function getCasualRankMinScores(
  def: Pick<CasualTournamentDefinition, "matchType" | "gameId" | "maxPlayers">
): RankMinScoresByRank {
  const base =
    def.gameId === "block_blast"
      ? RANK_MIN_BLOCK_BLAST[def.matchType]
      : RANK_MIN_SOLITAIRE[def.matchType];
  const out: RankMinScoresByRank = {};
  for (let r = 1; r <= def.maxPlayers; r++) {
    out[r] = base[r] ?? base[def.maxPlayers] ?? 0;
  }
  return out;
}

export const BOT_DIFFICULTY_RULES: BotDifficultyRule[] = [
  {
    id: "consecutive_loss_recovery",
    priority: 110,
    condition: (ctx) => ctx.consecutiveLossStreak >= CASUAL_CONSECUTIVE_LOSS_THRESHOLD,
    strategy: { weights: { 1: 85, 2: 12, 3: 3, 4: 2, 5: 1 } },
  },
  {
    id: "returning_player",
    priority: 100,
    condition: (ctx) => ctx.daysSinceLastMatch > 14,
    strategy: { weights: { 1: 70, 2: 25, 3: 5, 4: 2, 5: 1 } },
  },
  {
    id: "coin_poor",
    priority: 90,
    condition: (ctx) => ctx.coinsBalance < 90,
    strategy: { weights: { 1: 60, 2: 30, 3: 10, 4: 5, 5: 2 } },
  },
  {
    id: "paid_pass_early",
    priority: 80,
    condition: (ctx) =>
      ctx.passTrack !== "none" &&
      ctx.passLevel <= 8 &&
      ctx.completedMultiplayerMatches <= 6,
    strategy: { weights: { 1: 55, 2: 30, 3: 15, 4: 5, 5: 2 } },
  },
  {
    id: "early_game_1_3",
    priority: 50,
    condition: (ctx) =>
      ctx.completedMultiplayerMatches <= 3 && ctx.seasonLadderPoints <= 20,
    strategy: { weights: { 1: 70, 2: 25, 3: 5, 4: 2, 5: 1 } },
  },
  {
    id: "early_game_4_10",
    priority: 40,
    condition: (ctx) =>
      ctx.completedMultiplayerMatches <= 10 && ctx.seasonLadderPoints <= 50,
    strategy: { weights: { 1: 40, 2: 35, 3: 20, 4: 5, 5: 2 } },
  },
  {
    id: "high_pass_level",
    priority: 35,
    condition: (ctx) => ctx.passLevel >= 15,
    strategy: null,
  },
];

export function isCasualMultiplayerAsyncTemplate(def: CasualTournamentDefinition): boolean {
  if (def.maxPlayers <= 1) return false;
  if (def.omitFromPlayLobby) return false;
  return (
    def.matchType === "tournament_a" ||
    def.matchType === "tournament_b" ||
    def.matchType === "tournament_c" ||
    def.matchType === "season_challenge"
  );
}
