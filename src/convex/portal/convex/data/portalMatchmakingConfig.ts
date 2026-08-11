import {
  CASUAL_CONSECUTIVE_LOSS_THRESHOLD,
  type BotStrategyPlayerContext,
} from "./portalPlayerStrategyTypes";

/** 多人匹配队列：仅 effectiveHumans > 1 时生效（与前端 CASUAL_MATCH_OPEN_TIMEOUT_MS 对齐） */
export const portal_match_queue_TIMEOUT_MS = 5_000;

/** eff=1：single human in async multi 开桌延迟（ms） */
export const CASUAL_SOLO_ASYNC_OPEN_DELAY_MS = 1_000;

/** Join 画像未命中 MATCHMAKING_RULES 时的默认 effectiveHumans */
export const CASUAL_DEFAULT_EFFECTIVE_HUMANS = 2;

export type QueueExpireAction = "solo" | "exit";

/** Join 未命中规则、且 effectiveHumans > 1 时的队列超时行为：按一人开桌 + bot */
export const CASUAL_DEFAULT_QUEUE_EXPIRE: QueueExpireAction = "solo";

export type MatchmakingRule = {
  id: string;
  priority: number;
  condition: (ctx: BotStrategyPlayerContext) => boolean;
  strategy: { effectiveHumans: number; expireAction?: QueueExpireAction };
};

/** 规则 strategy 未写 expireAction 时回退默认（仅 eff>1 入队超时使用） */
export function resolveMatchmakingExpireAction(
  strategy: MatchmakingRule["strategy"]
): QueueExpireAction {
  return strategy.expireAction ?? CASUAL_DEFAULT_QUEUE_EXPIRE;
}

/**
 * 画像规则（async multi + sync queue 共用）：
 * - eff=1：async 直接建私有桌（joinOpen=false）；sync 同步一人开桌
 * - eff>1：async 先尝试加入未满桌；sync 入队等人
 * 默认 CASUAL_DEFAULT_EFFECTIVE_HUMANS=2。
 */
export const MATCHMAKING_RULES: MatchmakingRule[] = [
  {
    id: "consecutive_loss_solo_table",
    priority: 110,
    condition: (ctx) => ctx.consecutiveLossStreak >= CASUAL_CONSECUTIVE_LOSS_THRESHOLD,
    strategy: { effectiveHumans: 1 },
  },
  {
    id: "returning_player_solo",
    priority: 100,
    condition: (ctx) => ctx.daysSinceLastMatch > 14,
    strategy: { effectiveHumans: 1 },
  },
  {
    id: "early_game_solo",
    priority: 50,
    condition: (ctx) =>
      ctx.completedMultiplayerMatches <= 5 && ctx.weeklyLeagueTier === "bronze",
    strategy: { effectiveHumans: 1 },
  },
];
