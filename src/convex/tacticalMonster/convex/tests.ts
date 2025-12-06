/**
 * 游戏系统集成测试入口文件
 * 统一导出所有测试函数，使其在 Convex Dashboard 中可见
 * 
 * 注意：这些函数使用 mutation 而不是 internalMutation，以便在 Dashboard 中可见
 * 在生产环境中应该移除或限制访问
 */

import { v } from "convex/values";
import { internal } from "./_generated/api";
import { mutation } from "./_generated/server";
import { cleanupMatchingQueue, cleanupTestBattlePass, cleanupTestGames, cleanupTestPlayers } from "./service/game/tests/utils/cleanup";

/**
 * 清理所有测试数据
 */
export const cleanupAllTestData = mutation({
    args: {
        playerUids: v.array(v.string()),
        gameIds: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        const results = {
            players: await cleanupTestPlayers(ctx, args.playerUids),
            games: args.gameIds ? await cleanupTestGames(ctx, args.gameIds) : { deleted: 0, errors: [] },
            battlePass: await cleanupTestBattlePass(ctx, args.playerUids),
            matchingQueue: await cleanupMatchingQueue(ctx, args.playerUids),
        };

        return {
            success: true,
            results,
            totalDeleted: results.players.deleted + results.games.deleted + results.battlePass.deleted + results.matchingQueue.deleted,
            totalErrors: [
                ...results.players.errors,
                ...results.games.errors,
                ...results.battlePass.errors,
                ...results.matchingQueue.errors,
            ],
        };
    },
});

/**
 * 测试：创建并初始化单个玩家
 */
export const testPlayerInitialization = mutation({
    args: {
        uid: v.string(),
        monsterIds: v.array(v.string()),
        teamMonsterIds: v.array(v.string()),
    },
    handler: async (ctx, args) => {
        return await ctx.runMutation(
            (internal as any).service.game.tests.integration.playerInitialization.testPlayerInitialization,
            args
        );
    },
});

/**
 * 测试：批量初始化多个玩家
 */
export const testBatchPlayerInitialization = mutation({
    args: {
        playerCount: v.optional(v.number()),
        tier: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        return await ctx.runMutation(
            (internal as any).service.game.tests.integration.playerInitialization.testBatchPlayerInitialization,
            args
        );
    },
});

/**
 * 测试：单个玩家加入匹配队列
 */
export const testJoinMatchingQueue = mutation({
    args: {
        uid: v.string(),
        tournamentType: v.string(),
        tier: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        return await ctx.runMutation(
            (internal as any).service.game.tests.integration.matchingSystem.testJoinMatchingQueue,
            args
        );
    },
});

/**
 * 测试：多个玩家加入匹配队列并执行匹配
 */
export const testMatchingFlow = mutation({
    args: {
        playerCount: v.optional(v.number()),
        tier: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        return await ctx.runMutation(
            (internal as any).service.game.tests.integration.matchingSystem.testMatchingFlow,
            args
        );
    },
});

/**
 * 测试：创建游戏实例
 */
export const testCreateGameInstance = mutation({
    args: {
        matchId: v.string(),
        tier: v.string(),
        bossId: v.optional(v.string()),
        maxPlayers: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        return await ctx.runMutation(
            (internal as any).service.game.tests.integration.gameFlow.testCreateGameInstance,
            args
        );
    },
});

/**
 * 测试：完整的游戏流程（创建游戏、玩家完成、游戏结束）
 */
export const testCompleteGameFlow = mutation({
    args: {
        matchId: v.string(),
        tier: v.string(),
        playerScores: v.array(v.object({
            uid: v.string(),
            score: v.number(),
        })),
        bossId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        return await ctx.runMutation(
            (internal as any).service.game.tests.integration.gameFlow.testCompleteGameFlow,
            args
        );
    },
});

/**
 * 测试：使用测试场景进行游戏流程测试
 */
export const testGameFlowWithScenario = mutation({
    args: {
        scenarioIndex: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        return await ctx.runMutation(
            (internal as any).service.game.tests.integration.gameFlow.testGameFlowWithScenario,
            args
        );
    },
});

/**
 * 测试：验证游戏奖励发放
 */
export const testGameRewards = mutation({
    args: {
        gameId: v.string(),
        playerRankings: v.array(v.object({
            uid: v.string(),
            rank: v.number(),
            score: v.number(),
        })),
        tier: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.runMutation(
            (internal as any).service.game.tests.integration.rewardSystem.testGameRewards,
            args
        );
    },
});

/**
 * 测试：完整游戏流程 + 奖励验证
 */
export const testCompleteGameWithRewards = mutation({
    args: {
        scenarioIndex: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        return await ctx.runMutation(
            (internal as any).service.game.tests.integration.rewardSystem.testCompleteGameWithRewards,
            args
        );
    },
});

// 注意：endToEnd.test.ts 中的函数已经使用 mutation 导出
// 它们会通过 service/game/tests/index.ts 显示在 Dashboard 中
// 路径：service/game/tests/integration/endToEnd.test.ts

