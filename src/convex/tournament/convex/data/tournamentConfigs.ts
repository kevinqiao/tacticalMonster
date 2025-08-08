/**
 * 锦标赛配置类型定义 - 基于 tournament_types schema
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
    priority: number;

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

    // 高级配置
    advanced?: AdvancedConfig;

    // 兼容性字段
    handlerModule?: string;

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
    | "arcade";         // 街机游戏

/**
 * 参赛条件
 */
export interface EntryRequirements {
    // 段位要求
    minSegment?: "bronze" | "silver" | "gold" | "platinum" | "diamond";
    maxSegment?: "bronze" | "silver" | "gold" | "platinum" | "diamond";

    // 订阅要求
    isSubscribedRequired: boolean;

    // 等级要求
    minLevel?: number;
    maxLevel?: number;

    // 积分要求
    minPoints?: number;
    maxPoints?: number;

    // 入场费
    entryFee: {
        coins?: number;
        tickets?: {
            type: string;
            quantity: number;
        };
        props?: Array<{
            gameType: string;
            propType: string;
            quantity: number;
        }>;
    };

    // 特殊条件
    specialConditions?: Array<{
        type: string;
        value: any;
        description: string;
    }>;
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
    maxAttempts?: number;
    // 时间限制
    timeLimit?: {
        perMatch: number; // 秒
        perTurn?: number; // 秒
        total?: number;   // 秒
    };


}

/**
 * 奖励配置
 */
export interface RewardConfig {
    // 基础奖励
    baseRewards: {
        coins?: number;
        seasonPoints?: number;
        props?: Array<{
            gameType: string;
            propId: string;
            quantity: number;
        }>;
        tickets?: Array<{
            type: string;
            quantity: number;
        }>;
    };

    // 排名奖励
    rankRewards: Array<{
        rankRange: number[]; // [minRank, maxRank]
        multiplier: number;
        bonusProps?: Array<{
            gameType: string;
            propId: string;
            quantity: number;
        }>;
        bonusTickets?: Array<{
            type: string;
            quantity: number;
        }>;
    }>;

    // 段位加成
    segmentBonus?: {
        bronze: number;
        silver: number;
        gold: number;
        platinum: number;
        diamond: number;
    };

    // 订阅加成
    subscriptionBonus?: number;

    // 参与奖励
    participationReward?: {
        coins?: number;
        gamePoints?: number;
        props?: Array<{
            gameType: string;
            propIde: string;
            quantity: number;
        }>;
        tickets?: Array<{
            type: string;
            quantity: number;
        }>;
    };

    // 连胜奖励
    streakBonus?: {
        minStreak: number;
        bonusMultiplier: number;
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
    maxParticipations: number;
    maxTournaments: number;
    maxAttempts: number;

    // 订阅用户限制
    subscribed: {
        maxParticipations: number;
        maxTournaments: number;
        maxAttempts: number;
    };
}

/**
 * 高级配置
 */
export interface AdvancedConfig {
    // 匹配算法
    matching: {
        algorithm: "skill_based" | "random" | "segment_based" | "elo_based";
        skillRange?: number;
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
        name: "Solitaire锦标赛(免费)",
        description: "Solitaire锦标赛，免费模式，积分累积用于排行榜",
        gameType: "solitaire",
        isActive: true,
        priority: 1,
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
                coins: 5, // 参与奖励
                seasonPoints: 0 // 不直接给seasonPoints，通过排行榜获得
            },
            rankRewards: [
                {
                    rankRange: [1, 1],
                    multiplier: 1.0,
                    bonusProps: []
                },
                {
                    rankRange: [2, 2],
                    multiplier: 0.5
                },
                {
                    rankRange: [3, 4],
                    multiplier: 0.0
                }
            ],
            participationReward: {
                coins: 5,
                gamePoints: 0
            }
        },

        schedule: {
            timeZone: "America/Toronto",
            open: {
                time: "18:00:00"
            },
            start: {
                time: "00:00:00"
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

        createdAt: "2025-08-01T00:00:00.000Z",
        updatedAt: "2025-08-01T00:00:00.000Z"
    },

    // 快速对局配置 - 门票模式
    {
        typeId: "quick_match_solitaire_ticket2",
        name: "Solitaire快速对局(门票2)",
        description: "2-4人Solitaire快速对局，门票模式2",
        gameType: "solitaire",
        isActive: true,
        priority: 2,
        timeRange: "daily",

        entryRequirements: {
            isSubscribedRequired: false,
            entryFee: {
                coins: 10, // 门票费用
                tickets: {
                    type: "bronze",
                    quantity: 1
                }
            }
        },

        matchRules: {
            matchType: "single_match",
            minPlayers: 2,
            maxPlayers: 4,
            rankingMethod: "highest_score",
            timeLimit: {
                perMatch: 300, // 5分钟
                total: 300
            }
        },

        rewards: {
            baseRewards: {
                coins: 10, // 参与奖励
                seasonPoints: 0 // 不直接给seasonPoints，通过排行榜获得
            },
            rankRewards: [
                {
                    rankRange: [1, 1],
                    multiplier: 1.0,
                    bonusProps: []
                },
                {
                    rankRange: [2, 2],
                    multiplier: 0.5
                },
                {
                    rankRange: [3, 4],
                    multiplier: 0.0
                }
            ],
            participationReward: {
                coins: 10,
                gamePoints: 0
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
        createdAt: "2025-08-01T00:00:00.000Z",
        updatedAt: "2025-08-01T00:00:00.000Z"
    },

    // 每日特殊锦标赛
    {
        typeId: "quick_match_solitaire_ticket1",
        name: "Solitaire快速对局(门票1)",
        description: "2人Solitaire快速对局，门票模式1",
        gameType: "solitaire",
        isActive: true,
        priority: 3,
        timeRange: "daily",

        entryRequirements: {
            minSegment: "bronze",
            isSubscribedRequired: false,
            entryFee: {
                coins: 50,
                tickets: {
                    type: "silver",
                    quantity: 1
                }
            }
        },

        matchRules: {
            matchType: "single_match",
            minPlayers: 2,
            maxPlayers: 2,
            rankingMethod: "highest_score",
            timeLimit: {
                perMatch: 300, // 5分钟
                total: 900     // 15分钟
            }
        },

        rewards: {
            baseRewards: {
                coins: 100,
                seasonPoints: 50,
                props: [
                    {
                        gameType: "solitaire",
                        propId: "hint",
                        quantity: 2,
                    }
                ],
                tickets: []
            },
            rankRewards: [
                {
                    rankRange: [1, 1],
                    multiplier: 3.0,
                    bonusProps: [
                        {
                            gameType: "solitaire",
                            propId: "time_boost",
                            quantity: 1,
                        }
                    ]
                },
                {
                    rankRange: [2, 3],
                    multiplier: 2.0
                },
                {
                    rankRange: [4, 10],
                    multiplier: 1.5
                }
            ],
            segmentBonus: {
                bronze: 1.0,
                silver: 1.1,
                gold: 1.2,
                platinum: 1.3,
                diamond: 1.5
            },
            subscriptionBonus: 1.2,
            participationReward: {
                coins: 10,
                gamePoints: 5
            }
        },

        limits: {
            maxParticipations: 3,
            maxTournaments: 1,
            maxAttempts: 3,
            subscribed: {
                maxParticipations: 5,
                maxTournaments: 2,
                maxAttempts: 5
            }
        },

        createdAt: "2025-08-01T00:00:00.000Z",
        updatedAt: "2025-08-01T00:00:00.000Z"
    }
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
