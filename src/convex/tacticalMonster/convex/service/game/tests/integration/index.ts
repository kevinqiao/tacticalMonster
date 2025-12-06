/**
 * 集成测试入口文件
 * 导出所有集成测试函数，使其在 Convex Dashboard 中可见
 */

// 导出玩家初始化测试
export { createTestMonsterConfig, testBatchPlayerInitialization, testPlayerInitialization } from "./playerInitialization.test";

// 导出匹配系统测试
export { testJoinMatchingQueue, testMatchingFlow } from "./matchingSystem.test";

// 导出游戏流程测试
export { testCompleteGameFlow, testCreateGameInstance, testGameFlowWithScenario } from "./gameFlow.test";

// 导出奖励系统测试
export { testCompleteGameWithRewards, testGameRewards } from "./rewardSystem.test";

// 导出端到端测试
export { testEndToEndGameFlow, testQuickEndToEnd } from "./endToEnd.test";

// 导出 gameMatchingService 测试
export { testBatchJoinMatching, testCompleteMatchingFlow, testJoinTournamentMatching, testPowerValidation, testTierDerivation } from "./gameMatchingService.test";

