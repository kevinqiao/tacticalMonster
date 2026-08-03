import type { TournamentConfig } from "./tournamentConfigTypes";

/** TacticalMonster mode: tutorial */
export const TOURNAMENT_CONFIGS_TUTORIAL: TournamentConfig[] = [
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
        isActive: true,
        timeRange: "permanent",
        entryRequirements: {
            isSubscribedRequired: false,
            playerLevel: 1, // 玩家等级要求（需根据实际需求调整）
            entryFee: { coins: 0, energy: 6 },
        },
        mode: "tutorial",

        matchRules: {
            minPlayers: 1,
            maxPlayers: 1,
            ruleId: "monster_rumble_challenge_bronze_boss_1",
        },
        rewards: {
            baseRewards: { coins: 50, energy: 10 },
            performanceRewards: {
                baseReward: {
                    coins: 300,
                    monsterShards: [{ monsterId: "monster_001", quantity: 3 }],
                },
                scoreThresholds: [
                    { minScore: 0, level: "1" },
                    { minScore: 500, level: "2" },
                    { minScore: 1000, level: "3" },
                    { minScore: 2000, level: "4" },
                ],
            },
            firstClearRewards: {
                coins: 100,
                monsterShards: [{ monsterId: "monster_001", quantity: 5 }],
            },
        },
        limits: {
            maxAttempts: 999,
            attemptCost: { energy: 6 },
        },
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
        mode: "tutorial",

        matchRules: {
            minPlayers: 1,
            maxPlayers: 1,
            ruleId: "monster_rumble_challenge_bronze_boss_2",
        },
        rewards: {
            baseRewards: { coins: 60, energy: 11 },
            performanceRewards: {
                baseReward: {
                    coins: 320,
                    monsterShards: [{ monsterId: "monster_002", quantity: 3 }],
                },
            },
        },
        limits: { maxAttempts: 999, attemptCost: { energy: 6 } },
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
        mode: "tutorial",

        matchRules: {
            minPlayers: 1,
            maxPlayers: 1,
            ruleId: "monster_rumble_challenge_bronze_boss_3",
        },
        rewards: {
            baseRewards: { coins: 70, energy: 12 },
            performanceRewards: {
                baseReward: {
                    coins: 340,
                    monsterShards: [{ monsterId: "monster_001", quantity: 3 }],
                },
            },
        },
        limits: { maxAttempts: 999, attemptCost: { energy: 6 } },
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
        mode: "tutorial",

        matchRules: {
            minPlayers: 1,
            maxPlayers: 1,
            ruleId: "monster_rumble_challenge_bronze_boss_4",
        },
        rewards: {
            baseRewards: { coins: 80, energy: 13 },
            performanceRewards: {
                baseReward: {
                    coins: 360,
                    monsterShards: [{ monsterId: "monster_002", quantity: 3 }],
                },
            },
        },
        limits: { maxAttempts: 999, attemptCost: { energy: 6 } },
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
        mode: "tutorial",

        matchRules: {
            minPlayers: 1,
            maxPlayers: 1,
            ruleId: "monster_rumble_challenge_bronze_boss_5",
        },
        rewards: {
            baseRewards: { coins: 90, energy: 14 },
            performanceRewards: {
                baseReward: {
                    coins: 380,
                    monsterShards: [{ monsterId: "monster_001", quantity: 4 }],
                },
            },
            firstClearRewards: {
                coins: 150,
                monsterShards: [{ monsterId: "monster_002", quantity: 5 }],
            },
        },
        limits: { maxAttempts: 999, attemptCost: { energy: 6 } },
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
        mode: "tutorial",

        matchRules: {
            minPlayers: 1,
            maxPlayers: 1,
            ruleId: "monster_rumble_challenge_silver_boss_1",
        },
        rewards: {
            baseRewards: { coins: 100, energy: 15 },
            performanceRewards: {
                baseReward: {
                    coins: 600,
                    monsterShards: [{ monsterId: "monster_003", quantity: 4 }],
                },
            },
            firstClearRewards: {
                coins: 200,
                monsterShards: [{ monsterId: "monster_003", quantity: 6 }],
            },
        },
        limits: { maxAttempts: 999, attemptCost: { energy: 7 } },
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
        mode: "tutorial",

        matchRules: {
            minPlayers: 1,
            maxPlayers: 1,
            ruleId: "monster_rumble_challenge_silver_boss_2",
        },
        rewards: {
            baseRewards: { coins: 120, energy: 17 },
            performanceRewards: {
                baseReward: {
                    coins: 640,
                    monsterShards: [{ monsterId: "monster_004", quantity: 4 }],
                },
            },
        },
        limits: { maxAttempts: 999, attemptCost: { energy: 7 } },
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
        mode: "tutorial",

        matchRules: {
            minPlayers: 1,
            maxPlayers: 1,
            ruleId: "monster_rumble_challenge_silver_boss_3",
        },
        rewards: {
            baseRewards: { coins: 140, energy: 19 },
            performanceRewards: {
                baseReward: {
                    coins: 680,
                    monsterShards: [{ monsterId: "monster_003", quantity: 4 }],
                },
            },
        },
        limits: { maxAttempts: 999, attemptCost: { energy: 7 } },
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
        mode: "tutorial",

        matchRules: {
            minPlayers: 1,
            maxPlayers: 1,
            ruleId: "monster_rumble_challenge_silver_boss_4",
        },
        rewards: {
            baseRewards: { coins: 160, energy: 21 },
            performanceRewards: {
                baseReward: {
                    coins: 720,
                    monsterShards: [{ monsterId: "monster_004", quantity: 4 }],
                },
            },
        },
        limits: { maxAttempts: 999, attemptCost: { energy: 7 } },
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
        mode: "tutorial",

        matchRules: {
            minPlayers: 1,
            maxPlayers: 1,
            ruleId: "monster_rumble_challenge_silver_boss_5",
        },
        rewards: {
            baseRewards: { coins: 180, energy: 23 },
            performanceRewards: {
                baseReward: {
                    coins: 760,
                    monsterShards: [{ monsterId: "monster_003", quantity: 5 }],
                },
            },
            firstClearRewards: {
                coins: 300,
                monsterShards: [{ monsterId: "monster_004", quantity: 8 }],
            },
        },
        limits: { maxAttempts: 999, attemptCost: { energy: 7 } },
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
        mode: "tutorial",

        matchRules: {
            minPlayers: 1,
            maxPlayers: 1,
            ruleId: "monster_rumble_challenge_gold_boss_1",
        },
        rewards: {
            baseRewards: { coins: 200, energy: 20 },
            performanceRewards: {
                baseReward: {
                    coins: 1200,
                    monsterShards: [{ monsterId: "monster_005", quantity: 5 }],
                },
            },
            firstClearRewards: {
                coins: 400,
                monsterShards: [{ monsterId: "monster_005", quantity: 10 }],
            },
        },
        limits: { maxAttempts: 999, attemptCost: { energy: 8 } },
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
        mode: "tutorial",

        matchRules: {
            minPlayers: 1,
            maxPlayers: 1,
            ruleId: "monster_rumble_challenge_gold_boss_2",
        },
        rewards: {
            baseRewards: { coins: 240, energy: 23 },
            performanceRewards: {
                baseReward: {
                    coins: 1280,
                    monsterShards: [{ monsterId: "monster_006", quantity: 5 }],
                },
            },
        },
        limits: { maxAttempts: 999, attemptCost: { energy: 8 } },
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
        mode: "tutorial",

        matchRules: {
            minPlayers: 1,
            maxPlayers: 1,
            ruleId: "monster_rumble_challenge_gold_boss_3",
        },
        rewards: {
            baseRewards: { coins: 280, energy: 26 },
            performanceRewards: {
                baseReward: {
                    coins: 1360,
                    monsterShards: [{ monsterId: "monster_005", quantity: 5 }],
                },
            },
        },
        limits: { maxAttempts: 999, attemptCost: { energy: 8 } },
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
        mode: "tutorial",

        matchRules: {
            minPlayers: 1,
            maxPlayers: 1,
            ruleId: "monster_rumble_challenge_gold_boss_4",
        },
        rewards: {
            baseRewards: { coins: 320, energy: 29 },
            performanceRewards: {
                baseReward: {
                    coins: 1440,
                    monsterShards: [{ monsterId: "monster_006", quantity: 5 }],
                },
            },
        },
        limits: { maxAttempts: 999, attemptCost: { energy: 8 } },
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
        mode: "tutorial",

        matchRules: {
            minPlayers: 1,
            maxPlayers: 1,
            ruleId: "monster_rumble_challenge_gold_boss_5",
        },
        rewards: {
            baseRewards: { coins: 360, energy: 32 },
            performanceRewards: {
                baseReward: {
                    coins: 1520,
                    monsterShards: [{ monsterId: "monster_005", quantity: 6 }],
                },
            },
            firstClearRewards: {
                coins: 600,
                monsterShards: [{ monsterId: "monster_006", quantity: 10 }],
            },
        },
        limits: { maxAttempts: 999, attemptCost: { energy: 8 } },
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
        mode: "tutorial",

        matchRules: {
            minPlayers: 1,
            maxPlayers: 1,
            ruleId: "monster_rumble_challenge_platinum_boss_1",
        },
        rewards: {
            baseRewards: { coins: 500, energy: 30 },
            performanceRewards: {
                baseReward: {
                    coins: 3000,
                    monsterShards: [{ monsterId: "monster_007", quantity: 6 }],
                },
            },
            firstClearRewards: {
                coins: 800,
                monsterShards: [{ monsterId: "monster_007", quantity: 12 }],
            },
        },
        limits: { maxAttempts: 999, attemptCost: { energy: 10 } },
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
        mode: "tutorial",

        matchRules: {
            minPlayers: 1,
            maxPlayers: 1,
            ruleId: "monster_rumble_challenge_platinum_boss_2",
        },
        rewards: {
            baseRewards: { coins: 600, energy: 35 },
            performanceRewards: {
                baseReward: {
                    coins: 3200,
                    monsterShards: [{ monsterId: "monster_008", quantity: 6 }],
                },
            },
        },
        limits: { maxAttempts: 999, attemptCost: { energy: 10 } },
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
        mode: "tutorial",

        matchRules: {
            minPlayers: 1,
            maxPlayers: 1,
            ruleId: "monster_rumble_challenge_platinum_boss_3",
        },
        rewards: {
            baseRewards: { coins: 700, energy: 40 },
            performanceRewards: {
                baseReward: {
                    coins: 3400,
                    monsterShards: [{ monsterId: "monster_007", quantity: 6 }],
                },
            },
        },
        limits: { maxAttempts: 999, attemptCost: { energy: 10 } },
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
        mode: "tutorial",

        matchRules: {
            minPlayers: 1,
            maxPlayers: 1,
            ruleId: "monster_rumble_challenge_platinum_boss_4",
        },
        rewards: {
            baseRewards: { coins: 800, energy: 45 },
            performanceRewards: {
                baseReward: {
                    coins: 3600,
                    monsterShards: [{ monsterId: "monster_008", quantity: 6 }],
                },
            },
        },
        limits: { maxAttempts: 999, attemptCost: { energy: 10 } },
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
        mode: "tutorial",

        matchRules: {
            minPlayers: 1,
            maxPlayers: 1,
            ruleId: "monster_rumble_challenge_platinum_boss_5",
        },
        rewards: {
            baseRewards: { coins: 900, energy: 50 },
            performanceRewards: {
                baseReward: {
                    coins: 3800,
                    monsterShards: [{ monsterId: "monster_007", quantity: 7 }],
                },
            },
            firstClearRewards: {
                coins: 1000,
                monsterShards: [{ monsterId: "monster_008", quantity: 12 }],
            },
        },
        limits: { maxAttempts: 999, attemptCost: { energy: 10 } },
    },
];
