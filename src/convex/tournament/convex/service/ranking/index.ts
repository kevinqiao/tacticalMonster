/**
 * ScoreThresholdControl 模块主入口
 * 简化后的统一访问接口
 */

// ==================== 简化的管理器 ====================
// ScoreThresholdPlayerController removed - use managers directly

/** @deprecated 已废弃，功能已整合到其他管理器 */
export { PlayerHistoricalDataManager } from "./managers/PlayerHistoricalDataManager";

export { RankingRecommendationManager } from "./managers/RankingRecommendationManager";
/** @deprecated 已移除，功能未使用 */
// export { SeedRecommendationManager } from "./managers/SeedRecommendationManager";

// ==================== 类型定义和配置 ====================
// config.ts 和 types.ts 已移除（未被实际使用）
// schema.ts 保留（数据库表定义，被 schema.ts 导入）

// ==================== 系统信息 ====================
export const SYSTEM_INFO = {
    name: "RankingSystem",
    version: "4.0.0",
    description: "排名推荐系统 - 简化重构版本",
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
