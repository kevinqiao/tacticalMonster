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

    // 信心度配置
    confidenceWeights: {
        matchCount: number;         // 比赛场次权重（默认0.2）
        consistency: number;        // 一致性权重（默认0.2）
        skillLevel: number;         // 技能水平权重（默认0.1）
        participantCount: number;   // 参与者数量权重（默认0.1）
    };

    // 胜率控制配置
    winRateControl?: {
        enabled: boolean;                      // 是否启用胜率控制（默认false）
        targetWinRate: number;                 // 目标胜率（默认0.33）
        adjustmentSensitivity: number;         // 调整敏感度（默认10）
        minMatchesForControl: number;          // 至少需要多少场比赛才启用（默认5）
        maxAdjustmentRange: number;            // 最大排名调整范围比例（默认0.2）
    };

    // 个性化策略配置
    personalizedStrategy?: {
        enabled: boolean;                      // 是否启用个性化策略（默认false）
        minMatchesForPersonalization: number;  // 至少需要多少场比赛才启用个性化（默认15）
        profileUpdateInterval: number;        // 玩家画像更新间隔（小时，默认24）
        maxAdjustmentRange: number;            // 最大排名调整范围比例（默认0.3）
        confidenceThreshold: number;          // 最低信心度阈值（默认0.6）
        fallbackToVeteran: boolean;            // 是否回退到成熟策略（默认true）
        combineWithWinRateControl?: boolean;   // 是否与胜率控制策略结合使用（默认false）
        winRateControlPriority?: boolean;      // 当胜率严重偏离时，是否优先使用胜率控制（默认true）
        winRateDeviationThreshold?: number;    // 胜率偏离阈值，超过此值优先使用胜率控制（默认0.15）
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
    confidenceWeights: {
        matchCount: 0.2,
        consistency: 0.2,
        skillLevel: 0.1,
        participantCount: 0.1
    },

    // 胜率控制配置（默认禁用）
    winRateControl: {
        enabled: false,
        targetWinRate: 0.33,
        adjustmentSensitivity: 10,
        minMatchesForControl: 5,
        maxAdjustmentRange: 0.2
    },

    // 个性化策略配置（默认禁用）
    personalizedStrategy: {
        enabled: false,
        minMatchesForPersonalization: 15,
        profileUpdateInterval: 24,
        maxAdjustmentRange: 0.3,
        confidenceThreshold: 0.6,
        fallbackToVeteran: true,
        combineWithWinRateControl: false,
        winRateControlPriority: true,
        winRateDeviationThreshold: 0.15
    }
};


