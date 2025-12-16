/**
 * 挑战关卡测试数据导出（Tournament模块）
 */

// 导出公开的mutation（供Dashboard调用）
export * from "./runTest";

// 不导出setupTestData，因为它是internalMutation，只供内部使用
// export * from "./setupTestData";

// 导出测试数据生成函数和验证函数
export * from "./testData";
export * from "./validateTestData";

