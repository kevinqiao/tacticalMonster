/**
 * Battle Pass 测试入口文件
 * 统一导出所有 Battle Pass 测试函数，使其在 Convex Dashboard 中可见
 */

// 导出 Battle Pass 测试
export {
    testAddSeasonPoints,
    testClaimBattlePassRewards,
    testCompleteBattlePassFlow, testInitializeBattlePass, testPremiumPassFlow
} from "./integration/battlePassFlow.test";

