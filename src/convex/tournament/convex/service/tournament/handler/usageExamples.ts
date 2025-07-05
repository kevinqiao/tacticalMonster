import { getHandler, getHandlerCategories, getSupportedTournamentTypes } from "./index";

/**
 * 锦标赛处理器使用示例
 */
export class TournamentHandlerUsageExamples {

    /**
     * 示例1: 加入每日锦标赛
     */
    static async exampleJoinDailyTournament(ctx: any) {
        console.log("=== 示例1: 加入每日锦标赛 ===");

        const uid = "user123";
        const gameType = "solitaire";
        const tournamentType = "daily_solitaire_challenge";

        try {
            // 获取处理器
            const handler = getHandler(tournamentType);
            console.log(`使用处理器: ${handler.constructor.name}`);

            // 模拟玩家和赛季数据
            const player = {
                uid,
                segmentName: "Gold",
                isSubscribed: true,
                totalPoints: 1500
            };

            const season = {
                _id: "season123",
                name: "Spring 2024",
                isActive: true
            };

            // 加入锦标赛
            const result = await handler.join(ctx, {
                uid,
                gameType,
                tournamentType,
                player,
                season
            });

            console.log("加入结果:", result);
            return result;

        } catch (error) {
            console.error("加入每日锦标赛失败:", error);
            throw error;
        }
    }

    /**
     * 示例2: 加入排位锦标赛
     */
    static async exampleJoinRankedTournament(ctx: any) {
        console.log("=== 示例2: 加入排位锦标赛 ===");

        const uid = "user456";
        const gameType = "chess";
        const tournamentType = "ranked_chess_masters";

        try {
            const handler = getHandler(tournamentType);
            console.log(`使用处理器: ${handler.constructor.name}`);

            const player = {
                uid,
                segmentName: "Platinum",
                isSubscribed: true,
                totalPoints: 2500,
                eloScore: 1800
            };

            const season = {
                _id: "season123",
                name: "Spring 2024",
                isActive: true
            };

            const result = await handler.join(ctx, {
                uid,
                gameType,
                tournamentType,
                player,
                season
            });

            console.log("加入结果:", result);
            return result;

        } catch (error) {
            console.error("加入排位锦标赛失败:", error);
            throw error;
        }
    }

    /**
     * 示例3: 提交分数
     */
    static async exampleSubmitScore(ctx: any) {
        console.log("=== 示例3: 提交分数 ===");

        const tournamentId = "tournament123";
        const uid = "user123";
        const gameType = "solitaire";
        const score = 1500;
        const gameData = {
            moves: 45,
            timeSpent: 300,
            difficulty: "hard"
        };
        const propsUsed = ["hint", "time_boost"];
        const gameId = "game123";

        try {
            // 获取锦标赛信息来确定处理器
            const tournament = await ctx.db.get(tournamentId);
            if (!tournament) {
                throw new Error("锦标赛不存在");
            }

            const handler = getHandler(tournament.tournamentType);
            console.log(`使用处理器: ${handler.constructor.name}`);

            const result = await handler.submitScore(ctx, {
                tournamentId,
                uid,
                gameType,
                score,
                gameData,
                propsUsed,
                gameId
            });

            console.log("提交结果:", result);
            return result;

        } catch (error) {
            console.error("提交分数失败:", error);
            throw error;
        }
    }

    /**
     * 示例4: 结算锦标赛
     */
    static async exampleSettleTournament(ctx: any) {
        console.log("=== 示例4: 结算锦标赛 ===");

        const tournamentId = "tournament123";

        try {
            const tournament = await ctx.db.get(tournamentId);
            if (!tournament) {
                throw new Error("锦标赛不存在");
            }

            const handler = getHandler(tournament.tournamentType);
            console.log(`使用处理器: ${handler.constructor.name}`);

            await handler.settle(ctx, tournamentId);

            console.log("锦标赛结算完成");
            return { success: true, tournamentId };

        } catch (error) {
            console.error("结算锦标赛失败:", error);
            throw error;
        }
    }

    /**
     * 示例5: 批量处理不同类型的锦标赛
     */
    static async exampleBatchProcessTournaments(ctx: any) {
        console.log("=== 示例5: 批量处理不同类型的锦标赛 ===");

        const supportedTypes = getSupportedTournamentTypes();
        const results = [];

        for (const tournamentType of supportedTypes.slice(0, 5)) { // 只处理前5个
            try {
                const handler = getHandler(tournamentType);
                console.log(`处理锦标赛类型: ${tournamentType}`);

                // 模拟数据
                const player = {
                    uid: "user789",
                    segmentName: "Silver",
                    isSubscribed: false,
                    totalPoints: 800
                };

                const season = {
                    _id: "season123",
                    name: "Spring 2024",
                    isActive: true
                };

                // 尝试加入（这里只是演示，实际可能需要更多验证）
                const result = await handler.join(ctx, {
                    uid: "user789",
                    gameType: "solitaire",
                    tournamentType,
                    player,
                    season
                });

                results.push({
                    tournamentType,
                    status: "SUCCESS",
                    result
                });

            } catch (error) {
                results.push({
                    tournamentType,
                    status: "ERROR",
                    error: error instanceof Error ? error.message : "未知错误"
                });
            }
        }

        console.log("批量处理结果:", results);
        return results;
    }

    /**
     * 示例6: 按分类处理锦标赛
     */
    static async exampleProcessByCategory(ctx: any) {
        console.log("=== 示例6: 按分类处理锦标赛 ===");

        const categories = getHandlerCategories();
        const results: Record<string, any[]> = {};

        for (const [category, types] of Object.entries(categories)) {
            console.log(`处理分类: ${category}`);
            results[category] = [];

            for (const tournamentType of types.slice(0, 2)) { // 每个分类只处理2个
                try {
                    const handler = getHandler(tournamentType);

                    results[category].push({
                        tournamentType,
                        handler: handler.constructor.name,
                        status: "SUCCESS"
                    });

                } catch (error) {
                    results[category].push({
                        tournamentType,
                        status: "ERROR",
                        error: error instanceof Error ? error.message : "未知错误"
                    });
                }
            }
        }

        console.log("按分类处理结果:", results);
        return results;
    }

    /**
     * 示例7: 验证处理器功能
     */
    static async exampleValidateHandlerFunctions(ctx: any) {
        console.log("=== 示例7: 验证处理器功能 ===");

        const testTypes = [
            "daily_solitaire_challenge",
            "weekly_rummy_masters",
            "seasonal_uno_championship",
            "ranked_chess_masters",
            "championship_puzzle_masters"
        ];

        const validationResults = [];

        for (const tournamentType of testTypes) {
            try {
                const handler = getHandler(tournamentType);

                // 验证必要的方法
                const methods = {
                    join: typeof handler.join === 'function',
                    submitScore: typeof handler.submitScore === 'function',
                    settle: typeof handler.settle === 'function',
                    validateJoin: typeof handler.validateJoin === 'function',
                    validateScore: typeof handler.validateScore === 'function'
                };

                const isValid = Object.values(methods).every(Boolean);

                validationResults.push({
                    tournamentType,
                    handler: handler.constructor.name,
                    isValid,
                    methods
                });

            } catch (error) {
                validationResults.push({
                    tournamentType,
                    isValid: false,
                    error: error instanceof Error ? error.message : "未知错误"
                });
            }
        }

        console.log("功能验证结果:", validationResults);
        return validationResults;
    }
}

/**
 * 运行所有使用示例
 */
export async function runAllUsageExamples(ctx: any) {
    console.log("开始运行所有使用示例...\n");

    const results = {
        dailyTournament: await TournamentHandlerUsageExamples.exampleJoinDailyTournament(ctx),
        rankedTournament: await TournamentHandlerUsageExamples.exampleJoinRankedTournament(ctx),
        submitScore: await TournamentHandlerUsageExamples.exampleSubmitScore(ctx),
        settleTournament: await TournamentHandlerUsageExamples.exampleSettleTournament(ctx),
        batchProcess: await TournamentHandlerUsageExamples.exampleBatchProcessTournaments(ctx),
        processByCategory: await TournamentHandlerUsageExamples.exampleProcessByCategory(ctx),
        validateFunctions: await TournamentHandlerUsageExamples.exampleValidateHandlerFunctions(ctx)
    };

    console.log("\n=== 使用示例总结 ===");
    console.log("所有示例运行完成");

    return results;
}

// ==================== Convex 函数接口 ====================

import { v } from "convex/values";
import { query } from "../../../_generated/server";

/**
 * Convex 函数：运行所有使用示例
 */
export const runAllUsageExamplesConvex = query({
    args: {},
    handler: async (ctx) => {
        return await runAllUsageExamples(ctx);
    }
});

/**
 * Convex 函数：运行特定使用示例
 */
export const runSpecificUsageExample = query({
    args: {
        exampleName: v.string()
    },
    handler: async (ctx, args) => {
        const { exampleName } = args;

        switch (exampleName) {
            case "dailyTournament":
                return await TournamentHandlerUsageExamples.exampleJoinDailyTournament(ctx);
            case "rankedTournament":
                return await TournamentHandlerUsageExamples.exampleJoinRankedTournament(ctx);
            case "submitScore":
                return await TournamentHandlerUsageExamples.exampleSubmitScore(ctx);
            case "settleTournament":
                return await TournamentHandlerUsageExamples.exampleSettleTournament(ctx);
            case "batchProcess":
                return await TournamentHandlerUsageExamples.exampleBatchProcessTournaments(ctx);
            case "processByCategory":
                return await TournamentHandlerUsageExamples.exampleProcessByCategory(ctx);
            case "validateFunctions":
                return await TournamentHandlerUsageExamples.exampleValidateHandlerFunctions(ctx);
            default:
                throw new Error(`未知示例: ${exampleName}`);
        }
    }
});

// 导出使用示例

