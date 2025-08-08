import { getTorontoMidnight } from "../simpleTimezoneUtils";

// ============================================================================
// 排行榜系统 - 基于快速对局积分累积
// ============================================================================

export interface LeaderboardEntry {
    uid: string;
    username: string;
    totalScore: number; // 累积的总积分
    matchesPlayed: number; // 参与的对局数
    rank: number; // 当前排名
}

export interface LeaderboardReward {
    rankRange: number[]; // [minRank, maxRank] 排名范围
    rankPoints: number;
    seasonPoints: number;
    coins: number;
}

export interface LeaderboardConfig {
    leaderboardType: "daily" | "weekly";
    gameType: string;
    isActive: boolean;
    resetTime: string;
    resetDay?: number;
    rewards: LeaderboardReward[]; // 直接使用奖励数组，按rankRange排序
}

export class LeaderboardSystem {
    // ============================================================================
    // 排行榜配置
    // ============================================================================

    /**
     * 获取排行榜配置
     */
    static getLeaderboardConfigs(): LeaderboardConfig[] {
        return [
            // 每日排行榜配置
            {
                leaderboardType: "daily",
                gameType: "solitaire",
                isActive: true,
                resetTime: "00:00",
                rewards: [
                    { rankRange: [1, 1], rankPoints: 100, seasonPoints: 200, coins: 200 },
                    { rankRange: [2, 2], rankPoints: 50, seasonPoints: 100, coins: 100 },
                    { rankRange: [3, 3], rankPoints: 25, seasonPoints: 50, coins: 50 },
                    { rankRange: [4, 4], rankPoints: 10, seasonPoints: 20, coins: 20 },
                    { rankRange: [5, 10], rankPoints: 5, seasonPoints: 10, coins: 10 }
                ]
            },
            // 每周排行榜配置
            {
                leaderboardType: "weekly",
                gameType: "solitaire",
                isActive: true,
                resetTime: "00:00",
                resetDay: 1, // 周一重置
                rewards: [
                    { rankRange: [1, 1], rankPoints: 500, seasonPoints: 1000, coins: 1000 },
                    { rankRange: [2, 2], rankPoints: 250, seasonPoints: 500, coins: 500 },
                    { rankRange: [3, 3], rankPoints: 100, seasonPoints: 250, coins: 250 },
                    { rankRange: [4, 4], rankPoints: 50, seasonPoints: 100, coins: 100 },
                    { rankRange: [5, 10], rankPoints: 25, seasonPoints: 50, coins: 50 },
                    { rankRange: [11, 20], rankPoints: 10, seasonPoints: 20, coins: 20 }
                ]
            }
        ];
    }

    // ============================================================================
    // 积分累积
    // ============================================================================

    /**
     * 累积每日排行榜积分
     */
    static async accumulateDailyPoints(ctx: any, params: {
        uid: string;
        gameType: string;
        tournamentType: string;
        score: number; // 要累积的积分
    }): Promise<{ success: boolean; message: string; newTotalScore?: number; score?: number }> {
        const { uid, gameType, tournamentType, score } = params;
        const now = getTorontoMidnight();
        const today = now.localDate.toISOString().split('T')[0];

        try {
            // 获取玩家信息
            const player = await ctx.db.query("players")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .unique();

            if (!player) {
                return { success: false, message: "玩家不存在" };
            }

            // 获取或创建今日积分记录
            let pointsRecord = await ctx.db.query("daily_leaderboard_points")
                .withIndex("by_uid_date", (q: any) => q.eq("uid", uid).eq("date", today))
                .filter((q: any) => q.eq(q.field("gameType"), gameType))
                .filter((q: any) => q.eq(q.field("tournamentType"), tournamentType))
                .unique();

            if (pointsRecord) {
                // 更新现有记录
                const newMatchesPlayed = pointsRecord.matchesPlayed + 1;
                const newTotalScore = pointsRecord.totalScore + score; // 累积积分

                await ctx.db.patch(pointsRecord._id, {
                    totalScore: newTotalScore,
                    matchesPlayed: newMatchesPlayed,
                    updatedAt: now.iso
                });

                return {
                    success: true,
                    message: "每日积分累积成功",
                    newTotalScore,
                    score
                };
            } else {
                // 创建新记录
                await ctx.db.insert("daily_leaderboard_points", {
                    date: today,
                    uid,
                    gameType,
                    tournamentType,
                    totalScore: score, // 使用传入的积分作为初始积分
                    matchesPlayed: 1,
                    createdAt: now.iso,
                    updatedAt: now.iso
                });

                return {
                    success: true,
                    message: "每日积分记录创建成功",
                    newTotalScore: score,
                    score
                };
            }
        } catch (error) {
            console.error("累积每日积分失败:", error);
            return {
                success: false,
                message: "累积每日积分失败"
            };
        }
    }

    /**
     * 累积每周排行榜积分
     */
    static async accumulateWeeklyPoints(ctx: any, params: {
        uid: string;
        gameType: string;
        tournamentType: string;
        score: number; // 要累积的积分
    }): Promise<{ success: boolean; message: string; newTotalScore?: number; score?: number }> {
        const { uid, gameType, tournamentType, score } = params;
        const now = getTorontoMidnight();
        const weekStart = this.getWeekStart(now.localDate);
        const weekEnd = this.getWeekEnd(now.localDate);

        try {
            // 获取玩家信息
            const player = await ctx.db.query("players")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .unique();

            if (!player) {
                return { success: false, message: "玩家不存在" };
            }

            // 获取或创建本周积分记录
            let pointsRecord = await ctx.db.query("weekly_leaderboard_points")
                .withIndex("by_uid_week", (q: any) => q.eq("uid", uid).eq("weekStart", weekStart))
                .filter((q: any) => q.eq(q.field("gameType"), gameType))
                .filter((q: any) => q.eq(q.field("tournamentType"), tournamentType))
                .unique();

            if (pointsRecord) {
                // 更新现有记录
                const newMatchesPlayed = pointsRecord.matchesPlayed + 1;
                const newTotalScore = pointsRecord.totalScore + score; // 累积积分

                await ctx.db.patch(pointsRecord._id, {
                    totalScore: newTotalScore,
                    matchesPlayed: newMatchesPlayed,
                    updatedAt: now.iso
                });

                return {
                    success: true,
                    message: "每周积分累积成功",
                    newTotalScore,
                    score
                };
            } else {
                // 创建新记录
                await ctx.db.insert("weekly_leaderboard_points", {
                    weekStart,
                    weekEnd,
                    uid,
                    gameType,
                    tournamentType,
                    totalScore: score, // 使用传入的积分作为初始积分
                    matchesPlayed: 1,
                    createdAt: now.iso,
                    updatedAt: now.iso
                });

                return {
                    success: true,
                    message: "每周积分记录创建成功",
                    newTotalScore: score,
                    score
                };
            }
        } catch (error) {
            console.error("累积每周积分失败:", error);
            return {
                success: false,
                message: "累积每周积分失败"
            };
        }
    }

    /**
     * 累积每日综合排行榜积分（所有游戏）
     */
    static async accumulateDailyPointsOverall(ctx: any, params: {
        uid: string;
        score: number; // 要累积的积分
    }): Promise<{ success: boolean; message: string; newTotalScore?: number; score?: number }> {
        const { uid, score } = params;
        const now = getTorontoMidnight();
        const today = now.localDate.toISOString().split('T')[0];

        try {
            // 获取玩家信息
            const player = await ctx.db.query("players")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .unique();

            if (!player) {
                return { success: false, message: "玩家不存在" };
            }

            // 获取或创建今日综合积分记录
            let pointsRecord = await ctx.db.query("daily_leaderboard_points")
                .withIndex("by_uid_date", (q: any) => q.eq("uid", uid).eq("date", today))
                .unique();

            if (pointsRecord) {
                // 更新现有记录
                const newMatchesPlayed = pointsRecord.matchesPlayed + 1;
                const newTotalScore = pointsRecord.totalScore + score; // 累积积分

                await ctx.db.patch(pointsRecord._id, {
                    totalScore: newTotalScore,
                    matchesPlayed: newMatchesPlayed,
                    updatedAt: now.iso
                });

                return {
                    success: true,
                    message: "每日综合积分累积成功",
                    newTotalScore,
                    score
                };
            } else {
                // 创建新记录
                await ctx.db.insert("daily_leaderboard_points", {
                    date: today,
                    uid,
                    totalScore: score, // 使用传入的积分作为初始积分
                    matchesPlayed: 1,
                    createdAt: now.iso,
                    updatedAt: now.iso
                });

                return {
                    success: true,
                    message: "每日综合积分记录创建成功",
                    newTotalScore: score,
                    score
                };
            }
        } catch (error) {
            console.error("累积每日综合积分失败:", error);
            return {
                success: false,
                message: "累积每日综合积分失败"
            };
        }
    }

    /**
     * 累积每日游戏特定排行榜积分
     */
    static async accumulateDailyPointsByGame(ctx: any, params: {
        uid: string;
        gameType: string;
        score: number; // 要累积的积分
    }): Promise<{ success: boolean; message: string; newTotalScore?: number; score?: number }> {
        const { uid, gameType, score } = params;
        const now = getTorontoMidnight();
        const today = now.localDate.toISOString().split('T')[0];

        try {
            // 获取玩家信息
            const player = await ctx.db.query("players")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .unique();

            if (!player) {
                return { success: false, message: "玩家不存在" };
            }

            // 获取或创建今日游戏特定积分记录
            let pointsRecord = await ctx.db.query("daily_leaderboard_points_by_game")
                .withIndex("by_uid_date_game", (q: any) => q.eq("uid", uid).eq("date", today).eq("gameType", gameType))
                .unique();

            if (pointsRecord) {
                // 更新现有记录
                const newMatchesPlayed = pointsRecord.matchesPlayed + 1;
                const newTotalScore = pointsRecord.totalScore + score; // 累积积分

                await ctx.db.patch(pointsRecord._id, {
                    totalScore: newTotalScore,
                    matchesPlayed: newMatchesPlayed,
                    updatedAt: now.iso
                });

                return {
                    success: true,
                    message: "每日游戏积分累积成功",
                    newTotalScore,
                    score
                };
            } else {
                // 创建新记录
                await ctx.db.insert("daily_leaderboard_points_by_game", {
                    date: today,
                    uid,
                    gameType,
                    totalScore: score, // 使用传入的积分作为初始积分
                    matchesPlayed: 1,
                    createdAt: now.iso,
                    updatedAt: now.iso
                });

                return {
                    success: true,
                    message: "每日游戏积分记录创建成功",
                    newTotalScore: score,
                    score
                };
            }
        } catch (error) {
            console.error("累积每日游戏积分失败:", error);
            return {
                success: false,
                message: "累积每日游戏积分失败"
            };
        }
    }

    /**
     * 累积每周综合排行榜积分（所有游戏）
     */
    static async accumulateWeeklyPointsOverall(ctx: any, params: {
        uid: string;
        score: number; // 要累积的积分
    }): Promise<{ success: boolean; message: string; newTotalScore?: number; score?: number }> {
        const { uid, score } = params;
        const now = getTorontoMidnight();
        const weekStart = this.getWeekStart(now.localDate);
        const weekEnd = this.getWeekEnd(now.localDate);

        try {
            // 获取玩家信息
            const player = await ctx.db.query("players")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .unique();

            if (!player) {
                return { success: false, message: "玩家不存在" };
            }

            // 获取或创建本周综合积分记录
            let pointsRecord = await ctx.db.query("weekly_leaderboard_points")
                .withIndex("by_uid_week", (q: any) => q.eq("uid", uid).eq("weekStart", weekStart))
                .unique();

            if (pointsRecord) {
                // 更新现有记录
                const newMatchesPlayed = pointsRecord.matchesPlayed + 1;
                const newTotalScore = pointsRecord.totalScore + score; // 累积积分

                await ctx.db.patch(pointsRecord._id, {
                    totalScore: newTotalScore,
                    matchesPlayed: newMatchesPlayed,
                    updatedAt: now.iso
                });

                return {
                    success: true,
                    message: "每周综合积分累积成功",
                    newTotalScore,
                    score
                };
            } else {
                // 创建新记录
                await ctx.db.insert("weekly_leaderboard_points", {
                    weekStart,
                    weekEnd,
                    uid,
                    totalScore: score, // 使用传入的积分作为初始积分
                    matchesPlayed: 1,
                    createdAt: now.iso,
                    updatedAt: now.iso
                });

                return {
                    success: true,
                    message: "每周综合积分记录创建成功",
                    newTotalScore: score,
                    score
                };
            }
        } catch (error) {
            console.error("累积每周综合积分失败:", error);
            return {
                success: false,
                message: "累积每周综合积分失败"
            };
        }
    }

    /**
     * 累积每周游戏特定排行榜积分
     */
    static async accumulateWeeklyPointsByGame(ctx: any, params: {
        uid: string;
        gameType: string;
        score: number; // 要累积的积分
    }): Promise<{ success: boolean; message: string; newTotalScore?: number; score?: number }> {
        const { uid, gameType, score } = params;
        const now = getTorontoMidnight();
        const weekStart = this.getWeekStart(now.localDate);
        const weekEnd = this.getWeekEnd(now.localDate);

        try {
            // 获取玩家信息
            const player = await ctx.db.query("players")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .unique();

            if (!player) {
                return { success: false, message: "玩家不存在" };
            }

            // 获取或创建本周游戏特定积分记录
            let pointsRecord = await ctx.db.query("weekly_leaderboard_points_by_game")
                .withIndex("by_uid_week_game", (q: any) => q.eq("uid", uid).eq("weekStart", weekStart).eq("gameType", gameType))
                .unique();

            if (pointsRecord) {
                // 更新现有记录
                const newMatchesPlayed = pointsRecord.matchesPlayed + 1;
                const newTotalScore = pointsRecord.totalScore + score; // 累积积分

                await ctx.db.patch(pointsRecord._id, {
                    totalScore: newTotalScore,
                    matchesPlayed: newMatchesPlayed,
                    updatedAt: now.iso
                });

                return {
                    success: true,
                    message: "每周游戏积分累积成功",
                    newTotalScore,
                    score
                };
            } else {
                // 创建新记录
                await ctx.db.insert("weekly_leaderboard_points_by_game", {
                    weekStart,
                    weekEnd,
                    uid,
                    gameType,
                    totalScore: score, // 使用传入的积分作为初始积分
                    matchesPlayed: 1,
                    createdAt: now.iso,
                    updatedAt: now.iso
                });

                return {
                    success: true,
                    message: "每周游戏积分记录创建成功",
                    newTotalScore: score,
                    score
                };
            }
        } catch (error) {
            console.error("累积每周游戏积分失败:", error);
            return {
                success: false,
                message: "累积每周游戏积分失败"
            };
        }
    }

    /**
     * 便捷的积分更新方法 - 专门用于tournament系统调用
     */
    static async updatePoints(ctx: any, params: {
        uid: string;
        gameType: string;
        score: number;
    }): Promise<{ success: boolean; message: string; results?: any }> {
        const { uid, gameType, score } = params;

        try {

            const results = [];

            // 累积每日综合积分（所有游戏）
            const dailyOverallResult = await this.accumulateDailyPointsOverall(ctx, {
                uid,
                score
            });
            results.push({ type: "daily_overall", ...dailyOverallResult });

            // 累积每日游戏特定积分
            const dailyGameResult = await this.accumulateDailyPointsByGame(ctx, {
                uid,
                gameType,
                score
            });
            results.push({ type: "daily_game", ...dailyGameResult });

            // 累积每周综合积分（所有游戏）
            const weeklyOverallResult = await this.accumulateWeeklyPointsOverall(ctx, {
                uid,
                score
            });
            results.push({ type: "weekly_overall", ...weeklyOverallResult });

            // 累积每周游戏特定积分
            const weeklyGameResult = await this.accumulateWeeklyPointsByGame(ctx, {
                uid,
                gameType,
                score
            });
            results.push({ type: "weekly_game", ...weeklyGameResult });

            const successCount = results.filter(r => r.success).length;

            return {
                success: successCount > 0,
                message: `积分更新完成：${successCount}/4 个排行榜积分更新成功`,
                results
            };
        } catch (error) {
            console.error("积分更新失败:", error);
            return {
                success: false,
                message: "积分更新失败"
            };
        }
    }

    // ============================================================================
    // 排行榜查询
    // ============================================================================

    /**
     * 获取每日排行榜
     */
    static async getDailyLeaderboard(ctx: any, params: {
        date?: string;
        gameType: string;
        limit?: number;
        offset?: number;
    }): Promise<{ success: boolean; leaderboard?: LeaderboardEntry[]; totalPlayers?: number }> {
        const { date, gameType, limit = 100, offset = 0 } = params;
        const now = getTorontoMidnight();
        const targetDate = date || now.localDate.toISOString().split('T')[0];

        try {
            const entries = await ctx.db.query("daily_leaderboard_points")
                .withIndex("by_date_game", (q: any) => q.eq("date", targetDate).eq("gameType", gameType))
                .order("desc")
                .collect()
                .then((results: any) => results.slice(offset, offset + limit));

            const totalPlayers = await ctx.db.query("daily_leaderboard_points")
                .withIndex("by_date_game", (q: any) => q.eq("date", targetDate).eq("gameType", gameType))
                .collect();

            return {
                success: true,
                leaderboard: entries.map((entry: any, index: number) => ({
                    uid: entry.uid,
                    username: entry.username || entry.uid,
                    totalScore: entry.totalScore, // 累积的总积分
                    matchesPlayed: entry.matchesPlayed,
                    rank: offset + index + 1
                })),
                totalPlayers: totalPlayers.length
            };
        } catch (error) {
            console.error("获取每日排行榜失败:", error);
            return {
                success: false
            };
        }
    }

    /**
     * 获取每周排行榜
     */
    static async getWeeklyLeaderboard(ctx: any, params: {
        weekStart?: string;
        gameType: string;
        limit?: number;
        offset?: number;
    }): Promise<{ success: boolean; leaderboard?: LeaderboardEntry[]; totalPlayers?: number }> {
        const { weekStart, gameType, limit = 100, offset = 0 } = params;
        const now = getTorontoMidnight();
        const targetWeekStart = weekStart || this.getWeekStart(now.localDate);

        try {
            const entries = await ctx.db.query("weekly_leaderboard_points")
                .withIndex("by_week_game", (q: any) => q.eq("weekStart", targetWeekStart).eq("gameType", gameType))
                .order("desc")
                .collect()
                .then((results: any) => results.slice(offset, offset + limit));

            const totalPlayers = await ctx.db.query("weekly_leaderboard_points")
                .withIndex("by_week_game", (q: any) => q.eq("weekStart", targetWeekStart).eq("gameType", gameType))
                .collect();

            return {
                success: true,
                leaderboard: entries.map((entry: any, index: number) => ({
                    uid: entry.uid,
                    username: entry.username || entry.uid,
                    totalScore: entry.totalScore, // 累积的总积分
                    matchesPlayed: entry.matchesPlayed,
                    rank: offset + index + 1
                })),
                totalPlayers: totalPlayers.length
            };
        } catch (error) {
            console.error("获取每周排行榜失败:", error);
            return {
                success: false
            };
        }
    }

    // ============================================================================
    // 排行榜结算和奖励发放
    // ============================================================================

    /**
     * 结算每日排行榜并发放奖励
     */
    static async settleDailyLeaderboard(ctx: any, params: {
        date: string;
        gameType: string;
    }): Promise<{ success: boolean; message: string; rewardsIssued?: number }> {
        const { date, gameType } = params;
        const now = getTorontoMidnight();

        try {
            // 获取排行榜配置
            const config = this.getLeaderboardConfigs().find(c =>
                c.leaderboardType === "daily" && c.gameType === gameType
            );

            if (!config) {
                return { success: false, message: "排行榜配置不存在" };
            }

            // 获取当日排行榜
            const leaderboard = await ctx.db.query("daily_leaderboard_points")
                .withIndex("by_date_game", (q: any) => q.eq("date", date).eq("gameType", gameType))
                .order("desc")
                .collect();

            let rewardsIssued = 0;

            // 发放奖励
            for (let i = 0; i < leaderboard.length; i++) {
                const entry = leaderboard[i];
                const rank = i + 1;
                const isTicketPlayer = entry.isTicketPlayer;
                const rewardConfig = isTicketPlayer ? config.rewards : config.rewards;

                // 查找匹配的奖励配置
                let reward: LeaderboardReward | undefined;

                // 检查所有奖励配置
                for (const rewardItem of rewardConfig) {
                    if (rewardItem && rank >= rewardItem.rankRange[0] && rank <= rewardItem.rankRange[1]) {
                        reward = rewardItem;
                        break;
                    }
                }

                if (reward) {
                    // 记录结算
                    await ctx.db.insert("leaderboard_settlements", {
                        leaderboardType: "daily",
                        date,
                        gameType,
                        uid: entry.uid,
                        rank,
                        totalScore: entry.totalScore,
                        rankPointsReward: reward.rankPoints,
                        seasonPointsReward: reward.seasonPoints,
                        coinsReward: reward.coins,
                        isTicketPlayer,
                        claimed: false,
                        createdAt: now.iso
                    });

                    rewardsIssued++;
                }
            }

            // 记录重置
            await ctx.db.insert("leaderboard_resets", {
                leaderboardType: "daily",
                date,
                gameType,
                totalPlayers: leaderboard.length,
                totalRewards: rewardsIssued,
                resetAt: now.iso,
                createdAt: now.iso
            });

            return {
                success: true,
                message: `每日排行榜结算完成，发放了 ${rewardsIssued} 个奖励`,
                rewardsIssued
            };
        } catch (error) {
            console.error("结算每日排行榜失败:", error);
            return {
                success: false,
                message: "结算每日排行榜失败"
            };
        }
    }

    /**
     * 结算每周排行榜并发放奖励
     */
    static async settleWeeklyLeaderboard(ctx: any, params: {
        weekStart: string;
        gameType: string;
    }): Promise<{ success: boolean; message: string; rewardsIssued?: number }> {
        const { weekStart, gameType } = params;
        const now = getTorontoMidnight();

        try {
            // 获取排行榜配置
            const config = this.getLeaderboardConfigs().find(c =>
                c.leaderboardType === "weekly" && c.gameType === gameType
            );

            if (!config) {
                return { success: false, message: "排行榜配置不存在" };
            }

            // 获取本周排行榜
            const leaderboard = await ctx.db.query("weekly_leaderboard_points")
                .withIndex("by_week_game", (q: any) => q.eq("weekStart", weekStart).eq("gameType", gameType))
                .order("desc")
                .collect();

            let rewardsIssued = 0;

            // 发放奖励
            for (let i = 0; i < leaderboard.length; i++) {
                const entry = leaderboard[i];
                const rank = i + 1;
                const isTicketPlayer = entry.isTicketPlayer;
                const rewardConfig = isTicketPlayer ? config.rewards : config.rewards;

                // 查找匹配的奖励配置
                let reward: LeaderboardReward | undefined;

                // 检查所有奖励配置
                for (const rewardItem of rewardConfig) {
                    if (rewardItem && rank >= rewardItem.rankRange[0] && rank <= rewardItem.rankRange[1]) {
                        reward = rewardItem;
                        break;
                    }
                }

                if (reward) {
                    // 记录结算
                    await ctx.db.insert("leaderboard_settlements", {
                        leaderboardType: "weekly",
                        date: weekStart,
                        gameType,
                        uid: entry.uid,
                        rank,
                        totalScore: entry.totalScore,
                        rankPointsReward: reward.rankPoints,
                        seasonPointsReward: reward.seasonPoints,
                        coinsReward: reward.coins,
                        isTicketPlayer,
                        claimed: false,
                        createdAt: now.iso
                    });

                    rewardsIssued++;
                }
            }

            // 记录重置
            await ctx.db.insert("leaderboard_resets", {
                leaderboardType: "weekly",
                date: weekStart,
                gameType,
                totalPlayers: leaderboard.length,
                totalRewards: rewardsIssued,
                resetAt: now.iso,
                createdAt: now.iso
            });

            return {
                success: true,
                message: `每周排行榜结算完成，发放了 ${rewardsIssued} 个奖励`,
                rewardsIssued
            };
        } catch (error) {
            console.error("结算每周排行榜失败:", error);
            return {
                success: false,
                message: "结算每周排行榜失败"
            };
        }
    }

    // ============================================================================
    // 奖励领取
    // ============================================================================

    /**
     * 领取排行榜奖励
     */
    static async claimLeaderboardReward(ctx: any, params: {
        uid: string;
        leaderboardType: "daily" | "weekly";
        date: string;
        gameType: string;
    }): Promise<{ success: boolean; message: string; rewards?: any }> {
        const { uid, leaderboardType, date, gameType } = params;
        const now = getTorontoMidnight();

        try {
            // 查找未领取的奖励
            const settlement = await ctx.db.query("leaderboard_settlements")
                .withIndex("by_uid_type_date", (q: any) =>
                    q.eq("uid", uid)
                        .eq("leaderboardType", leaderboardType)
                        .eq("date", date)
                )
                .filter((q: any) => q.eq(q.field("gameType"), gameType))
                .filter((q: any) => q.eq(q.field("claimed"), false))
                .unique();

            if (!settlement) {
                return { success: false, message: "没有可领取的奖励" };
            }

            // 标记为已领取
            await ctx.db.patch(settlement._id, {
                claimed: true,
                claimedAt: now.iso
            });

            // 发放奖励到玩家账户
            const player = await ctx.db.query("players")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .unique();

            if (player) {
                // 更新金币
                await ctx.db.patch(player._id, {
                    coins: player.coins + settlement.coinsReward
                });
            }

            return {
                success: true,
                message: `成功领取排行榜奖励：rankPoints +${settlement.rankPointsReward}, seasonPoints +${settlement.seasonPointsReward}, coins +${settlement.coinsReward}`,
                rewards: {
                    rankPoints: settlement.rankPointsReward,
                    seasonPoints: settlement.seasonPointsReward,
                    coins: settlement.coinsReward
                }
            };
        } catch (error) {
            console.error("领取排行榜奖励失败:", error);
            return {
                success: false,
                message: "领取排行榜奖励失败"
            };
        }
    }

    // ============================================================================
    // 私有辅助方法
    // ============================================================================

    /**
     * 获取周开始日期
     */
    private static getWeekStart(date: Date): string {
        const weekStart = new Date(date);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // 周一开始
        return weekStart.toISOString().split('T')[0];
    }

    /**
     * 获取周结束日期
     */
    private static getWeekEnd(date: Date): string {
        const weekEnd = new Date(date);
        weekEnd.setDate(weekEnd.getDate() - weekEnd.getDay() + 7); // 周日结束
        return weekEnd.toISOString().split('T')[0];
    }

} 