/**
 * 锦标赛配置类型定义 - 基于 tournament_types schema
 * 
 * 重要说明：
 * - Tier（竞技场）：TacticalMonster 特定，基于 Power 匹配，与 Boss 难度关联
 * - 对于 TacticalMonster 游戏，应使用 Tier 限制
 * - Power 基于当前队伍（inTeam: true 的怪物）计算
 * - 玩家可以通过选择低 Power 的队伍来加入低 Tier 锦标赛，实现自然降级
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
    gameType: GameType;
    isActive: boolean;
    // 参赛条件
    entryRequirements?: EntryRequirements;

    // 比赛规则
    matchRules: MatchRules;

    // 奖励配置
    rewards: RewardConfig;

    // 时间配置
    schedule?: ScheduleConfig;

    // 限制配置
    limits?: LimitConfig;

    // ============================================
    // 单人挑战配置（当 matchRules.minPlayers === 1 && maxPlayers === 1 时使用）
    // 注意：此配置定义关卡的挑战内容，与玩家等级（player level）无关
    // ============================================
    soloChallenge?: SoloChallengeConfig;

    // 时间戳
    createdAt?: string;
    updatedAt?: string;
}

/**
 * 游戏类型
 */
export type GameType =
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
 * - minPower 和 maxPower 不应该在此接口中定义
 * - 这些值应该从 tier 配置（TIER_CONFIGS）中获取
 * - tier 字段用于标识所属的 Tier，Power 范围由 TacticalMonster 模块的 tier 配置决定
 */
export interface EntryRequirements {
    // ============================================
    // 通用要求
    // ============================================
    // 订阅要求
    isSubscribedRequired: boolean;

    // Tier 要求（TacticalMonster 特定）
    // Power 范围由对应 tier 的配置决定，不在此处定义
    tier?: "bronze" | "silver" | "gold" | "platinum";

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
    // 比赛类型
    matchType: "single_match" | "multi_match" | "best_of_series" | "elimination" | "round_robin";

    // 玩家数量
    minPlayers: number;
    maxPlayers: number;
    // 排名规则
    rankingMethod: "highest_score" | "total_score" | "average_score" | "threshold";
    matchPoints?: { [k: string]: number };
    // 分数阈值（用于threshold排名）
    scoreThreshold?: number;
    // maxAttempts?: number;
    // 时间限制
    timeLimit?: {
        perMatch: number; // 秒
        perTurn?: number; // 秒
        total?: number;   // 秒
    };


}

/**
 * 奖励配置 - TacticalMonster 专用
 * 
 * 注意：
 * - 单人关卡（soloChallenge）：使用 performanceRewards（基于分数阈值）
 * - 多人比赛：使用 rankRewards（基于排名范围）
 * - 不包含 props 和 tickets（这些是传统游戏的奖励类型）
 */
export interface RewardConfig {
    // ============================================
    // 基础奖励 - 参与即可获得
    // ============================================
    baseRewards: {
        coins?: number;
        // TacticalMonster 特定奖励
        monsters?: Array<{
            monsterId: string;
            level?: number;
            stars?: number;
        }>;
        monsterShards?: Array<{
            monsterId: string;
            quantity: number;
        }>;
        energy?: number;
    };

    // ============================================
    // 排名奖励 - 仅用于多人比赛（minPlayers > 1 或 maxPlayers > 1）
    // ============================================
    rankRewards?: Array<{
        rankRange: number[]; // [minRank, maxRank]
        multiplier: number;

        // TacticalMonster 特定奖励
        coins?: number;
        monsters?: Array<{
            monsterId: string;
            level?: number;
            stars?: number;
        }>;
        monsterShards?: Array<{
            monsterId: string;
            quantity: number;
        }>;
        energy?: number;
    }>;

    // ============================================
    // Tier 加成 - TacticalMonster 特定（基于 Tier 的奖励加成）
    // ============================================
    tierBonus?: {
        bronze?: {
            coins?: number;
            monsterShards?: Array<{ monsterId: string; quantity: number; }>;
            energy?: number;
        };
        silver?: {
            coins?: number;
            monsterShards?: Array<{ monsterId: string; quantity: number; }>;
            energy?: number;
        };
        gold?: {
            coins?: number;
            monsterShards?: Array<{ monsterId: string; quantity: number; }>;
            energy?: number;
        };
        platinum?: {
            coins?: number;
            monsterShards?: Array<{ monsterId: string; quantity: number; }>;
            energy?: number;
        };
    };

    // ============================================
    // 订阅加成 - TacticalMonster 特定
    // ============================================
    subscriptionBonus?: {
        coins?: number;
        monsterShards?: Array<{ monsterId: string; quantity: number; }>;
        energy?: number;
    };

    // ============================================
    // 参与奖励 - 参与即可获得
    // ============================================
    participationReward?: {
        coins?: number;
        // TacticalMonster 特定奖励
        energy?: number;
        monsterShards?: Array<{ monsterId: string; quantity: number; }>;
    };


    // ============================================
    // 表现奖励 - 仅用于单人关卡（soloChallenge，minPlayers === 1 && maxPlayers === 1）
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
 * 时间配置
 */
export interface ScheduleConfig {
    timeZone: string;
    open: {
        day?: string;
        time: string;
    };
    start: {
        day?: string;
        time: string;
    };
    end: {
        day?: string;
        time: string;
    };
    duration?: number;
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

/**
 * 单人挑战配置
 * 当 matchRules.minPlayers === 1 && maxPlayers === 1 时，可以使用此配置
 * 
 * 注意：此配置定义关卡的挑战内容（Boss、难度、奖励等），
 * 与玩家等级（player level）无关。玩家等级在 unlockConditions.minPlayerLevel 中定义。
 */
export interface SoloChallengeConfig {
    // ============================================
    // 关卡类型和进度
    // ============================================
    levelType: "story" | "challenge" | "boss_rush" | "endless";  // 关卡类型
    chapter?: number;                    // 章节编号（故事模式使用）
    levelNumber?: number;                 // 章节内关卡编号
    worldId?: string;                     // 世界/区域ID（可选）

    // ============================================
    // 连续关卡配置（支持关卡链和关卡树）
    // ============================================
    levelChain?: {
        // 下一关卡（线性关卡链）
        nextLevels?: string[];           // 下一关卡的 typeId 列表（支持分支）

        // 前置关卡（用于验证和自动解锁）
        previousLevels?: string[];       // 前置关卡的 typeId 列表

        // 关卡组（同一组内的关卡可以并行解锁）
        levelGroup?: string;              // 关卡组ID（如 "chapter_1_group_1"）

        // 解锁模式
        unlockMode?: "sequential" | "parallel" | "any";  // 顺序解锁 | 并行解锁 | 任意完成即可
        // sequential: 必须按顺序完成前置关卡
        // parallel: 前置关卡可以并行完成
        // any: 完成任意一个前置关卡即可解锁

        // 自动解锁（完成当前关卡后自动解锁下一关卡）
        autoUnlockNext?: boolean;        // 是否自动解锁下一关卡（默认 true）

        // 关卡链元数据
        chainId?: string;                 // 关卡链ID（用于标识整个关卡链）
        chainOrder?: number;              // 在关卡链中的顺序（用于排序）
    };

    // ============================================
    // 解锁条件（兼容旧配置，优先使用 levelChain）
    // ============================================
    unlockConditions?: {
        // 前置关卡要求（需要完成的 typeId 列表）
        // 注意：如果配置了 levelChain.previousLevels，则优先使用 levelChain
        requiredTypeIds?: string[];

        // 玩家等级要求
        minPlayerLevel?: number;

        // Tier 要求（与 entryRequirements.tier 一致）
        // 注意：如果设置了 entryRequirements.tier，则自动应用

        // 自定义解锁条件
        customConditions?: Array<{
            type: string;                // 条件类型，如 "monster_collected", "achievement"
            value: any;                  // 条件值
        }>;
    };

    // ============================================
    // 关卡内容配置（TacticalMonster 特定）
    // ============================================
    levelContent?: {
        // Boss 配置
        bossConfig?: {
            bossId?: string;              // Boss ID（固定 Boss）
            bossPool?: string[];          // Boss ID 列表（随机选择）
            bossLevel?: number;           // Boss 等级（可选，用于难度调整）
            bossDifficulty?: "easy" | "medium" | "hard" | "expert";  // Boss 难度
        };

        // 关卡配置引用（关联到 mr_level_configs）
        levelConfigId?: string;          // 关联的关卡配置ID

        // 地图配置（可选，如果不使用 levelConfigId）
        mapConfig?: {
            mapSize: { rows: number; cols: number };
            generationType: "template" | "procedural" | "random";
            templateId?: string;
        };

        // 难度调整
        difficultyAdjustment?: {
            powerBasedScaling?: boolean;   // 是否基于玩家 Power 调整难度
            scalingFactor?: number;       // 难度调整系数（已废弃，使用difficultyMultiplier）
            adaptiveDifficulty?: boolean;  // 是否启用自适应难度
            // ✅ Boss难度倍数（手动配置参数）
            // 表示Boss Power与玩家Team Power的目标比率
            // 例如：1.0 表示Boss Power = Player Team Power（平衡）
            //       1.2 表示Boss Power = 1.2 × Player Team Power（Boss更强）
            difficultyMultiplier?: number;  // Boss Power / Player Team Power 的比率
            minMultiplier?: number;        // 最低难度倍数
            maxMultiplier?: number;        // 最高难度倍数
        };
    };

    // ============================================
    // 首次通关奖励（单人关卡特有）
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
        // 解锁奖励（解锁其他 typeId）
        unlocks?: Array<{
            typeId: string;              // 解锁的锦标赛 typeId
        }>;
    };

    // ============================================
    // 星级评价系统（单人关卡特有）
    // ============================================
    starRating?: {
        // 星级评价条件
        criteria: Array<{
            stars: number;               // 星级（1, 2, 3）
            condition: {
                type: "score" | "time" | "damage_taken" | "turns" | "combo";
                operator: ">=" | "<=" | "==";
                value: number;
            };
        }>;

        // 星级奖励
        starRewards?: {
            [stars: number]: {
                coins?: number;
                monsterShards?: Array<{ monsterId: string; quantity: number }>;
            };
        };
    };

    // ============================================
    // 重试配置（单人关卡特有）
    // ============================================
    retryConfig?: {
        maxAttempts?: number;            // 最大尝试次数（覆盖 limits.maxAttempts）
        retryCost?: {
            coins?: number;
            energy?: number;
        };
        unlimitedRetries?: boolean;      // 是否允许无限重试
    };

    // ============================================
    // 显示和排序
    // ============================================
    isVisible?: boolean;                 // 是否在关卡列表中显示（默认 true）
    sortOrder?: number;                  // 排序顺序
}

// 注意：积分规则配置已移至段位系统，不再在此定义
// 使用段位系统的统一配置源

/**
 * 高级配置
 */
export interface AdvancedConfig {
    // 匹配算法
    matching: {
        algorithm: "skill_based" | "random" | "tier_based" | "elo_based" | "power_based";
        skillRange?: number;
        powerRange?: number; // TacticalMonster 特定：Power 匹配范围（百分比，如 10 表示 ±10%）
        maxWaitTime: number; // 秒
        fallbackToAI: boolean;
    };

    // 结算配置
    settlement: {
        autoSettle: boolean;
        settleDelay: number; // 秒
        requireMinimumPlayers: boolean;
        minimumPlayers: number;
    };

    // 通知配置
    notifications: {
        enabled: boolean;
        types: string[];
        channels: string[];
    };

    // 监控配置
    monitoring: {
        enabled: boolean;
        metrics: string[];
        alerts: string[];
    };

    // 自定义配置
    custom?: any;
}

/**
 * 完整的锦标赛配置
 */
export const TOURNAMENT_CONFIGS: TournamentConfig[] = [
    // 快速对局配置 - 免费模式
    {
        typeId: "jackpot_solitaire_free",
        name: "Solitaire锦标赛(最好成绩)",
        description: "Solitaire锦标赛，免费模式，积分累积用于排行榜",
        gameType: "solitaire",
        isActive: true,
        timeRange: "daily",

        entryRequirements: {
            isSubscribedRequired: false,
            entryFee: {
                coins: 0 // 免费参与
            }
        },

        matchRules: {
            matchType: "multi_match",
            minPlayers: 1,
            maxPlayers: 1,
            rankingMethod: "highest_score",
            timeLimit: {
                perMatch: 300, // 5分钟
                total: 300
            }
        },

        rewards: {
            baseRewards: {
                coins: 5 // 参与奖励
            },
            rankRewards: [
                {
                    rankRange: [1, 1],
                    multiplier: 1.0,
                    coins: 10
                },
                {
                    rankRange: [2, 2],
                    multiplier: 0.5,
                    coins: 5
                },
                {
                    rankRange: [3, 4],
                    multiplier: 0.0,
                    coins: 0
                }
            ],
            participationReward: {
                coins: 5
            }
        },

        schedule: {
            timeZone: "America/Toronto",
            open: {
                time: "00:00:00"
            },
            start: {
                time: "00:30:00"
            },
            end: {
                time: "23:59:59"
            },
            duration: 86400 * 365, // 一年
        },

        limits: {
            maxParticipations: 10, // 每日10局免费
            maxTournaments: 1,
            maxAttempts: 10,
            subscribed: {
                maxParticipations: 15,
                maxTournaments: 1,
                maxAttempts: 15
            }
        },
    },

    // 快速对局配置 - 门票模式
    {
        typeId: "quick_match_solitaire_ticket2",
        name: "Solitaire快速对局(门票2)",
        description: "2-4人Solitaire快速对局，门票模式2",
        gameType: "solitaire",
        isActive: true,
        timeRange: "daily",

        entryRequirements: {
            isSubscribedRequired: false,
            tier: "bronze", // Tier 要求（仅适用于 TacticalMonster）
            entryFee: {
                coins: 10, // 门票费用
            }
        },

        matchRules: {
            matchType: "single_match",
            minPlayers: 2,
            maxPlayers: 4,
            rankingMethod: "highest_score",
        },

        rewards: {
            baseRewards: {
                coins: 10 // 参与奖励
            },
            rankRewards: [
                {
                    rankRange: [1, 1],
                    multiplier: 1.0,
                    coins: 20
                },
                {
                    rankRange: [2, 2],
                    multiplier: 0.5,
                    coins: 10
                },
                {
                    rankRange: [3, 4],
                    multiplier: 0.1,
                    coins: 2
                }
            ],
            participationReward: {
                coins: 10
            }
        },


        limits: {
            maxParticipations: 5, // 每日5局门票
            maxTournaments: 1,
            maxAttempts: 5,
            subscribed: {
                maxParticipations: 8,
                maxTournaments: 1,
                maxAttempts: 8
            }
        },
    },

    // 每日特殊锦标赛
    {
        typeId: "quick_match_solitaire_ticket1",
        name: "Solitaire快速对局(门票1)",
        description: "2人Solitaire快速对局，门票模式1",
        gameType: "solitaire",
        isActive: true,
        timeRange: "daily",

        entryRequirements: {
            isSubscribedRequired: false,
            tier: "silver",
            entryFee: {
                coins: 50,
            }
        },

        matchRules: {
            matchType: "single_match",
            minPlayers: 1,
            maxPlayers: 1,
            rankingMethod: "highest_score",
        },

        rewards: {
            baseRewards: {
                coins: 100,
            },
            performanceRewards: {
                baseReward: {
                    coins: 300,
                },
                scoreThresholds: {
                    excellent: 90000,
                    good: 70000,
                    average: 50000,
                },
            },
            subscriptionBonus: {
                coins: 1.2,
            },
            participationReward: {
                coins: 10
            }
        },

        // limits: {
        //     maxParticipations: 3,
        //     maxTournaments: 1,
        //     maxAttempts: 3,
        //     subscribed: {
        //         maxParticipations: 5,
        //         maxTournaments: 2,
        //         maxAttempts: 5
        //     }
        // },

    },

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
            tier: "bronze",
            // 注意：玩家可以通过选择低 Power 的队伍来加入低 Tier 锦标赛
            // Power 基于当前队伍（inTeam: true 的怪物）计算
            // 入场费（包含能量消耗）
            entryFee: {
                coins: 0,
                energy: 6, // TacticalMonster 特定：能量消耗
            },
        },

        matchRules: {
            matchType: "multi_match",
            minPlayers: 4,
            maxPlayers: 8,
            rankingMethod: "highest_score",
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
            // Tier 加成（TacticalMonster 特定）
            tierBonus: {
                bronze: {
                    coins: 50,
                    monsterShards: [
                        { monsterId: "monster_001", quantity: 5 },
                    ],
                },
            },
            participationReward: {
                coins: 20,
                energy: 5,
            },
        },

        schedule: {
            timeZone: "UTC",
            open: {
                time: "00:00:00",
            },
            start: {
                time: "00:00:00",
            },
            end: {
                time: "23:59:59",
            },
            duration: 86400, // 24小时
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
            tier: "bronze",
            // 注意：玩家可以通过选择低 Power 的队伍来加入低 Tier 锦标赛
            // Power 基于当前队伍（inTeam: true 的怪物）计算
            // 匹配基于 Power ±10%，确保公平匹配
            entryFee: {
                coins: 0,
                energy: 6,
            },
        },

        matchRules: {
            matchType: "multi_match",
            minPlayers: 4,
            maxPlayers: 8,
            rankingMethod: "highest_score",
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
            tierBonus: {
                bronze: {
                    coins: 50,
                    monsterShards: [
                        { monsterId: "monster_001", quantity: 5 },
                    ],
                },
            },
            participationReward: {
                coins: 20,
                energy: 5,
            },
        },

        schedule: {
            timeZone: "UTC",
            open: {
                time: "00:00:00",
            },
            start: {
                time: "00:00:00",
            },
            end: {
                time: "23:59:59",
            },
            duration: 86400,
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
            tier: "bronze",
            entryFee: {
                energy: 5,  // 故事模式消耗较少能量
            },
        },

        matchRules: {
            matchType: "single_match",
            minPlayers: 1,  // ✅ 单人关卡标识
            maxPlayers: 1,  // ✅ 单人关卡标识
            rankingMethod: "highest_score",
            timeLimit: {
                perMatch: 300,  // 5分钟
            },
        },

        rewards: {
            baseRewards: {
                coins: 50,
                energy: 5,
            },
            participationReward: {
                coins: 20,
                energy: 3,
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

        // ✅ 单人挑战配置
        soloChallenge: {
            levelType: "story",
            chapter: 1,
            levelNumber: 1,

            // ✅ 连续关卡配置
            levelChain: {
                nextLevels: ["monster_rumble_story_1_2"],  // 下一关卡
                unlockMode: "sequential",                  // 顺序解锁
                autoUnlockNext: true,                      // 自动解锁下一关
                chainId: "story_chapter_1",                // 关卡链ID
                chainOrder: 1,                             // 在链中的顺序
            },

            unlockConditions: {
                minPlayerLevel: 1,
            },

            levelContent: {
                bossConfig: {
                    bossId: "boss_bronze_1",
                    bossDifficulty: "easy",
                },
            },

            firstClearRewards: {
                coins: 200,
                energy: 10,
                monsterShards: [
                    { monsterId: "monster_001", quantity: 10 },
                ],
                // 注意：如果配置了 levelChain.autoUnlockNext，则自动解锁 nextLevels
                // 这里可以额外配置其他解锁
            },

            starRating: {
                criteria: [
                    {
                        stars: 3,
                        condition: {
                            type: "score",
                            operator: ">=",
                            value: 10000,
                        },
                    },
                    {
                        stars: 2,
                        condition: {
                            type: "score",
                            operator: ">=",
                            value: 5000,
                        },
                    },
                    {
                        stars: 1,
                        condition: {
                            type: "score",
                            operator: ">=",
                            value: 1000,
                        },
                    },
                ],
                starRewards: {
                    3: {
                        coins: 50,
                        monsterShards: [{ monsterId: "monster_001", quantity: 5 }],
                    },
                    2: {
                        coins: 30,
                    },
                    1: {
                        coins: 10,
                    },
                },
            },

            retryConfig: {
                unlimitedRetries: true,  // 故事模式允许无限重试
            },

            isVisible: true,
            sortOrder: 1,
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
            tier: "bronze",
            entryFee: { coins: 0, energy: 6 },
        },
        matchRules: {
            matchType: "single_match",
            minPlayers: 1,
            maxPlayers: 1,
            rankingMethod: "highest_score",
            timeLimit: { perMatch: 300 },
        },
        rewards: {
            baseRewards: { coins: 50, energy: 10 },
            tierBonus: { bronze: { coins: 50 } },
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
        soloChallenge: {
            levelType: "challenge",
            levelNumber: 1,
            levelChain: {
                nextLevels: ["monster_rumble_challenge_bronze_boss_2"],
                unlockMode: "sequential",
                autoUnlockNext: true,
                chainId: "challenge_bronze",
                chainOrder: 1,
            },
            unlockConditions: { minPlayerLevel: 1 },
            levelContent: {
                bossConfig: { bossId: "boss_bronze_1" },
                difficultyAdjustment: {
                    powerBasedScaling: true,
                    difficultyMultiplier: 1.0,
                    minMultiplier: 0.5,
                    maxMultiplier: 2.0,
                },
            },
            retryConfig: {
                maxAttempts: 3,
                retryCost: { energy: 3 },
            },
            sortOrder: 1,
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
            tier: "bronze",
            entryFee: { coins: 0, energy: 6 },
        },
        matchRules: {
            matchType: "single_match",
            minPlayers: 1,
            maxPlayers: 1,
            rankingMethod: "highest_score",
            timeLimit: { perMatch: 300 },
        },
        rewards: {
            baseRewards: { coins: 60, energy: 11 },
            tierBonus: { bronze: { coins: 50 } },
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
        soloChallenge: {
            levelType: "challenge",
            levelNumber: 2,
            levelChain: {
                previousLevels: ["monster_rumble_challenge_bronze_boss_1"],
                nextLevels: ["monster_rumble_challenge_bronze_boss_3"],
                unlockMode: "sequential",
                autoUnlockNext: true,
                chainId: "challenge_bronze",
                chainOrder: 2,
            },
            unlockConditions: { minPlayerLevel: 1 },
            levelContent: {
                bossConfig: { bossId: "boss_bronze_2" },
                difficultyAdjustment: {
                    powerBasedScaling: true,
                    difficultyMultiplier: 1.1,
                    minMultiplier: 0.5,
                    maxMultiplier: 2.0,
                },
            },
            retryConfig: {
                maxAttempts: 3,
                retryCost: { energy: 3 },
            },
            sortOrder: 2,
        },
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
            tier: "bronze",
            entryFee: { coins: 0, energy: 6 },
        },
        matchRules: {
            matchType: "single_match",
            minPlayers: 1,
            maxPlayers: 1,
            rankingMethod: "highest_score",
            timeLimit: { perMatch: 300 },
        },
        rewards: {
            baseRewards: { coins: 70, energy: 12 },
            tierBonus: { bronze: { coins: 50 } },
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
        soloChallenge: {
            levelType: "challenge",
            levelNumber: 3,
            levelChain: {
                previousLevels: ["monster_rumble_challenge_bronze_boss_2"],
                nextLevels: ["monster_rumble_challenge_bronze_boss_4"],
                unlockMode: "sequential",
                autoUnlockNext: true,
                chainId: "challenge_bronze",
                chainOrder: 3,
            },
            unlockConditions: { minPlayerLevel: 1 },
            levelContent: {
                bossConfig: { bossId: "boss_bronze_1" },
                difficultyAdjustment: {
                    powerBasedScaling: true,
                    difficultyMultiplier: 1.2,
                    minMultiplier: 0.5,
                    maxMultiplier: 2.0,
                },
            },
            retryConfig: {
                maxAttempts: 3,
                retryCost: { energy: 3 },
            },
            sortOrder: 3,
        },
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
            tier: "bronze",
            entryFee: { coins: 0, energy: 6 },
        },
        matchRules: {
            matchType: "single_match",
            minPlayers: 1,
            maxPlayers: 1,
            rankingMethod: "highest_score",
            timeLimit: { perMatch: 300 },
        },
        rewards: {
            baseRewards: { coins: 80, energy: 13 },
            tierBonus: { bronze: { coins: 50 } },
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
        soloChallenge: {
            levelType: "challenge",
            levelNumber: 4,
            levelChain: {
                previousLevels: ["monster_rumble_challenge_bronze_boss_3"],
                nextLevels: ["monster_rumble_challenge_bronze_boss_5"],
                unlockMode: "sequential",
                autoUnlockNext: true,
                chainId: "challenge_bronze",
                chainOrder: 4,
            },
            unlockConditions: { minPlayerLevel: 1 },
            levelContent: {
                bossConfig: { bossId: "boss_bronze_2" },
                difficultyAdjustment: {
                    powerBasedScaling: true,
                    difficultyMultiplier: 1.3,
                    minMultiplier: 0.5,
                    maxMultiplier: 2.0,
                },
            },
            retryConfig: {
                maxAttempts: 3,
                retryCost: { energy: 3 },
            },
            sortOrder: 4,
        },
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
            tier: "bronze",
            entryFee: { coins: 0, energy: 6 },
        },
        matchRules: {
            matchType: "single_match",
            minPlayers: 1,
            maxPlayers: 1,
            rankingMethod: "highest_score",
            timeLimit: { perMatch: 300 },
        },
        rewards: {
            baseRewards: { coins: 90, energy: 14 },
            tierBonus: { bronze: { coins: 50 } },
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
        soloChallenge: {
            levelType: "challenge",
            levelNumber: 5,
            levelChain: {
                previousLevels: ["monster_rumble_challenge_bronze_boss_4"],
                nextLevels: ["monster_rumble_challenge_silver_boss_1"],
                unlockMode: "sequential",
                autoUnlockNext: true,
                chainId: "challenge_bronze",
                chainOrder: 5,
            },
            unlockConditions: { minPlayerLevel: 1 },
            levelContent: {
                bossConfig: { bossId: "boss_bronze_1" },
                difficultyAdjustment: {
                    powerBasedScaling: true,
                    difficultyMultiplier: 1.5,
                    minMultiplier: 0.5,
                    maxMultiplier: 2.0,
                },
            },
            retryConfig: {
                maxAttempts: 3,
                retryCost: { energy: 3 },
            },
            sortOrder: 5,
        },
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
            tier: "silver",
            entryFee: { coins: 0, energy: 7 },
        },
        matchRules: {
            matchType: "single_match",
            minPlayers: 1,
            maxPlayers: 1,
            rankingMethod: "highest_score",
            timeLimit: { perMatch: 300 },
        },
        rewards: {
            baseRewards: { coins: 100, energy: 15 },
            tierBonus: { silver: { coins: 100 } },
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
        soloChallenge: {
            levelType: "challenge",
            levelNumber: 1,
            levelChain: {
                previousLevels: ["monster_rumble_challenge_bronze_boss_5"],
                nextLevels: ["monster_rumble_challenge_silver_boss_2"],
                unlockMode: "sequential",
                autoUnlockNext: true,
                chainId: "challenge_silver",
                chainOrder: 1,
            },
            unlockConditions: { minPlayerLevel: 11 },
            levelContent: {
                bossConfig: { bossId: "boss_silver_1" },
                difficultyAdjustment: {
                    powerBasedScaling: true,
                    difficultyMultiplier: 1.1,
                    minMultiplier: 0.8,
                    maxMultiplier: 2.0,
                },
            },
            retryConfig: {
                maxAttempts: 3,
                retryCost: { energy: 4 },
            },
            sortOrder: 1,
        },
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
            tier: "silver",
            entryFee: { coins: 0, energy: 7 },
        },
        matchRules: {
            matchType: "single_match",
            minPlayers: 1,
            maxPlayers: 1,
            rankingMethod: "highest_score",
            timeLimit: { perMatch: 300 },
        },
        rewards: {
            baseRewards: { coins: 120, energy: 17 },
            tierBonus: { silver: { coins: 100 } },
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
        soloChallenge: {
            levelType: "challenge",
            levelNumber: 2,
            levelChain: {
                previousLevels: ["monster_rumble_challenge_silver_boss_1"],
                nextLevels: ["monster_rumble_challenge_silver_boss_3"],
                unlockMode: "sequential",
                autoUnlockNext: true,
                chainId: "challenge_silver",
                chainOrder: 2,
            },
            unlockConditions: { minPlayerLevel: 11 },
            levelContent: {
                bossConfig: { bossId: "boss_silver_2" },
                difficultyAdjustment: {
                    powerBasedScaling: true,
                    difficultyMultiplier: 1.2,
                    minMultiplier: 0.8,
                    maxMultiplier: 2.0,
                },
            },
            retryConfig: {
                maxAttempts: 3,
                retryCost: { energy: 4 },
            },
            sortOrder: 2,
        },
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
            tier: "silver",
            entryFee: { coins: 0, energy: 7 },
        },
        matchRules: {
            matchType: "single_match",
            minPlayers: 1,
            maxPlayers: 1,
            rankingMethod: "highest_score",
            timeLimit: { perMatch: 300 },
        },
        rewards: {
            baseRewards: { coins: 140, energy: 19 },
            tierBonus: { silver: { coins: 100 } },
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
        soloChallenge: {
            levelType: "challenge",
            levelNumber: 3,
            levelChain: {
                previousLevels: ["monster_rumble_challenge_silver_boss_2"],
                nextLevels: ["monster_rumble_challenge_silver_boss_4"],
                unlockMode: "sequential",
                autoUnlockNext: true,
                chainId: "challenge_silver",
                chainOrder: 3,
            },
            unlockConditions: { minPlayerLevel: 11 },
            levelContent: {
                bossConfig: { bossId: "boss_silver_1" },
                difficultyAdjustment: {
                    powerBasedScaling: true,
                    difficultyMultiplier: 1.3,
                    minMultiplier: 0.8,
                    maxMultiplier: 2.0,
                },
            },
            retryConfig: {
                maxAttempts: 3,
                retryCost: { energy: 4 },
            },
            sortOrder: 3,
        },
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
            tier: "silver",
            entryFee: { coins: 0, energy: 7 },
        },
        matchRules: {
            matchType: "single_match",
            minPlayers: 1,
            maxPlayers: 1,
            rankingMethod: "highest_score",
            timeLimit: { perMatch: 300 },
        },
        rewards: {
            baseRewards: { coins: 160, energy: 21 },
            tierBonus: { silver: { coins: 100 } },
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
        soloChallenge: {
            levelType: "challenge",
            levelNumber: 4,
            levelChain: {
                previousLevels: ["monster_rumble_challenge_silver_boss_3"],
                nextLevels: ["monster_rumble_challenge_silver_boss_5"],
                unlockMode: "sequential",
                autoUnlockNext: true,
                chainId: "challenge_silver",
                chainOrder: 4,
            },
            unlockConditions: { minPlayerLevel: 11 },
            levelContent: {
                bossConfig: { bossId: "boss_silver_2" },
                difficultyAdjustment: {
                    powerBasedScaling: true,
                    difficultyMultiplier: 1.4,
                    minMultiplier: 0.8,
                    maxMultiplier: 2.0,
                },
            },
            retryConfig: {
                maxAttempts: 3,
                retryCost: { energy: 4 },
            },
            sortOrder: 4,
        },
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
            tier: "silver",
            entryFee: { coins: 0, energy: 7 },
        },
        matchRules: {
            matchType: "single_match",
            minPlayers: 1,
            maxPlayers: 1,
            rankingMethod: "highest_score",
            timeLimit: { perMatch: 300 },
        },
        rewards: {
            baseRewards: { coins: 180, energy: 23 },
            tierBonus: { silver: { coins: 100 } },
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
        soloChallenge: {
            levelType: "challenge",
            levelNumber: 5,
            levelChain: {
                previousLevels: ["monster_rumble_challenge_silver_boss_4"],
                nextLevels: ["monster_rumble_challenge_gold_boss_1"],
                unlockMode: "sequential",
                autoUnlockNext: true,
                chainId: "challenge_silver",
                chainOrder: 5,
            },
            unlockConditions: { minPlayerLevel: 11 },
            levelContent: {
                bossConfig: { bossId: "boss_silver_1" },
                difficultyAdjustment: {
                    powerBasedScaling: true,
                    difficultyMultiplier: 1.6,
                    minMultiplier: 0.8,
                    maxMultiplier: 2.0,
                },
            },
            retryConfig: {
                maxAttempts: 3,
                retryCost: { energy: 4 },
            },
            sortOrder: 5,
        },
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
            tier: "gold",
            entryFee: { coins: 0, energy: 8 },
        },
        matchRules: {
            matchType: "single_match",
            minPlayers: 1,
            maxPlayers: 1,
            rankingMethod: "highest_score",
            timeLimit: { perMatch: 300 },
        },
        rewards: {
            baseRewards: { coins: 200, energy: 20 },
            tierBonus: { gold: { coins: 200 } },
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
        soloChallenge: {
            levelType: "challenge",
            levelNumber: 1,
            levelChain: {
                previousLevels: ["monster_rumble_challenge_silver_boss_5"],
                nextLevels: ["monster_rumble_challenge_gold_boss_2"],
                unlockMode: "sequential",
                autoUnlockNext: true,
                chainId: "challenge_gold",
                chainOrder: 1,
            },
            unlockConditions: { minPlayerLevel: 31 },
            levelContent: {
                bossConfig: { bossId: "boss_gold_1" },
                difficultyAdjustment: {
                    powerBasedScaling: true,
                    difficultyMultiplier: 1.2,
                    minMultiplier: 1.0,
                    maxMultiplier: 2.0,
                },
            },
            retryConfig: {
                maxAttempts: 3,
                retryCost: { energy: 5 },
            },
            sortOrder: 1,
        },
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
            tier: "gold",
            entryFee: { coins: 0, energy: 8 },
        },
        matchRules: {
            matchType: "single_match",
            minPlayers: 1,
            maxPlayers: 1,
            rankingMethod: "highest_score",
            timeLimit: { perMatch: 300 },
        },
        rewards: {
            baseRewards: { coins: 240, energy: 23 },
            tierBonus: { gold: { coins: 200 } },
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
        soloChallenge: {
            levelType: "challenge",
            levelNumber: 2,
            levelChain: {
                previousLevels: ["monster_rumble_challenge_gold_boss_1"],
                nextLevels: ["monster_rumble_challenge_gold_boss_3"],
                unlockMode: "sequential",
                autoUnlockNext: true,
                chainId: "challenge_gold",
                chainOrder: 2,
            },
            unlockConditions: { minPlayerLevel: 31 },
            levelContent: {
                bossConfig: { bossId: "boss_gold_2" },
                difficultyAdjustment: {
                    powerBasedScaling: true,
                    difficultyMultiplier: 1.3,
                    minMultiplier: 1.0,
                    maxMultiplier: 2.0,
                },
            },
            retryConfig: {
                maxAttempts: 3,
                retryCost: { energy: 5 },
            },
            sortOrder: 2,
        },
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
            tier: "gold",
            entryFee: { coins: 0, energy: 8 },
        },
        matchRules: {
            matchType: "single_match",
            minPlayers: 1,
            maxPlayers: 1,
            rankingMethod: "highest_score",
            timeLimit: { perMatch: 300 },
        },
        rewards: {
            baseRewards: { coins: 280, energy: 26 },
            tierBonus: { gold: { coins: 200 } },
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
        soloChallenge: {
            levelType: "challenge",
            levelNumber: 3,
            levelChain: {
                previousLevels: ["monster_rumble_challenge_gold_boss_2"],
                nextLevels: ["monster_rumble_challenge_gold_boss_4"],
                unlockMode: "sequential",
                autoUnlockNext: true,
                chainId: "challenge_gold",
                chainOrder: 3,
            },
            unlockConditions: { minPlayerLevel: 31 },
            levelContent: {
                bossConfig: { bossId: "boss_gold_1" },
                difficultyAdjustment: {
                    powerBasedScaling: true,
                    difficultyMultiplier: 1.4,
                    minMultiplier: 1.0,
                    maxMultiplier: 2.0,
                },
            },
            retryConfig: {
                maxAttempts: 3,
                retryCost: { energy: 5 },
            },
            sortOrder: 3,
        },
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
            tier: "gold",
            entryFee: { coins: 0, energy: 8 },
        },
        matchRules: {
            matchType: "single_match",
            minPlayers: 1,
            maxPlayers: 1,
            rankingMethod: "highest_score",
            timeLimit: { perMatch: 300 },
        },
        rewards: {
            baseRewards: { coins: 320, energy: 29 },
            tierBonus: { gold: { coins: 200 } },
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
        soloChallenge: {
            levelType: "challenge",
            levelNumber: 4,
            levelChain: {
                previousLevels: ["monster_rumble_challenge_gold_boss_3"],
                nextLevels: ["monster_rumble_challenge_gold_boss_5"],
                unlockMode: "sequential",
                autoUnlockNext: true,
                chainId: "challenge_gold",
                chainOrder: 4,
            },
            unlockConditions: { minPlayerLevel: 31 },
            levelContent: {
                bossConfig: { bossId: "boss_gold_2" },
                difficultyAdjustment: {
                    powerBasedScaling: true,
                    difficultyMultiplier: 1.5,
                    minMultiplier: 1.0,
                    maxMultiplier: 2.0,
                },
            },
            retryConfig: {
                maxAttempts: 3,
                retryCost: { energy: 5 },
            },
            sortOrder: 4,
        },
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
            tier: "gold",
            entryFee: { coins: 0, energy: 8 },
        },
        matchRules: {
            matchType: "single_match",
            minPlayers: 1,
            maxPlayers: 1,
            rankingMethod: "highest_score",
            timeLimit: { perMatch: 300 },
        },
        rewards: {
            baseRewards: { coins: 360, energy: 32 },
            tierBonus: { gold: { coins: 200 } },
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
        soloChallenge: {
            levelType: "challenge",
            levelNumber: 5,
            levelChain: {
                previousLevels: ["monster_rumble_challenge_gold_boss_4"],
                nextLevels: ["monster_rumble_challenge_platinum_boss_1"],
                unlockMode: "sequential",
                autoUnlockNext: true,
                chainId: "challenge_gold",
                chainOrder: 5,
            },
            unlockConditions: { minPlayerLevel: 31 },
            levelContent: {
                bossConfig: { bossId: "boss_gold_1" },
                difficultyAdjustment: {
                    powerBasedScaling: true,
                    difficultyMultiplier: 1.7,
                    minMultiplier: 1.0,
                    maxMultiplier: 2.0,
                },
            },
            retryConfig: {
                maxAttempts: 3,
                retryCost: { energy: 5 },
            },
            sortOrder: 5,
        },
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
            tier: "platinum",
            entryFee: { coins: 0, energy: 10 },
        },
        matchRules: {
            matchType: "single_match",
            minPlayers: 1,
            maxPlayers: 1,
            rankingMethod: "highest_score",
            timeLimit: { perMatch: 300 },
        },
        rewards: {
            baseRewards: { coins: 500, energy: 30 },
            tierBonus: { platinum: { coins: 500 } },
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
        soloChallenge: {
            levelType: "challenge",
            levelNumber: 1,
            levelChain: {
                previousLevels: ["monster_rumble_challenge_gold_boss_5"],
                nextLevels: ["monster_rumble_challenge_platinum_boss_2"],
                unlockMode: "sequential",
                autoUnlockNext: true,
                chainId: "challenge_platinum",
                chainOrder: 1,
            },
            unlockConditions: { minPlayerLevel: 51 },
            levelContent: {
                bossConfig: { bossId: "boss_platinum_1" },
                difficultyAdjustment: {
                    powerBasedScaling: true,
                    difficultyMultiplier: 1.3,
                    minMultiplier: 1.0,
                    maxMultiplier: 2.0,
                },
            },
            retryConfig: {
                maxAttempts: 3,
                retryCost: { energy: 6 },
            },
            sortOrder: 1,
        },
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
            tier: "platinum",
            entryFee: { coins: 0, energy: 10 },
        },
        matchRules: {
            matchType: "single_match",
            minPlayers: 1,
            maxPlayers: 1,
            rankingMethod: "highest_score",
            timeLimit: { perMatch: 300 },
        },
        rewards: {
            baseRewards: { coins: 600, energy: 35 },
            tierBonus: { platinum: { coins: 500 } },
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
        soloChallenge: {
            levelType: "challenge",
            levelNumber: 2,
            levelChain: {
                previousLevels: ["monster_rumble_challenge_platinum_boss_1"],
                nextLevels: ["monster_rumble_challenge_platinum_boss_3"],
                unlockMode: "sequential",
                autoUnlockNext: true,
                chainId: "challenge_platinum",
                chainOrder: 2,
            },
            unlockConditions: { minPlayerLevel: 51 },
            levelContent: {
                bossConfig: { bossId: "boss_platinum_2" },
                difficultyAdjustment: {
                    powerBasedScaling: true,
                    difficultyMultiplier: 1.4,
                    minMultiplier: 1.0,
                    maxMultiplier: 2.0,
                },
            },
            retryConfig: {
                maxAttempts: 3,
                retryCost: { energy: 6 },
            },
            sortOrder: 2,
        },
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
            tier: "platinum",
            entryFee: { coins: 0, energy: 10 },
        },
        matchRules: {
            matchType: "single_match",
            minPlayers: 1,
            maxPlayers: 1,
            rankingMethod: "highest_score",
            timeLimit: { perMatch: 300 },
        },
        rewards: {
            baseRewards: { coins: 700, energy: 40 },
            tierBonus: { platinum: { coins: 500 } },
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
        soloChallenge: {
            levelType: "challenge",
            levelNumber: 3,
            levelChain: {
                previousLevels: ["monster_rumble_challenge_platinum_boss_2"],
                nextLevels: ["monster_rumble_challenge_platinum_boss_4"],
                unlockMode: "sequential",
                autoUnlockNext: true,
                chainId: "challenge_platinum",
                chainOrder: 3,
            },
            unlockConditions: { minPlayerLevel: 51 },
            levelContent: {
                bossConfig: { bossId: "boss_platinum_1" },
                difficultyAdjustment: {
                    powerBasedScaling: true,
                    difficultyMultiplier: 1.5,
                    minMultiplier: 1.0,
                    maxMultiplier: 2.0,
                },
            },
            retryConfig: {
                maxAttempts: 3,
                retryCost: { energy: 6 },
            },
            sortOrder: 3,
        },
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
            tier: "platinum",
            entryFee: { coins: 0, energy: 10 },
        },
        matchRules: {
            matchType: "single_match",
            minPlayers: 1,
            maxPlayers: 1,
            rankingMethod: "highest_score",
            timeLimit: { perMatch: 300 },
        },
        rewards: {
            baseRewards: { coins: 800, energy: 45 },
            tierBonus: { platinum: { coins: 500 } },
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
        soloChallenge: {
            levelType: "challenge",
            levelNumber: 4,
            levelChain: {
                previousLevels: ["monster_rumble_challenge_platinum_boss_3"],
                nextLevels: ["monster_rumble_challenge_platinum_boss_5"],
                unlockMode: "sequential",
                autoUnlockNext: true,
                chainId: "challenge_platinum",
                chainOrder: 4,
            },
            unlockConditions: { minPlayerLevel: 51 },
            levelContent: {
                bossConfig: { bossId: "boss_platinum_2" },
                difficultyAdjustment: {
                    powerBasedScaling: true,
                    difficultyMultiplier: 1.6,
                    minMultiplier: 1.0,
                    maxMultiplier: 2.0,
                },
            },
            retryConfig: {
                maxAttempts: 3,
                retryCost: { energy: 6 },
            },
            sortOrder: 4,
        },
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
            tier: "platinum",
            entryFee: { coins: 0, energy: 10 },
        },
        matchRules: {
            matchType: "single_match",
            minPlayers: 1,
            maxPlayers: 1,
            rankingMethod: "highest_score",
            timeLimit: { perMatch: 300 },
        },
        rewards: {
            baseRewards: { coins: 900, energy: 50 },
            tierBonus: { platinum: { coins: 500 } },
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
        soloChallenge: {
            levelType: "challenge",
            levelNumber: 5,
            levelChain: {
                previousLevels: ["monster_rumble_challenge_platinum_boss_4"],
                unlockMode: "sequential",
                autoUnlockNext: true,
                chainId: "challenge_platinum",
                chainOrder: 5,
            },
            unlockConditions: { minPlayerLevel: 51 },
            levelContent: {
                bossConfig: { bossId: "boss_platinum_1" },
                difficultyAdjustment: {
                    powerBasedScaling: true,
                    difficultyMultiplier: 2.0,
                    minMultiplier: 1.0,
                    maxMultiplier: 2.0,
                },
            },
            retryConfig: {
                maxAttempts: 3,
                retryCost: { energy: 6 },
            },
            sortOrder: 5,
        },
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
            tier: "bronze",
            entryFee: {
                coins: 100,
                energy: 10,
            },
        },

        matchRules: {
            matchType: "single_match",
            minPlayers: 1,  // ✅ 单人关卡标识
            maxPlayers: 1,  // ✅ 单人关卡标识
            rankingMethod: "highest_score",
            timeLimit: {
                perMatch: 600,  // 10分钟
            },
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

        // ✅ 单人挑战配置
        soloChallenge: {
            levelType: "boss_rush",
            levelNumber: 1,

            // ✅ 连续关卡配置（需要完成多个前置关卡）
            levelChain: {
                previousLevels: [
                    "monster_rumble_challenge_bronze_boss_1",
                    "monster_rumble_challenge_bronze_boss_2",
                ],
                unlockMode: "parallel",  // 并行解锁：完成任意一个前置关卡即可
                chainId: "boss_rush_bronze",
                chainOrder: 1,
            },

            unlockConditions: {
                requiredTypeIds: [
                    "monster_rumble_challenge_bronze_boss_1",
                    "monster_rumble_challenge_bronze_boss_2",
                ],
            },

            levelContent: {
                bossConfig: {
                    // Boss Rush 使用 Boss 池
                    bossPool: ["boss_bronze_1", "boss_bronze_2"],
                    bossDifficulty: "easy",
                },
            },

            retryConfig: {
                maxAttempts: 1,  // 每日只能挑战1次
                retryCost: {
                    coins: 200,
                    energy: 10,
                },
            },

            isVisible: true,
            sortOrder: 100,
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
            tier: "bronze",
            entryFee: {
                energy: 5,
            },
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
            participationReward: {
                coins: 25,
                energy: 3,
            },
        },

        limits: {
            maxAttempts: 999,
        },

        soloChallenge: {
            levelType: "story",
            chapter: 1,
            levelNumber: 2,

            // ✅ 连续关卡配置：线性链
            levelChain: {
                previousLevels: ["monster_rumble_story_1_1"],  // 前置关卡
                nextLevels: ["monster_rumble_story_1_3"],      // 下一关卡
                unlockMode: "sequential",                      // 顺序解锁
                autoUnlockNext: true,                          // 自动解锁
                chainId: "story_chapter_1",                    // 同一关卡链
                chainOrder: 2,                                 // 链中顺序
            },

            levelContent: {
                bossConfig: {
                    bossId: "boss_bronze_2",
                    bossDifficulty: "easy",
                },
            },

            firstClearRewards: {
                coins: 250,
                energy: 10,
                monsterShards: [
                    { monsterId: "monster_001", quantity: 12 },
                ],
            },

            starRating: {
                criteria: [
                    {
                        stars: 3,
                        condition: {
                            type: "score",
                            operator: ">=",
                            value: 12000,
                        },
                    },
                    {
                        stars: 2,
                        condition: {
                            type: "score",
                            operator: ">=",
                            value: 6000,
                        },
                    },
                    {
                        stars: 1,
                        condition: {
                            type: "score",
                            operator: ">=",
                            value: 1200,
                        },
                    },
                ],
            },

            retryConfig: {
                unlimitedRetries: true,
            },

            isVisible: true,
            sortOrder: 2,
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
            tier: "bronze",
            entryFee: {
                energy: 5,
            },
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

        soloChallenge: {
            levelType: "story",
            chapter: 1,
            levelNumber: 2,

            // ✅ 连续关卡配置：分支关卡
            levelChain: {
                previousLevels: ["monster_rumble_story_1_1"],  // 前置关卡
                nextLevels: ["monster_rumble_story_1_3"],       // 下一关卡（与2B汇合）
                unlockMode: "any",                              // 任意完成前置关卡即可
                autoUnlockNext: true,
                levelGroup: "chapter_1_branch_a",              // 关卡组（分支A）
                chainId: "story_chapter_1",
                chainOrder: 2,
            },

            levelContent: {
                bossConfig: {
                    bossId: "boss_bronze_agile",
                    bossDifficulty: "easy",
                },
            },

            firstClearRewards: {
                coins: 250,
            },

            retryConfig: {
                unlimitedRetries: true,
            },

            isVisible: true,
            sortOrder: 3,
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
            tier: "bronze",
            entryFee: {
                energy: 5,
            },
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

        soloChallenge: {
            levelType: "story",
            chapter: 1,
            levelNumber: 2,

            // ✅ 连续关卡配置：分支关卡（与2A并行）
            levelChain: {
                previousLevels: ["monster_rumble_story_1_1"],  // 前置关卡
                nextLevels: ["monster_rumble_story_1_3"],       // 下一关卡（与2A汇合）
                unlockMode: "any",                              // 任意完成前置关卡即可
                autoUnlockNext: true,
                levelGroup: "chapter_1_branch_b",              // 关卡组（分支B）
                chainId: "story_chapter_1",
                chainOrder: 2,
            },

            levelContent: {
                bossConfig: {
                    bossId: "boss_bronze_defense",
                    bossDifficulty: "easy",
                },
            },

            firstClearRewards: {
                coins: 250,
            },

            retryConfig: {
                unlimitedRetries: true,
            },

            isVisible: true,
            sortOrder: 4,
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
            tier: "bronze",
            entryFee: {
                energy: 6,
            },
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

        soloChallenge: {
            levelType: "story",
            chapter: 1,
            levelNumber: 3,

            // ✅ 连续关卡配置：汇合关卡（需要完成2A或2B）
            levelChain: {
                previousLevels: [
                    "monster_rumble_story_1_2a",
                    "monster_rumble_story_1_2b",
                ],
                nextLevels: ["monster_rumble_story_2_1"],      // 解锁下一章
                unlockMode: "any",                              // 完成任意一个前置关卡即可
                autoUnlockNext: true,
                chainId: "story_chapter_1",
                chainOrder: 3,
            },

            levelContent: {
                bossConfig: {
                    bossId: "boss_bronze_final",
                    bossDifficulty: "medium",
                },
            },

            firstClearRewards: {
                coins: 500,
                energy: 20,
                monsterShards: [
                    { monsterId: "monster_001", quantity: 20 },
                ],
                unlocks: [
                    { typeId: "monster_rumble_story_2_1" },    // 解锁第二章
                ],
            },

            retryConfig: {
                unlimitedRetries: true,
            },

            isVisible: true,
            sortOrder: 5,
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
export function getTournamentConfigsByGameType(gameType: GameType): TournamentConfig[] {
    return TOURNAMENT_CONFIGS.filter(config => config.gameType === gameType && config.isActive);
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
        // Tier 限制仅用于 TacticalMonster
        if (config.gameType === "tacticalMonster") {
            const tierOrder = ["bronze", "silver", "gold", "platinum"];
            if (config.entryRequirements.tier && !tierOrder.includes(config.entryRequirements.tier)) {
                errors.push("tier 必须是bronze, silver, gold, platinum中的一个");
            }
            // 注意：Power 范围（minPower/maxPower）应该从 tier 配置中获取，不在此处验证
        } else {
            // 非 TacticalMonster 游戏不应配置 tier
            if (config.entryRequirements.tier) {
                errors.push(`tier 限制仅适用于 TacticalMonster 游戏，当前游戏类型: ${config.gameType}`);
            }
        }

        // 入场费验证
        if (config.entryRequirements.entryFee) {
            // TacticalMonster 游戏可以包含能量消耗
            if (config.gameType !== "tacticalMonster" && config.entryRequirements.entryFee.energy) {
                errors.push(`能量消耗仅适用于 TacticalMonster 游戏，当前游戏类型: ${config.gameType}`);
            }
        }
    }

    // 比赛规则验证
    if (!config.matchRules) {
        errors.push("matchRules 是必需的");
    } else {
        if (!config.matchRules.matchType) errors.push("matchRules.matchType 是必需的");
        if (config.matchRules.minPlayers < 1) errors.push("minPlayers 必须大于等于 1");
        if (config.matchRules.maxPlayers < config.matchRules.minPlayers) {
            errors.push("maxPlayers 必须大于等于 minPlayers");
        }

        // 单人挑战验证
        const isSinglePlayer = config.matchRules.minPlayers === 1 && config.matchRules.maxPlayers === 1;
        if (isSinglePlayer) {
            // 单人挑战必须使用 single_match
            if (config.matchRules.matchType !== "single_match") {
                errors.push("单人挑战（minPlayers=1, maxPlayers=1）必须使用 matchType='single_match'");
            }
            // 单人挑战可以配置 soloChallenge
            if (config.soloChallenge) {
                if (!config.soloChallenge.levelType) {
                    errors.push("soloChallenge.levelType 是必需的");
                }
            }
        } else {
            // 多人锦标赛不应配置 soloChallenge
            if (config.soloChallenge) {
                errors.push("多人锦标赛（minPlayers>1 或 maxPlayers>1）不应配置 soloChallenge");
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
            // 单人挑战必须使用 performanceRewards，不能使用 rankRewards
            if (!config.rewards.performanceRewards) {
                errors.push("单人挑战（minPlayers=1, maxPlayers=1）必须配置 performanceRewards");
            }
            if (config.rewards.rankRewards && config.rewards.rankRewards.length > 0) {
                errors.push("单人挑战（minPlayers=1, maxPlayers=1）不应配置 rankRewards，应使用 performanceRewards");
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

        // Tier 加成仅适用于 TacticalMonster
        if (config.rewards.tierBonus && config.gameType !== "tacticalMonster") {
            errors.push(`tierBonus 仅适用于 TacticalMonster 游戏，当前游戏类型: ${config.gameType}`);
        }
    }

    // 时间配置验证
    // 永久开放的单人关卡不需要 schedule
    const isPermanentSinglePlayer = config.timeRange === "permanent" &&
        config.matchRules?.minPlayers === 1 &&
        config.matchRules?.maxPlayers === 1;

    if (!isPermanentSinglePlayer && !config.schedule) {
        errors.push("schedule 是必需的（永久开放的单人关卡除外）");
    } else if (config.schedule) {
        if (!config.schedule.duration || config.schedule.duration <= 0) {
            errors.push("schedule.duration 是必需的且必须大于 0");
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
 * 获取关卡的下一个关卡列表
 */
export function getNextLevels(typeId: string): string[] {
    const config = getTournamentConfig(typeId);
    if (!config || !config.soloChallenge?.levelChain) {
        return [];
    }
    return config.soloChallenge.levelChain.nextLevels || [];
}

/**
 * 获取关卡的前置关卡列表
 */
export function getPreviousLevels(typeId: string): string[] {
    const config = getTournamentConfig(typeId);
    if (!config || !config.soloChallenge?.levelChain) {
        return [];
    }
    return config.soloChallenge.levelChain.previousLevels || [];
}

/**
 * 获取关卡链中的所有关卡（按顺序）
 */
export function getLevelChain(chainId: string): TournamentConfig[] {
    return TOURNAMENT_CONFIGS
        .filter(config =>
            config.soloChallenge?.levelChain?.chainId === chainId &&
            config.isActive
        )
        .sort((a, b) => {
            const orderA = a.soloChallenge?.levelChain?.chainOrder || 0;
            const orderB = b.soloChallenge?.levelChain?.chainOrder || 0;
            return orderA - orderB;
        });
}

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
    if (!config || !config.soloChallenge) {
        return { unlocked: false, reason: "关卡配置不存在或不是单人挑战" };
    }

    const { soloChallenge } = config;
    const { levelChain, unlockConditions } = soloChallenge;

    // 1. 检查玩家等级
    if (unlockConditions?.minPlayerLevel && params.playerLevel) {
        if (params.playerLevel < unlockConditions.minPlayerLevel) {
            return {
                unlocked: false,
                reason: `需要玩家等级 ${unlockConditions.minPlayerLevel}，当前 ${params.playerLevel}`,
            };
        }
    }

    // 2. 检查前置关卡（优先使用 levelChain）
    const requiredTypeIds = levelChain?.previousLevels || unlockConditions?.requiredTypeIds || [];

    if (requiredTypeIds.length > 0) {
        const unlockMode = levelChain?.unlockMode || "sequential";

        if (unlockMode === "sequential") {
            // 顺序解锁：必须完成所有前置关卡
            const allCompleted = requiredTypeIds.every(
                id => params.completedTypeIds.includes(id)
            );
            if (!allCompleted) {
                const missing = requiredTypeIds.filter(
                    id => !params.completedTypeIds.includes(id)
                );
                return {
                    unlocked: false,
                    reason: `需要完成前置关卡: ${missing.join(", ")}`,
                };
            }
        } else if (unlockMode === "parallel" || unlockMode === "any") {
            // 并行/任意解锁：完成任意一个前置关卡即可
            const anyCompleted = requiredTypeIds.some(
                id => params.completedTypeIds.includes(id)
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
    if (!config || !config.soloChallenge?.levelChain) {
        return [];
    }

    const nextLevelIds = config.soloChallenge.levelChain.nextLevels || [];

    return nextLevelIds
        .map(typeId => getTournamentConfig(typeId))
        .filter((config): config is TournamentConfig => {
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
    gameType?: GameType
): TournamentConfig[] {
    return TOURNAMENT_CONFIGS
        .filter(config => {
            if (!config.isActive) return false;
            if (gameType && config.gameType !== gameType) return false;
            if (!config.soloChallenge) return false;
            return config.soloChallenge.chapter === chapter;
        })
        .sort((a, b) => {
            const numA = a.soloChallenge?.levelNumber || 0;
            const numB = b.soloChallenge?.levelNumber || 0;
            return numA - numB;
        });
}

/**
 * 获取关卡组的所有关卡（用于分支关卡）
 */
export function getLevelsByGroup(
    levelGroup: string
): TournamentConfig[] {
    return TOURNAMENT_CONFIGS
        .filter(config =>
            config.soloChallenge?.levelChain?.levelGroup === levelGroup &&
            config.isActive
        )
        .sort((a, b) => {
            const orderA = a.soloChallenge?.levelChain?.chainOrder || 0;
            const orderB = b.soloChallenge?.levelChain?.chainOrder || 0;
            return orderA - orderB;
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
            config.soloChallenge?.chapter === params.chapter
        );
    }

    if (params.levelType) {
        levels = levels.filter(config =>
            config.soloChallenge?.levelType === params.levelType
        );
    }

    if (params.tier) {
        levels = levels.filter(config =>
            config.entryRequirements?.tier === params.tier
        );
    }

    // 3. 检查是否需要动态生成
    // 例如：如果请求 chapter 1，但只有 level 1-3，可以动态生成 level 4-10

    return levels;
}
