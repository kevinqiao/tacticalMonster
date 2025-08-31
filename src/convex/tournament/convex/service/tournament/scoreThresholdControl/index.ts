/**
 * ScoreThresholdControl 模块主入口
 * 简化后的统一访问接口
 */

// ==================== 简化的管理器 ====================
// ScoreThresholdPlayerController removed - use managers directly
export { PlayerHistoricalDataManager } from "./managers/PlayerHistoricalDataManager";
export { RankingRecommendationManager } from "./managers/RankingRecommendationManager";
export { SeedRecommendationManager } from "./managers/SeedRecommendationManager";

// ==================== 类型定义 ====================
export * from "./config/types";

// ==================== 配置 ====================
export * from "./config/config";

// ==================== 系统信息 ====================
export const SYSTEM_INFO = {
    name: "ScoreThresholdControl",
    version: "3.1.0",
    description: "分数门槛控制系统 - 简化重构版本",
    architecture: "简化架构：核心需求驱动设计",
    coreFeatures: [
        "基于当前分数推荐排名",
        "基于历史数据推荐新种子"
    ],
    features: [
        "智能排名推荐",
        "种子推荐系统",
        "玩家历史分析",
        "技能等级评估",
        "概率分布计算",
        "缓存优化"
    ],
    directoryStructure: {
        managers: "简化管理器 - 排名推荐 & 种子推荐 & 历史数据",
        config: "配置和类型定义",
        docs: "架构文档"
    },
    changelog: {
        "3.1.0": "移除ScoreThresholdPlayerController：直接使用Manager架构",
        "3.0.0": "重构简化：从4个复杂manager简化为2个核心manager",
        "2.1.0": "统一架构版本",
        "2.0.0": "分层架构设计"
    }
};
