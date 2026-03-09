/**
 * 锦标赛配置类型定义 - 基于 tournament_types schema
 * 
 * 重要说明：
 * - playerLevel: 玩家等级要求，在 EntryRequirements 中配置
 * - Power 范围（minTeamPower/maxTeamPower）在 GameRuleConfig.unlockConditions 中配置
 * - 通过 gameRule.ruleId 关联到 TacticalMonster 模块的 GameRuleConfig
 * - gameRule: 游戏规则配置，包含 description, mode (challenge/pvp/story), ruleId
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
    gameRule?: GameRule;  // 游戏规则配置（包含 description, mode, ruleId）
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

export interface GameRule {
    description: string;
    mode: "challenge" | "arena" | "story";
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
    // 玩家数量
    minPlayers: number;
    maxPlayers: number;
}

/**
 * 宝箱类型权重配置
 */
export interface ChestTypeWeights {
    silver?: number;
    gold?: number;
    purple?: number;
    orange?: number;
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
    type?: "by_performance" | "by_rank";  // 可选：向后兼容

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
        chestDropRate?: number;  // 该排名范围的宝箱触发率
        chestTypeWeights?: ChestTypeWeights;  // 该排名范围的宝箱类型权重（每个排名范围独立配置）
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
        levelRewards?: Record<string, {
            coins?: number;
            monsterShards?: Array<{ monsterId: string; quantity: number; }>;
            energy?: number;
            chestDropRate?: number;  // 该表现等级的宝箱触发率（每个表现等级独立配置）
            chestTypeWeights?: ChestTypeWeights;  // 该表现等级的宝箱类型权重（每个表现等级独立配置）
        }>;

    };

    // ============================================
    // 首次通关奖励 - 仅用于单人关卡（minPlayers === 1 && maxPlayers === 1）
    // ============================================
    firstClearRewards?: {
        coins?: number;
        energy?: number;
        monsterShards?: Array<{ monsterId: string; quantity: number }>;
        monsters?: Array<{
            monsterId: string;
            level?: number;
            stars?: number;
        }>;
        chestDropRate?: number;  // 首次通关宝箱触发率
        chestTypeWeights?: ChestTypeWeights;  // 首次通关宝箱类型权重
    };
}

/**
 * 限制配置
 */
export interface LimitConfig {
    // 最大参与次数
    intervalHours?: number;
    maxAttempts?: number;  // 最大尝试次数
    // 订阅用户限制
    subscribed?: {
        maxAttempts?: number;
    };
    attemptCost?: {
        coins?: number;
        energy?: number;
    };
    unlimitedAttempts?: boolean;  // 是否允许无限尝试
}

// 注意：积分规则配置已移至段位系统，不再在此定义
// 使用段位系统的统一配置源


/**
 * 完整的锦标赛配置
 */
export const TOURNAMENT_CONFIGS: TournamentConfig[] = [

    // ============================================
    // TacticalMonster (Monster Rumble) - 单人关卡配置示例
    // ============================================


    // ============================================
    // 挑战模式关卡配置（自动生成，共20个关卡）
    // ============================================

    // Bronze Tier - 关卡 1
    {
        typeId: "monster_rumble_challenge_bronze_boss_1",
        name: "青铜挑战 - Boss 1",
        description: "青铜挑战 - Boss 1 - 自动生成",
        gameType: "tacticalMonster",
        gameRule: {
            description: "青铜挑战 - Boss 1",
            mode: "challenge",
            ruleId: "monster_rumble_challenge_bronze_boss_1",
        },
        isActive: true,
        timeRange: "permanent",
        entryRequirements: {
            isSubscribedRequired: false,
            playerLevel: 1, // 玩家等级要求（需根据实际需求调整）
            entryFee: { coins: 0, energy: 6 },
        },
        matchRules: {
            minPlayers: 1,
            maxPlayers: 1,
        },
        rewards: {
            baseRewards: { coins: 50, energy: 10 },
            performanceRewards: {
                baseReward: { coins: 300 },
            },
        },
        limits: {
            maxAttempts: 3,
            attemptCost: {
                energy: 3,
            },
        },
    },

    // Bronze Tier - 关卡 2
    {
        typeId: "monster_rumble_challenge_bronze_boss_2",
        name: "青铜挑战 - Boss 2",
        description: "青铜挑战 - Boss 2 - 自动生成",
        gameType: "tacticalMonster",
        gameRule: {
            description: "青铜挑战 - Boss 2",
            mode: "challenge",
            ruleId: "monster_rumble_challenge_bronze_boss_2",
        },
        isActive: true,
        timeRange: "permanent",
        entryRequirements: {
            isSubscribedRequired: false,
            playerLevel: 1, // 玩家等级要求（需根据实际需求调整）
            entryFee: { coins: 0, energy: 6 },
        },
        matchRules: {
            minPlayers: 1,
            maxPlayers: 1,
        },
        rewards: {
            baseRewards: { coins: 60, energy: 11 },
            performanceRewards: {
                baseReward: { coins: 320 },
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
        gameRule: {
            description: "青铜挑战 - Boss 3",
            mode: "challenge",
            ruleId: "monster_rumble_challenge_bronze_boss_3",
        },
        isActive: true,
        timeRange: "permanent",
        entryRequirements: {
            isSubscribedRequired: false,
            playerLevel: 1, // 玩家等级要求（需根据实际需求调整）
            entryFee: { coins: 0, energy: 6 },
        },
        matchRules: {
            minPlayers: 1,
            maxPlayers: 1,
        },
        rewards: {
            baseRewards: { coins: 70, energy: 12 },
            performanceRewards: {
                baseReward: { coins: 340 },
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
        gameRule: {
            description: "青铜挑战 - Boss 4",
            mode: "challenge",
            ruleId: "monster_rumble_challenge_bronze_boss_4",
        },
        isActive: true,
        timeRange: "permanent",
        entryRequirements: {
            isSubscribedRequired: false,
            playerLevel: 1, // 玩家等级要求（需根据实际需求调整）
            entryFee: { coins: 0, energy: 6 },
        },
        matchRules: {
            minPlayers: 1,
            maxPlayers: 1,
        },
        rewards: {
            baseRewards: { coins: 80, energy: 13 },
            performanceRewards: {
                baseReward: { coins: 360 },
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
        gameRule: {
            description: "青铜挑战 - Boss 5",
            mode: "challenge",
            ruleId: "monster_rumble_challenge_bronze_boss_5",
        },
        isActive: true,
        timeRange: "permanent",
        entryRequirements: {
            isSubscribedRequired: false,
            playerLevel: 1, // 玩家等级要求（需根据实际需求调整）
            entryFee: { coins: 0, energy: 6 },
        },
        matchRules: {
            minPlayers: 1,
            maxPlayers: 1,
        },
        rewards: {
            baseRewards: { coins: 90, energy: 14 },
            performanceRewards: {
                baseReward: { coins: 380 },
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
        gameRule: {
            description: "白银挑战 - Boss 1",
            mode: "challenge",
            ruleId: "monster_rumble_challenge_silver_boss_1",
        },
        isActive: true,
        timeRange: "permanent",
        entryRequirements: {
            isSubscribedRequired: false,
            playerLevel: 11, // 玩家等级要求（需根据实际需求调整）
            entryFee: { coins: 0, energy: 7 },
        },
        matchRules: {
            minPlayers: 1,
            maxPlayers: 1,
        },
        rewards: {
            baseRewards: { coins: 100, energy: 15 },
            performanceRewards: {
                baseReward: { coins: 600 },
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
        gameRule: {
            description: "白银挑战 - Boss 2",
            mode: "challenge",
            ruleId: "monster_rumble_challenge_silver_boss_2",
        },
        isActive: true,
        timeRange: "permanent",
        entryRequirements: {
            isSubscribedRequired: false,
            playerLevel: 11, // 玩家等级要求（需根据实际需求调整）
            entryFee: { coins: 0, energy: 7 },
        },
        matchRules: {
            minPlayers: 1,
            maxPlayers: 1,
        },
        rewards: {
            baseRewards: { coins: 120, energy: 17 },
            performanceRewards: {
                baseReward: { coins: 640 },
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
        gameRule: {
            description: "白银挑战 - Boss 3",
            mode: "challenge",
            ruleId: "monster_rumble_challenge_silver_boss_3",
        },
        isActive: true,
        timeRange: "permanent",
        entryRequirements: {
            isSubscribedRequired: false,
            playerLevel: 11, // 玩家等级要求（需根据实际需求调整）
            entryFee: { coins: 0, energy: 7 },
        },
        matchRules: {
            minPlayers: 1,
            maxPlayers: 1,
        },
        rewards: {
            baseRewards: { coins: 140, energy: 19 },
            performanceRewards: {
                baseReward: { coins: 680 },
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
        gameRule: {
            description: "白银挑战 - Boss 4",
            mode: "challenge",
            ruleId: "monster_rumble_challenge_silver_boss_4",
        },
        isActive: true,
        timeRange: "permanent",
        entryRequirements: {
            isSubscribedRequired: false,
            playerLevel: 11, // 玩家等级要求（需根据实际需求调整）
            entryFee: { coins: 0, energy: 7 },
        },
        matchRules: {
            minPlayers: 1,
            maxPlayers: 1,
        },
        rewards: {
            baseRewards: { coins: 160, energy: 21 },
            performanceRewards: {
                baseReward: { coins: 720 },
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
        gameRule: {
            description: "白银挑战 - Boss 5",
            mode: "challenge",
            ruleId: "monster_rumble_challenge_silver_boss_5",
        },
        isActive: true,
        timeRange: "permanent",
        entryRequirements: {
            isSubscribedRequired: false,
            playerLevel: 11, // 玩家等级要求（需根据实际需求调整）
            entryFee: { coins: 0, energy: 7 },
        },
        matchRules: {
            minPlayers: 1,
            maxPlayers: 1,
        },
        rewards: {
            baseRewards: { coins: 180, energy: 23 },
            performanceRewards: {
                baseReward: { coins: 760 },
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
        gameRule: {
            description: "黄金挑战 - Boss 1",
            mode: "challenge",
            ruleId: "monster_rumble_challenge_gold_boss_1",
        },
        isActive: true,
        timeRange: "permanent",
        entryRequirements: {
            isSubscribedRequired: false,
            playerLevel: 31, // 玩家等级要求（需根据实际需求调整）
            entryFee: { coins: 0, energy: 8 },
        },
        matchRules: {
            minPlayers: 1,
            maxPlayers: 1,
        },
        rewards: {
            baseRewards: { coins: 200, energy: 20 },
            performanceRewards: {
                baseReward: { coins: 1200 },
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
        gameRule: {
            description: "黄金挑战 - Boss 2",
            mode: "challenge",
            ruleId: "monster_rumble_challenge_gold_boss_2",
        },
        isActive: true,
        timeRange: "permanent",
        entryRequirements: {
            isSubscribedRequired: false,
            playerLevel: 31, // 玩家等级要求（需根据实际需求调整）
            entryFee: { coins: 0, energy: 8 },
        },
        matchRules: {
            minPlayers: 1,
            maxPlayers: 1,
        },
        rewards: {
            baseRewards: { coins: 240, energy: 23 },
            performanceRewards: {
                baseReward: { coins: 1280 },
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
        gameRule: {
            description: "黄金挑战 - Boss 3",
            mode: "challenge",
            ruleId: "monster_rumble_challenge_gold_boss_3",
        },
        isActive: true,
        timeRange: "permanent",
        entryRequirements: {
            isSubscribedRequired: false,
            playerLevel: 31, // 玩家等级要求（需根据实际需求调整）
            entryFee: { coins: 0, energy: 8 },
        },
        matchRules: {
            minPlayers: 1,
            maxPlayers: 1,
        },
        rewards: {
            baseRewards: { coins: 280, energy: 26 },
            performanceRewards: {
                baseReward: { coins: 1360 },
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
        gameRule: {
            description: "黄金挑战 - Boss 4",
            mode: "challenge",
            ruleId: "monster_rumble_challenge_gold_boss_4",
        },
        isActive: true,
        timeRange: "permanent",
        entryRequirements: {
            isSubscribedRequired: false,
            playerLevel: 31, // 玩家等级要求（需根据实际需求调整）
            entryFee: { coins: 0, energy: 8 },
        },
        matchRules: {
            minPlayers: 1,
            maxPlayers: 1,
        },
        rewards: {
            baseRewards: { coins: 320, energy: 29 },
            performanceRewards: {
                baseReward: { coins: 1440 },
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
        gameRule: {
            description: "黄金挑战 - Boss 5",
            mode: "challenge",
            ruleId: "monster_rumble_challenge_gold_boss_5",
        },
        isActive: true,
        timeRange: "permanent",
        entryRequirements: {
            isSubscribedRequired: false,
            playerLevel: 31, // 玩家等级要求（需根据实际需求调整）
            entryFee: { coins: 0, energy: 8 },
        },
        matchRules: {
            minPlayers: 1,
            maxPlayers: 1,
        },
        rewards: {
            baseRewards: { coins: 360, energy: 32 },
            performanceRewards: {
                baseReward: { coins: 1520 },
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
        gameRule: {
            description: "白金挑战 - Boss 1",
            mode: "challenge",
            ruleId: "monster_rumble_challenge_platinum_boss_1",
        },
        isActive: true,
        timeRange: "permanent",
        entryRequirements: {
            isSubscribedRequired: false,
            playerLevel: 51, // 玩家等级要求（需根据实际需求调整）
            entryFee: { coins: 0, energy: 10 },
        },
        matchRules: {
            minPlayers: 1,
            maxPlayers: 1,
        },
        rewards: {
            baseRewards: { coins: 500, energy: 30 },
            performanceRewards: {
                baseReward: { coins: 3000 },
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
        gameRule: {
            description: "白金挑战 - Boss 2",
            mode: "challenge",
            ruleId: "monster_rumble_challenge_platinum_boss_2",
        },
        isActive: true,
        timeRange: "permanent",
        entryRequirements: {
            isSubscribedRequired: false,
            playerLevel: 51, // 玩家等级要求（需根据实际需求调整）
            entryFee: { coins: 0, energy: 10 },
        },
        matchRules: {
            minPlayers: 1,
            maxPlayers: 1,
        },
        rewards: {
            baseRewards: { coins: 600, energy: 35 },
            performanceRewards: {
                baseReward: { coins: 3200 },
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
        gameRule: {
            description: "白金挑战 - Boss 3",
            mode: "challenge",
            ruleId: "monster_rumble_challenge_platinum_boss_3",
        },
        isActive: true,
        timeRange: "permanent",
        entryRequirements: {
            isSubscribedRequired: false,
            playerLevel: 51, // 玩家等级要求（需根据实际需求调整）
            entryFee: { coins: 0, energy: 10 },
        },
        matchRules: {
            minPlayers: 1,
            maxPlayers: 1,
        },
        rewards: {
            baseRewards: { coins: 700, energy: 40 },
            performanceRewards: {
                baseReward: { coins: 3400 },
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
        gameRule: {
            description: "白金挑战 - Boss 4",
            mode: "challenge",
            ruleId: "monster_rumble_challenge_platinum_boss_4",
        },
        isActive: true,
        timeRange: "permanent",
        entryRequirements: {
            isSubscribedRequired: false,
            playerLevel: 51, // 玩家等级要求（需根据实际需求调整）
            entryFee: { coins: 0, energy: 10 },
        },
        matchRules: {
            minPlayers: 1,
            maxPlayers: 1,
        },
        rewards: {
            baseRewards: { coins: 800, energy: 45 },
            performanceRewards: {
                baseReward: { coins: 3600 },
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
        gameRule: {
            description: "白金挑战 - Boss 5",
            mode: "challenge",
            ruleId: "monster_rumble_challenge_platinum_boss_5",
        },
        isActive: true,
        timeRange: "permanent",
        entryRequirements: {
            isSubscribedRequired: false,
            playerLevel: 51, // 玩家等级要求（需根据实际需求调整）
            entryFee: { coins: 0, energy: 10 },
        },
        matchRules: {
            minPlayers: 1,
            maxPlayers: 1,
        },
        rewards: {
            baseRewards: { coins: 900, energy: 50 },
            performanceRewards: {
                baseReward: { coins: 3800 },
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
        gameRule: {
            description: "连续挑战多个 Boss，测试你的极限！",
            mode: "challenge",
            ruleId: "monster_rumble_boss_rush_bronze",
        },
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
        gameRule: {
            description: "继续你的冒险，挑战更强的 Boss！",
            mode: "story",
            ruleId: "monster_rumble_story_1_2",
        },
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
        gameRule: {
            description: "选择路线A，挑战敏捷型 Boss！",
            mode: "story",
            ruleId: "monster_rumble_story_1_2a",
        },
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
        gameRule: {
            description: "选择路线B，挑战防御型 Boss！",
            mode: "story",
            ruleId: "monster_rumble_story_1_2b",
        },
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
        gameRule: {
            description: "两条路线汇合，挑战最终 Boss！",
            mode: "story",
            ruleId: "monster_rumble_story_1_3",
        },
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
            },
        },

        limits: {
            maxAttempts: 999,
        },
    },
];

/**
 * 转换旧格式配置为新格式（向后兼容）
 * 将 type 和 stageRuleId 转换为 gameRule 对象
 * 注意：此函数用于向后兼容，新配置应直接使用 gameRule 格式
 */
function convertToSchemaFormat(config: any): TournamentConfig {
    const converted: any = { ...config };

    // 如果有 stageRuleId，转换为 gameRule 对象
    if (config.stageRuleId && !config.gameRule) {
        const mode = config.type === "challenge" ? "challenge"
            : config.type === "arena" ? "pvp"
                : config.type === "story" ? "story"
                    : "challenge"; // 默认值

        converted.gameRule = {
            description: config.description || config.name,
            mode: mode as "challenge" | "pvp" | "story",
            ruleId: config.stageRuleId,
        };
    }

    // 移除旧字段（如果存在）
    delete converted.type;
    delete converted.stageRuleId;
    delete converted.stageRule; // 兼容旧版本的 stageRule
    delete converted.priority; // schema 中无此字段

    return converted as TournamentConfig;
}

/**
 * 获取锦标赛配置
 */
export function getTournamentConfig(typeId: string): TournamentConfig | undefined {
    const config = TOURNAMENT_CONFIGS.find(config => config.typeId === typeId);
    if (!config) return undefined;

    // 如果是旧格式，转换为新格式
    if ((config as any).type || (config as any).stageRuleId) {
        return convertToSchemaFormat(config);
    }

    return config;
}

/**
 * 获取活跃的锦标赛配置
 */
export function getActiveTournamentConfigs(): TournamentConfig[] {
    return TOURNAMENT_CONFIGS
        .filter(config => config.isActive)
        .map(config => {
            // 如果是旧格式，转换为新格式
            if ((config as any).type || (config as any).stageRuleId) {
                return convertToSchemaFormat(config);
            }
            return config;
        });
}

/**
 * 按游戏类型获取锦标赛配置
 */
export function getTournamentConfigsByGameType(gameType: string): TournamentConfig[] {
    return TOURNAMENT_CONFIGS
        .filter(config => (config.gameType === gameType) && config.isActive)
        .map(config => {
            // 如果是旧格式，转换为新格式
            if ((config as any).type || (config as any).stageRuleId) {
                return convertToSchemaFormat(config);
            }
            return config;
        });
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
        if (config.matchRules.minPlayers < 1) errors.push("minPlayers 必须大于等于 1");
        if (config.matchRules.maxPlayers < config.matchRules.minPlayers) {
            errors.push("maxPlayers 必须大于等于 minPlayers");
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
    } else {
        // 验证 maxAttempts
        if (config.limits.maxAttempts !== undefined && config.limits.maxAttempts < 0) {
            errors.push("maxAttempts 必须大于等于 0");
        }
        // 验证 attemptCost
        if (config.limits.attemptCost) {
            if (config.limits.attemptCost.coins !== undefined && config.limits.attemptCost.coins < 0) {
                errors.push("attemptCost.coins 必须大于等于 0");
            }
            if (config.limits.attemptCost.energy !== undefined && config.limits.attemptCost.energy < 0) {
                errors.push("attemptCost.energy 必须大于等于 0");
            }
        }
    }

    // firstClearRewards 验证（仅用于单人关卡）
    if (config.rewards.firstClearRewards) {
        const isSinglePlayer = config.matchRules.minPlayers === 1 && config.matchRules.maxPlayers === 1;
        if (!isSinglePlayer) {
            errors.push("firstClearRewards 仅适用于单人关卡（minPlayers=1, maxPlayers=1）");
        }
        // 验证 firstClearRewards.chestTypeWeights 权重总和
        if (config.rewards.firstClearRewards.chestTypeWeights) {
            const weights = config.rewards.firstClearRewards.chestTypeWeights;
            const sum = (weights.silver || 0) + (weights.gold || 0) + (weights.purple || 0) + (weights.orange || 0);
            if (sum < 0.99 || sum > 1.01) {
                errors.push(`firstClearRewards.chestTypeWeights 权重总和应为 1.0，当前为 ${sum}`);
            }
        }
        // 验证 firstClearRewards.chestDropRate 范围
        if (config.rewards.firstClearRewards.chestDropRate !== undefined) {
            if (config.rewards.firstClearRewards.chestDropRate < 0 || config.rewards.firstClearRewards.chestDropRate > 1) {
                errors.push("firstClearRewards.chestDropRate 必须在 0-1 之间");
            }
        }
    }

    // chestTypeWeights 验证
    // 验证 rankRewards 中每个项的 chestTypeWeights
    if (config.rewards.rankRewards) {
        for (const rankReward of config.rewards.rankRewards) {
            if (rankReward.chestTypeWeights) {
                const weights = rankReward.chestTypeWeights;
                const sum = (weights.silver || 0) + (weights.gold || 0) + (weights.purple || 0) + (weights.orange || 0);
                if (sum < 0.99 || sum > 1.01) {
                    errors.push(`rankRewards[${rankReward.rankRange[0]}-${rankReward.rankRange[1]}].chestTypeWeights 权重总和应为 1.0，当前为 ${sum}`);
                }
            }
            if (rankReward.chestDropRate !== undefined) {
                if (rankReward.chestDropRate < 0 || rankReward.chestDropRate > 1) {
                    errors.push(`rankRewards[${rankReward.rankRange[0]}-${rankReward.rankRange[1]}].chestDropRate 必须在 0-1 之间`);
                }
            }
        }
    }

    // 验证 performanceRewards.levelRewards 中每个等级的 chestTypeWeights
    if (config.rewards.performanceRewards?.levelRewards) {
        for (const [levelKey, levelReward] of Object.entries(config.rewards.performanceRewards.levelRewards)) {
            if (levelReward.chestTypeWeights) {
                const weights = levelReward.chestTypeWeights;
                const sum = (weights.silver || 0) + (weights.gold || 0) + (weights.purple || 0) + (weights.orange || 0);
                if (sum < 0.99 || sum > 1.01) {
                    errors.push(`performanceRewards.levelRewards[${levelKey}].chestTypeWeights 权重总和应为 1.0，当前为 ${sum}`);
                }
            }
            if (levelReward.chestDropRate !== undefined) {
                if (levelReward.chestDropRate < 0 || levelReward.chestDropRate > 1) {
                    errors.push(`performanceRewards.levelRewards[${levelKey}].chestDropRate 必须在 0-1 之间`);
                }
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

