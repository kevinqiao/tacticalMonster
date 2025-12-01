/**
 * Boss AI模块导出
 */

export { BossAIService, BossAction, BossAIDecision } from "./bossAIService";
export { PhaseManager, PhaseCheckResult } from "./phaseManager";
export { ConditionEvaluator, Condition, BossState, GameState } from "./conditionEvaluator";
export { TargetSelector, TargetCharacter, TargetStrategy } from "./targetSelector";
export { BehaviorTreeExecutor, BehaviorTreeNode, ExecutionContext, ActionResult } from "./behaviorTreeExecutor";

// 导出API接口
export { getBossAIDecision, executeBossAction } from "./bossAIActions";
export { handleBossTurn } from "./bossTurnHandler";

