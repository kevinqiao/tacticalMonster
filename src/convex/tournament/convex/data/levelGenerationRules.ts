/**
 * 挑战模式关卡生成规则配置
 * 用于动态生成挑战模式顺序解锁的关卡序列
 * 支持Boss难度自适应配置（基于Boss Power与玩家Team Power的比率）
 */

import { SoloChallengeConfig, TournamentConfig } from "./tournamentConfigs";

// 注意：TIER_CONFIGS 需要从 TacticalMonster 模块获取
// 这里使用类型定义，实际使用时需要通过 HTTP 调用或共享配置
// 为了示例，这里定义一个简化的 Boss 池获取函数
function getBossPoolByTier(tier?: string): string[] {
    // 实际实现应该从 TacticalMonster 模块获取
    // 这里返回示例数据
    const tierBossMap: Record<string, string[]> = {
        bronze: ["boss_bronze_1", "boss_bronze_2"],
        silver: ["boss_silver_1", "boss_silver_2"],
        gold: ["boss_gold_1", "boss_gold_2"],
        platinum: ["boss_platinum_1", "boss_platinum_2"],
    };
    return tier ? (tierBossMap[tier] || []) : [];
}

/**
 * 关卡生成规则
 * 定义如何动态生成一系列关卡
 */
export interface LevelGenerationRule {
    // ============================================
    // 基础信息
    // ============================================
    ruleId: string;                    // 规则唯一ID
    name: string;                      // 规则名称
    description: string;                // 规则描述
    isActive: boolean;                 // 是否启用

    // ============================================
    // 生成范围
    // ============================================
    generationScope: {
        // 关卡类型（仅支持挑战模式）
        levelType: "challenge";

        // Tier 范围（挑战模式）
        tier: "bronze" | "silver" | "gold" | "platinum";

        // 关卡数量
        levelCount: number;             // 生成的关卡数量
    };

    // ============================================
    // 关卡模板（用于生成每个关卡）
    // ============================================
    levelTemplate: {
        // 基础配置模板
        baseConfig: Partial<TournamentConfig>;

        // 单人挑战配置模板
        soloChallengeTemplate: Partial<SoloChallengeConfig>;

        // 动态字段生成规则
        dynamicFields?: {
            // typeId 生成规则
            typeIdPattern?: string;      // 如 "monster_rumble_story_{chapter}_{level}"

            // name 生成规则
            namePattern?: string;        // 如 "{tier}挑战 - Boss {level}"

            // Boss 分配规则
            bossAssignment?: {
                mode: "sequential" | "random" | "round_robin" | "tier_based";
                // sequential: 按顺序分配 Boss
                // random: 随机分配
                // round_robin: 轮询分配
                // tier_based: 基于 Tier 配置的 Boss 列表
                bossPool?: string[];      // Boss ID 列表
            };

            // ✅ Boss难度倍数配置（手动配置参数）
            // 每个关卡对应一个难度倍数，表示Boss Power与玩家Team Power的目标比率
            difficultyMultipliers?: number[];  // 每个关卡对应的难度倍数数组

            // 奖励递增规则
            rewardProgression?: {
                enabled: boolean;
                baseCoins?: number;
                coinsIncrement?: number;  // 每关金币增量
                baseEnergy?: number;
                energyIncrement?: number;  // 每关能量增量
            };
        };
    };

    // ============================================
    // 关卡链配置
    // ============================================
    chainConfig?: {
        // 是否自动建立关卡链
        autoChain: boolean;              // 默认 true

        // 关卡链ID
        chainIdPattern?: string;         // 如 "challenge_{tier}"

        // 解锁模式
        unlockMode?: "sequential" | "parallel" | "any";

        // 自动解锁
        autoUnlockNext?: boolean;        // 默认 true
    };
}

/**
 * 挑战模式关卡生成规则配置示例
 */
export const LEVEL_GENERATION_RULES: LevelGenerationRule[] = [
    // ============================================
    // 示例1：挑战模式 Bronze Tier 关卡生成规则
    // ============================================
    {
        ruleId: "challenge_bronze_generation",
        name: "青铜挑战关卡生成规则",
        description: "自动生成青铜 Tier 的所有挑战关卡",
        isActive: true,

        generationScope: {
            levelType: "challenge",
            tier: "bronze",
            levelCount: 5,  // 生成5个挑战关卡
        },

        levelTemplate: {
            baseConfig: {
                gameType: "tacticalMonster",
                isActive: true,
                timeRange: "permanent",
                entryRequirements: {
                    isSubscribedRequired: false,
                    tier: "bronze",
                    entryFee: {
                        coins: 0,
                        energy: 6,
                    },
                    minPower: 0,
                    maxPower: 2000,
                },
                matchRules: {
                    matchType: "single_match",
                    minPlayers: 1,
                    maxPlayers: 1,
                    rankingMethod: "highest_score",
                    timeLimit: {
                        perMatch: 300,
                    },
                },
                rewards: {
                    baseRewards: {
                        coins: 50,
                        energy: 10,
                    },
                    // ✅ 单人关卡不使用 rankRewards
                    rankRewards: [],  // 空数组，单人关卡不使用排名奖励
                    tierBonus: {
                        bronze: {
                            coins: 50,
                        },
                    },
                    // ✅ 表现奖励配置（基于分数阈值）
                    performanceRewards: {
                        baseReward: {
                            coins: 300,  // 基础表现奖励金币
                            monsterShards: [
                                { monsterId: "monster_001", quantity: 10 },
                            ],
                        },
                        scoreThresholds: {
                            excellent: 90000,  // 优秀：≥90000分，100%奖励
                            good: 70000,       // 良好：≥70000分，80%奖励
                            average: 50000,    // 一般：≥50000分，50%奖励
                            // 低于50000分：只有基础奖励，没有表现奖励
                        },
                    },
                },
                limits: {
                    maxAttempts: 3,
                },
            },

            soloChallengeTemplate: {
                levelType: "challenge",
                unlockConditions: {
                    minPlayerLevel: 1,
                },
                levelContent: {
                    bossConfig: {},
                    // Boss难度自适应配置（基础模板）
                    difficultyAdjustment: {
                        powerBasedScaling: true,
                        difficultyMultiplier: 1.0,  // 默认值，将在dynamicFields中覆盖
                        minMultiplier: 0.5,
                        maxMultiplier: 2.0,
                    } as any,  // 类型断言，因为difficultyMultiplier等字段已在tournamentConfigs.ts中定义
                },
                retryConfig: {
                    maxAttempts: 3,
                    retryCost: {
                        energy: 3,
                    },
                },
            },

            dynamicFields: {
                typeIdPattern: "monster_rumble_challenge_bronze_boss_{level}",
                namePattern: "青铜挑战 - Boss {level}",
                bossAssignment: {
                    mode: "round_robin",
                    bossPool: getBossPoolByTier("bronze"),
                },
                // ✅ Boss难度倍数配置（手动配置参数）
                // 每个关卡对应一个难度倍数，表示Boss Power与玩家Team Power的目标比率
                difficultyMultipliers: [1.0, 1.1, 1.2, 1.3, 1.5],  // 5个关卡对应的难度倍数
                rewardProgression: {
                    enabled: true,
                    baseCoins: 50,
                    coinsIncrement: 10,  // 每关增加10金币
                    baseEnergy: 10,
                    energyIncrement: 1,  // 每关增加1能量
                },
            },
        },

        chainConfig: {
            autoChain: true,
            chainIdPattern: "challenge_bronze",
            unlockMode: "sequential",
            autoUnlockNext: true,
        },
    },

    // ============================================
    // 示例2：挑战模式 Silver Tier 关卡生成规则
    // ============================================
    {
        ruleId: "challenge_silver_generation",
        name: "白银挑战关卡生成规则",
        description: "自动生成白银 Tier 的所有挑战关卡",
        isActive: true,

        generationScope: {
            levelType: "challenge",
            tier: "silver",
            levelCount: 5,  // 生成5个挑战关卡
        },

        levelTemplate: {
            baseConfig: {
                gameType: "tacticalMonster",
                isActive: true,
                timeRange: "permanent",
                entryRequirements: {
                    isSubscribedRequired: false,
                    tier: "silver",
                    entryFee: {
                        coins: 0,
                        energy: 7,
                    },
                    minPower: 2000,
                    maxPower: 5000,
                },
                matchRules: {
                    matchType: "single_match",
                    minPlayers: 1,
                    maxPlayers: 1,
                    rankingMethod: "highest_score",
                    timeLimit: {
                        perMatch: 300,
                    },
                },
                rewards: {
                    baseRewards: {
                        coins: 100,
                        energy: 15,
                    },
                    rankRewards: [],  // 空数组，单人关卡不使用排名奖励
                    tierBonus: {
                        silver: {
                            coins: 100,
                        },
                    },
                    // ✅ 表现奖励配置（基于分数阈值）
                    performanceRewards: {
                        baseReward: {
                            coins: 600,  // Silver Tier 基础表现奖励更高
                            monsterShards: [
                                { monsterId: "monster_002", quantity: 15 },
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
                    maxAttempts: 3,
                },
            },

            soloChallengeTemplate: {
                levelType: "challenge",
                unlockConditions: {
                    minPlayerLevel: 11,
                },
                levelContent: {
                    bossConfig: {},
                    difficultyAdjustment: {
                        powerBasedScaling: true,
                        difficultyMultiplier: 1.1,  // 默认值，将在dynamicFields中覆盖
                        minMultiplier: 0.8,
                        maxMultiplier: 2.0,
                    } as any,  // 类型断言
                },
                retryConfig: {
                    maxAttempts: 3,
                    retryCost: {
                        energy: 4,
                    },
                },
            },

            dynamicFields: {
                typeIdPattern: "monster_rumble_challenge_silver_boss_{level}",
                namePattern: "白银挑战 - Boss {level}",
                bossAssignment: {
                    mode: "round_robin",
                    bossPool: getBossPoolByTier("silver"),
                },
                // ✅ Boss难度倍数配置（手动配置参数）
                difficultyMultipliers: [1.1, 1.2, 1.3, 1.4, 1.6],  // Silver Tier 难度稍高
                rewardProgression: {
                    enabled: true,
                    baseCoins: 100,
                    coinsIncrement: 20,
                    baseEnergy: 15,
                    energyIncrement: 2,
                },
            },
        },

        chainConfig: {
            autoChain: true,
            chainIdPattern: "challenge_silver",
            unlockMode: "sequential",
            autoUnlockNext: true,
        },
    },

    // ============================================
    // 示例3：挑战模式 Gold Tier 关卡生成规则
    // ============================================
    {
        ruleId: "challenge_gold_generation",
        name: "黄金挑战关卡生成规则",
        description: "自动生成黄金 Tier 的所有挑战关卡",
        isActive: true,

        generationScope: {
            levelType: "challenge",
            tier: "gold",
            levelCount: 5,  // 生成5个挑战关卡
        },

        levelTemplate: {
            baseConfig: {
                gameType: "tacticalMonster",
                isActive: true,
                timeRange: "permanent",
                entryRequirements: {
                    isSubscribedRequired: false,
                    tier: "gold",
                    entryFee: {
                        coins: 0,
                        energy: 8,
                    },
                    minPower: 5000,
                    maxPower: 10000,
                },
                matchRules: {
                    matchType: "single_match",
                    minPlayers: 1,
                    maxPlayers: 1,
                    rankingMethod: "highest_score",
                    timeLimit: {
                        perMatch: 300,
                    },
                },
                rewards: {
                    baseRewards: {
                        coins: 200,
                        energy: 20,
                    },
                    rankRewards: [],  // 空数组，单人关卡不使用排名奖励
                    tierBonus: {
                        gold: {
                            coins: 200,
                        },
                    },
                    // ✅ 表现奖励配置（基于分数阈值）
                    performanceRewards: {
                        baseReward: {
                            coins: 1200,  // Gold Tier 基础表现奖励更高
                            monsterShards: [
                                { monsterId: "monster_003", quantity: 20 },
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
                    maxAttempts: 3,
                },
            },

            soloChallengeTemplate: {
                levelType: "challenge",
                unlockConditions: {
                    minPlayerLevel: 31,
                },
                levelContent: {
                    bossConfig: {},
                    difficultyAdjustment: {
                        powerBasedScaling: true,
                        difficultyMultiplier: 1.2,  // 默认值，将在dynamicFields中覆盖
                        minMultiplier: 1.0,
                        maxMultiplier: 2.0,
                    } as any,  // 类型断言
                },
                retryConfig: {
                    maxAttempts: 3,
                    retryCost: {
                        energy: 5,
                    },
                },
            },

            dynamicFields: {
                typeIdPattern: "monster_rumble_challenge_gold_boss_{level}",
                namePattern: "黄金挑战 - Boss {level}",
                bossAssignment: {
                    mode: "round_robin",
                    bossPool: getBossPoolByTier("gold"),
                },
                // ✅ Boss难度倍数配置（手动配置参数）
                difficultyMultipliers: [1.2, 1.3, 1.4, 1.5, 1.7],  // Gold Tier 难度更高
                rewardProgression: {
                    enabled: true,
                    baseCoins: 200,
                    coinsIncrement: 40,
                    baseEnergy: 20,
                    energyIncrement: 3,
                },
            },
        },

        chainConfig: {
            autoChain: true,
            chainIdPattern: "challenge_gold",
            unlockMode: "sequential",
            autoUnlockNext: true,
        },
    },

    // ============================================
    // 示例4：挑战模式 Platinum Tier 关卡生成规则
    // ============================================
    {
        ruleId: "challenge_platinum_generation",
        name: "白金挑战关卡生成规则",
        description: "自动生成白金 Tier 的所有挑战关卡",
        isActive: true,

        generationScope: {
            levelType: "challenge",
            tier: "platinum",
            levelCount: 5,  // 生成5个挑战关卡
        },

        levelTemplate: {
            baseConfig: {
                gameType: "tacticalMonster",
                isActive: true,
                timeRange: "permanent",
                entryRequirements: {
                    isSubscribedRequired: false,
                    tier: "platinum",
                    entryFee: {
                        coins: 0,
                        energy: 10,
                    },
                    minPower: 10000,
                    maxPower: Infinity,
                },
                matchRules: {
                    matchType: "single_match",
                    minPlayers: 1,
                    maxPlayers: 1,
                    rankingMethod: "highest_score",
                    timeLimit: {
                        perMatch: 300,
                    },
                },
                rewards: {
                    baseRewards: {
                        coins: 500,
                        energy: 30,
                    },
                    rankRewards: [],  // 空数组，单人关卡不使用排名奖励
                    tierBonus: {
                        platinum: {
                            coins: 500,
                        },
                    },
                    // ✅ 表现奖励配置（基于分数阈值）
                    performanceRewards: {
                        baseReward: {
                            coins: 3000,  // Platinum Tier 基础表现奖励最高
                            monsterShards: [
                                { monsterId: "monster_004", quantity: 30 },
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
                    maxAttempts: 3,
                },
            },

            soloChallengeTemplate: {
                levelType: "challenge",
                unlockConditions: {
                    minPlayerLevel: 51,
                },
                levelContent: {
                    bossConfig: {},
                    difficultyAdjustment: {
                        powerBasedScaling: true,
                        difficultyMultiplier: 1.3,  // 默认值，将在dynamicFields中覆盖
                        minMultiplier: 1.0,
                        maxMultiplier: 2.0,
                    } as any,  // 类型断言
                },
                retryConfig: {
                    maxAttempts: 3,
                    retryCost: {
                        energy: 6,
                    },
                },
            },

            dynamicFields: {
                typeIdPattern: "monster_rumble_challenge_platinum_boss_{level}",
                namePattern: "白金挑战 - Boss {level}",
                bossAssignment: {
                    mode: "round_robin",
                    bossPool: getBossPoolByTier("platinum"),
                },
                // ✅ Boss难度倍数配置（手动配置参数）
                difficultyMultipliers: [1.3, 1.4, 1.5, 1.6, 2.0],  // Platinum Tier 最高难度
                rewardProgression: {
                    enabled: true,
                    baseCoins: 500,
                    coinsIncrement: 100,
                    baseEnergy: 30,
                    energyIncrement: 5,
                },
            },
        },

        chainConfig: {
            autoChain: true,
            chainIdPattern: "challenge_platinum",
            unlockMode: "sequential",
            autoUnlockNext: true,
        },
    },
];

/**
 * 关卡生成器
 * 根据规则动态生成关卡配置
 */
export class LevelGenerator {
    /**
     * 根据规则生成关卡配置列表
     */
    static generateLevels(rule: LevelGenerationRule): TournamentConfig[] {
        const { generationScope, levelTemplate, chainConfig } = rule;
        const levels: TournamentConfig[] = [];

        // 1. 确定生成范围
        const levelCount = this.getLevelCount(generationScope);
        const tier = generationScope.tier;

        // 2. 准备 Boss 池
        const bossPool = this.prepareBossPool(levelTemplate.dynamicFields?.bossAssignment, tier);

        // 3. 生成每个关卡
        for (let i = 0; i < levelCount; i++) {
            const levelNumber = i + 1;

            // 生成关卡配置
            const levelConfig = this.generateSingleLevel(
                rule,
                levelNumber,
                i,
                bossPool
            );

            levels.push(levelConfig);
        }

        // 4. 建立关卡链关系
        if (chainConfig?.autoChain) {
            this.buildLevelChain(levels, chainConfig);
        }

        return levels;
    }

    /**
     * 获取关卡数量
     */
    private static getLevelCount(scope: LevelGenerationRule["generationScope"]): number {
        return scope.levelCount || 1;
    }

    /**
     * 准备 Boss 池
     */
    private static prepareBossPool(
        bossAssignment?: NonNullable<LevelGenerationRule["levelTemplate"]["dynamicFields"]>["bossAssignment"],
        tier?: string
    ): string[] {
        if (bossAssignment?.bossPool) {
            return bossAssignment.bossPool;
        }

        // 如果没有指定 Boss 池，使用 Tier 配置
        if (tier) {
            return getBossPoolByTier(tier);
        }

        return [];
    }

    /**
     * 生成单个关卡配置
     */
    private static generateSingleLevel(
        rule: LevelGenerationRule,
        levelNumber: number,
        index: number,
        bossPool: string[]
    ): TournamentConfig {
        const { generationScope, levelTemplate, chainConfig } = rule;
        const { dynamicFields } = levelTemplate;

        // 1. 生成 typeId
        const typeId = this.generateTypeId(
            dynamicFields?.typeIdPattern || "challenge_{tier}_boss_{level}",
            { level: levelNumber, tier: generationScope.tier }
        );

        // 2. 生成 name
        const name = this.generateName(
            dynamicFields?.namePattern || "{tier}挑战 - Boss {level}",
            { level: levelNumber, tier: generationScope.tier }
        );

        // 3. 分配 Boss
        const bossId = this.assignBoss(
            bossPool,
            dynamicFields?.bossAssignment?.mode || "round_robin",
            index
        );

        // 4. 获取Boss难度倍数（手动配置参数）
        const difficultyMultipliers = dynamicFields?.difficultyMultipliers || [];
        const difficultyMultiplier = difficultyMultipliers[index] || 1.0;

        // 5. 计算奖励
        const rewards = this.calculateRewards(
            levelTemplate.baseConfig.rewards!,
            index,
            dynamicFields?.rewardProgression
        );

        // 6. 构建完整配置
        const config: TournamentConfig = {
            ...levelTemplate.baseConfig,
            typeId,
            name,
            description: `${name} - 自动生成`,
            gameType: "tacticalMonster",
            isActive: true,
            rewards,
            soloChallenge: {
                ...levelTemplate.soloChallengeTemplate,
                levelType: generationScope.levelType,
                levelNumber,
                levelContent: {
                    ...levelTemplate.soloChallengeTemplate.levelContent,
                    bossConfig: {
                        ...levelTemplate.soloChallengeTemplate.levelContent?.bossConfig,
                        bossId,
                    },
                    // ✅ 应用Boss难度倍数配置
                    difficultyAdjustment: {
                        ...levelTemplate.soloChallengeTemplate.levelContent?.difficultyAdjustment,
                        difficultyMultiplier: difficultyMultiplier,  // 手动配置的难度倍数
                    },
                },
                levelChain: {
                    chainId: chainConfig?.chainIdPattern
                        ? this.generateTypeId(chainConfig.chainIdPattern, { tier: generationScope.tier })
                        : undefined,
                    chainOrder: levelNumber,
                    unlockMode: chainConfig?.unlockMode || "sequential",
                    autoUnlockNext: chainConfig?.autoUnlockNext !== false,
                },
                sortOrder: levelNumber,
            },
        } as TournamentConfig;

        return config;
    }

    /**
     * 生成 typeId（支持变量替换）
     */
    private static generateTypeId(
        pattern: string,
        variables: { level?: number; tier?: string }
    ): string {
        let typeId = pattern;
        if (variables.level !== undefined) {
            typeId = typeId.replace(/{level}/g, String(variables.level));
        }
        if (variables.tier) {
            typeId = typeId.replace(/{tier}/g, variables.tier);
        }
        return typeId;
    }

    /**
     * 生成 name（支持变量替换）
     */
    private static generateName(
        pattern: string,
        variables: { level?: number; tier?: string }
    ): string {
        let name = pattern;
        if (variables.level !== undefined) {
            name = name.replace(/{level}/g, String(variables.level));
        }
        if (variables.tier) {
            name = name.replace(/{tier}/g, variables.tier);
        }
        return name;
    }

    /**
     * 分配 Boss
     */
    private static assignBoss(
        bossPool: string[],
        mode: "sequential" | "random" | "round_robin" | "tier_based",
        index: number
    ): string {
        if (bossPool.length === 0) {
            return "boss_default";
        }

        switch (mode) {
            case "sequential":
                // 按顺序分配
                return bossPool[index % bossPool.length];

            case "round_robin":
                // 轮询分配
                return bossPool[index % bossPool.length];

            case "random":
                // 随机分配（使用索引作为种子）
                const randomIndex = (index * 7 + 13) % bossPool.length;
                return bossPool[randomIndex];

            case "tier_based":
                // 基于 Tier 分配（已通过 bossPool 传入）
                return bossPool[index % bossPool.length];

            default:
                return bossPool[0];
        }
    }


    /**
     * 计算奖励
     */
    private static calculateRewards(
        baseRewards: TournamentConfig["rewards"],
        index: number,
        progression?: NonNullable<LevelGenerationRule["levelTemplate"]["dynamicFields"]>["rewardProgression"]
    ): TournamentConfig["rewards"] {
        if (!progression?.enabled) {
            return baseRewards;
        }

        const coinsIncrement = progression.coinsIncrement || 0;
        const energyIncrement = progression.energyIncrement || 0;

        // 深拷贝并更新奖励
        const rewards = JSON.parse(JSON.stringify(baseRewards));

        // 更新基础奖励
        if (rewards.baseRewards) {
            if (rewards.baseRewards.coins !== undefined) {
                rewards.baseRewards.coins = (progression.baseCoins || rewards.baseRewards.coins) + (coinsIncrement * index);
            }
            if (rewards.baseRewards.energy !== undefined) {
                rewards.baseRewards.energy = (progression.baseEnergy || rewards.baseRewards.energy) + (energyIncrement * index);
            }
        }

        // ✅ 更新表现奖励（单人关卡专用）
        // 表现奖励的基础奖励也会随关卡递增
        if (rewards.performanceRewards?.baseReward) {
            const performanceBaseReward = rewards.performanceRewards.baseReward;
            if (performanceBaseReward.coins !== undefined) {
                // 表现奖励的递增幅度更大（2倍基础奖励递增）
                performanceBaseReward.coins = (performanceBaseReward.coins || 0) + (coinsIncrement * index * 2);
            }
            // 注意：分数阈值保持不变，只有基础奖励金额递增
        }

        return rewards;
    }

    /**
     * 建立关卡链关系
     */
    private static buildLevelChain(
        levels: TournamentConfig[],
        chainConfig: LevelGenerationRule["chainConfig"]
    ): void {
        if (!chainConfig?.autoChain) {
            return;
        }

        // 按 chainOrder 排序
        levels.sort((a, b) => {
            const orderA = a.soloChallenge?.levelChain?.chainOrder || 0;
            const orderB = b.soloChallenge?.levelChain?.chainOrder || 0;
            return orderA - orderB;
        });

        // 建立前后关系
        for (let i = 0; i < levels.length; i++) {
            const current = levels[i];
            const previous = i > 0 ? levels[i - 1] : null;
            const next = i < levels.length - 1 ? levels[i + 1] : null;

            if (!current.soloChallenge) {
                continue;
            }

            // 设置前置关卡
            if (previous) {
                if (!current.soloChallenge.levelChain) {
                    current.soloChallenge.levelChain = {};
                }
                current.soloChallenge.levelChain.previousLevels = [previous.typeId];
            }

            // 设置下一关卡
            if (next) {
                if (!current.soloChallenge.levelChain) {
                    current.soloChallenge.levelChain = {};
                }
                current.soloChallenge.levelChain.nextLevels = [next.typeId];
            }
        }
    }
}

/**
 * 获取生成规则
 */
export function getLevelGenerationRule(ruleId: string): LevelGenerationRule | undefined {
    return LEVEL_GENERATION_RULES.find(rule => rule.ruleId === ruleId && rule.isActive);
}

/**
 * 获取所有活跃的生成规则
 */
export function getActiveGenerationRules(): LevelGenerationRule[] {
    return LEVEL_GENERATION_RULES.filter(rule => rule.isActive);
}

/**
 * 根据规则生成关卡配置并添加到配置列表
 */
export function generateAndAddLevels(ruleId: string): TournamentConfig[] {
    const rule = getLevelGenerationRule(ruleId);
    if (!rule) {
        throw new Error(`生成规则不存在: ${ruleId}`);
    }

    return LevelGenerator.generateLevels(rule);
}

