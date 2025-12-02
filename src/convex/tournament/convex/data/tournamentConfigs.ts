/**
 * 锦标赛配置类型定义 - 基于 tournament_types schema
 * 
 * 重要说明：
 * - Tier（竞技场）：TacticalMonster 特定，基于 Power 匹配，与 Boss 难度关联
 * - 对于 TacticalMonster 游戏，应使用 Tier 限制
 * - Power 基于当前队伍（inTeam: true 的怪物）计算
 * - 玩家可以通过选择低 Power 的队伍来加入低 Tier 锦标赛，实现自然降级
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
 */
export interface EntryRequirements {


    // Power 要求（仅适用于 TacticalMonster，用于 Tier 匹配）
    minPower?: number;
    maxPower?: number;

    // ============================================
    // 通用要求
    // ============================================
    // 订阅要求
    isSubscribedRequired: boolean;

    // 等级要求
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
 * 奖励配置 - 专注于传统游戏奖励，积分通过 pointRules 配置
 */
export interface RewardConfig {
    // ============================================
    // 基础奖励 - 参与即可获得
    // ============================================
    baseRewards: {
        coins?: number;
        tickets?: Array<{
            type: string;
            quantity: number;
        }>;
        props?: Array<{
            gameType: string;
            propId: string;
            quantity: number;
        }>;
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
    // 排名奖励 - 基于排名范围
    // ============================================
    rankRewards: Array<{
        rankRange: number[]; // [minRank, maxRank]
        multiplier: number;

        // 传统游戏奖励
        coins?: number;
        tickets?: Array<{
            type: string;
            quantity: number;
        }>;
        props?: Array<{
            gameType: string;
            propId: string;
            quantity: number;
        }>;
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
    // 订阅加成 - 传统奖励的订阅加成
    // ============================================
    subscriptionBonus?: {
        coins?: number;
        tickets?: Array<{ type: string; quantity: number; }>;
        props?: Array<{ gameType: string; propId: string; quantity: number; }>;
    };

    // ============================================
    // 参与奖励 - 参与即可获得
    // ============================================
    participationReward?: {
        coins?: number;
        tickets?: Array<{ type: string; quantity: number; }>;
        props?: Array<{ gameType: string; propId: string; quantity: number; }>;
        // TacticalMonster 特定奖励
        energy?: number;
        monsterShards?: Array<{ monsterId: string; quantity: number; }>;
    };

    // ============================================
    // 连胜奖励 - 传统奖励的连胜加成
    // ============================================
    streakBonus?: {
        minStreak: number;
        bonusMultiplier: number;
        coins?: number;
        tickets?: Array<{ type: string; quantity: number; }>;
        props?: Array<{ gameType: string; propId: string; quantity: number; }>;
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
            rankRewards: [
                {
                    rankRange: [1, 1],
                    multiplier: 3.0,
                    coins: 300,
                    props: [
                        {
                            gameType: "solitaire",
                            propId: "time_boost",
                            quantity: 1,
                        }
                    ]
                },
                {
                    rankRange: [2, 3],
                    multiplier: 2.0,
                    coins: 200
                },
                {
                    rankRange: [4, 10],
                    multiplier: 1.5,
                    coins: 150
                }
            ],
            subscriptionBonus: {
                coins: 1.2,
                tickets: [],
                props: []
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
    // TacticalMonster (Monster Rumble) 配置示例
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
            // Power 范围验证
            if (config.entryRequirements.minPower !== undefined &&
                config.entryRequirements.maxPower !== undefined) {
                if (config.entryRequirements.minPower > config.entryRequirements.maxPower) {
                    errors.push("minPower 必须小于等于 maxPower");
                }
                if (config.entryRequirements.minPower < 0) {
                    errors.push("minPower 不能为负数");
                }
            }
        } else {

            if (config.entryRequirements.minPower !== undefined ||
                config.entryRequirements.maxPower !== undefined) {
                errors.push(`Power 限制仅适用于 TacticalMonster 游戏，当前游戏类型: ${config.gameType}`);
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
    }

    // 奖励配置验证
    if (!config.rewards) {
        errors.push("rewards 是必需的");
    } else {
        if (!config.rewards.baseRewards) errors.push("baseRewards 是必需的");
        if (!config.rewards.rankRewards || config.rewards.rankRewards.length === 0) {
            errors.push("rankRewards 是必需的且不能为空");
        }
        // Tier 加成仅适用于 TacticalMonster
        if (config.rewards.tierBonus && config.gameType !== "tacticalMonster") {
            errors.push(`tierBonus 仅适用于 TacticalMonster 游戏，当前游戏类型: ${config.gameType}`);
        }
    }

    // 时间配置验证
    if (!config.schedule) {
        errors.push("schedule 是必需的");
    } else {
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
