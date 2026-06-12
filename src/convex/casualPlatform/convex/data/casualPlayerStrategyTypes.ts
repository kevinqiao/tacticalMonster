import type { CasualTournamentDefinition } from "./casualTournamentConfigs";
import type { RegisteredCasualGameType } from "./casualGameRegistry";

/** 连续「无名次奖励」场数达到此值 → join solo 开桌 + bot 难度规则 110 */
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

export type CasualTableMode = "solo_bot" | "mixed_human";

export type CasualGameIdForBot = RegisteredCasualGameType;

export type BotRankDistribution = {
  weights: Record<number, number>;
};

/** Join 匹配与 submit bot 难度共用的玩家画像 */
export type BotStrategyPlayerContext = {
  uid: string;
  tournamentId: string;
  templateId: string;
  matchType: CasualTournamentDefinition["matchType"];
  gameType: CasualGameIdForBot;
  maxPlayers: number;
  seasonLadderPoints: number;
  completedMultiplayerMatches: number;
  coinsBalance: number;
  daysSinceLastMatch: number;
  passLevel: number;
  passTrack: "none" | "standard" | "deluxe";
  consecutiveLossStreak: number;
};

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
