/**
 * 排名推荐配置类型定义
 */

export interface RankingConfig {
    // 分段阈值
    newbieThreshold: number;        // 新手阈值（默认10）
    growingThreshold: number;       // 成长阈值（默认30）

    // 权重配置
    newbieScoreWeight: number;      // 新手当前表现权重（默认0.9）
    newbieSkillWeight: number;      // 新手历史表现权重（默认0.1）
    growingScoreWeight: number;     // 成长当前表现权重（默认0.6）
    growingSkillWeight: number;     // 成长历史表现权重（默认0.4）
    veteranScoreWeight: number;     // 成熟当前表现权重（默认0.4）
    veteranSkillWeight: number;     // 成熟历史表现权重（默认0.6）

    // 调整参数
    newbieProtectionThreshold: number;      // 新手保护阈值（默认0.5）
    newbieProtectionMultiplier: number;     // 新手保护倍数（默认0.4）
    growingAdjustmentMultiplier: number;    // 成长调整倍数（默认0.6）
    veteranAdjustmentMultiplier: number;    // 成熟调整倍数（默认0.5）

    // 限制参数
    maxAICount: number;             // 最大AI数量（默认10）
    maxParticipants: number;        // 最大参与者数量（默认20）

    // 段位配置
    supportedParticipantCounts: number[];   // 支持的参与者数量（默认[4,6,8]）

    // 缓存配置
    cacheEnabled: boolean;          // 是否启用缓存（默认true）
    cacheExpiration: number;        // 缓存过期时间（毫秒，默认300000）

    // 信心度配置
    confidenceWeights: {
        matchCount: number;         // 比赛场次权重（默认0.2）
        consistency: number;        // 一致性权重（默认0.2）
        skillLevel: number;         // 技能水平权重（默认0.1）
        participantCount: number;   // 参与者数量权重（默认0.1）
    };
}

export const DEFAULT_RANKING_CONFIG: RankingConfig = {
    newbieThreshold: 10,
    growingThreshold: 30,
    newbieScoreWeight: 0.9,
    newbieSkillWeight: 0.1,
    growingScoreWeight: 0.6,
    growingSkillWeight: 0.4,
    veteranScoreWeight: 0.4,
    veteranSkillWeight: 0.6,
    newbieProtectionThreshold: 0.5,
    newbieProtectionMultiplier: 0.4,
    growingAdjustmentMultiplier: 0.6,
    veteranAdjustmentMultiplier: 0.5,
    maxAICount: 10,
    maxParticipants: 20,
    supportedParticipantCounts: [4, 6, 8],
    cacheEnabled: true,
    cacheExpiration: 300000,
    confidenceWeights: {
        matchCount: 0.2,
        consistency: 0.2,
        skillLevel: 0.1,
        participantCount: 0.1
    }
};


