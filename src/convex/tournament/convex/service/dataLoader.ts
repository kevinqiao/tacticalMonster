import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { getTorontoDate } from "./utils";

// 加载锦标赛类型数据到数据库
export const loadTournamentTypes = mutation({
    args: {},
    handler: async (ctx) => {
        const now = getTorontoDate();

        // 锦标赛类型数据
        const tournamentTypes = [
            {
                id: "daily_special",
                name: "每日特殊赛",
                description: "每日限时特殊锦标赛，单局模式，立即结算",
                gameType: "solitaire",
                entryFee: {
                    coins: 50,
                    ticket: {
                        gameType: "solitaire",
                        tournamentType: "daily_special",
                        quantity: 1
                    }
                },
                maxParticipations: 3,
                duration: 24,
                rules: {
                    ranking: "threshold",
                    scoreThreshold: 1000,
                    maxAttempts: 1
                },
                rewards: [
                    {
                        rankRange: [1, 1],
                        coins: 200,
                        gamePoints: 100,
                        props: [
                            {
                                gameType: "solitaire",
                                propType: "hint",
                                quantity: 2
                            }
                        ],
                        tickets: [
                            {
                                gameType: "solitaire",
                                tournamentType: "weekly_championship",
                                quantity: 1
                            }
                        ]
                    },
                    {
                        rankRange: [2, 999],
                        coins: 50,
                        gamePoints: 25,
                        props: [],
                        tickets: []
                    }
                ],
                subscriberBonus: {
                    coins: 1.2,
                    gamePoints: 1.5
                },
                share: {
                    probability: 0.3,
                    rankRange: [1, 1]
                },
                isActive: true
            },
            {
                id: "weekly_championship",
                name: "周冠军赛",
                description: "每周举行的多尝试排名锦标赛",
                gameType: "solitaire",
                entryFee: {
                    coins: 100,
                    ticket: {
                        gameType: "solitaire",
                        tournamentType: "weekly_championship",
                        quantity: 1
                    }
                },
                maxParticipations: 10,
                duration: 168,
                rules: {
                    ranking: "highest_score",
                    maxAttempts: 5
                },
                rewards: [
                    {
                        rankRange: [1, 1],
                        coins: 1000,
                        gamePoints: 500,
                        props: [
                            {
                                gameType: "solitaire",
                                propType: "hint",
                                quantity: 5
                            },
                            {
                                gameType: "solitaire",
                                propType: "undo",
                                quantity: 3
                            }
                        ],
                        tickets: [
                            {
                                gameType: "solitaire",
                                tournamentType: "monthly_grand",
                                quantity: 2
                            }
                        ]
                    },
                    {
                        rankRange: [2, 3],
                        coins: 500,
                        gamePoints: 250,
                        props: [
                            {
                                gameType: "solitaire",
                                propType: "hint",
                                quantity: 2
                            }
                        ],
                        tickets: [
                            {
                                gameType: "solitaire",
                                tournamentType: "monthly_grand",
                                quantity: 1
                            }
                        ]
                    },
                    {
                        rankRange: [4, 10],
                        coins: 200,
                        gamePoints: 100,
                        props: [],
                        tickets: []
                    },
                    {
                        rankRange: [11, 50],
                        coins: 50,
                        gamePoints: 25,
                        props: [],
                        tickets: []
                    }
                ],
                subscriberBonus: {
                    coins: 1.3,
                    gamePoints: 1.6
                },
                share: {
                    probability: 0.5,
                    rankRange: [1, 3]
                },
                isActive: true
            },
            {
                id: "monthly_grand",
                name: "月度大奖赛",
                description: "每月举行的顶级锦标赛，丰厚奖励",
                gameType: "solitaire",
                entryFee: {
                    coins: 200,
                    ticket: {
                        gameType: "solitaire",
                        tournamentType: "monthly_grand",
                        quantity: 1
                    }
                },
                maxParticipations: 20,
                duration: 720,
                rules: {
                    ranking: "highest_score",
                    maxAttempts: 10
                },
                rewards: [
                    {
                        rankRange: [1, 1],
                        coins: 5000,
                        gamePoints: 2000,
                        props: [
                            {
                                gameType: "solitaire",
                                propType: "hint",
                                quantity: 10
                            },
                            {
                                gameType: "solitaire",
                                propType: "undo",
                                quantity: 5
                            },
                            {
                                gameType: "solitaire",
                                propType: "shuffle",
                                quantity: 3
                            }
                        ],
                        tickets: [
                            {
                                gameType: "solitaire",
                                tournamentType: "season_final",
                                quantity: 3
                            }
                        ]
                    },
                    {
                        rankRange: [2, 5],
                        coins: 2000,
                        gamePoints: 1000,
                        props: [
                            {
                                gameType: "solitaire",
                                propType: "hint",
                                quantity: 5
                            },
                            {
                                gameType: "solitaire",
                                propType: "undo",
                                quantity: 2
                            }
                        ],
                        tickets: [
                            {
                                gameType: "solitaire",
                                tournamentType: "season_final",
                                quantity: 1
                            }
                        ]
                    },
                    {
                        rankRange: [6, 20],
                        coins: 500,
                        gamePoints: 250,
                        props: [
                            {
                                gameType: "solitaire",
                                propType: "hint",
                                quantity: 2
                            }
                        ],
                        tickets: []
                    }
                ],
                subscriberBonus: {
                    coins: 1.4,
                    gamePoints: 1.7
                },
                share: {
                    probability: 0.7,
                    rankRange: [1, 5]
                },
                isActive: true
            },
            {
                id: "quick_match",
                name: "快速匹配赛",
                description: "快速进行的单局锦标赛，低门槛高回报",
                gameType: "solitaire",
                entryFee: {
                    coins: 10,
                    ticket: null
                },
                maxParticipations: 5,
                duration: 2,
                rules: {
                    ranking: "threshold",
                    scoreThreshold: 500,
                    maxAttempts: 1
                },
                rewards: [
                    {
                        rankRange: [1, 1],
                        coins: 50,
                        gamePoints: 25,
                        props: [
                            {
                                gameType: "solitaire",
                                propType: "hint",
                                quantity: 1
                            }
                        ],
                        tickets: []
                    },
                    {
                        rankRange: [2, 999],
                        coins: 10,
                        gamePoints: 5,
                        props: [],
                        tickets: []
                    }
                ],
                subscriberBonus: {
                    coins: 1.1,
                    gamePoints: 1.2
                },
                share: {
                    probability: 0.2,
                    rankRange: [1, 1]
                },
                isActive: true
            },
            {
                id: "ludo_daily",
                name: "飞行棋每日赛",
                description: "飞行棋每日锦标赛",
                gameType: "ludo",
                entryFee: {
                    coins: 30,
                    ticket: {
                        gameType: "ludo",
                        tournamentType: "ludo_daily",
                        quantity: 1
                    }
                },
                maxParticipations: 2,
                duration: 24,
                rules: {
                    ranking: "highest_score",
                    maxAttempts: 3
                },
                rewards: [
                    {
                        rankRange: [1, 1],
                        coins: 150,
                        gamePoints: 75,
                        props: [
                            {
                                gameType: "ludo",
                                propType: "dice_boost",
                                quantity: 2
                            }
                        ],
                        tickets: [
                            {
                                gameType: "ludo",
                                tournamentType: "ludo_weekly",
                                quantity: 1
                            }
                        ]
                    },
                    {
                        rankRange: [2, 999],
                        coins: 30,
                        gamePoints: 15,
                        props: [],
                        tickets: []
                    }
                ],
                subscriberBonus: {
                    coins: 1.2,
                    gamePoints: 1.3
                },
                share: {
                    probability: 0.3,
                    rankRange: [1, 1]
                },
                isActive: true
            }
        ];

        let loadedCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;

        for (const tournamentType of tournamentTypes) {
            try {
                // 检查是否已存在
                const existing = await ctx.db
                    .query("tournament_types")
                    .withIndex("by_typeId", (q) => q.eq("typeId", tournamentType.id))
                    .first();

                if (existing) {
                    // 更新现有记录
                    await ctx.db.patch(existing._id, {
                        ...tournamentType,
                        updatedAt: now.iso
                    });
                    updatedCount++;
                    console.log(`更新锦标赛类型: ${tournamentType.name}`);
                } else {
                    // 创建新记录
                    await ctx.db.insert("tournament_types", {
                        typeId: tournamentType.id,
                        name: tournamentType.name,
                        description: tournamentType.description,
                        handlerModule: `tournament_${tournamentType.id}`,
                        defaultConfig: {
                            gameType: tournamentType.gameType,
                            entryFee: tournamentType.entryFee,
                            maxParticipations: tournamentType.maxParticipations,
                            duration: tournamentType.duration,
                            rules: tournamentType.rules,
                            rewards: tournamentType.rewards,
                            subscriberBonus: tournamentType.subscriberBonus,
                            share: tournamentType.share,
                            isActive: tournamentType.isActive
                        },
                        createdAt: now.iso,
                        updatedAt: now.iso
                    });
                    loadedCount++;
                    console.log(`加载锦标赛类型: ${tournamentType.name}`);
                }
            } catch (error) {
                console.error(`加载锦标赛类型 ${tournamentType.name} 时出错:`, error);
                skippedCount++;
            }
        }

        return {
            success: true,
            loaded: loadedCount,
            updated: updatedCount,
            skipped: skippedCount,
            total: tournamentTypes.length
        };
    }
});

// 清空锦标赛类型数据
export const clearTournamentTypes = mutation({
    args: {},
    handler: async (ctx) => {
        const tournamentTypes = await ctx.db
            .query("tournament_types")
            .collect();

        let deletedCount = 0;
        for (const tournamentType of tournamentTypes) {
            try {
                await ctx.db.delete(tournamentType._id);
                deletedCount++;
                console.log(`删除锦标赛类型: ${tournamentType.name}`);
            } catch (error) {
                console.error(`删除锦标赛类型 ${tournamentType.name} 时出错:`, error);
            }
        }

        return {
            success: true,
            deleted: deletedCount,
            total: tournamentTypes.length
        };
    }
});

// 获取所有锦标赛类型
export const getAllTournamentTypes = mutation({
    args: {},
    handler: async (ctx) => {
        const tournamentTypes = await ctx.db
            .query("tournament_types")
            .order("asc")
            .collect();

        return {
            success: true,
            tournamentTypes: tournamentTypes.map(tt => ({
                typeId: tt.typeId,
                name: tt.name,
                description: tt.description,
                gameType: tt.defaultConfig.gameType,
                isActive: tt.defaultConfig.isActive,
                createdAt: tt.createdAt,
                updatedAt: tt.updatedAt
            }))
        };
    }
});

// 根据ID获取锦标赛类型
export const getTournamentTypeById = mutation({
    args: { id: v.string() },
    handler: async (ctx, args) => {
        const tournamentType = await ctx.db
            .query("tournament_types")
            .withIndex("by_typeId", (q) => q.eq("typeId", args.id))
            .first();

        if (!tournamentType) {
            throw new Error(`锦标赛类型 ${args.id} 不存在`);
        }

        return {
            success: true,
            tournamentType: {
                ...tournamentType,
                id: tournamentType.typeId,
                ...tournamentType.defaultConfig
            }
        };
    }
});

// 根据游戏类型获取锦标赛类型
export const getTournamentTypesByGameType = mutation({
    args: { gameType: v.string() },
    handler: async (ctx, args) => {
        const tournamentTypes = await ctx.db
            .query("tournament_types")
            .filter((q) => q.eq(q.field("defaultConfig.gameType"), args.gameType))
            .filter((q) => q.eq(q.field("defaultConfig.isActive"), true))
            .order("asc")
            .collect();

        return {
            success: true,
            tournamentTypes: tournamentTypes.map(tt => ({
                id: tt.typeId,
                name: tt.name,
                description: tt.description,
                gameType: tt.defaultConfig.gameType,
                entryFee: tt.defaultConfig.entryFee,
                maxParticipations: tt.defaultConfig.maxParticipations,
                duration: tt.defaultConfig.duration,
                rules: tt.defaultConfig.rules,
                rewards: tt.defaultConfig.rewards,
                subscriberBonus: tt.defaultConfig.subscriberBonus,
                share: tt.defaultConfig.share,
                isActive: tt.defaultConfig.isActive
            }))
        };
    }
});

// 更新锦标赛类型状态
export const updateTournamentTypeStatus = mutation({
    args: {
        id: v.string(),
        isActive: v.boolean()
    },
    handler: async (ctx, args) => {
        const tournamentType = await ctx.db
            .query("tournament_types")
            .withIndex("by_typeId", (q) => q.eq("typeId", args.id))
            .first();

        if (!tournamentType) {
            throw new Error(`锦标赛类型 ${args.id} 不存在`);
        }

        await ctx.db.patch(tournamentType._id, {
            defaultConfig: {
                ...tournamentType.defaultConfig,
                isActive: args.isActive
            },
            updatedAt: getTorontoDate().iso
        });

        return {
            success: true,
            message: `锦标赛类型 ${tournamentType.name} 状态已更新为 ${args.isActive ? '激活' : '停用'}`
        };
    }
}); 