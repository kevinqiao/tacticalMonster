/**
 * ScoreThresholdControl 模块主入口
 * 重新导出所有组件，提供统一的访问接口
 */

// ==================== 核心控制器 ====================
export { ScoreThresholdPlayerController } from "./core/ScoreThresholdPlayerController";


// ==================== 管理器 ====================
export { IncrementalStatisticsManager } from "./managers/IncrementalStatisticsManager";
export { IntelligentExperienceManager } from "./managers/IntelligentExperienceManager";
export { PlayerHistoricalDataManager } from "./managers/PlayerHistoricalDataManager";

// ==================== 类型定义 ====================
export * from "./config/types";

// ==================== 配置 ====================
export * from "./config/config";

// ==================== 函数接口 ====================
// 核心功能
// export * from "./functions/core";
// 配置管理
// 智能体验

// 种子推荐系统
export * from "./functions/seedRecommendation";

// 数据迁移
export * from "./functions/dataMigration";

// 示例和测试


// ==================== 集成 ====================
export * from "./integration/scoreThresholdIntegration";

// ==================== 测试 ====================
export * from "./tests/testFunctions";

// ==================== 系统信息 ====================
export const SYSTEM_INFO = {
    name: "ScoreThresholdControl",
    version: "2.1.0",
    description: "分数门槛控制系统 - 统一架构版本",
    architecture: "分层架构设计 + 统一数据模型",
    features: [
        "智能体验管理",
        "动态排名分配",
        "学习曲线优化",
        "情感体验管理",
        "混合模式支持",
        "批量操作优化",
        "种子难度分析",
        "智能种子推荐",
        "统一数据模型",
        "数据迁移支持"
    ],
    directoryStructure: {
        core: "核心控制器",
        managers: "业务管理器",
        config: "配置和类型",
        functions: "Convex函数接口",
        integration: "系统集成",
        docs: "文档",
        tests: "测试和示例"
    }
};
