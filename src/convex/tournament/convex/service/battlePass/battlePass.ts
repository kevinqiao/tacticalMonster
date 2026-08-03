import { v } from "convex/values";
import { authedMutation, authedQuery } from "../../custom/session";
import { internalMutation, query } from "../../_generated/server";
import { BattlePassSystem } from "./battlePassSystem";


// ============================================================================
// Battle Pass API接口 - 基于Season Points
// ============================================================================

// 查询接口

/**
 * 获取当前赛季Battle Pass配置
 */
export const getCurrentBattlePassConfig = query({
    args: {},
    handler: async (ctx, args) => {
        return BattlePassSystem.getCurrentBattlePassConfig();
    },
});

/**
 * 获取玩家Battle Pass信息
 * 如果赛季已切换，会自动重置为新赛季
 */
export const getPlayerBattlePass = authedQuery({
    args: {},
    handler: async (ctx) => {
        await BattlePassSystem.checkAndResetPlayerBattlePassIfNeeded(ctx, ctx.uid);
        return await BattlePassSystem.getPlayerBattlePass(ctx, ctx.uid);
    },
});

/**
 * 获取玩家Battle Pass统计
 */
export const getPlayerBattlePassStats = authedQuery({
    args: {},
    handler: async (ctx) => {
        return await BattlePassSystem.getPlayerBattlePassStats(ctx, ctx.uid);
    },
});

/**
 * 获取赛季排行榜
 */
export const getSeasonLeaderboard = query({
    args: { limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
        return await BattlePassSystem.getSeasonLeaderboard(ctx, args.limit || 100);
    },
});

/**
 * 获取Battle Pass统计数据
 */
export const getBattlePassStats = query({
    args: {},
    handler: async (ctx, args) => {
        return await BattlePassSystem.getBattlePassStats(ctx);
    },
});

// 修改接口

/**
 * 初始化玩家Battle Pass
 */
export const initializePlayerBattlePass = authedMutation({
    args: {},
    handler: async (ctx) => {
        return await BattlePassSystem.initializePlayerBattlePass(ctx, ctx.uid);
    },
});

/**
 * 购买Premium Battle Pass
 */
export const purchasePremiumBattlePass = authedMutation({
    args: {},
    handler: async (ctx) => {
        return await BattlePassSystem.purchasePremiumBattlePass(ctx, ctx.uid);
    },
});

/**
 * 添加赛季积分到玩家Battle Pass
 */
export const addBattlePassSeasonPoints = authedMutation({
    args: {
        seasonPointsAmount: v.number(),
        source: v.string(), // "tournament", "quick_match", "prop_match", "task", "social", "achievement"
        sourceDetails: v.optional(v.object({
            gameType: v.optional(v.string()),
            tournamentId: v.optional(v.string()),
            matchId: v.optional(v.string()),
            taskId: v.optional(v.string()),
            achievementId: v.optional(v.string())
        }))
    },
    handler: async (ctx, args) => {
        return await BattlePassSystem.addSeasonPoints(ctx, ctx.uid, args.seasonPointsAmount, args.source);
    },
});

/**
 * 领取Battle Pass奖励
 */
export const claimBattlePassRewards = authedMutation({
    args: {
        level: v.number()
    },
    handler: async (ctx, args) => {
        return await BattlePassSystem.claimBattlePassRewards(ctx, ctx.uid, args.level);
    },
});

/**
 * 批量领取Battle Pass奖励
 */
export const batchClaimBattlePassRewards = authedMutation({
    args: {
        levels: v.array(v.number())
    },
    handler: async (ctx, args) => {
        const { levels } = args;
        const uid = ctx.uid;
        const results = [];
        const claimedRewards = [];

        for (const level of levels) {
            const result = await BattlePassSystem.claimBattlePassRewards(ctx, uid, level);
            results.push(result);

            if (result.success && result.rewards) {
                claimedRewards.push({
                    level,
                    rewards: result.rewards
                });
            }
        }

        const successCount = results.filter(r => r.success).length;
        const totalCoins = claimedRewards.reduce((sum, item) =>
            sum + (item.rewards.coins || 0), 0
        );
        const totalSeasonPoints = claimedRewards.reduce((sum, item) =>
            sum + (item.rewards.seasonPoints || 0), 0
        );
        const totalRankPoints = claimedRewards.reduce((sum, item) =>
            sum + (item.rewards.rankPoints || 0), 0
        );

        return {
            success: true,
            message: `成功领取 ${successCount}/${levels.length} 个等级奖励`,
            totalCoins,
            totalSeasonPoints,
            totalRankPoints,
            claimedRewards,
            results
        };
    },
});

// ============================================================================
// 集成接口 - 自动添加赛季积分
// ============================================================================

/**
 * 锦标赛完成时自动添加赛季积分
 */
export const addTournamentSeasonPoints = authedMutation({
    args: {
        tournamentId: v.string(),
        gameType: v.string(),
        rank: v.number(),
        totalParticipants: v.number()
    },
    handler: async (ctx, args) => {
        const { tournamentId, gameType, rank, totalParticipants } = args;
        const uid = ctx.uid;

        // 计算排名百分比
        const rankPercentage = (rank / totalParticipants) * 100;

        // 根据排名确定赛季积分奖励
        let seasonPointsAmount = 0;
        if (rankPercentage <= 10) {
            seasonPointsAmount = 100; // 前10%
        } else if (rankPercentage <= 20) {
            seasonPointsAmount = 80;  // 前11-20%
        } else if (rankPercentage <= 50) {
            seasonPointsAmount = 50;  // 前21-50%
        } else {
            seasonPointsAmount = 10;  // 后50%
        }

        return await BattlePassSystem.addSeasonPoints(ctx, uid, seasonPointsAmount, "tournament");
    },
});

/**
 * 快速对局完成时自动添加赛季积分
 */
export const addQuickMatchSeasonPoints = authedMutation({
    args: {
        gameType: v.string(),
        isWin: v.boolean(),
        matchId: v.string()
    },
    handler: async (ctx, args) => {
        const { gameType, isWin, matchId } = args;
        const uid = ctx.uid;

        let seasonPointsAmount = 0;
        if (isWin) {
            seasonPointsAmount = 10; // 胜利获得10赛季积分
        }

        return await BattlePassSystem.addSeasonPoints(ctx, uid, seasonPointsAmount, "quick_match");
    },
});

/**
 * 道具对局完成时自动添加赛季积分
 */
export const addPropMatchSeasonPoints = authedMutation({
    args: {
        gameType: v.string(),
        isWin: v.boolean(),
        matchId: v.string(),
        propsUsed: v.number()
    },
    handler: async (ctx, args) => {
        const { gameType, isWin, matchId, propsUsed } = args;
        const uid = ctx.uid;

        let seasonPointsAmount = 0;
        if (isWin) {
            seasonPointsAmount = 10; // 胜利获得10赛季积分
        }

        // 道具使用奖励
        if (propsUsed > 0) {
            seasonPointsAmount += propsUsed * 15; // 每个道具15赛季积分
        }

        return await BattlePassSystem.addSeasonPoints(ctx, uid, seasonPointsAmount, "prop_match");
    },
});

/**
 * 任务完成时自动添加赛季积分
 */
export const addTaskSeasonPoints = authedMutation({
    args: {
        taskId: v.string(),
        taskType: v.string(),
        seasonPointsAmount: v.number()
    },
    handler: async (ctx, args) => {
        const { taskId, taskType, seasonPointsAmount } = args;
        const uid = ctx.uid;

        return await BattlePassSystem.addSeasonPoints(ctx, uid, seasonPointsAmount, "task");
    },
});

/**
 * 社交活动时自动添加赛季积分
 */
export const addSocialSeasonPoints = authedMutation({
    args: {
        action: v.string(), // "invite_friend", "share_game", "join_clan"
        seasonPointsAmount: v.number()
    },
    handler: async (ctx, args) => {
        const { action, seasonPointsAmount } = args;
        const uid = ctx.uid;

        return await BattlePassSystem.addSeasonPoints(ctx, uid, seasonPointsAmount, "social");
    },
});

/**
 * 成就解锁时自动添加赛季积分
 */
export const addAchievementSeasonPoints = authedMutation({
    args: {
        achievementId: v.string(),
        seasonPointsAmount: v.number()
    },
    handler: async (ctx, args) => {
        const { achievementId, seasonPointsAmount } = args;
        const uid = ctx.uid;

        return await BattlePassSystem.addSeasonPoints(ctx, uid, seasonPointsAmount, "achievement");
    },
});

// ============================================================================
// 批量操作接口
// ============================================================================

/**
 * 批量添加赛季积分
 */
export const batchAddBattlePassSeasonPoints = internalMutation({
    args: {
        seasonPointsEntries: v.array(v.object({
            uid: v.string(),
            seasonPointsAmount: v.number(),
            source: v.string(),
            sourceDetails: v.optional(v.object({
                gameType: v.optional(v.string()),
                tournamentId: v.optional(v.string()),
                matchId: v.optional(v.string()),
                taskId: v.optional(v.string()),
                achievementId: v.optional(v.string())
            }))
        }))
    },
    handler: async (ctx, args) => {
        const results = [];

        for (const entry of args.seasonPointsEntries) {
            const result = await BattlePassSystem.addSeasonPoints(ctx, entry.uid, entry.seasonPointsAmount, entry.source);
            results.push({
                uid: entry.uid,
                ...result
            });
        }

        const successCount = results.filter(r => r.success).length;
        const totalSeasonPoints = args.seasonPointsEntries.reduce((sum, entry) => sum + entry.seasonPointsAmount, 0);

        return {
            success: true,
            message: `成功为 ${successCount}/${args.seasonPointsEntries.length} 个玩家添加赛季积分`,
            totalSeasonPoints,
            results
        };
    },
});

// ============================================================================
// 管理接口
// ============================================================================

/**
 * 重置玩家Battle Pass（管理用）
 */
export const resetPlayerBattlePass = authedMutation({
    args: {},
    handler: async (ctx) => {
        const config = BattlePassSystem.getCurrentBattlePassConfig();

        // 删除现有Battle Pass记录
        const existingBattlePass = await ctx.db.query("player_battle_pass")
            .withIndex("by_uid_season", (q: any) => q.eq("uid", ctx.uid).eq("seasonId", config.seasonId))
            .unique();

        if (existingBattlePass) {
            await ctx.db.delete(existingBattlePass._id);
        }

        // 重新初始化
        const newBattlePass = await BattlePassSystem.initializePlayerBattlePass(ctx, ctx.uid);

        return {
            success: true,
            message: "Battle Pass重置成功",
            battlePass: newBattlePass
        };
    },
});

/**
 * 自动重置所有玩家的Battle Pass为新赛季（定时任务用）
 * 每月1日自动执行
 */
export const resetAllPlayersBattlePassForNewSeason = internalMutation({
    args: {},
    handler: async (ctx) => {
        return await BattlePassSystem.resetAllPlayersBattlePassForNewSeason(ctx);
    },
});

/**
 * 创建Battle Pass快照（管理用）
 */
export const createBattlePassSnapshot = authedMutation({
    args: {},
    handler: async (ctx) => {
        const config = BattlePassSystem.getCurrentBattlePassConfig();
        const nowISO = new Date().toISOString();

        const playerBattlePass = await BattlePassSystem.getPlayerBattlePass(ctx, ctx.uid);
        if (!playerBattlePass) {
            return { success: false, message: "Battle Pass不存在" };
        }

        // 创建快照
        await ctx.db.insert("battle_pass_snapshots", {
            uid: ctx.uid,
            seasonId: config.seasonId,
            currentLevel: playerBattlePass.currentLevel,
            currentSeasonPoints: playerBattlePass.currentSeasonPoints,
            totalSeasonPoints: playerBattlePass.totalSeasonPoints,
            isPremium: playerBattlePass.isPremium,
            claimedLevels: playerBattlePass.claimedLevels,
            progress: playerBattlePass.progress,
            snapshotDate: nowISO.split('T')[0],
            createdAt: nowISO
        });

        return {
            success: true,
            message: "Battle Pass快照创建成功"
        };
    },
});

/**
 * 获取Battle Pass快照历史
 */
export const getBattlePassSnapshots = authedQuery({
    args: {
        seasonId: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        const { seasonId } = args;
        const uid = ctx.uid;
        const config = BattlePassSystem.getCurrentBattlePassConfig();
        const targetSeasonId = seasonId || config.seasonId;

        const snapshots = await ctx.db.query("battle_pass_snapshots")
            .withIndex("by_uid_season", (q: any) => q.eq("uid", uid).eq("seasonId", targetSeasonId))
            .order("desc")
            .collect();

        return snapshots.map((snapshot: any) => ({
            uid: snapshot.uid,
            seasonId: snapshot.seasonId,
            currentLevel: snapshot.currentLevel,
            currentSeasonPoints: snapshot.currentSeasonPoints,
            totalSeasonPoints: snapshot.totalSeasonPoints,
            isPremium: snapshot.isPremium,
            claimedLevels: snapshot.claimedLevels,
            progress: snapshot.progress,
            snapshotDate: snapshot.snapshotDate,
            createdAt: snapshot.createdAt
        }));
    },
}); 