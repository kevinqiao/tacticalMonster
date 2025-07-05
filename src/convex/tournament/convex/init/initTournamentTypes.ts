import { mutation } from "../_generated/server";
import { getTorontoDate } from "../service/utils";

/**
 * 初始化锦标赛类型
 * 将预定义的锦标赛类型配置添加到数据库中
 */
export const initTournamentTypes = mutation({
    args: {},
    handler: async (ctx, args) => {
        const now = getTorontoDate();
        const createdTypes = [];

        // 检查是否已经存在锦标赛类型
        const existingTypes = await ctx.db.query("tournament_types").collect();
        const existingTypeIds = new Set(existingTypes.map(t => t.typeId));

        // 定义要创建的锦标赛类型
        const tournamentTypes = [
            {
                typeId: "daily_special",
                name: "每日特殊锦标赛",
                description: "每日限时特殊锦标赛，提供丰厚奖励",
                category: "daily",
                gameType: "solitaire",
                isActive: true,
                priority: 1,
                defaultConfig: {
                    entryFee: {
                        coins: 50,
                        tickets: {
                            gameType: "solitaire",
                            tournamentType: "daily_special",
                            quantity: 1
                        }
                    },
                    rules: {
                        maxAttempts: 3,
                        isSingleMatch: true,
                        rankingMethod: "highest_score"
                    },
                    duration: 86400, // 24小时
                    isSubscribedRequired: false
                }
            },
            {
                typeId: "single_player_threshold_tournament",
                name: "单人阈值锦标赛",
                description: "达到目标分数即可获胜，挑战你的极限",
                category: "casual",
                gameType: "solitaire",
                isActive: true,
                priority: 2,
                defaultConfig: {
                    entryFee: {
                        coins: 30
                    },
                    rules: {
                        maxAttempts: 3,
                        isSingleMatch: true,
                        rankingMethod: "threshold",
                        scoreThreshold: 1000
                    },
                    duration: 86400, // 24小时
                    isSubscribedRequired: false
                }
            },
            {
                typeId: "multi_player_single_match_tournament",
                name: "多人单场比赛锦标赛",
                description: "多个玩家各自进行单场比赛，最多3次尝试",
                category: "tournament",
                gameType: "solitaire",
                isActive: true,
                priority: 3,
                defaultConfig: {
                    entryFee: {
                        coins: 40
                    },
                    rules: {
                        maxAttempts: 3,
                        isSingleMatch: true,
                        rankingMethod: "highest_score"
                    },
                    duration: 86400, // 24小时
                    isSubscribedRequired: false
                }
            }
        ];

        // 创建不存在的锦标赛类型
        for (const tournamentType of tournamentTypes) {
            if (!existingTypeIds.has(tournamentType.typeId)) {
                const typeId = await ctx.db.insert("tournament_types", {
                    typeId: tournamentType.typeId,
                    name: tournamentType.name,
                    description: tournamentType.description,
                    category: tournamentType.category,
                    gameType: tournamentType.gameType,
                    isActive: tournamentType.isActive,
                    priority: tournamentType.priority,
                    defaultConfig: tournamentType.defaultConfig,
                    createdAt: now.iso,
                    updatedAt: now.iso
                });

                createdTypes.push({
                    typeId: tournamentType.typeId,
                    name: tournamentType.name,
                    dbId: typeId
                });

                console.log(`创建锦标赛类型: ${tournamentType.typeId}`);
            } else {
                console.log(`锦标赛类型已存在: ${tournamentType.typeId}`);
            }
        }

        return {
            success: true,
            message: `锦标赛类型初始化完成`,
            createdTypes,
            totalExisting: existingTypes.length,
            totalCreated: createdTypes.length
        };
    },
});

/**
 * 更新锦标赛类型配置
 * 更新现有锦标赛类型的配置
 */
export const updateTournamentTypes = mutation({
    args: {},
    handler: async (ctx, args) => {
        const now = getTorontoDate();
        const updatedTypes = [];

        // 更新阈值锦标赛配置
        const thresholdType = await ctx.db
            .query("tournament_types")
            .withIndex("by_typeId", (q: any) => q.eq("typeId", "single_player_threshold_tournament"))
            .first();

        if (thresholdType) {
            await ctx.db.patch(thresholdType._id, {
                defaultConfig: {
                    entryFee: {
                        coins: 30
                    },
                    rules: {
                        maxAttempts: 3,
                        isSingleMatch: true,
                        rankingMethod: "threshold",
                        scoreThreshold: 1000
                    },
                    duration: 86400,
                    isSubscribedRequired: false
                },
                updatedAt: now.iso
            });

            updatedTypes.push("single_player_threshold_tournament");
            console.log("更新阈值锦标赛配置");
        }

        return {
            success: true,
            message: "锦标赛类型配置更新完成",
            updatedTypes
        };
    },
});

/**
 * 获取所有锦标赛类型
 */
export const getAllTournamentTypes = mutation({
    args: {},
    handler: async (ctx, args) => {
        const types = await ctx.db.query("tournament_types").collect();

        return {
            success: true,
            types: types.map(t => ({
                typeId: t.typeId,
                name: t.name,
                category: t.category,
                gameType: t.gameType,
                isActive: t.isActive,
                priority: t.priority
            }))
        };
    },
}); 