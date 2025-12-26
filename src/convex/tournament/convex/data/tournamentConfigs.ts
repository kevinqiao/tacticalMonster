/**
 * 锦标赛配置类型定义 - 基于 tournament_types schema
 * 
 * 重要说明：
 * - playerLevel: 玩家等级要求，在 EntryRequirements 中配置
 * - Power 范围（minTeamPower/maxTeamPower）在 GameRuleConfig.unlockConditions 中配置
 * - 通过 gameRule.ruleId 关联到 TacticalMonster 模块的 GameRuleConfig
 * - 单人关卡：当 matchRules.minPlayers === 1 && maxPlayers === 1 时，表示单人关卡
 *   单人关卡可以配置关卡进度、解锁条件、首次通关奖励等特殊属性
 */
export interface TournamentConfig {
    // 基础信息
    typeId: string;
    name: string;
    description: string;
    timeRange?: string;
    // 游戏配置
    gameType?: GameName;
    stageRule?: StageRule;  // 新配置使用此字段，包含 ruleId
    isActive: boolean;
    // 参赛条件
    entryRequirements?: EntryRequirements;

    // 比赛规则
    matchRules: MatchRules;

    // 奖励配置
    rewards: RewardConfig;

    // 限制配置
    limits?: LimitConfig;

    // 时间戳
    createdAt?: string;
    updatedAt?: string;
}

export interface StageRule {
    description: string;
    mode: "challenge" | "pvp" | "story";
    ruleId: string;  // 必填：关联到 TacticalMonster 模块的 GameRuleConfig
}

/**
 * 游戏类型
 */
export type GameName =
    | "solitaire"       // 单人纸牌
    | "rummy"           // 拉米纸牌
    | "uno"             // UNO
    | "ludo"            // 飞行棋
    | "chess"           // 国际象棋
    | "checkers"        // 跳棋
    | "puzzle"          // 益智游戏
    | "arcade"          // 街机游戏
    | "tacticalMonster"; // 战术怪物（Monster Rumble）

/**
 * 参赛条件
 * 
 * 注意：
 * - playerLevel: 玩家等级要求（TacticalMonster 游戏使用）
 * - Power 范围（minTeamPower/maxTeamPower）在 GameRuleConfig.unlockConditions 中配置
 * - 通过 gameRule.ruleId 关联到 TacticalMonster 模块的 GameRuleConfig 获取 Power 范围
 */
export interface EntryRequirements {
    // ============================================
    // 通用要求
    // ============================================
    // 订阅要求
    isSubscribedRequired: boolean;

    // 玩家等级要求（TacticalMonster 游戏使用）
    playerLevel?: number;

    // ============================================
    // 入场费
    // ============================================
    entryFee: {
        coins?: number;
        gems?: number;
        // TacticalMonster 特定：能量消耗
        energy?: number;
    };

}

/**
 * 比赛规则
 */
export interface MatchRules {
    // 比赛类型（向后兼容）
    matchType?: string;  // "single_match", "multi_match", "best_of_series", "elimination", "round_robin"
    attempts?: number;  // 可选：向后兼容

    // 玩家数量
    minPlayers: number;
    maxPlayers: number;
    // 排名规则 
    matchPointsType?: "by_score" | "by_rank" | "by_performance";
    rankPoints?: { [k: string]: number };
    performancePoints?: { [k: string]: number };

}

/**
 * 奖励配置 - TacticalMonster 专用
 * 
 * 注意：
 * - 单人关卡（minPlayers === 1 && maxPlayers === 1）：使用 performanceRewards（基于分数阈值）
 * - 多人比赛：使用 rankRewards（基于排名范围）
 * - 不包含 props 和 tickets（这些是传统游戏的奖励类型）
 */
export interface RewardConfig {
    rewardType?: "by_points" | "by_rank";  // 可选：向后兼容

    // ============================================
    // 基础奖励 - 参与即可获得
    // ============================================
    baseRewards: {
        coins?: number;        // TacticalMonster 特定奖励
        energy?: number;
        chestDropRate?: number;  // 可选：向后兼容，如果没有配置则使用默认值
    };

    // ============================================
    // 排名奖励 - 仅用于多人比赛（minPlayers > 1 或 maxPlayers > 1）
    // ============================================
    rankRewards?: Array<{
        rankRange: number[]; // [minRank, maxRank]
        multiplier: number;
        // TacticalMonster 特定奖励
        coins?: number;
        monsterShards?: Array<{
            monsterId: string;
            quantity: number;
        }>;
        energy?: number;
        chestDropRate?: number;
    }>;


    // ============================================
    // 订阅加成 - TacticalMonster 特定
    // ============================================
    subscriptionBonus?: {
        coins?: number;
        monsterShards?: Array<{ monsterId: string; quantity: number; }>;
        energy?: number;
    };




    // ============================================
    // 表现奖励 - 仅用于单人关卡（minPlayers === 1 && maxPlayers === 1）
    // 基于分数阈值计算奖励，替代排名奖励
    // ============================================
    performanceRewards?: {
        // 基础表现奖励（用于计算各等级奖励）
        baseReward: {
            coins?: number;
            monsterShards?: Array<{ monsterId: string; quantity: number; }>;
            energy?: number;
        };
        // 分数阈值配置
        scoreThresholds: {
            excellent: number;  // 优秀阈值（≥此分数获得100%奖励）
            good: number;      // 良好阈值（≥此分数获得80%奖励）
            average: number;   // 一般阈值（≥此分数获得50%奖励）
            // 低于average：只有基础奖励，没有表现奖励
        };
    };
}

/**
 * 限制配置
 */
export interface LimitConfig {
    // 最大参与次数
    maxParticipations?: number;
    maxTournaments?: number;
    maxAttempts?: number;

    // 订阅用户限制
    subscribed?: {
        maxParticipations?: number;
        maxTournaments?: number;
        maxAttempts?: number;
    };
}

// 注意：积分规则配置已移至段位系统，不再在此定义
// 使用段位系统的统一配置源


/**
 * 完整的锦标赛配置
 */
export const TOURNAMENT_CONFIGS: TournamentConfig[] = [


    // ============================================
    // TacticalMonster (Monster Rumble) - 多人锦标赛配置示例
    // ============================================
    {
        typeId: "monster_rumble_bronze_daily",
        name: "Monster Rumble - Bronze Tier",
        description: "Monster Rumble 青铜竞技场，每日锦标赛",
        gameType: "tacticalMonster",
        isActive: true,
        timeRange: "daily",

        entryRequirements: {
            isSubscribedRequired: false,
            playerLevel: 1, // 玩家等级要求
            entryFee: {
                coins: 0,
                energy: 6, // TacticalMonster 特定：能量消耗
            },
        },

        matchRules: {
            matchType: "multi_match",
            minPlayers: 4,
            maxPlayers: 8,
        },

        rewards: {
            baseRewards: {
                coins: 50,
                energy: 10, // TacticalMonster 特定：能量奖励
            },
            rankRewards: [
                {
                    rankRange: [1, 1],
                    multiplier: 1.0,
                    coins: 300,
                    monsterShards: [
                        { monsterId: "monster_001", quantity: 10 },
                    ],
                },
                {
                    rankRange: [2, 3],
                    multiplier: 0.6,
                    coins: 180,
                    monsterShards: [
                        { monsterId: "monster_001", quantity: 5 },
                    ],
                },
                {
                    rankRange: [4, 10],
                    multiplier: 0.3,
                    coins: 90,
                },
            ],
        },

        limits: {
            maxParticipations: 10,
            maxTournaments: 1,
            maxAttempts: 10,
            subscribed: {
                maxParticipations: 15,
                maxTournaments: 1,
                maxAttempts: 15,
            },
        },
    },

    // ============================================
    // 允许降级的锦标赛配置示例
    // ============================================
    {
        typeId: "monster_rumble_bronze_open",
        name: "Monster Rumble - Bronze Tier (开放)",
        description: "Monster Rumble 青铜竞技场（允许高等级玩家降级加入）",
        gameType: "tacticalMonster",
        isActive: true,
        timeRange: "daily",

        entryRequirements: {
            isSubscribedRequired: false,
            playerLevel: 1, // 玩家等级要求
            entryFee: {
                coins: 0,
                energy: 6,
            },
        },

        matchRules: {
            matchType: "multi_match",
            minPlayers: 4,
            maxPlayers: 8,
        },

        rewards: {
            baseRewards: {
                coins: 50,
                energy: 10,
            },
            rankRewards: [
                {
                    rankRange: [1, 1],
                    multiplier: 1.0,
                    coins: 300,
                    monsterShards: [
                        { monsterId: "monster_001", quantity: 10 },
                    ],
                },
                {
                    rankRange: [2, 3],
                    multiplier: 0.6,
                    coins: 180,
                    monsterShards: [
                        { monsterId: "monster_001", quantity: 5 },
                    ],
                },
                {
                    rankRange: [4, 10],
                    multiplier: 0.3,
                    coins: 90,
                },
            ],
        },

        limits: {
            maxParticipations: 10,
            maxTournaments: 1,
            maxAttempts: 10,
            subscribed: {
                maxParticipations: 15,
                maxTournaments: 1,
                maxAttempts: 15,
            },
        },
    },

    // ============================================
    // TacticalMonster (Monster Rumble) - 单人关卡配置示例
    // ============================================

    // 示例1：故事模式关卡
    {
        typeId: "monster_rumble_story_1_1",
        name: "第一章 - 第一关",
        description: "欢迎来到 Monster Rumble！击败第一个 Boss 开始你的冒险。",
        gameType: "tacticalMonster",
        isActive: true,
        timeRange: "permanent",  // 永久开放

        entryRequirements: {
            isSubscribedRequired: false,
            playerLevel: 1, // 玩家等级要求
            entryFee: {
                energy: 5,  // 故事模式消耗较少能量
            },
        },

        matchRules: {
            matchType: "single_match",
            minPlayers: 1,  // ✅ 单人关卡标识
            maxPlayers: 1,  // ✅ 单人关卡标识
        },

        rewards: {
            baseRewards: {
                coins: 50,
                energy: 5,
            },
            performanceRewards: {
                baseReward: {
                    coins: 100,
                    monsterShards: [
                        { monsterId: "monster_001", quantity: 5 },
                    ],
                },
                scoreThresholds: {
                    excellent: 10000,
                    good: 5000,
                    average: 1000,
                },
            },
        },

        limits: {
            maxAttempts: 999,  // 故事模式允许无限重试
        },
    },

    // ============================================
    // 挑战模式关卡配置（自动生成，共20个关卡）
    // ============================================

    // Bronze Tier - 关卡 1
    {
        typeId: "monster_rumble_challenge_bronze_boss_1",
        name: "青铜挑战 - Boss 1",
        description: "青铜挑战 - Boss 1 - 自动生成",
        gameType: "tacticalMonster",
        isActive: true,
        timeRange: "permanent",
        entryRequirements: {
            isSubscribedRequired: false,
            playerLevel: 1, // 玩家等级要求（需根据实际需求调整）
            entryFee: { coins: 0, energy: 6 },
        },
        matchRules: {
            matchType: "single_match",
            minPlayers: 1,
            maxPlayers: 1,
        },
        rewards: {
            baseRewards: { coins: 50, energy: 10 },
            performanceRewards: {
                baseReward: { coins: 300 },
                scoreThresholds: {
                    excellent: 90000,
                    good: 70000,
                    average: 50000,
                },
            },
        },
        limits: { maxAttempts: 3 },
    },

    // Bronze Tier - 关卡 2
    {
        typeId: "monster_rumble_challenge_bronze_boss_2",
        name: "青铜挑战 - Boss 2",
        description: "青铜挑战 - Boss 2 - 自动生成",
        gameType: "tacticalMonster",
        isActive: true,
        timeRange: "permanent",
        entryRequirements: {
            isSubscribedRequired: false,
            playerLevel: 1, // 玩家等级要求（需根据实际需求调整）
            entryFee: { coins: 0, energy: 6 },
        },
        matchRules: {
            matchType: "single_match",
            minPlayers: 1,
            maxPlayers: 1,
        },
        rewards: {
            baseRewards: { coins: 60, energy: 11 },
            performanceRewards: {
                baseReward: { coins: 320 },
                scoreThresholds: {
                    excellent: 90000,
                    good: 70000,
                    average: 50000,
                },
            },
        },
        limits: { maxAttempts: 3 },
    },

    // Bronze Tier - 关卡 3
    {
        typeId: "monster_rumble_challenge_bronze_boss_3",
        name: "青铜挑战 - Boss 3",
        description: "青铜挑战 - Boss 3 - 自动生成",
        gameType: "tacticalMonster",
        isActive: true,
        timeRange: "permanent",
        entryRequirements: {
            isSubscribedRequired: false,
            playerLevel: 1, // 玩家等级要求（需根据实际需求调整）
            entryFee: { coins: 0, energy: 6 },
        },
        matchRules: {
            matchType: "single_match",
            minPlayers: 1,
            maxPlayers: 1,
        },
        rewards: {
            baseRewards: { coins: 70, energy: 12 },
            performanceRewards: {
                baseReward: { coins: 340 },
                scoreThresholds: {
                    excellent: 90000,
                    good: 70000,
                    average: 50000,
                },
            },
        },
        limits: { maxAttempts: 3 },
    },

    // Bronze Tier - 关卡 4
    {
        typeId: "monster_rumble_challenge_bronze_boss_4",
        name: "青铜挑战 - Boss 4",
        description: "青铜挑战 - Boss 4 - 自动生成",
        gameType: "tacticalMonster",
        isActive: true,
        timeRange: "permanent",
        entryRequirements: {
            isSubscribedRequired: false,
            playerLevel: 1, // 玩家等级要求（需根据实际需求调整）
            entryFee: { coins: 0, energy: 6 },
        },
        matchRules: {
            matchType: "single_match",
            minPlayers: 1,
            maxPlayers: 1,
        },
        rewards: {
            baseRewards: { coins: 80, energy: 13 },
            performanceRewards: {
                baseReward: { coins: 360 },
                scoreThresholds: {
                    excellent: 90000,
                    good: 70000,
                    average: 50000,
                },
            },
        },
        limits: { maxAttempts: 3 },
    },

    // Bronze Tier - 关卡 5
    {
        typeId: "monster_rumble_challenge_bronze_boss_5",
        name: "青铜挑战 - Boss 5",
        description: "青铜挑战 - Boss 5 - 自动生成",
        gameType: "tacticalMonster",
        isActive: true,
        timeRange: "permanent",
        entryRequirements: {
            isSubscribedRequired: false,
            playerLevel: 1, // 玩家等级要求（需根据实际需求调整）
            entryFee: { coins: 0, energy: 6 },
        },
        matchRules: {
            matchType: "single_match",
            minPlayers: 1,
            maxPlayers: 1,
        },
        rewards: {
            baseRewards: { coins: 90, energy: 14 },
            performanceRewards: {
                baseReward: { coins: 380 },
                scoreThresholds: {
                    excellent: 90000,
                    good: 70000,
                    average: 50000,
                },
            },
        },
        limits: { maxAttempts: 3 },
    },

    // Silver Tier - 关卡 1
    {
        typeId: "monster_rumble_challenge_silver_boss_1",
        name: "白银挑战 - Boss 1",
        description: "白银挑战 - Boss 1 - 自动生成",
        gameType: "tacticalMonster",
        isActive: true,
        timeRange: "permanent",
        entryRequirements: {
            isSubscribedRequired: false,
            playerLevel: 11, // 玩家等级要求（需根据实际需求调整）
            entryFee: { coins: 0, energy: 7 },
        },
        matchRules: {
            matchType: "single_match",
            minPlayers: 1,
            maxPlayers: 1,
        },
        rewards: {
            baseRewards: { coins: 100, energy: 15 },
            performanceRewards: {
                baseReward: { coins: 600 },
                scoreThresholds: {
                    excellent: 90000,
                    good: 70000,
                    average: 50000,
                },
            },
        },
        limits: { maxAttempts: 3 },
    },

    // Silver Tier - 关卡 2
    {
        typeId: "monster_rumble_challenge_silver_boss_2",
        name: "白银挑战 - Boss 2",
        description: "白银挑战 - Boss 2 - 自动生成",
        gameType: "tacticalMonster",
        isActive: true,
        timeRange: "permanent",
        entryRequirements: {
            isSubscribedRequired: false,
            playerLevel: 11, // 玩家等级要求（需根据实际需求调整）
            entryFee: { coins: 0, energy: 7 },
        },
        matchRules: {
            matchType: "single_match",
            minPlayers: 1,
            maxPlayers: 1,
        },
        rewards: {
            baseRewards: { coins: 120, energy: 17 },
            performanceRewards: {
                baseReward: { coins: 640 },
                scoreThresholds: {
                    excellent: 90000,
                    good: 70000,
                    average: 50000,
                },
            },
        },
        limits: { maxAttempts: 3 },
    },

    // Silver Tier - 关卡 3
    {
        typeId: "monster_rumble_challenge_silver_boss_3",
        name: "白银挑战 - Boss 3",
        description: "白银挑战 - Boss 3 - 自动生成",
        gameType: "tacticalMonster",
        isActive: true,
        timeRange: "permanent",
        entryRequirements: {
            isSubscribedRequired: false,
            playerLevel: 11, // 玩家等级要求（需根据实际需求调整）
            entryFee: { coins: 0, energy: 7 },
        },
        matchRules: {
            matchType: "single_match",
            minPlayers: 1,
            maxPlayers: 1,
        },
        rewards: {
            baseRewards: { coins: 140, energy: 19 },
            performanceRewards: {
                baseReward: { coins: 680 },
                scoreThresholds: {
                    excellent: 90000,
                    good: 70000,
                    average: 50000,
                },
            },
        },
        limits: { maxAttempts: 3 },
    },

    // Silver Tier - 关卡 4
    {
        typeId: "monster_rumble_challenge_silver_boss_4",
        name: "白银挑战 - Boss 4",
        description: "白银挑战 - Boss 4 - 自动生成",
        gameType: "tacticalMonster",
        isActive: true,
        timeRange: "permanent",
        entryRequirements: {
            isSubscribedRequired: false,
            playerLevel: 11, // 玩家等级要求（需根据实际需求调整）
            entryFee: { coins: 0, energy: 7 },
        },
        matchRules: {
            matchType: "single_match",
            minPlayers: 1,
            maxPlayers: 1,
        },
        rewards: {
            baseRewards: { coins: 160, energy: 21 },
            performanceRewards: {
                baseReward: { coins: 720 },
                scoreThresholds: {
                    excellent: 90000,
                    good: 70000,
                    average: 50000,
                },
            },
        },
        limits: { maxAttempts: 3 },
    },

    // Silver Tier - 关卡 5
    {
        typeId: "monster_rumble_challenge_silver_boss_5",
        name: "白银挑战 - Boss 5",
        description: "白银挑战 - Boss 5 - 自动生成",
        gameType: "tacticalMonster",
        isActive: true,
        timeRange: "permanent",
        entryRequirements: {
            isSubscribedRequired: false,
            playerLevel: 11, // 玩家等级要求（需根据实际需求调整）
            entryFee: { coins: 0, energy: 7 },
        },
        matchRules: {
            matchType: "single_match",
            minPlayers: 1,
            maxPlayers: 1,
        },
        rewards: {
            baseRewards: { coins: 180, energy: 23 },
            performanceRewards: {
                baseReward: { coins: 760 },
                scoreThresholds: {
                    excellent: 90000,
                    good: 70000,
                    average: 50000,
                },
            },
        },
        limits: { maxAttempts: 3 },
    },

    // Gold Tier - 关卡 1
    {
        typeId: "monster_rumble_challenge_gold_boss_1",
        name: "黄金挑战 - Boss 1",
        description: "黄金挑战 - Boss 1 - 自动生成",
        gameType: "tacticalMonster",
        isActive: true,
        timeRange: "permanent",
        entryRequirements: {
            isSubscribedRequired: false,
            playerLevel: 31, // 玩家等级要求（需根据实际需求调整）
            entryFee: { coins: 0, energy: 8 },
        },
        matchRules: {
            matchType: "single_match",
            minPlayers: 1,
            maxPlayers: 1,
        },
        rewards: {
            baseRewards: { coins: 200, energy: 20 },
            performanceRewards: {
                baseReward: { coins: 1200 },
                scoreThresholds: {
                    excellent: 90000,
                    good: 70000,
                    average: 50000,
                },
            },
        },
        limits: { maxAttempts: 3 },
    },

    // Gold Tier - 关卡 2
    {
        typeId: "monster_rumble_challenge_gold_boss_2",
        name: "黄金挑战 - Boss 2",
        description: "黄金挑战 - Boss 2 - 自动生成",
        gameType: "tacticalMonster",
        isActive: true,
        timeRange: "permanent",
        entryRequirements: {
            isSubscribedRequired: false,
            playerLevel: 31, // 玩家等级要求（需根据实际需求调整）
            entryFee: { coins: 0, energy: 8 },
        },
        matchRules: {
            matchType: "single_match",
            minPlayers: 1,
            maxPlayers: 1,
        },
        rewards: {
            baseRewards: { coins: 240, energy: 23 },
            performanceRewards: {
                baseReward: { coins: 1280 },
                scoreThresholds: {
                    excellent: 90000,
                    good: 70000,
                    average: 50000,
                },
            },
        },
        limits: { maxAttempts: 3 },
    },

    // Gold Tier - 关卡 3
    {
        typeId: "monster_rumble_challenge_gold_boss_3",
        name: "黄金挑战 - Boss 3",
        description: "黄金挑战 - Boss 3 - 自动生成",
        gameType: "tacticalMonster",
        isActive: true,
        timeRange: "permanent",
        entryRequirements: {
            isSubscribedRequired: false,
            playerLevel: 31, // 玩家等级要求（需根据实际需求调整）
            entryFee: { coins: 0, energy: 8 },
        },
        matchRules: {
            matchType: "single_match",
            minPlayers: 1,
            maxPlayers: 1,
        },
        rewards: {
            baseRewards: { coins: 280, energy: 26 },
            performanceRewards: {
                baseReward: { coins: 1360 },
                scoreThresholds: {
                    excellent: 90000,
                    good: 70000,
                    average: 50000,
                },
            },
        },
        limits: { maxAttempts: 3 },
    },

    // Gold Tier - 关卡 4
    {
        typeId: "monster_rumble_challenge_gold_boss_4",
        name: "黄金挑战 - Boss 4",
        description: "黄金挑战 - Boss 4 - 自动生成",
        gameType: "tacticalMonster",
        isActive: true,
        timeRange: "permanent",
        entryRequirements: {
            isSubscribedRequired: false,
            playerLevel: 31, // 玩家等级要求（需根据实际需求调整）
            entryFee: { coins: 0, energy: 8 },
        },
        matchRules: {
            matchType: "single_match",
            minPlayers: 1,
            maxPlayers: 1,
        },
        rewards: {
            baseRewards: { coins: 320, energy: 29 },
            performanceRewards: {
                baseReward: { coins: 1440 },
                scoreThresholds: {
                    excellent: 90000,
                    good: 70000,
                    average: 50000,
                },
            },
        },
        limits: { maxAttempts: 3 },
    },

    // Gold Tier - 关卡 5
    {
        typeId: "monster_rumble_challenge_gold_boss_5",
        name: "黄金挑战 - Boss 5",
        description: "黄金挑战 - Boss 5 - 自动生成",
        gameType: "tacticalMonster",
        isActive: true,
        timeRange: "permanent",
        entryRequirements: {
            isSubscribedRequired: false,
            playerLevel: 31, // 玩家等级要求（需根据实际需求调整）
            entryFee: { coins: 0, energy: 8 },
        },
        matchRules: {
            matchType: "single_match",
            minPlayers: 1,
            maxPlayers: 1,
        },
        rewards: {
            baseRewards: { coins: 360, energy: 32 },
            performanceRewards: {
                baseReward: { coins: 1520 },
                scoreThresholds: {
                    excellent: 90000,
                    good: 70000,
                    average: 50000,
                },
            },
        },
        limits: { maxAttempts: 3 },
    },

    // Platinum Tier - 关卡 1
    {
        typeId: "monster_rumble_challenge_platinum_boss_1",
        name: "白金挑战 - Boss 1",
        description: "白金挑战 - Boss 1 - 自动生成",
        gameType: "tacticalMonster",
        isActive: true,
        timeRange: "permanent",
        entryRequirements: {
            isSubscribedRequired: false,
            playerLevel: 51, // 玩家等级要求（需根据实际需求调整）
            entryFee: { coins: 0, energy: 10 },
        },
        matchRules: {
            matchType: "single_match",
            minPlayers: 1,
            maxPlayers: 1,
        },
        rewards: {
            baseRewards: { coins: 500, energy: 30 },
            performanceRewards: {
                baseReward: { coins: 3000 },
                scoreThresholds: {
                    excellent: 90000,
                    good: 70000,
                    average: 50000,
                },
            },
        },
        limits: { maxAttempts: 3 },
    },

    // Platinum Tier - 关卡 2
    {
        typeId: "monster_rumble_challenge_platinum_boss_2",
        name: "白金挑战 - Boss 2",
        description: "白金挑战 - Boss 2 - 自动生成",
        gameType: "tacticalMonster",
        isActive: true,
        timeRange: "permanent",
        entryRequirements: {
            isSubscribedRequired: false,
            playerLevel: 51, // 玩家等级要求（需根据实际需求调整）
            entryFee: { coins: 0, energy: 10 },
        },
        matchRules: {
            matchType: "single_match",
            minPlayers: 1,
            maxPlayers: 1,
        },
        rewards: {
            baseRewards: { coins: 600, energy: 35 },
            performanceRewards: {
                baseReward: { coins: 3200 },
                scoreThresholds: {
                    excellent: 90000,
                    good: 70000,
                    average: 50000,
                },
            },
        },
        limits: { maxAttempts: 3 },
    },

    // Platinum Tier - 关卡 3
    {
        typeId: "monster_rumble_challenge_platinum_boss_3",
        name: "白金挑战 - Boss 3",
        description: "白金挑战 - Boss 3 - 自动生成",
        gameType: "tacticalMonster",
        isActive: true,
        timeRange: "permanent",
        entryRequirements: {
            isSubscribedRequired: false,
            playerLevel: 51, // 玩家等级要求（需根据实际需求调整）
            entryFee: { coins: 0, energy: 10 },
        },
        matchRules: {
            matchType: "single_match",
            minPlayers: 1,
            maxPlayers: 1,
        },
        rewards: {
            baseRewards: { coins: 700, energy: 40 },
            performanceRewards: {
                baseReward: { coins: 3400 },
                scoreThresholds: {
                    excellent: 90000,
                    good: 70000,
                    average: 50000,
                },
            },
        },
        limits: { maxAttempts: 3 },
    },

    // Platinum Tier - 关卡 4
    {
        typeId: "monster_rumble_challenge_platinum_boss_4",
        name: "白金挑战 - Boss 4",
        description: "白金挑战 - Boss 4 - 自动生成",
        gameType: "tacticalMonster",
        isActive: true,
        timeRange: "permanent",
        entryRequirements: {
            isSubscribedRequired: false,
            playerLevel: 51, // 玩家等级要求（需根据实际需求调整）
            entryFee: { coins: 0, energy: 10 },
        },
        matchRules: {
            matchType: "single_match",
            minPlayers: 1,
            maxPlayers: 1,
        },
        rewards: {
            baseRewards: { coins: 800, energy: 45 },
            performanceRewards: {
                baseReward: { coins: 3600 },
                scoreThresholds: {
                    excellent: 90000,
                    good: 70000,
                    average: 50000,
                },
            },
        },
        limits: { maxAttempts: 3 },
    },

    // Platinum Tier - 关卡 5
    {
        typeId: "monster_rumble_challenge_platinum_boss_5",
        name: "白金挑战 - Boss 5",
        description: "白金挑战 - Boss 5 - 自动生成",
        gameType: "tacticalMonster",
        isActive: true,
        timeRange: "permanent",
        entryRequirements: {
            isSubscribedRequired: false,
            playerLevel: 51, // 玩家等级要求（需根据实际需求调整）
            entryFee: { coins: 0, energy: 10 },
        },
        matchRules: {
            matchType: "single_match",
            minPlayers: 1,
            maxPlayers: 1,
        },
        rewards: {
            baseRewards: { coins: 900, energy: 50 },
            performanceRewards: {
                baseReward: { coins: 3800 },
                scoreThresholds: {
                    excellent: 90000,
                    good: 70000,
                    average: 50000,
                },
            },
        },
        limits: { maxAttempts: 3 },
    },

    // 示例3：Boss Rush 模式
    {
        typeId: "monster_rumble_boss_rush_bronze",
        name: "Boss Rush - 青铜",
        description: "连续挑战多个 Boss，测试你的极限！",
        gameType: "tacticalMonster",
        isActive: true,
        timeRange: "permanent",

        entryRequirements: {
            isSubscribedRequired: false,
            playerLevel: 1, // 玩家等级要求（需根据实际需求调整）
            entryFee: {
                coins: 100,
                energy: 10,
            },
        },

        matchRules: {
            matchType: "single_match",
            minPlayers: 1,  // ✅ 单人关卡标识
            maxPlayers: 1,  // ✅ 单人关卡标识
        },

        rewards: {
            baseRewards: {
                coins: 200,
                energy: 20,
            },
            performanceRewards: {
                baseReward: {
                    coins: 1000,
                    monsterShards: [
                        { monsterId: "monster_001", quantity: 20 },
                    ],
                },
                scoreThresholds: {
                    excellent: 90000,
                    good: 70000,
                    average: 50000,
                },
            },
        },

        limits: {
            maxAttempts: 1,  // 每日只能挑战1次
        },
    },

    // ============================================
    // 连续关卡配置示例
    // ============================================

    // 示例4：线性关卡链（故事模式第1章第2关）
    {
        typeId: "monster_rumble_story_1_2",
        name: "第一章 - 第二关",
        description: "继续你的冒险，挑战更强的 Boss！",
        gameType: "tacticalMonster",
        isActive: true,
        timeRange: "permanent",

        entryRequirements: {
            isSubscribedRequired: false,
            playerLevel: 1, // 玩家等级要求（需根据实际需求调整）
            entryFee: {
                energy: 5,
            },
        },

        matchRules: {
            matchType: "single_match",
            minPlayers: 1,
            maxPlayers: 1,
        },

        rewards: {
            baseRewards: {
                coins: 60,
                energy: 5,
            },
            performanceRewards: {
                baseReward: {
                    coins: 120,
                    monsterShards: [
                        { monsterId: "monster_001", quantity: 6 },
                    ],
                },
                scoreThresholds: {
                    excellent: 12000,
                    good: 6000,
                    average: 1200,
                },
            },
        },

        limits: {
            maxAttempts: 999,
        },
    },

    // 示例5：分支关卡（完成关卡1后可以选择关卡2A或2B）
    {
        typeId: "monster_rumble_story_1_2a",
        name: "第一章 - 第二关（路线A）",
        description: "选择路线A，挑战敏捷型 Boss！",
        gameType: "tacticalMonster",
        isActive: true,
        timeRange: "permanent",

        entryRequirements: {
            isSubscribedRequired: false,
            playerLevel: 1, // 玩家等级要求（需根据实际需求调整）
            entryFee: {
                energy: 5,
            },
        },

        matchRules: {
            matchType: "single_match",
            minPlayers: 1,
            maxPlayers: 1,
        },

        rewards: {
            baseRewards: {
                coins: 60,
                energy: 5,
            },
            performanceRewards: {
                baseReward: {
                    coins: 120,
                },
                scoreThresholds: {
                    excellent: 12000,
                    good: 6000,
                    average: 1200,
                },
            },
        },

        limits: {
            maxAttempts: 999,
        },
    },

    {
        typeId: "monster_rumble_story_1_2b",
        name: "第一章 - 第二关（路线B）",
        description: "选择路线B，挑战防御型 Boss！",
        gameType: "tacticalMonster",
        isActive: true,
        timeRange: "permanent",

        entryRequirements: {
            isSubscribedRequired: false,
            playerLevel: 1, // 玩家等级要求（需根据实际需求调整）
            entryFee: {
                energy: 5,
            },
        },

        matchRules: {
            matchType: "single_match",
            minPlayers: 1,
            maxPlayers: 1,
        },

        rewards: {
            baseRewards: {
                coins: 60,
                energy: 5,
            },
            performanceRewards: {
                baseReward: {
                    coins: 120,
                },
                scoreThresholds: {
                    excellent: 12000,
                    good: 6000,
                    average: 1200,
                },
            },
        },

        limits: {
            maxAttempts: 999,
        },
    },

    // 示例6：汇合关卡（需要完成2A或2B才能解锁）
    {
        typeId: "monster_rumble_story_1_3",
        name: "第一章 - 第三关（Boss战）",
        description: "两条路线汇合，挑战最终 Boss！",
        gameType: "tacticalMonster",
        isActive: true,
        timeRange: "permanent",

        entryRequirements: {
            isSubscribedRequired: false,
            playerLevel: 1, // 玩家等级要求（需根据实际需求调整）
            entryFee: {
                energy: 6,
            },
        },

        matchRules: {
            matchType: "single_match",
            minPlayers: 1,
            maxPlayers: 1,
        },

        rewards: {
            baseRewards: {
                coins: 80,
                energy: 6,
            },
            performanceRewards: {
                baseReward: {
                    coins: 200,
                    monsterShards: [
                        { monsterId: "monster_001", quantity: 15 },
                    ],
                },
                scoreThresholds: {
                    excellent: 15000,
                    good: 8000,
                    average: 2000,
                },
            },
        },

        limits: {
            maxAttempts: 999,
        },
    },
];

/**
 * 获取锦标赛配置
 */
export function getTournamentConfig(typeId: string): TournamentConfig | undefined {
    return TOURNAMENT_CONFIGS.find(config => config.typeId === typeId);
}

/**
 * 获取活跃的锦标赛配置
 */
export function getActiveTournamentConfigs(): TournamentConfig[] {
    return TOURNAMENT_CONFIGS.filter(config => config.isActive);
}

/**
 * 按游戏类型获取锦标赛配置
 */
export function getTournamentConfigsByGameType(gameType: string): TournamentConfig[] {
    return TOURNAMENT_CONFIGS.filter(config =>
        (config.gameType === gameType) && config.isActive
    );
}

/**
 * 验证锦标赛配置
 */
export function validateTournamentConfig(config: TournamentConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 基础验证
    if (!config.typeId) errors.push("typeId 是必需的");
    if (!config.name) errors.push("name 是必需的");
    if (!config.description) errors.push("description 是必需的");
    if (!config.gameType) errors.push("gameType 是必需的");

    // 参赛条件验证
    if (config.entryRequirements) {
        // 入场费验证
        if (config.entryRequirements.entryFee) {
            // TacticalMonster 游戏可以包含能量消耗
            if (config.gameType !== "tacticalMonster" && config.entryRequirements.entryFee.energy) {
                errors.push(`能量消耗仅适用于 TacticalMonster 游戏，当前游戏类型: ${config.gameType}`);
            }
        }
        // 注意：Power 范围（minTeamPower/maxTeamPower）从 GameRuleConfig.unlockConditions 获取，不在此处验证
    }

    // 比赛规则验证
    if (!config.matchRules) {
        errors.push("matchRules 是必需的");
    } else {
        // matchType 是可选的（向后兼容），但如果存在则验证
        // if (!config.matchRules.matchType) errors.push("matchRules.matchType 是必需的");
        if (config.matchRules.minPlayers < 1) errors.push("minPlayers 必须大于等于 1");
        if (config.matchRules.maxPlayers < config.matchRules.minPlayers) {
            errors.push("maxPlayers 必须大于等于 minPlayers");
        }

        // 单人挑战验证
        const isSinglePlayer = config.matchRules.minPlayers === 1 && config.matchRules.maxPlayers === 1;
        if (isSinglePlayer) {
            // 单人挑战必须使用 single_match（如果有 matchType）
            if (config.matchRules.matchType && config.matchRules.matchType !== "single_match") {
                errors.push("单人挑战（minPlayers=1, maxPlayers=1）必须使用 matchType='single_match'");
            }
        }
    }

    // 奖励配置验证
    if (!config.rewards) {
        errors.push("rewards 是必需的");
    } else {
        if (!config.rewards.baseRewards) errors.push("baseRewards 是必需的");

        // 单人挑战 vs 多人比赛的奖励验证
        const isSinglePlayer = config.matchRules.minPlayers === 1 && config.matchRules.maxPlayers === 1;

        if (isSinglePlayer) {
            // 单人挑战推荐使用 performanceRewards，但不强制（向后兼容）
            if (!config.rewards.performanceRewards && (!config.rewards.rankRewards || config.rewards.rankRewards.length === 0)) {
                errors.push("单人挑战（minPlayers=1, maxPlayers=1）建议配置 performanceRewards");
            }
        } else {
            // 多人比赛必须使用 rankRewards，不能使用 performanceRewards
            if (!config.rewards.rankRewards || config.rewards.rankRewards.length === 0) {
                errors.push("多人比赛（minPlayers>1 或 maxPlayers>1）必须配置 rankRewards");
            }
            if (config.rewards.performanceRewards) {
                errors.push("多人比赛（minPlayers>1 或 maxPlayers>1）不应配置 performanceRewards，应使用 rankRewards");
            }
        }

    }

    // 限制配置验证
    if (!config.limits) {
        errors.push("limits 是必需的");
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * ============================================
 * 连续关卡工具函数
 * ============================================
 */




/**
 * 检查关卡是否已解锁
 */
export function isLevelUnlocked(
    typeId: string,
    params: {
        completedTypeIds: string[];      // 已完成的关卡 typeId 列表
        playerLevel?: number;            // 玩家等级
        unlockedTier?: "bronze" | "silver" | "gold" | "platinum";
    }
): { unlocked: boolean; reason?: string } {
    const config = getTournamentConfig(typeId);
    if (!config) {
        return { unlocked: false, reason: "关卡配置不存在" };
    }

    // 注意：soloChallenge 已移除，需要通过 gameRule.ruleId 查询 GameRuleConfig
    if (!config.stageRule?.ruleId) {
        return { unlocked: false, reason: "关卡配置不存在或不是单人挑战（需要通过 ruleId 查询）" };
    }

    // TODO: 通过 gameRule.ruleId 查询 TacticalMonster 模块的 GameRuleConfig 获取解锁条件
    // 暂时返回已解锁，需要实现通过 ruleId 查询的逻辑
    const unlockConditions = null; // 需要通过 ruleId 查询获取

    // 1. 检查玩家等级
    // TODO: 从 GameRuleConfig 获取 minPlayerLevel
    // if (unlockConditions?.minPlayerLevel && params.playerLevel) {
    //     if (params.playerLevel < unlockConditions.minPlayerLevel) {
    //         return {
    //             unlocked: false,
    //             reason: `需要玩家等级 ${unlockConditions.minPlayerLevel}，当前 ${params.playerLevel}`,
    //         };
    //     }
    // }

    // 2. 检查前置关卡
    // TODO: 从 GameRuleConfig 获取前置关卡列表
    const requiredTypeIds: string[] = []; // 需要通过 ruleId 查询获取

    if (requiredTypeIds.length > 0) {
        // TODO: 从 GameRuleConfig 获取解锁模式
        const unlockMode = "sequential"; // 需要通过 ruleId 查询获取

        if (unlockMode === "sequential") {
            // 顺序解锁：必须完成所有前置关卡
            const allCompleted = requiredTypeIds.every(
                (id: string) => params.completedTypeIds.includes(id)
            );
            if (!allCompleted) {
                const missing = requiredTypeIds.filter(
                    (id: string) => !params.completedTypeIds.includes(id)
                );
                return {
                    unlocked: false,
                    reason: `需要完成前置关卡: ${missing.join(", ")}`,
                };
            }
        } else if (unlockMode === "parallel" || unlockMode === "any") {
            // 并行/任意解锁：完成任意一个前置关卡即可
            const anyCompleted = requiredTypeIds.some(
                (id: string) => params.completedTypeIds.includes(id)
            );
            if (!anyCompleted) {
                return {
                    unlocked: false,
                    reason: `需要完成至少一个前置关卡: ${requiredTypeIds.join(", ")}`,
                };
            }
        }
    }

    return { unlocked: true };
}

/**
 * 获取玩家可解锁的下一关卡列表（完成当前关卡后）
 */
export function getUnlockableNextLevels(
    completedTypeId: string,
    params: {
        completedTypeIds: string[];
        playerLevel?: number;
        unlockedTier?: "bronze" | "silver" | "gold" | "platinum";
    }
): TournamentConfig[] {
    const config = getTournamentConfig(completedTypeId);
    if (!config) {
        return [];
    }

    // 注意：soloChallenge 已移除，需要通过 gameRule.ruleId 查询 GameRuleConfig
    // TODO: 通过 gameRule.ruleId 查询 TacticalMonster 模块的 GameRuleConfig 获取下一关卡
    const nextLevelIds: string[] = []; // 需要通过 ruleId 查询获取
    if (!nextLevelIds || nextLevelIds.length === 0) {
        return [];
    }

    return nextLevelIds
        .map((typeId: string) => getTournamentConfig(typeId))
        .filter((config: TournamentConfig | undefined): config is TournamentConfig => {
            if (!config || !config.isActive) {
                return false;
            }

            // 检查是否已解锁
            const unlockCheck = isLevelUnlocked(config.typeId, params);
            return unlockCheck.unlocked;
        });
}

/**
 * 获取章节的所有关卡（按关卡编号排序）
 */
export function getLevelsByChapter(
    chapter: number,
    gameType?: string
): TournamentConfig[] {
    return TOURNAMENT_CONFIGS
        .filter(config => {
            if (!config.isActive) return false;
            const configGameType = config.gameType;
            if (gameType && configGameType !== gameType) return false;
            // 注意：soloChallenge 已移除，需要通过 gameRule.ruleId 查询 GameRuleConfig
            // TODO: 通过 gameRule.ruleId 查询 TacticalMonster 模块的 GameRuleConfig 判断章节
            if (!config.stageRule?.ruleId) return false;
            // 暂时返回 true，需要实现通过 ruleId 查询的逻辑
            return true;
        })
        .sort((a, b) => {
            // TODO: 从 GameRuleConfig 获取 levelNumber 进行排序
            return 0; // 暂时不排序，需要实现通过 ruleId 查询的逻辑
        });
}

/**
 * 获取关卡组的所有关卡（用于分支关卡）
 */
export function getLevelsByGroup(
    levelGroup: string
): TournamentConfig[] {
    return TOURNAMENT_CONFIGS
        .filter(config => {
            // 注意：soloChallenge 已移除，需要通过 gameRule.ruleId 查询 GameRuleConfig
            // TODO: 通过 gameRule.ruleId 查询 TacticalMonster 模块的 GameRuleConfig 判断 levelGroup
            if (!config.stageRule?.ruleId || !config.isActive) return false;
            // 暂时返回 false，需要实现通过 ruleId 查询的逻辑
            return false;
        })
        .sort((a, b) => {
            // TODO: 从 GameRuleConfig 获取 chainOrder 进行排序
            return 0; // 暂时不排序，需要实现通过 ruleId 查询的逻辑
        });
}

/**
 * ============================================
 * 动态关卡生成支持
 * ============================================
 */

/**
 * 获取动态生成的关卡配置
 * 如果关卡不在静态配置中，尝试根据规则动态生成
 */
export function getTournamentConfigWithGeneration(
    typeId: string,
    ctx?: any
): TournamentConfig | undefined {
    // 1. 先尝试从静态配置获取
    const staticConfig = getTournamentConfig(typeId);
    if (staticConfig) {
        return staticConfig;
    }

    // 2. 如果不在静态配置中，尝试动态生成
    // 注意：这里需要根据 typeId 的模式匹配生成规则
    // 例如：monster_rumble_story_1_5 匹配 story_chapter_1_generation 规则

    // 这里简化处理，实际实现需要：
    // - 解析 typeId 模式
    // - 匹配生成规则
    // - 生成对应关卡配置

    return undefined;
}

/**
 * 获取所有关卡（包括动态生成的）
 * 用于关卡列表显示
 */
export async function getAllLevelsWithGeneration(
    ctx: any,
    params: {
        chapter?: number;
        levelType?: "story" | "challenge" | "boss_rush" | "endless";
        tier?: string;
    }
): Promise<TournamentConfig[]> {
    // 1. 获取静态配置的关卡
    let levels = getActiveTournamentConfigs()
        .filter(config =>
            config.matchRules.minPlayers === 1 &&
            config.matchRules.maxPlayers === 1
        );

    // 2. 根据参数过滤
    if (params.chapter !== undefined) {
        levels = levels.filter(config =>
            // 注意：soloChallenge 已移除，需要通过 gameRule.ruleId 查询 GameRuleConfig
            // TODO: 通过 gameRule.ruleId 查询 TacticalMonster 模块的 GameRuleConfig 判断章节
            config.stageRule?.ruleId ? true : false // 暂时不过滤，需要实现通过 ruleId 查询的逻辑
        );
    }

    if (params.levelType) {
        levels = levels.filter(config =>
            // 注意：soloChallenge 已移除，需要通过 gameRule.ruleId 查询 GameRuleConfig
            // TODO: 通过 gameRule.ruleId 查询 TacticalMonster 模块的 GameRuleConfig 判断 levelType
            config.stageRule?.ruleId ? true : false // 暂时不过滤，需要实现通过 ruleId 查询的逻辑
        );
    }

    // 注意：tier 字段已移除，如果需要在按 tier 过滤，应该通过其他方式（如从 GameRuleConfig 获取）
    // 暂时保留此参数但不进行过滤，或可以通过 gameRule.ruleId 查询 GameRuleConfig 来判断
    // if (params.tier) {
    //     // tier 过滤需要从 GameRuleConfig 获取，暂不支持
    // }

    // 3. 检查是否需要动态生成
    // 例如：如果请求 chapter 1，但只有 level 1-3，可以动态生成 level 4-10

    return levels;
}
