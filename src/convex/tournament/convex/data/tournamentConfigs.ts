/**
 * 锦标赛配置类型定义
 */
export interface TournamentConfig {
    // 基础信息
    typeId: string;
    name: string;
    description: string;
    category: TournamentCategory;

    // 游戏配置
    gameType: GameType;
    isActive: boolean;
    priority: number;

    // 参赛条件
    entryRequirements: EntryRequirements;

    // 比赛规则
    matchRules: MatchRules;

    // 奖励配置
    rewards: RewardConfig;

    // 时间配置
    schedule: ScheduleConfig;

    // 限制配置
    limits: LimitConfig;

    // 高级配置
    advanced: AdvancedConfig;
}

/**
 * 锦标赛分类
 */
export type TournamentCategory =
    | "daily"           // 每日锦标赛
    | "weekly"          // 每周锦标赛
    | "seasonal"        // 赛季锦标赛
    | "special"         // 特殊活动锦标赛
    | "ranked"          // 排位锦标赛
    | "casual"          // 休闲锦标赛
    | "championship"    // 冠军锦标赛
    | "tournament"      // 普通锦标赛;

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
    | "arcade"          // 街机游戏;

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
            gameType: GameType;
            tournamentType: string;
            quantity: number;
        };
        props?: Array<{
            gameType: GameType;
            propType: string;
            quantity: number;
        }>;
    };

    // 特殊条件
    specialConditions?: Array<{
        type: "achievement" | "event" | "time" | "custom";
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
            gameType: GameType;
            propType: string;
            quantity: number;
            rarity: "common" | "rare" | "epic" | "legendary";
        }>;
        tickets: Array<{
            gameType: GameType;
            tournamentType: string;
            quantity: number;
        }>;
    };

    // 排名奖励
    rankRewards: Array<{
        rankRange: [number, number]; // [minRank, maxRank]
        multiplier: number;
        bonusProps?: Array<{
            gameType: GameType;
            propType: string;
            quantity: number;
            rarity: "common" | "rare" | "epic" | "legendary";
        }>;
        bonusTickets?: Array<{
            gameType: GameType;
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
    // 每日限制
    daily: {
        maxParticipations: number;
        maxTournaments: number;
        maxAttempts: number;
    };

    // 每周限制
    weekly: {
        maxParticipations: number;
        maxTournaments: number;
        maxAttempts: number;
    };

    // 赛季限制
    seasonal: {
        maxParticipations: number;
        maxTournaments: number;
        maxAttempts: number;
    };

    // 总限制
    total: {
        maxParticipations: number;
        maxTournaments: number;
        maxAttempts: number;
    };

    // 订阅用户限制
    subscribed: {
        daily: {
            maxParticipations: number;
            maxTournaments: number;
            maxAttempts: number;
        };
        weekly: {
            maxParticipations: number;
            maxTournaments: number;
            maxAttempts: number;
        };
        seasonal: {
            maxParticipations: number;
            maxTournaments: number;
            maxAttempts: number;
        };
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
        types: Array<"join" | "start" | "complete" | "reward" | "reminder">;
        channels: Array<"in_app" | "email" | "push">;
    };

    // 监控配置
    monitoring: {
        enabled: boolean;
        metrics: Array<"participation" | "completion" | "rewards" | "performance">;
        alerts: Array<"low_participation" | "high_failure" | "reward_issues">;
    };

    // 自定义配置
    custom?: Record<string, any>;
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
        category: "daily",
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
            maxAttempts: 3,  // 在同一个锦标赛中允许尝试3次
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
            daily: {
                maxParticipations: 3,
                maxTournaments: 1,
                maxAttempts: 3
            },
            weekly: {
                maxParticipations: 21,
                maxTournaments: 7,
                maxAttempts: 21
            },
            seasonal: {
                maxParticipations: 90,
                maxTournaments: 30,
                maxAttempts: 90
            },
            total: {
                maxParticipations: 1000,
                maxTournaments: 500,
                maxAttempts: 3000
            },
            subscribed: {
                daily: {
                    maxParticipations: 5,
                    maxTournaments: 2,
                    maxAttempts: 5
                },
                weekly: {
                    maxParticipations: 35,
                    maxTournaments: 14,
                    maxAttempts: 35
                },
                seasonal: {
                    maxParticipations: 150,
                    maxTournaments: 60,
                    maxAttempts: 150
                }
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
        category: "tournament",
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
            subscriptionBonus: 1.3,
            participationReward: {
                coins: 20,
                gamePoints: 10
            }
        },

        schedule: {
            startTime: {
                type: "fixed",
                value: "2024-01-01T00:00:00Z"
            },
            endTime: {
                type: "duration",
                value: 604800 // 7天
            },
            duration: 604800,
            timezone: "America/Toronto"
        },

        limits: {
            daily: {
                maxParticipations: 5,
                maxTournaments: 2,
                maxAttempts: 5
            },
            weekly: {
                maxParticipations: 35,
                maxTournaments: 14,
                maxAttempts: 35
            },
            seasonal: {
                maxParticipations: 150,
                maxTournaments: 60,
                maxAttempts: 150
            },
            total: {
                maxParticipations: 1000,
                maxTournaments: 500,
                maxAttempts: 1000
            },
            subscribed: {
                daily: {
                    maxParticipations: 8,
                    maxTournaments: 3,
                    maxAttempts: 8
                },
                weekly: {
                    maxParticipations: 56,
                    maxTournaments: 21,
                    maxAttempts: 56
                },
                seasonal: {
                    maxParticipations: 240,
                    maxTournaments: 90,
                    maxAttempts: 240
                }
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
                settleDelay: 600,
                requireMinimumPlayers: true,
                minimumPlayers: 2
            },
            notifications: {
                enabled: true,
                types: ["join", "start", "complete", "reward"],
                channels: ["in_app", "push"]
            },
            monitoring: {
                enabled: true,
                metrics: ["participation", "completion", "rewards", "performance"],
                alerts: ["low_participation", "high_failure", "reward_issues"]
            }
        }
    },

    // 单人锦标赛
    {
        typeId: "single_player_tournament",
        name: "单人锦标赛",
        description: "挑战自我，追求最高分数",
        category: "casual",
        gameType: "solitaire",
        isActive: true,
        priority: 3,

        entryRequirements: {
            minSegment: "bronze",
            isSubscribedRequired: false,
            entryFee: {
                coins: 25
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
                perMatch: 600 // 10分钟
            }
        },

        rewards: {
            baseRewards: {
                coins: 50,
                gamePoints: 25,
                props: [],
                tickets: []
            },
            rankRewards: [
                {
                    rankRange: [1, 1],
                    multiplier: 2.0
                },
                {
                    rankRange: [2, 5],
                    multiplier: 1.5
                },
                {
                    rankRange: [6, 10],
                    multiplier: 1.2
                }
            ],
            segmentBonus: {
                bronze: 1.0,
                silver: 1.05,
                gold: 1.1,
                platinum: 1.15,
                diamond: 1.2
            },
            subscriptionBonus: 1.1,
            participationReward: {
                coins: 5,
                gamePoints: 3
            }
        },

        schedule: {
            startTime: {
                type: "fixed",
                value: "2024-01-01T00:00:00Z"
            },
            endTime: {
                type: "duration",
                value: 2592000 // 30天
            },
            duration: 2592000,
            timezone: "America/Toronto"
        },

        limits: {
            daily: {
                maxParticipations: 10,
                maxTournaments: 5,
                maxAttempts: 10
            },
            weekly: {
                maxParticipations: 70,
                maxTournaments: 35,
                maxAttempts: 70
            },
            seasonal: {
                maxParticipations: 300,
                maxTournaments: 150,
                maxAttempts: 300
            },
            total: {
                maxParticipations: 2000,
                maxTournaments: 1000,
                maxAttempts: 5000
            },
            subscribed: {
                daily: {
                    maxParticipations: 15,
                    maxTournaments: 8,
                    maxAttempts: 15
                },
                weekly: {
                    maxParticipations: 105,
                    maxTournaments: 56,
                    maxAttempts: 105
                },
                seasonal: {
                    maxParticipations: 450,
                    maxTournaments: 225,
                    maxAttempts: 450
                }
            }
        },

        advanced: {
            matching: {
                algorithm: "random",
                maxWaitTime: 5,
                fallbackToAI: true
            },
            settlement: {
                autoSettle: true,
                settleDelay: 60,
                requireMinimumPlayers: false,
                minimumPlayers: 1
            },
            notifications: {
                enabled: true,
                types: ["join", "complete", "reward"],
                channels: ["in_app"]
            },
            monitoring: {
                enabled: true,
                metrics: ["participation", "completion", "rewards"],
                alerts: ["low_participation"]
            }
        }
    },

    // 单人阈值锦标赛
    {
        typeId: "single_player_threshold_tournament",
        name: "单人阈值锦标赛",
        description: "达到目标分数即可获胜，挑战你的极限",
        category: "casual",
        gameType: "solitaire",
        isActive: true,
        priority: 2,

        entryRequirements: {
            minSegment: "bronze",
            isSubscribedRequired: false,
            entryFee: {
                coins: 30
            }
        },

        matchRules: {
            matchType: "single_match",
            minPlayers: 1,
            maxPlayers: 1,
            isSingleMatch: true,
            maxAttempts: 3,
            allowMultipleAttempts: true,
            rankingMethod: "threshold",
            scoreThreshold: 1000, // 达到1000分即可获胜
            timeLimit: {
                perMatch: 480 // 8分钟
            }
        },

        rewards: {
            baseRewards: {
                coins: 80,
                gamePoints: 40,
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
                    rankRange: [2, 2],
                    multiplier: 1.5,
                    bonusProps: [
                        {
                            gameType: "solitaire",
                            propType: "hint",
                            quantity: 1,
                            rarity: "common"
                        }
                    ]
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
                value: "2024-01-01T00:00:00Z"
            },
            endTime: {
                type: "duration",
                value: 86400 // 24小时
            },
            duration: 86400,
            timezone: "America/Toronto"
        },

        limits: {
            daily: {
                maxParticipations: 5,
                maxTournaments: 2,
                maxAttempts: 5
            },
            weekly: {
                maxParticipations: 35,
                maxTournaments: 14,
                maxAttempts: 35
            },
            seasonal: {
                maxParticipations: 150,
                maxTournaments: 60,
                maxAttempts: 150
            },
            total: {
                maxParticipations: 1000,
                maxTournaments: 500,
                maxAttempts: 2000
            },
            subscribed: {
                daily: {
                    maxParticipations: 8,
                    maxTournaments: 3,
                    maxAttempts: 8
                },
                weekly: {
                    maxParticipations: 56,
                    maxTournaments: 21,
                    maxAttempts: 56
                },
                seasonal: {
                    maxParticipations: 240,
                    maxTournaments: 90,
                    maxAttempts: 240
                }
            }
        },

        advanced: {
            matching: {
                algorithm: "random",
                maxWaitTime: 5,
                fallbackToAI: true
            },
            settlement: {
                autoSettle: true,
                settleDelay: 120,
                requireMinimumPlayers: false,
                minimumPlayers: 1
            },
            notifications: {
                enabled: true,
                types: ["join", "complete", "reward"],
                channels: ["in_app"]
            },
            monitoring: {
                enabled: true,
                metrics: ["participation", "completion", "rewards"],
                alerts: ["low_participation"]
            }
        }
    },

    // 独立锦标赛
    {
        typeId: "independent_tournament",
        name: "独立锦标赛",
        description: "每次尝试都是独立的锦标赛",
        category: "casual",
        gameType: "solitaire",
        isActive: true,
        priority: 4,

        entryRequirements: {
            minSegment: "bronze",
            isSubscribedRequired: false,
            entryFee: {
                coins: 30
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
                perMatch: 480 // 8分钟
            }
        },

        rewards: {
            baseRewards: {
                coins: 60,
                gamePoints: 30,
                props: [
                    {
                        gameType: "solitaire",
                        propType: "undo",
                        quantity: 1,
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
                    rankRange: [2, 3],
                    multiplier: 1.8
                },
                {
                    rankRange: [4, 5],
                    multiplier: 1.3
                }
            ],
            segmentBonus: {
                bronze: 1.0,
                silver: 1.08,
                gold: 1.15,
                platinum: 1.22,
                diamond: 1.3
            },
            subscriptionBonus: 1.15,
            participationReward: {
                coins: 8,
                gamePoints: 4
            }
        },

        schedule: {
            startTime: {
                type: "fixed",
                value: "2024-01-01T00:00:00Z"
            },
            endTime: {
                type: "duration",
                value: 86400 // 24小时
            },
            duration: 86400,
            timezone: "America/Toronto"
        },

        limits: {
            daily: {
                maxParticipations: 5,
                maxTournaments: 3,
                maxAttempts: 5
            },
            weekly: {
                maxParticipations: 35,
                maxTournaments: 21,
                maxAttempts: 35
            },
            seasonal: {
                maxParticipations: 150,
                maxTournaments: 90,
                maxAttempts: 150
            },
            total: {
                maxParticipations: 1000,
                maxTournaments: 600,
                maxAttempts: 1000
            },
            subscribed: {
                daily: {
                    maxParticipations: 8,
                    maxTournaments: 5,
                    maxAttempts: 8
                },
                weekly: {
                    maxParticipations: 56,
                    maxTournaments: 35,
                    maxAttempts: 56
                },
                seasonal: {
                    maxParticipations: 240,
                    maxTournaments: 150,
                    maxAttempts: 240
                }
            }
        },

        advanced: {
            matching: {
                algorithm: "random",
                maxWaitTime: 5,
                fallbackToAI: true
            },
            settlement: {
                autoSettle: true,
                settleDelay: 120,
                requireMinimumPlayers: false,
                minimumPlayers: 1
            },
            notifications: {
                enabled: true,
                types: ["join", "complete", "reward"],
                channels: ["in_app"]
            },
            monitoring: {
                enabled: true,
                metrics: ["participation", "completion", "rewards"],
                alerts: ["low_participation"]
            }
        }
    },

    // ===== 从 tournamentTypeConfigs.ts 迁移的配置 =====

    // 每日纸牌挑战
    {
        typeId: "daily_solitaire_challenge",
        name: "每日纸牌挑战",
        description: "每日限时纸牌游戏挑战，测试你的策略和速度",
        category: "daily",
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
                    tournamentType: "daily_solitaire_challenge",
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
                perMatch: 300 // 5分钟
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
                        quantity: 1,
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
                            propType: "hint",
                            quantity: 2,
                            rarity: "common"
                        }
                    ]
                },
                {
                    rankRange: [2, 3],
                    multiplier: 2.0,
                    bonusProps: [
                        {
                            gameType: "solitaire",
                            propType: "hint",
                            quantity: 1,
                            rarity: "common"
                        }
                    ]
                },
                {
                    rankRange: [4, 10],
                    multiplier: 1.0,
                    bonusProps: [
                        {
                            gameType: "solitaire",
                            propType: "hint",
                            quantity: 1,
                            rarity: "common"
                        }
                    ]
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
            daily: {
                maxParticipations: 3,
                maxTournaments: 1,
                maxAttempts: 3
            },
            weekly: {
                maxParticipations: 21,
                maxTournaments: 7,
                maxAttempts: 21
            },
            seasonal: {
                maxParticipations: 90,
                maxTournaments: 30,
                maxAttempts: 90
            },
            total: {
                maxParticipations: 1000,
                maxTournaments: 500,
                maxAttempts: 3000
            },
            subscribed: {
                daily: {
                    maxParticipations: 5,
                    maxTournaments: 2,
                    maxAttempts: 5
                },
                weekly: {
                    maxParticipations: 35,
                    maxTournaments: 14,
                    maxAttempts: 35
                },
                seasonal: {
                    maxParticipations: 150,
                    maxTournaments: 60,
                    maxAttempts: 150
                }
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


    // 每周拉米大师赛
    {
        typeId: "weekly_rummy_masters",
        name: "每周拉米大师赛",
        description: "每周拉米纸牌大师级比赛，争夺周冠军称号",
        category: "weekly",
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
                    tournamentType: "weekly_rummy_masters",
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
                props: [],
                tickets: []
            },
            rankRewards: [
                {
                    rankRange: [1, 1],
                    multiplier: 4.0,
                    bonusProps: [
                        {
                            gameType: "rummy",
                            propType: "wild_card",
                            quantity: 2,
                            rarity: "rare"
                        }
                    ]
                },
                {
                    rankRange: [2, 2],
                    multiplier: 2.5,
                    bonusProps: [
                        {
                            gameType: "rummy",
                            propType: "wild_card",
                            quantity: 1,
                            rarity: "rare"
                        }
                    ]
                },
                {
                    rankRange: [3, 5],
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
            subscriptionBonus: 1.3,
            participationReward: {
                coins: 20,
                gamePoints: 10
            }
        },

        schedule: {
            startTime: {
                type: "weekly",
                value: "monday 09:00"
            },
            endTime: {
                type: "duration",
                value: 604800 // 7天
            },
            duration: 604800,
            timezone: "America/Toronto"
        },

        limits: {
            daily: {
                maxParticipations: 5,
                maxTournaments: 2,
                maxAttempts: 5
            },
            weekly: {
                maxParticipations: 35,
                maxTournaments: 14,
                maxAttempts: 35
            },
            seasonal: {
                maxParticipations: 150,
                maxTournaments: 60,
                maxAttempts: 150
            },
            total: {
                maxParticipations: 1000,
                maxTournaments: 500,
                maxAttempts: 1000
            },
            subscribed: {
                daily: {
                    maxParticipations: 8,
                    maxTournaments: 3,
                    maxAttempts: 8
                },
                weekly: {
                    maxParticipations: 56,
                    maxTournaments: 21,
                    maxAttempts: 56
                },
                seasonal: {
                    maxParticipations: 240,
                    maxTournaments: 90,
                    maxAttempts: 240
                }
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
                settleDelay: 600,
                requireMinimumPlayers: true,
                minimumPlayers: 2
            },
            notifications: {
                enabled: true,
                types: ["join", "start", "complete", "reward"],
                channels: ["in_app", "push"]
            },
            monitoring: {
                enabled: true,
                metrics: ["participation", "completion", "rewards", "performance"],
                alerts: ["low_participation", "high_failure", "reward_issues"]
            }
        }
    },

    // 每月UNO锦标赛
    {
        typeId: "monthly_uno_championship",
        name: "每月UNO锦标赛",
        description: "每月UNO游戏锦标赛，持续一个月的激烈竞争",
        category: "seasonal",
        gameType: "uno",
        isActive: true,
        priority: 3,

        entryRequirements: {
            minSegment: "bronze",
            isSubscribedRequired: false,
            entryFee: {
                coins: 200,
                tickets: {
                    gameType: "uno",
                    tournamentType: "monthly_uno_championship",
                    quantity: 1
                }
            }
        },

        matchRules: {
            matchType: "multi_match",
            minPlayers: 2,
            maxPlayers: 6,
            isSingleMatch: false,
            maxAttempts: 5,
            allowMultipleAttempts: true,
            rankingMethod: "total_score",
            timeLimit: {
                perMatch: 480, // 8分钟
                perTurn: 20    // 20秒
            }
        },

        rewards: {
            baseRewards: {
                coins: 400,
                gamePoints: 200,
                props: [],
                tickets: []
            },
            rankRewards: [
                {
                    rankRange: [1, 1],
                    multiplier: 3.75,
                    bonusProps: [
                        {
                            gameType: "uno",
                            propType: "reverse",
                            quantity: 5,
                            rarity: "common"
                        },
                        {
                            gameType: "uno",
                            propType: "skip",
                            quantity: 3,
                            rarity: "common"
                        }
                    ]
                },
                {
                    rankRange: [2, 3],
                    multiplier: 2.5,
                    bonusProps: [
                        {
                            gameType: "uno",
                            propType: "reverse",
                            quantity: 3,
                            rarity: "common"
                        }
                    ]
                },
                {
                    rankRange: [4, 10],
                    multiplier: 1.25
                }
            ],
            segmentBonus: {
                bronze: 1.0,
                silver: 1.1,
                gold: 1.2,
                platinum: 1.3,
                diamond: 1.5
            },
            subscriptionBonus: 1.4,
            participationReward: {
                coins: 30,
                gamePoints: 15
            }
        },

        schedule: {
            startTime: {
                type: "monthly",
                value: "1st 09:00"
            },
            endTime: {
                type: "duration",
                value: 2592000 // 30天
            },
            duration: 2592000,
            timezone: "America/Toronto"
        },

        limits: {
            daily: {
                maxParticipations: 8,
                maxTournaments: 3,
                maxAttempts: 8
            },
            weekly: {
                maxParticipations: 56,
                maxTournaments: 21,
                maxAttempts: 56
            },
            seasonal: {
                maxParticipations: 240,
                maxTournaments: 90,
                maxAttempts: 240
            },
            total: {
                maxParticipations: 1000,
                maxTournaments: 500,
                maxAttempts: 2000
            },
            subscribed: {
                daily: {
                    maxParticipations: 12,
                    maxTournaments: 5,
                    maxAttempts: 12
                },
                weekly: {
                    maxParticipations: 84,
                    maxTournaments: 35,
                    maxAttempts: 84
                },
                seasonal: {
                    maxParticipations: 360,
                    maxTournaments: 150,
                    maxAttempts: 360
                }
            }
        },

        advanced: {
            matching: {
                algorithm: "skill_based",
                skillRange: 100,
                maxWaitTime: 45,
                fallbackToAI: false
            },
            settlement: {
                autoSettle: true,
                settleDelay: 900,
                requireMinimumPlayers: true,
                minimumPlayers: 2
            },
            notifications: {
                enabled: true,
                types: ["join", "start", "complete", "reward", "reminder"],
                channels: ["in_app", "push", "email"]
            },
            monitoring: {
                enabled: true,
                metrics: ["participation", "completion", "rewards", "performance"],
                alerts: ["low_participation", "high_failure", "reward_issues"]
            }
        }
    },

    // 赛季飞行棋联赛
    {
        typeId: "seasonal_ludo_league",
        name: "赛季飞行棋联赛",
        description: "赛季级飞行棋联赛，争夺赛季冠军和丰厚奖励",
        category: "seasonal",
        gameType: "ludo",
        isActive: true,
        priority: 4,

        entryRequirements: {
            minSegment: "bronze",
            isSubscribedRequired: false,
            entryFee: {
                coins: 500,
                tickets: {
                    gameType: "ludo",
                    tournamentType: "seasonal_ludo_league",
                    quantity: 1
                }
            }
        },

        matchRules: {
            matchType: "multi_match",
            minPlayers: 2,
            maxPlayers: 4,
            isSingleMatch: false,
            maxAttempts: 10,
            allowMultipleAttempts: true,
            rankingMethod: "total_score",
            timeLimit: {
                perMatch: 900, // 15分钟
                perTurn: 60    // 60秒
            }
        },

        rewards: {
            baseRewards: {
                coins: 1000,
                gamePoints: 500,
                props: [],
                tickets: []
            },
            rankRewards: [
                {
                    rankRange: [1, 1],
                    multiplier: 5.0,
                    bonusProps: [
                        {
                            gameType: "ludo",
                            propType: "double_dice",
                            quantity: 10,
                            rarity: "rare"
                        },
                        {
                            gameType: "ludo",
                            propType: "safe_zone",
                            quantity: 5,
                            rarity: "epic"
                        }
                    ]
                },
                {
                    rankRange: [2, 3],
                    multiplier: 3.0,
                    bonusProps: [
                        {
                            gameType: "ludo",
                            propType: "double_dice",
                            quantity: 5,
                            rarity: "rare"
                        }
                    ]
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
            subscriptionBonus: 1.5,
            participationReward: {
                coins: 50,
                gamePoints: 25
            }
        },

        schedule: {
            startTime: {
                type: "seasonal",
                value: "season_start"
            },
            endTime: {
                type: "duration",
                value: 7776000 // 90天
            },
            duration: 7776000,
            timezone: "America/Toronto"
        },

        limits: {
            daily: {
                maxParticipations: 10,
                maxTournaments: 4,
                maxAttempts: 10
            },
            weekly: {
                maxParticipations: 70,
                maxTournaments: 28,
                maxAttempts: 70
            },
            seasonal: {
                maxParticipations: 300,
                maxTournaments: 120,
                maxAttempts: 300
            },
            total: {
                maxParticipations: 1000,
                maxTournaments: 500,
                maxAttempts: 2000
            },
            subscribed: {
                daily: {
                    maxParticipations: 15,
                    maxTournaments: 6,
                    maxAttempts: 15
                },
                weekly: {
                    maxParticipations: 105,
                    maxTournaments: 42,
                    maxAttempts: 105
                },
                seasonal: {
                    maxParticipations: 450,
                    maxTournaments: 180,
                    maxAttempts: 450
                }
            }
        },

        advanced: {
            matching: {
                algorithm: "skill_based",
                skillRange: 50,
                maxWaitTime: 90,
                fallbackToAI: false
            },
            settlement: {
                autoSettle: true,
                settleDelay: 1800,
                requireMinimumPlayers: true,
                minimumPlayers: 2
            },
            notifications: {
                enabled: true,
                types: ["join", "start", "complete", "reward", "reminder"],
                channels: ["in_app", "push", "email"]
            },
            monitoring: {
                enabled: true,
                metrics: ["participation", "completion", "rewards", "performance"],
                alerts: ["low_participation", "high_failure", "reward_issues"]
            }
        }
    },

    // 万圣节特别赛
    {
        typeId: "special_halloween_bonanza",
        name: "万圣节特别赛",
        description: "万圣节主题特别锦标赛，限时活动，双倍奖励",
        category: "special",
        gameType: "solitaire",
        isActive: true,
        priority: 1,

        entryRequirements: {
            minSegment: "bronze",
            isSubscribedRequired: false,
            entryFee: {
                coins: 150,
                tickets: {
                    gameType: "solitaire",
                    tournamentType: "special_halloween_bonanza",
                    quantity: 1
                }
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
                perMatch: 420 // 7分钟
            }
        },

        rewards: {
            baseRewards: {
                coins: 300,
                gamePoints: 150,
                props: [],
                tickets: []
            },
            rankRewards: [
                {
                    rankRange: [1, 1],
                    multiplier: 3.33,
                    bonusProps: [
                        {
                            gameType: "solitaire",
                            propType: "hint",
                            quantity: 10,
                            rarity: "rare"
                        },
                        {
                            gameType: "solitaire",
                            propType: "undo",
                            quantity: 5,
                            rarity: "rare"
                        }
                    ]
                },
                {
                    rankRange: [2, 5],
                    multiplier: 2.0,
                    bonusProps: [
                        {
                            gameType: "solitaire",
                            propType: "hint",
                            quantity: 5,
                            rarity: "common"
                        }
                    ]
                },
                {
                    rankRange: [6, 20],
                    multiplier: 1.0
                }
            ],
            segmentBonus: {
                bronze: 1.0,
                silver: 1.1,
                gold: 1.2,
                platinum: 1.3,
                diamond: 1.5
            },
            subscriptionBonus: 2.0, // 特殊活动双倍奖励
            participationReward: {
                coins: 20,
                gamePoints: 10
            }
        },

        schedule: {
            startTime: {
                type: "fixed",
                value: "2024-10-25T00:00:00Z"
            },
            endTime: {
                type: "fixed",
                value: "2024-11-01T23:59:59Z"
            },
            duration: 604800, // 7天
            timezone: "America/Toronto"
        },

        limits: {
            daily: {
                maxParticipations: 5,
                maxTournaments: 2,
                maxAttempts: 5
            },
            weekly: {
                maxParticipations: 35,
                maxTournaments: 14,
                maxAttempts: 35
            },
            seasonal: {
                maxParticipations: 150,
                maxTournaments: 60,
                maxAttempts: 150
            },
            total: {
                maxParticipations: 1000,
                maxTournaments: 500,
                maxAttempts: 2000
            },
            subscribed: {
                daily: {
                    maxParticipations: 8,
                    maxTournaments: 3,
                    maxAttempts: 8
                },
                weekly: {
                    maxParticipations: 56,
                    maxTournaments: 21,
                    maxAttempts: 56
                },
                seasonal: {
                    maxParticipations: 240,
                    maxTournaments: 90,
                    maxAttempts: 240
                }
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
                channels: ["in_app", "push", "email"]
            },
            monitoring: {
                enabled: true,
                metrics: ["participation", "completion", "rewards", "performance"],
                alerts: ["low_participation", "high_failure", "reward_issues"]
            },
            custom: {
                theme: "halloween",
                specialRules: ["double_rewards", "spooky_effects"],
                eventConfig: {
                    startDate: "2024-10-25",
                    endDate: "2024-11-01"
                }
            }
        }
    },

    // 纸牌精英排位赛
    {
        
        typeId: "ranked_solitaire_elite",
        name: "纸牌精英排位赛",
        description: "基于段位的纸牌精英排位赛，只有高级玩家才能参与",
        category: "ranked",
        gameType: "solitaire",
        isActive: true,
        priority: 3,

        entryRequirements: {
            minSegment: "gold",
            maxSegment: "diamond",
            isSubscribedRequired: false,
            entryFee: {
                coins: 300,
                tickets: {
                    gameType: "solitaire",
                    tournamentType: "ranked_solitaire_elite",
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
                perMatch: 600 // 10分钟
            }
        },

        rewards: {
            baseRewards: {
                coins: 600,
                gamePoints: 300,
                props: [],
                tickets: []
            },
            rankRewards: [
                {
                    rankRange: [1, 1],
                    multiplier: 3.33,
                    bonusProps: [
                        {
                            gameType: "solitaire",
                            propType: "hint",
                            quantity: 15,
                            rarity: "rare"
                        },
                        {
                            gameType: "solitaire",
                            propType: "time_boost",
                            quantity: 5,
                            rarity: "epic"
                        }
                    ]
                },
                {
                    rankRange: [2, 3],
                    multiplier: 2.0,
                    bonusProps: [
                        {
                            gameType: "solitaire",
                            propType: "hint",
                            quantity: 8,
                            rarity: "common"
                        }
                    ]
                },
                {
                    rankRange: [4, 10],
                    multiplier: 1.0
                }
            ],
            segmentBonus: {
                bronze: 1.0,
                silver: 1.1,
                gold: 1.2,
                platinum: 1.3,
                diamond: 1.5
            },
            subscriptionBonus: 1.3,
            participationReward: {
                coins: 30,
                gamePoints: 15
            }
        },

        schedule: {
            startTime: {
                type: "fixed",
                value: "2024-01-01T00:00:00Z"
            },
            endTime: {
                type: "duration",
                value: 2592000 // 30天
            },
            duration: 2592000,
            timezone: "America/Toronto"
        },

        limits: {
            daily: {
                maxParticipations: 3,
                maxTournaments: 1,
                maxAttempts: 3
            },
            weekly: {
                maxParticipations: 21,
                maxTournaments: 7,
                maxAttempts: 21
            },
            seasonal: {
                maxParticipations: 90,
                maxTournaments: 30,
                maxAttempts: 90
            },
            total: {
                maxParticipations: 500,
                maxTournaments: 200,
                maxAttempts: 1000
            },
            subscribed: {
                daily: {
                    maxParticipations: 5,
                    maxTournaments: 2,
                    maxAttempts: 5
                },
                weekly: {
                    maxParticipations: 35,
                    maxTournaments: 14,
                    maxAttempts: 35
                },
                seasonal: {
                    maxParticipations: 150,
                    maxTournaments: 60,
                    maxAttempts: 150
                }
            }
        },

        advanced: {
            matching: {
                algorithm: "skill_based",
                skillRange: 100,
                maxWaitTime: 45,
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
                channels: ["in_app", "push"]
            },
            monitoring: {
                enabled: true,
                metrics: ["participation", "completion", "rewards", "performance"],
                alerts: ["low_participation", "high_failure", "reward_issues"]
            }
        }
    },

    // 拉米休闲赛
    {
        typeId: "casual_rummy_fun",
        name: "拉米休闲赛",
        description: "轻松愉快的拉米休闲赛，适合所有玩家参与",
        category: "casual",
        gameType: "rummy",
        isActive: true,
        priority: 5,

        entryRequirements: {
            minSegment: "bronze",
            isSubscribedRequired: false,
            entryFee: {
                coins: 25,
                tickets: {
                    gameType: "rummy",
                    tournamentType: "casual_rummy_fun",
                    quantity: 1
                }
            }
        },

        matchRules: {
            matchType: "multi_match",
            minPlayers: 2,
            maxPlayers: 4,
            isSingleMatch: false,
            maxAttempts: 10,
            allowMultipleAttempts: true,
            rankingMethod: "total_score",
            timeLimit: {
                perMatch: 720, // 12分钟
                perTurn: 45    // 45秒
            }
        },

        rewards: {
            baseRewards: {
                coins: 50,
                gamePoints: 25,
                props: [],
                tickets: []
            },
            rankRewards: [
                {
                    rankRange: [1, 1],
                    multiplier: 3.0,
                    bonusProps: [
                        {
                            gameType: "rummy",
                            propType: "wild_card",
                            quantity: 2,
                            rarity: "common"
                        }
                    ]
                },
                {
                    rankRange: [2, 5],
                    multiplier: 2.0
                },
                {
                    rankRange: [6, 15],
                    multiplier: 1.0
                }
            ],
            segmentBonus: {
                bronze: 1.0,
                silver: 1.05,
                gold: 1.1,
                platinum: 1.15,
                diamond: 1.2
            },
            subscriptionBonus: 1.1,
            participationReward: {
                coins: 5,
                gamePoints: 3
            }
        },

        schedule: {
            startTime: {
                type: "fixed",
                value: "2024-01-01T00:00:00Z"
            },
            endTime: {
                type: "duration",
                value: 604800 // 7天
            },
            duration: 604800,
            timezone: "America/Toronto"
        },

        limits: {
            daily: {
                maxParticipations: 15,
                maxTournaments: 8,
                maxAttempts: 15
            },
            weekly: {
                maxParticipations: 105,
                maxTournaments: 56,
                maxAttempts: 105
            },
            seasonal: {
                maxParticipations: 450,
                maxTournaments: 240,
                maxAttempts: 450
            },
            total: {
                maxParticipations: 2000,
                maxTournaments: 1000,
                maxAttempts: 5000
            },
            subscribed: {
                daily: {
                    maxParticipations: 20,
                    maxTournaments: 12,
                    maxAttempts: 20
                },
                weekly: {
                    maxParticipations: 140,
                    maxTournaments: 84,
                    maxAttempts: 140
                },
                seasonal: {
                    maxParticipations: 600,
                    maxTournaments: 360,
                    maxAttempts: 600
                }
            }
        },

        advanced: {
            matching: {
                algorithm: "random",
                maxWaitTime: 30,
                fallbackToAI: true
            },
            settlement: {
                autoSettle: true,
                settleDelay: 300,
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
                alerts: ["low_participation"]
            }
        }
    },

    // 终极冠军赛
    {
        typeId: "championship_ultimate_showdown",
        name: "终极冠军赛",
        description: "年度终极冠军锦标赛，最高荣誉和奖励",
        category: "championship",
        gameType: "solitaire",
        isActive: true,
        priority: 1,

        entryRequirements: {
            minSegment: "platinum",
            isSubscribedRequired: true,
            entryFee: {
                coins: 1000,
                tickets: {
                    gameType: "solitaire",
                    tournamentType: "championship_ultimate_showdown",
                    quantity: 1
                }
            }
        },

        matchRules: {
            matchType: "multi_match",
            minPlayers: 2,
            maxPlayers: 8,
            isSingleMatch: false,
            maxAttempts: 15,
            allowMultipleAttempts: true,
            rankingMethod: "total_score",
            timeLimit: {
                perMatch: 1200, // 20分钟
                perTurn: 90     // 90秒
            }
        },

        rewards: {
            baseRewards: {
                coins: 2000,
                gamePoints: 1000,
                props: [],
                tickets: []
            },
            rankRewards: [
                {
                    rankRange: [1, 1],
                    multiplier: 5.0,
                    bonusProps: [
                        {
                            gameType: "solitaire",
                            propType: "hint",
                            quantity: 50,
                            rarity: "legendary"
                        },
                        {
                            gameType: "solitaire",
                            propType: "time_boost",
                            quantity: 20,
                            rarity: "epic"
                        },
                        {
                            gameType: "solitaire",
                            propType: "undo",
                            quantity: 15,
                            rarity: "rare"
                        }
                    ]
                },
                {
                    rankRange: [2, 3],
                    multiplier: 2.5,
                    bonusProps: [
                        {
                            gameType: "solitaire",
                            propType: "hint",
                            quantity: 25,
                            rarity: "epic"
                        },
                        {
                            gameType: "solitaire",
                            propType: "time_boost",
                            quantity: 10,
                            rarity: "rare"
                        }
                    ]
                },
                {
                    rankRange: [4, 10],
                    multiplier: 1.0
                }
            ],
            segmentBonus: {
                bronze: 1.0,
                silver: 1.1,
                gold: 1.2,
                platinum: 1.3,
                diamond: 1.5
            },
            subscriptionBonus: 1.5,
            participationReward: {
                coins: 100,
                gamePoints: 50
            }
        },

        schedule: {
            startTime: {
                type: "fixed",
                value: "2024-01-01T00:00:00Z"
            },
            endTime: {
                type: "duration",
                value: 15552000 // 180天
            },
            duration: 15552000,
            timezone: "America/Toronto"
        },

        limits: {
            daily: {
                maxParticipations: 2,
                maxTournaments: 1,
                maxAttempts: 2
            },
            weekly: {
                maxParticipations: 14,
                maxTournaments: 7,
                maxAttempts: 14
            },
            seasonal: {
                maxParticipations: 60,
                maxTournaments: 30,
                maxAttempts: 60
            },
            total: {
                maxParticipations: 200,
                maxTournaments: 100,
                maxAttempts: 500
            },
            subscribed: {
                daily: {
                    maxParticipations: 3,
                    maxTournaments: 2,
                    maxAttempts: 3
                },
                weekly: {
                    maxParticipations: 21,
                    maxTournaments: 14,
                    maxAttempts: 21
                },
                seasonal: {
                    maxParticipations: 90,
                    maxTournaments: 60,
                    maxAttempts: 90
                }
            }
        },

        advanced: {
            matching: {
                algorithm: "skill_based",
                skillRange: 50,
                maxWaitTime: 120,
                fallbackToAI: false
            },
            settlement: {
                autoSettle: true,
                settleDelay: 3600,
                requireMinimumPlayers: true,
                minimumPlayers: 2
            },
            notifications: {
                enabled: true,
                types: ["join", "start", "complete", "reward", "reminder"],
                channels: ["in_app", "push", "email"]
            },
            monitoring: {
                enabled: true,
                metrics: ["participation", "completion", "rewards", "performance"],
                alerts: ["low_participation", "high_failure", "reward_issues"]
            }
        }
    },

    // 标准锦标赛
    {
        typeId: "tournament_standard_battle",
        name: "标准锦标赛",
        description: "标准的多游戏类型锦标赛，平衡的奖励和挑战",
        category: "tournament",
        gameType: "solitaire",
        isActive: true,
        priority: 5,

        entryRequirements: {
            minSegment: "bronze",
            isSubscribedRequired: false,
            entryFee: {
                coins: 75,
                tickets: {
                    gameType: "solitaire",
                    tournamentType: "tournament_standard_battle",
                    quantity: 1
                }
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
                perMatch: 540 // 9分钟
            }
        },

        rewards: {
            baseRewards: {
                coins: 150,
                gamePoints: 75,
                props: [],
                tickets: []
            },
            rankRewards: [
                {
                    rankRange: [1, 1],
                    multiplier: 2.67,
                    bonusProps: [
                        {
                            gameType: "solitaire",
                            propType: "hint",
                            quantity: 5,
                            rarity: "common"
                        }
                    ]
                },
                {
                    rankRange: [2, 3],
                    multiplier: 1.67,
                    bonusProps: [
                        {
                            gameType: "solitaire",
                            propType: "hint",
                            quantity: 3,
                            rarity: "common"
                        }
                    ]
                },
                {
                    rankRange: [4, 10],
                    multiplier: 1.0
                }
            ],
            segmentBonus: {
                bronze: 1.0,
                silver: 1.05,
                gold: 1.1,
                platinum: 1.15,
                diamond: 1.2
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
                value: "2024-01-01T00:00:00Z"
            },
            endTime: {
                type: "duration",
                value: 1728000 // 20天
            },
            duration: 1728000,
            timezone: "America/Toronto"
        },

        limits: {
            daily: {
                maxParticipations: 8,
                maxTournaments: 4,
                maxAttempts: 8
            },
            weekly: {
                maxParticipations: 56,
                maxTournaments: 28,
                maxAttempts: 56
            },
            seasonal: {
                maxParticipations: 240,
                maxTournaments: 120,
                maxAttempts: 240
            },
            total: {
                maxParticipations: 1000,
                maxTournaments: 500,
                maxAttempts: 2000
            },
            subscribed: {
                daily: {
                    maxParticipations: 12,
                    maxTournaments: 6,
                    maxAttempts: 12
                },
                weekly: {
                    maxParticipations: 84,
                    maxTournaments: 42,
                    maxAttempts: 84
                },
                seasonal: {
                    maxParticipations: 360,
                    maxTournaments: 180,
                    maxAttempts: 360
                }
            }
        },

        advanced: {
            matching: {
                algorithm: "skill_based",
                skillRange: 150,
                maxWaitTime: 45,
                fallbackToAI: true
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
                channels: ["in_app", "push"]
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
 * 按分类获取锦标赛配置
 */
export function getTournamentConfigsByCategory(category: TournamentCategory): TournamentConfig[] {
    return TOURNAMENT_CONFIGS.filter(config => config.category === category && config.isActive);
}

/**
 * 验证锦标赛配置
 */
export function validateTournamentConfig(config: TournamentConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 基础验证
    if (!config.typeId) errors.push("typeId is required");
    if (!config.name) errors.push("name is required");
    if (!config.gameType) errors.push("gameType is required");

    // 参赛条件验证
    if (config.entryRequirements.minSegment && config.entryRequirements.maxSegment) {
        const segments = ["bronze", "silver", "gold", "platinum", "diamond"];
        const minIndex = segments.indexOf(config.entryRequirements.minSegment);
        const maxIndex = segments.indexOf(config.entryRequirements.maxSegment);
        if (minIndex > maxIndex) {
            errors.push("minSegment cannot be higher than maxSegment");
        }
    }

    // 比赛规则验证
    if (config.matchRules.minPlayers > config.matchRules.maxPlayers) {
        errors.push("minPlayers cannot be greater than maxPlayers");
    }

    if (config.matchRules.minPlayers < 1) {
        errors.push("minPlayers must be at least 1");
    }

    // 时间配置验证
    if (config.schedule.duration <= 0) {
        errors.push("duration must be positive");
    }

    // 限制配置验证
    if (config.limits.daily.maxParticipations < 1) {
        errors.push("daily maxParticipations must be at least 1");
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
    gameType: GameType,
    category: TournamentCategory
): TournamentConfig {
    return {
        typeId,
        name,
        description: `${name} - 默认配置`,
        category,
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
            daily: {
                maxParticipations: 3,
                maxTournaments: 1,
                maxAttempts: 3
            },
            weekly: {
                maxParticipations: 21,
                maxTournaments: 7,
                maxAttempts: 21
            },
            seasonal: {
                maxParticipations: 90,
                maxTournaments: 30,
                maxAttempts: 90
            },
            total: {
                maxParticipations: 1000,
                maxTournaments: 500,
                maxAttempts: 3000
            },
            subscribed: {
                daily: {
                    maxParticipations: 5,
                    maxTournaments: 2,
                    maxAttempts: 5
                },
                weekly: {
                    maxParticipations: 35,
                    maxTournaments: 14,
                    maxAttempts: 35
                },
                seasonal: {
                    maxParticipations: 150,
                    maxTournaments: 60,
                    maxAttempts: 150
                }
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