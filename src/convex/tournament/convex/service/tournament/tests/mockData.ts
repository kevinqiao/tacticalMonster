/**
 * 锦标赛系统测试数据
 * 提供所有测试用例需要的模拟数据
 */

import { getTorontoDate } from "../../utils";

// ==================== 玩家数据 ====================

export const TEST_PLAYERS = [
    {
        _id: "player1_id" as any,
        _creationTime: Date.now(),
        uid: "player1",
        displayName: "Player One",
        segmentName: "gold",
        isSubscribed: true,
        totalPoints: 1500,
        eloScore: 1500,
        level: 15,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        lastActive: "2024-01-01T00:00:00Z"
    },
    {
        _id: "player2_id" as any,
        _creationTime: Date.now(),
        uid: "player2",
        displayName: "Player Two",
        segmentName: "silver",
        isSubscribed: false,
        totalPoints: 800,
        eloScore: 800,
        level: 8,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        lastActive: "2024-01-01T00:00:00Z"
    },
    {
        _id: "player3_id" as any,
        _creationTime: Date.now(),
        uid: "player3",
        displayName: "Player Three",
        segmentName: "bronze",
        isSubscribed: false,
        totalPoints: 300,
        eloScore: 300,
        level: 3,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        lastActive: "2024-01-01T00:00:00Z"
    },
    {
        _id: "player4_id" as any,
        _creationTime: Date.now(),
        uid: "player4",
        displayName: "Player Four",
        segmentName: "platinum",
        isSubscribed: true,
        totalPoints: 2500,
        eloScore: 2500,
        level: 25,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        lastActive: "2024-01-01T00:00:00Z"
    }
];

// ==================== 赛季数据 ====================

export const TEST_SEASONS = [
    {
        _id: "season1_id" as any,
        _creationTime: Date.now(),
        name: "Test Season 2024",
        startDate: "2024-01-01T00:00:00Z",
        endDate: "2024-12-31T23:59:59Z",
        isActive: true,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z"
    },
    {
        _id: "season2_id" as any,
        _creationTime: Date.now(),
        name: "Previous Season 2023",
        startDate: "2023-01-01T00:00:00Z",
        endDate: "2023-12-31T23:59:59Z",
        isActive: false,
        createdAt: "2023-01-01T00:00:00Z",
        updatedAt: "2023-12-31T23:59:59Z"
    }
];

// ==================== 库存数据 ====================

export const TEST_INVENTORIES = [
    {
        _id: "inventory1_id" as any,
        uid: "player1",
        coins: 1000,
        tickets: [
            { gameType: "solitaire", tournamentType: "daily_special", quantity: 5 },
            { gameType: "rummy", tournamentType: "multi_player_tournament", quantity: 3 }
        ],
        props: [
            { gameType: "solitaire", propType: "hint", quantity: 10 },
            { gameType: "solitaire", propType: "undo", quantity: 5 },
            { gameType: "rummy", propType: "wild_card", quantity: 2 }
        ],
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z"
    },
    {
        _id: "inventory2_id" as any,
        uid: "player2",
        coins: 500,
        tickets: [
            { gameType: "solitaire", tournamentType: "daily_special", quantity: 2 }
        ],
        props: [
            { gameType: "solitaire", propType: "hint", quantity: 3 }
        ],
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z"
    },
    {
        _id: "inventory3_id" as any,
        uid: "player3",
        coins: 100,
        tickets: [],
        props: [],
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z"
    },
    {
        _id: "inventory4_id" as any,
        uid: "player4",
        coins: 2000,
        tickets: [
            { gameType: "solitaire", tournamentType: "daily_special", quantity: 10 },
            { gameType: "rummy", tournamentType: "multi_player_tournament", quantity: 8 },
            { gameType: "ludo", tournamentType: "championship", quantity: 5 }
        ],
        props: [
            { gameType: "solitaire", propType: "hint", quantity: 20 },
            { gameType: "solitaire", propType: "undo", quantity: 15 },
            { gameType: "rummy", propType: "wild_card", quantity: 10 },
            { gameType: "ludo", propType: "dice_boost", quantity: 8 }
        ],
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z"
    }
];

// ==================== 锦标赛配置数据 ====================

export const TEST_TOURNAMENT_CONFIGS = {
    daily_special: {
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
            maxAttempts: 3,
            allowMultipleAttempts: true,
            rankingMethod: "highest_score",
            timeLimit: {
                perMatch: 300,
                total: 900
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
            }
        }
    },

    single_player_tournament: {
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
                perMatch: 600
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
            }
        }
    },

    multi_player_tournament: {
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
                perMatch: 600,
                perTurn: 30
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
            }
        }
    },

    independent_tournament: {
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
                perMatch: 480
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
            }
        }
    }
};

// ==================== 比赛数据 ====================

export const TEST_MATCHES = [
    {
        _id: "match1_id" as any,
        tournamentId: "tournament1",
        gameType: "solitaire",
        matchType: "single_match",
        status: "in_progress",
        maxPlayers: 1,
        minPlayers: 1,
        startTime: getTorontoDate().iso,
        endTime: undefined,
        gameData: {
            player: {
                uid: "player1",
                segmentName: "gold",
                eloScore: 1500
            }
        },
        createdAt: getTorontoDate().iso,
        updatedAt: getTorontoDate().iso
    },
    {
        _id: "match2_id" as any,
        tournamentId: "tournament2",
        gameType: "rummy",
        matchType: "multi_match",
        status: "pending",
        maxPlayers: 4,
        minPlayers: 2,
        startTime: undefined,
        endTime: undefined,
        gameData: {
            matchType: "skill_based",
            createdAt: getTorontoDate().iso
        },
        createdAt: getTorontoDate().iso,
        updatedAt: getTorontoDate().iso
    }
];

// ==================== 玩家比赛数据 ====================

export const TEST_PLAYER_MATCHES = [
    {
        _id: "playerMatch1_id" as any,
        matchId: "match1",
        tournamentId: "tournament1",
        uid: "player1",
        gameType: "solitaire",
        score: 1000,
        rank: 1,
        completed: true,
        attemptNumber: 1,
        propsUsed: ["hint"],
        playerGameData: {
            moves: 50,
            time: 300,
            hints: 2
        },
        joinTime: getTorontoDate().iso,
        leaveTime: getTorontoDate().iso,
        createdAt: getTorontoDate().iso,
        updatedAt: getTorontoDate().iso
    },
    {
        _id: "playerMatch2_id" as any,
        matchId: "match2",
        tournamentId: "tournament2",
        uid: "player2",
        gameType: "rummy",
        score: 0,
        rank: undefined,
        completed: false,
        attemptNumber: 1,
        propsUsed: [],
        playerGameData: {},
        joinTime: getTorontoDate().iso,
        leaveTime: undefined,
        createdAt: getTorontoDate().iso,
        updatedAt: getTorontoDate().iso
    }
];

// ==================== 锦标赛数据 ====================

export const TEST_TOURNAMENTS = [
    {
        _id: "tournament1_id" as any,
        seasonId: "season1",
        gameType: "solitaire",
        segmentName: "gold",
        status: "open",
        playerUids: ["player1"],
        tournamentType: "single_player_tournament",
        isSubscribedRequired: false,
        isSingleMatch: true,
        prizePool: 0,
        config: TEST_TOURNAMENT_CONFIGS.single_player_tournament,
        createdAt: getTorontoDate().iso,
        updatedAt: getTorontoDate().iso,
        endTime: new Date(getTorontoDate().localDate.getTime() + 24 * 60 * 60 * 1000).toISOString()
    },
    {
        _id: "tournament2_id" as any,
        seasonId: "season1",
        gameType: "rummy",
        segmentName: "silver",
        status: "open",
        playerUids: ["player2", "player3"],
        tournamentType: "multi_player_tournament",
        isSubscribedRequired: false,
        isSingleMatch: false,
        prizePool: 200,
        config: TEST_TOURNAMENT_CONFIGS.multi_player_tournament,
        createdAt: getTorontoDate().iso,
        updatedAt: getTorontoDate().iso,
        endTime: new Date(getTorontoDate().localDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
    }
];

// ==================== 限制数据 ====================

export const TEST_LIMITS = [
    {
        _id: "limit1_id" as any,
        uid: "player1",
        gameType: "solitaire",
        tournamentType: "daily_special",
        date: getTorontoDate().localDate.toISOString().split("T")[0],
        participationCount: 1,
        tournamentCount: 1,
        submissionCount: 1,
        createdAt: getTorontoDate().iso,
        updatedAt: getTorontoDate().iso
    },
    {
        _id: "limit2_id" as any,
        uid: "player2",
        gameType: "rummy",
        tournamentType: "multi_player_tournament",
        date: getTorontoDate().localDate.toISOString().split("T")[0],
        participationCount: 2,
        tournamentCount: 1,
        submissionCount: 2,
        createdAt: getTorontoDate().iso,
        updatedAt: getTorontoDate().iso
    }
];

// ==================== 事件数据 ====================

export const TEST_EVENTS = [
    {
        _id: "event1_id" as any,
        matchId: "match1",
        tournamentId: "tournament1",
        uid: "player1",
        eventType: "player_join",
        eventData: {
            playerCount: 1
        },
        timestamp: getTorontoDate().iso,
        createdAt: getTorontoDate().iso
    },
    {
        _id: "event2_id" as any,
        matchId: "match1",
        tournamentId: "tournament1",
        uid: "player1",
        eventType: "score_submit",
        eventData: {
            score: 1000,
            propsUsed: ["hint"],
            attemptNumber: 1
        },
        timestamp: getTorontoDate().iso,
        createdAt: getTorontoDate().iso
    }
];

// ==================== 工具函数 ====================

export function getTestPlayer(uid: string) {
    return TEST_PLAYERS.find(p => p.uid === uid);
}

export function getTestInventory(uid: string) {
    return TEST_INVENTORIES.find(i => i.uid === uid);
}

export function getTestTournamentConfig(typeId: string) {
    return TEST_TOURNAMENT_CONFIGS[typeId as keyof typeof TEST_TOURNAMENT_CONFIGS];
}

export function getTestSeason(seasonId: string) {
    return TEST_SEASONS.find(s => s._id === seasonId);
}

export function createTestMatch(matchData: Partial<typeof TEST_MATCHES[0]>) {
    return {
        _id: `match_${Date.now()}_id` as any,
        tournamentId: "tournament1",
        gameType: "solitaire",
        matchType: "single_match",
        status: "pending",
        maxPlayers: 1,
        minPlayers: 1,
        startTime: undefined,
        endTime: undefined,
        gameData: {},
        createdAt: getTorontoDate().iso,
        updatedAt: getTorontoDate().iso,
        ...matchData
    };
}

export function createTestPlayerMatch(playerMatchData: Partial<typeof TEST_PLAYER_MATCHES[0]>) {
    return {
        _id: `playerMatch_${Date.now()}_id` as any,
        matchId: "match1",
        tournamentId: "tournament1",
        uid: "player1",
        gameType: "solitaire",
        score: 0,
        rank: undefined,
        completed: false,
        attemptNumber: 1,
        propsUsed: [],
        playerGameData: {},
        joinTime: getTorontoDate().iso,
        leaveTime: undefined,
        createdAt: getTorontoDate().iso,
        updatedAt: getTorontoDate().iso,
        ...playerMatchData
    };
} 