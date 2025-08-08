import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";
import { BattlePassSystem } from "./battlePassSystem";
import { getTorontoMidnight } from "../simpleTimezoneUtils";

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
 */
export const getPlayerBattlePass = query({
    args: { uid: v.string() },
    handler: async (ctx, args) => {
        return await BattlePassSystem.getPlayerBattlePass(ctx, args.uid);
    },
});

/**
 * 获取玩家Battle Pass统计
 */
export const getPlayerBattlePassStats = query({
    args: { uid: v.string() },
    handler: async (ctx, args) => {
        return await BattlePassSystem.getPlayerBattlePassStats(ctx, args.uid);
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
export const initializePlayerBattlePass = mutation({
    args: { uid: v.string() },
    handler: async (ctx, args) => {
        return await BattlePassSystem.initializePlayerBattlePass(ctx, args.uid);
    },
});

/**
 * 购买Premium Battle Pass
 */
export const purchasePremiumBattlePass = mutation({
    args: { uid: v.string() },
    handler: async (ctx, args) => {
        return await BattlePassSystem.purchasePremiumBattlePass(ctx, args.uid);
    },
});

/**
 * 添加赛季积分到玩家Battle Pass
 */
export const addBattlePassSeasonPoints = mutation({
    args: {
        uid: v.string(),
        seasonPointsAmount: v.number(),
        source: v.string(), // "tournament", "quick_match", "prop_match", "task", "social", "achievement", "segment_upgrade"
        sourceDetails: v.optional(v.object({
            gameType: v.optional(v.string()),
            tournamentId: v.optional(v.string()),
            matchId: v.optional(v.string()),
            taskId: v.optional(v.string()),
            achievementId: v.optional(v.string()),
            segmentUpgradeId: v.optional(v.string())
        }))
    },
    handler: async (ctx, args) => {
        return await BattlePassSystem.addSeasonPoints(ctx, args.uid, args.seasonPointsAmount, args.source);
    },
});

/**
 * 领取Battle Pass奖励
 */
export const claimBattlePassRewards = mutation({
    args: {
        uid: v.string(),
        level: v.number()
    },
    handler: async (ctx, args) => {
        return await BattlePassSystem.claimBattlePassRewards(ctx, args.uid, args.level);
    },
});

/**
 * 批量领取Battle Pass奖励
 */
export const batchClaimBattlePassRewards = mutation({
    args: {
        uid: v.string(),
        levels: v.array(v.number())
    },
    handler: async (ctx, args) => {
        const { uid, levels } = args;
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
export const addTournamentSeasonPoints = mutation({
    args: {
        uid: v.string(),
        tournamentId: v.string(),
        gameType: v.string(),
        rank: v.number(),
        totalParticipants: v.number()
    },
    handler: async (ctx, args) => {
        const { uid, tournamentId, gameType, rank, totalParticipants } = args;

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
export const addQuickMatchSeasonPoints = mutation({
    args: {
        uid: v.string(),
        gameType: v.string(),
        isWin: v.boolean(),
        matchId: v.string()
    },
    handler: async (ctx, args) => {
        const { uid, gameType, isWin, matchId } = args;

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
export const addPropMatchSeasonPoints = mutation({
    args: {
        uid: v.string(),
        gameType: v.string(),
        isWin: v.boolean(),
        matchId: v.string(),
        propsUsed: v.number()
    },
    handler: async (ctx, args) => {
        const { uid, gameType, isWin, matchId, propsUsed } = args;

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
export const addTaskSeasonPoints = mutation({
    args: {
        uid: v.string(),
        taskId: v.string(),
        taskType: v.string(),
        seasonPointsAmount: v.number()
    },
    handler: async (ctx, args) => {
        const { uid, taskId, taskType, seasonPointsAmount } = args;

        return await BattlePassSystem.addSeasonPoints(ctx, uid, seasonPointsAmount, "task");
    },
});

/**
 * 社交活动时自动添加赛季积分
 */
export const addSocialSeasonPoints = mutation({
    args: {
        uid: v.string(),
        action: v.string(), // "invite_friend", "share_game", "join_clan"
        seasonPointsAmount: v.number()
    },
    handler: async (ctx, args) => {
        const { uid, action, seasonPointsAmount } = args;

        return await BattlePassSystem.addSeasonPoints(ctx, uid, seasonPointsAmount, "social");
    },
});

/**
 * 成就解锁时自动添加赛季积分
 */
export const addAchievementSeasonPoints = mutation({
    args: {
        uid: v.string(),
        achievementId: v.string(),
        seasonPointsAmount: v.number()
    },
    handler: async (ctx, args) => {
        const { uid, achievementId, seasonPointsAmount } = args;

        return await BattlePassSystem.addSeasonPoints(ctx, uid, seasonPointsAmount, "achievement");
    },
});

/**
 * 段位升级时自动添加赛季积分
 */
export const addSegmentUpgradeSeasonPoints = mutation({
    args: {
        uid: v.string(),
        fromSegment: v.string(),
        toSegment: v.string(),
        seasonPointsAmount: v.number()
    },
    handler: async (ctx, args) => {
        const { uid, fromSegment, toSegment, seasonPointsAmount } = args;

        return await BattlePassSystem.addSeasonPoints(ctx, uid, seasonPointsAmount, "segment_upgrade");
    },
});

// ============================================================================
// 批量操作接口
// ============================================================================

/**
 * 批量添加赛季积分
 */
export const batchAddBattlePassSeasonPoints = mutation({
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
                achievementId: v.optional(v.string()),
                segmentUpgradeId: v.optional(v.string())
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
export const resetPlayerBattlePass = mutation({
    args: { uid: v.string() },
    handler: async (ctx, args) => {
        const config = BattlePassSystem.getCurrentBattlePassConfig();

        // 删除现有Battle Pass记录
        const existingBattlePass = await ctx.db.query("player_battle_pass")
            .withIndex("by_uid_season", (q: any) => q.eq("uid", args.uid).eq("seasonId", config.seasonId))
            .unique();

        if (existingBattlePass) {
            await ctx.db.delete(existingBattlePass._id);
        }

        // 重新初始化
        const newBattlePass = await BattlePassSystem.initializePlayerBattlePass(ctx, args.uid);

        return {
            success: true,
            message: "Battle Pass重置成功",
            battlePass: newBattlePass
        };
    },
});

/**
 * 创建Battle Pass快照（管理用）
 */
export const createBattlePassSnapshot = mutation({
    args: { uid: v.string() },
    handler: async (ctx, args) => {
        const config = BattlePassSystem.getCurrentBattlePassConfig();
        const now = getTorontoMidnight();

        const playerBattlePass = await BattlePassSystem.getPlayerBattlePass(ctx, args.uid);
        if (!playerBattlePass) {
            return { success: false, message: "Battle Pass不存在" };
        }

        // 创建快照
        await ctx.db.insert("battle_pass_snapshots", {
            uid: args.uid,
            seasonId: config.seasonId,
            currentLevel: playerBattlePass.currentLevel,
            currentSeasonPoints: playerBattlePass.currentSeasonPoints,
            totalSeasonPoints: playerBattlePass.totalSeasonPoints,
            isPremium: playerBattlePass.isPremium,
            claimedLevels: playerBattlePass.claimedLevels,
            progress: playerBattlePass.progress,
            snapshotDate: now.localDate.toISOString().split('T')[0],
            createdAt: now.iso
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
export const getBattlePassSnapshots = query({
    args: {
        uid: v.string(),
        seasonId: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        const { uid, seasonId } = args;
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