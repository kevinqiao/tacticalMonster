import type { RolloutTerminalReason } from "@/convex/solitaireArena/convex/service/seedPool/solitaireRecordedOpTypes";

export type RolloutEndCopy = {
  title: string;
  body: string;
};

export function rolloutEndCopy(reason: RolloutTerminalReason): RolloutEndCopy {
  switch (reason) {
    case "completed":
      return {
        title: "回放结束 · 通关",
        body: "模拟玩家在时限内完成接龙，本 rollout 以通关告终。",
      };
    case "stuck":
      return {
        title: "回放结束 · 卡住",
        body: "无更多合法步（无法抽牌、回收或走子），策略停止，本局记为卡住。",
      };
    case "time_up":
      return {
        title: "回放结束 · 时间到",
        body: "模拟用时达到 5 分钟上限，后续操作不再执行。",
      };
    case "exited":
      return {
        title: "回放结束 · 早退",
        body: "策略判定继续收益不大，模拟玩家提前结束本局。",
      };
    default:
      return {
        title: "回放结束",
        body: "本 rollout 已播放完全部操作。",
      };
  }
}
