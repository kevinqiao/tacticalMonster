/**
 * 锦标赛配置类型定义 - 基于 tournament_types schema
 */
export interface TournamentConfig {
    // 基础信息
    typeId: string;
    name: string;
    description: string;
    timeRange?: string;
    independent?: boolean;

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
    schedule: ScheduleConfig;

    // 限制配置
    limits: LimitConfig;

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
            gameType: string;
            tournamentType: string;
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

    // 是否单人比赛
    isSingleMatch: boolean;

    // 尝试次数
    maxAttempts?: number;
    allowMultipleAttempts: boolean;

    // 排名规则
    rankingMethod: "highest_score" | "total_score" | "average_score" | "best_of_attempts" | "threshold";

    // 分数阈值（用于threshold排名）
    scoreThreshold?: number;

    // 时间限制
    timeLimit?: {
        perMatch: number; // 秒
        perTurn?: number; // 秒
        total?: number;   // 秒
    };

    // 特殊规则
    specialRules?: Array<{
        type: string;
        value: any;
        description: string;
    }>;
}

/**
 * 奖励配置
 */
export interface RewardConfig {
    // 基础奖励
    baseRewards: {
        coins: number;
        gamePoints: number;
        props: Array<{
            gameType: string;
            propType: string;
            quantity: number;
            rarity: "common" | "rare" | "epic" | "legendary";
        }>;
        tickets: Array<{
            gameType: string;
            tournamentType: string;
            quantity: number;
        }>;
    };

    // 排名奖励
    rankRewards: Array<{
        rankRange: number[]; // [minRank, maxRank]
        multiplier: number;
        bonusProps?: Array<{
            gameType: string;
            propType: string;
            quantity: number;
            rarity: "common" | "rare" | "epic" | "legendary";
        }>;
        bonusTickets?: Array<{
            gameType: string;
            tournamentType: string;
            quantity: number;
        }>;
    }>;

    // 段位加成
    segmentBonus: {
        bronze: number;
        silver: number;
        gold: number;
        platinum: number;
        diamond: number;
    };

    // 订阅加成
    subscriptionBonus: number;

    // 参与奖励
    participationReward: {
        coins: number;
        gamePoints: number;
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
    // 开始时间
    startTime: {
        type: "fixed" | "daily" | "weekly" | "monthly" | "seasonal";
        value: string; // ISO string or cron expression
    };

    // 结束时间
    endTime: {
        type: "fixed" | "duration" | "until_completion";
        value: string | number; // ISO string or duration in seconds
    };

    // 持续时间
    duration: number; // 秒

    // 报名截止时间
    registrationDeadline?: number; // 秒，相对于开始时间

    // 重复配置
    repeat?: {
        enabled: boolean;
        interval: "daily" | "weekly" | "monthly";
        daysOfWeek?: number[]; // 0-6, 0=Sunday
        dayOfMonth?: number;
    };

    // 时区
    timezone: string; // IANA timezone
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
    // 每日特殊锦标赛
    {
        typeId: "daily_special",
        name: "每日特殊锦标赛",
        description: "每日限时特殊锦标赛，提供丰厚奖励",
        gameType: "solitaire",
        isActive: true,
        priority: 1,

        entryRequirements: {
            minSegment: "bronze",
            isSubscribedRequired: false,
            entryFee: {
                coins: 50,
                tickets: {
                    gameType: "solitaire",
                    tournamentType: "daily_special",
                    quantity: 1
                }
            }
        },

        matchRules: {
            matchType: "single_match",
            minPlayers: 1,
            maxPlayers: 1,
            isSingleMatch: true,
            maxAttempts: 3,
            allowMultipleAttempts: true,
            rankingMethod: "highest_score",
            timeLimit: {
                perMatch: 300, // 5分钟
                total: 900     // 15分钟
            }
        },

        rewards: {
            baseRewards: {
                coins: 100,
                gamePoints: 50,
                props: [
                    {
                        gameType: "solitaire",
                        propType: "hint",
                        quantity: 2,
                        rarity: "common"
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
                            propType: "time_boost",
                            quantity: 1,
                            rarity: "rare"
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

        schedule: {
            startTime: {
                type: "daily",
                value: "09:00"
            },
            endTime: {
                type: "duration",
                value: 86400 // 24小时
            },
            duration: 86400,
            timezone: "America/Toronto"
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

        advanced: {
            matching: {
                algorithm: "skill_based",
                skillRange: 200,
                maxWaitTime: 30,
                fallbackToAI: true
            },
            settlement: {
                autoSettle: true,
                settleDelay: 300,
                requireMinimumPlayers: false,
                minimumPlayers: 1
            },
            notifications: {
                enabled: true,
                types: ["join", "start", "complete", "reward", "reminder"],
                channels: ["in_app", "push"]
            },
            monitoring: {
                enabled: true,
                metrics: ["participation", "completion", "rewards", "performance"],
                alerts: ["low_participation", "high_failure", "reward_issues"]
            }
        }
    },

    // 多人锦标赛
    {
        typeId: "multi_player_tournament",
        name: "多人锦标赛",
        description: "与其他玩家实时对战，争夺排名",
        gameType: "rummy",
        isActive: true,
        priority: 2,

        entryRequirements: {
            minSegment: "bronze",
            isSubscribedRequired: false,
            entryFee: {
                coins: 100,
                tickets: {
                    gameType: "rummy",
                    tournamentType: "multi_player_tournament",
                    quantity: 1
                }
            }
        },

        matchRules: {
            matchType: "multi_match",
            minPlayers: 2,
            maxPlayers: 4,
            isSingleMatch: false,
            maxAttempts: 1,
            allowMultipleAttempts: false,
            rankingMethod: "total_score",
            timeLimit: {
                perMatch: 600, // 10分钟
                perTurn: 30    // 30秒
            }
        },

        rewards: {
            baseRewards: {
                coins: 200,
                gamePoints: 100,
                props: [
                    {
                        gameType: "rummy",
                        propType: "wild_card",
                        quantity: 1,
                        rarity: "rare"
                    }
                ],
                tickets: []
            },
            rankRewards: [
                {
                    rankRange: [1, 1],
                    multiplier: 4.0,
                    bonusProps: [
                        {
                            gameType: "rummy",
                            propType: "joker",
                            quantity: 1,
                            rarity: "epic"
                        }
                    ]
                },
                {
                    rankRange: [2, 2],
                    multiplier: 2.5
                },
                {
                    rankRange: [3, 3],
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
                coins: 20,
                gamePoints: 10
            }
        },

        schedule: {
            startTime: {
                type: "fixed",
                value: new Date().toISOString()
            },
            endTime: {
                type: "duration",
                value: 3600 // 1小时
            },
            duration: 3600,
            timezone: "America/Toronto"
        },

        limits: {
            maxParticipations: 5,
            maxTournaments: 2,
            maxAttempts: 5,
            subscribed: {
                maxParticipations: 8,
                maxTournaments: 3,
                maxAttempts: 8
            }
        },

        advanced: {
            matching: {
                algorithm: "skill_based",
                skillRange: 150,
                maxWaitTime: 60,
                fallbackToAI: false
            },
            settlement: {
                autoSettle: true,
                settleDelay: 180,
                requireMinimumPlayers: true,
                minimumPlayers: 2
            },
            notifications: {
                enabled: true,
                types: ["join", "start", "complete", "reward"],
                channels: ["in_app"]
            },
            monitoring: {
                enabled: true,
                metrics: ["participation", "completion", "rewards"],
                alerts: ["low_participation", "high_failure"]
            }
        }
    },

    // 独立游戏锦标赛
    {
        typeId: "independent_games",
        name: "独立游戏锦标赛",
        description: "玩家独立完成游戏，按分数排名",
        gameType: "solitaire",
        isActive: true,
        priority: 3,
        independent: true,

        entryRequirements: {
            minSegment: "bronze",
            isSubscribedRequired: false,
            entryFee: {
                coins: 75
            }
        },

        matchRules: {
            matchType: "single_match",
            minPlayers: 1,
            maxPlayers: 1,
            isSingleMatch: true,
            maxAttempts: 5,
            allowMultipleAttempts: true,
            rankingMethod: "highest_score",
            timeLimit: {
                perMatch: 600, // 10分钟
                total: 1800    // 30分钟
            }
        },

        rewards: {
            baseRewards: {
                coins: 150,
                gamePoints: 75,
                props: [
                    {
                        gameType: "solitaire",
                        propType: "undo",
                        quantity: 3,
                        rarity: "common"
                    }
                ],
                tickets: []
            },
            rankRewards: [
                {
                    rankRange: [1, 1],
                    multiplier: 2.5
                },
                {
                    rankRange: [2, 5],
                    multiplier: 1.8
                },
                {
                    rankRange: [6, 15],
                    multiplier: 1.3
                }
            ],
            segmentBonus: {
                bronze: 1.0,
                silver: 1.1,
                gold: 1.2,
                platinum: 1.3,
                diamond: 1.5
            },
            subscriptionBonus: 1.15,
            participationReward: {
                coins: 15,
                gamePoints: 8
            }
        },

        schedule: {
            startTime: {
                type: "weekly",
                value: "0 10 * * 1" // 每周一上午10点
            },
            endTime: {
                type: "duration",
                value: 604800 // 7天
            },
            duration: 604800,
            timezone: "America/Toronto"
        },

        limits: {
            maxParticipations: 2,
            maxTournaments: 1,
            maxAttempts: 5,
            subscribed: {
                maxParticipations: 3,
                maxTournaments: 1,
                maxAttempts: 7
            }
        },

        advanced: {
            matching: {
                algorithm: "random",
                maxWaitTime: 10,
                fallbackToAI: false
            },
            settlement: {
                autoSettle: true,
                settleDelay: 600,
                requireMinimumPlayers: false,
                minimumPlayers: 1
            },
            notifications: {
                enabled: true,
                types: ["join", "start", "complete", "reward"],
                channels: ["in_app"]
            },
            monitoring: {
                enabled: true,
                metrics: ["participation", "completion", "rewards"],
                alerts: ["low_participation"]
            }
        }
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

/**
 * 创建默认锦标赛配置
 */
export function createDefaultTournamentConfig(
    typeId: string,
    name: string,
    gameType: GameType
): TournamentConfig {
    return {
        typeId,
        name,
        description: `${name} - 默认配置`,
        gameType,
        isActive: true,
        priority: 5,

        entryRequirements: {
            isSubscribedRequired: false,
            entryFee: {
                coins: 50
            }
        },

        matchRules: {
            matchType: "single_match",
            minPlayers: 1,
            maxPlayers: 1,
            isSingleMatch: true,
            allowMultipleAttempts: true,
            rankingMethod: "highest_score"
        },

        rewards: {
            baseRewards: {
                coins: 100,
                gamePoints: 50,
                props: [],
                tickets: []
            },
            rankRewards: [
                {
                    rankRange: [1, 1],
                    multiplier: 2.0
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

        schedule: {
            startTime: {
                type: "fixed",
                value: new Date().toISOString()
            },
            endTime: {
                type: "duration",
                value: 86400
            },
            duration: 86400,
            timezone: "America/Toronto"
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

        advanced: {
            matching: {
                algorithm: "skill_based",
                maxWaitTime: 30,
                fallbackToAI: true
            },
            settlement: {
                autoSettle: true,
                settleDelay: 300,
                requireMinimumPlayers: false,
                minimumPlayers: 1
            },
            notifications: {
                enabled: true,
                types: ["join", "start", "complete", "reward"],
                channels: ["in_app"]
            },
            monitoring: {
                enabled: true,
                metrics: ["participation", "completion", "rewards"],
                alerts: ["low_participation"]
            }
        }
    };
} 