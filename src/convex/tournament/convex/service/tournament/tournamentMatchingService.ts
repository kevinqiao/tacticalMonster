import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";
import { getTorontoDate } from "../utils";
import { MatchManager } from "./matchManager";

/**
 * 锦标赛匹配服务
 * 基于锦标赛本身的匹配机制，支持技能匹配、段位匹配和智能排队
 */
export class TournamentMatchingService {
    /**
     * 加入锦标赛匹配
     */
    static async joinTournamentMatch(ctx: any, params: {
        uid: string;
        tournamentId: string;
        gameType: string;
        player: any;
        config: any;
    }) {
        const now = getTorontoDate();
        const { uid, tournamentId, gameType, player, config } = params;
        const matchRules = config.matchRules;
        const advanced = config.advanced;

        try {
            // 1. 验证锦标赛状态
            const tournament = await ctx.db.get(tournamentId);
            if (!tournament || tournament.status !== "open") {
                throw new Error("锦标赛不存在或已关闭");
            }

            // 2. 查找可用的比赛
            let match = await this.findBestMatch(ctx, {
                tournamentId,
                gameType,
                player,
                config
            });

            // 3. 如果没有合适的比赛，创建新比赛
            if (!match) {
                const matchId = await MatchManager.createMatch(ctx, {
                    tournamentId,
                    gameType,
                    matchType: "tournament_match",
                    maxPlayers: matchRules?.maxPlayers || 4,
                    minPlayers: matchRules?.minPlayers || 2,
                    gameData: {
                        matchType: "tournament_based",
                        createdAt: now.iso,
                        matchingAlgorithm: advanced?.matching?.algorithm || "skill_based"
                    }
                });
                match = await ctx.db.get(matchId);
            }

            // 4. 检查玩家是否已在此比赛中
            const existingPlayer = await ctx.db
                .query("player_matches")
                .withIndex("by_match_uid", (q: any) => q.eq("matchId", match._id).eq("uid", uid))
                .first();

            if (existingPlayer) {
                return {
                    success: true,
                    matchId: match._id,
                    playerMatchId: existingPlayer._id,
                    status: "already_joined",
                    message: "已在此比赛中"
                };
            }

            // 5. 玩家加入比赛
            const playerMatchId = await MatchManager.joinMatch(ctx, {
                matchId: match._id,
                tournamentId,
                uid,
                gameType
            });

            // 6. 检查是否达到开始条件
            const currentPlayers = await ctx.db
                .query("player_matches")
                .withIndex("by_match", (q: any) => q.eq("matchId", match._id))
                .collect();

            let gameResult: any = undefined;
            let matchStatus = "waiting";

            if (this.shouldStartMatch(ctx, { match, currentPlayers, config })) {
                // 创建远程游戏
                gameResult = await MatchManager.createRemoteGame(ctx, {
                    matchId: match._id,
                    tournamentId,
                    uids: currentPlayers.map((p: any) => p.uid),
                    gameType,
                    matchType: "tournament_match"
                });

                matchStatus = "started";

                // 记录匹配成功事件
                await ctx.db.insert("match_events", {
                    matchId: match._id,
                    tournamentId,
                    eventType: "tournament_match_started",
                    eventData: {
                        players: currentPlayers.map((p: any) => p.uid),
                        gameId: gameResult.gameId,
                        playerCount: currentPlayers.length,
                        matchingAlgorithm: advanced?.matching?.algorithm
                    },
                    timestamp: now.iso,
                    createdAt: now.iso
                });
            }

            return {
                success: true,
                matchId: match._id,
                playerMatchId,
                gameId: gameResult ? gameResult.gameId : undefined,
                serverUrl: gameResult ? gameResult.serverUrl : undefined,
                status: matchStatus,
                matchInfo: {
                    currentPlayers: currentPlayers.length,
                    maxPlayers: match.maxPlayers,
                    minPlayers: match.minPlayers,
                    isReady: currentPlayers.length >= match.minPlayers,
                    message: this.getMatchStatusMessage(currentPlayers.length, match.minPlayers, matchStatus)
                }
            };

        } catch (error) {
            console.error("加入锦标赛匹配失败:", error);
            throw error;
        }
    }

    /**
     * 查找最佳匹配
     */
    private static async findBestMatch(ctx: any, params: {
        tournamentId: string;
        gameType: string;
        player: any;
        config: any;
    }) {
        const { tournamentId, gameType, player, config } = params;

        // 获取所有待匹配的比赛
        const availableMatches = await ctx.db
            .query("matches")
            .withIndex("by_tournament", (q: any) => q.eq("tournamentId", tournamentId))
            .filter((q: any) => q.eq(q.field("status"), "pending"))
            .collect();

        const eligibleMatches = [];

        for (const match of availableMatches) {
            const playerMatches = await ctx.db
                .query("player_matches")
                .withIndex("by_match", (q: any) => q.eq("matchId", match._id))
                .collect();

            // 检查人数限制
            if (playerMatches.length >= match.maxPlayers) continue;

            // 检查匹配兼容性
            const compatibility = await this.checkMatchCompatibility(ctx, {
                match,
                playerMatches,
                player,
                config
            });

            if (compatibility.compatible) {
                eligibleMatches.push({
                    match,
                    playerCount: playerMatches.length,
                    compatibility: compatibility.score,
                    priority: this.calculateMatchPriority(match, playerMatches.length, compatibility.score)
                });
            }
        }

        // 按优先级排序，选择最佳匹配
        eligibleMatches.sort((a: any, b: any) => b.priority - a.priority);
        return eligibleMatches.length > 0 ? eligibleMatches[0].match : null;
    }

    /**
     * 检查比赛兼容性
     */
    private static async checkMatchCompatibility(ctx: any, params: {
        match: any;
        playerMatches: any[];
        player: any;
        config: any;
    }) {
        const { match, playerMatches, player, config } = params;
        const advanced = config.advanced;

        // 如果没有其他玩家，直接匹配
        if (playerMatches.length === 0) {
            return { compatible: true, score: 1.0 };
        }

        const algorithm = advanced?.matching?.algorithm || "skill_based";
        let score = 0;

        switch (algorithm) {
            case "skill_based":
                score = await this.calculateSkillCompatibility(ctx, { playerMatches, player });
                break;
            case "segment_based":
                score = await this.calculateSegmentCompatibility(ctx, { playerMatches, player });
                break;
            case "elo_based":
                score = await this.calculateEloCompatibility(ctx, { playerMatches, player });
                break;
            case "random":
                score = 0.5; // 随机匹配给中等分数
                break;
            default:
                score = await this.calculateSkillCompatibility(ctx, { playerMatches, player });
        }

        const compatible = score >= (advanced?.matching?.skillRange || 0.3);
        return { compatible, score };
    }

    /**
     * 计算技能兼容性
     */
    private static async calculateSkillCompatibility(ctx: any, params: {
        playerMatches: any[];
        player: any;
    }) {
        const { playerMatches, player } = params;

        let totalScore = 0;
        let playerCount = 0;

        for (const playerMatch of playerMatches) {
            const otherPlayer = await ctx.db
                .query("players")
                .withIndex("by_uid", (q: any) => q.eq("uid", playerMatch.uid))
                .first();

            if (otherPlayer) {
                const skillDiff = Math.abs((player.totalPoints || 1000) - (otherPlayer.totalPoints || 1000));
                const compatibility = Math.max(0, 1 - skillDiff / 2000); // 2000分差为0兼容性
                totalScore += compatibility;
                playerCount++;
            }
        }

        return playerCount > 0 ? totalScore / playerCount : 1.0;
    }

    /**
     * 计算段位兼容性
     */
    private static async calculateSegmentCompatibility(ctx: any, params: {
        playerMatches: any[];
        player: any;
    }) {
        const { playerMatches, player } = params;

        const segments = ["bronze", "silver", "gold", "platinum", "diamond"];
        const playerIndex = segments.indexOf(player.segmentName);
        let totalScore = 0;
        let playerCount = 0;

        for (const playerMatch of playerMatches) {
            const otherPlayer = await ctx.db
                .query("players")
                .withIndex("by_uid", (q: any) => q.eq("uid", playerMatch.uid))
                .first();

            if (otherPlayer) {
                const otherIndex = segments.indexOf(otherPlayer.segmentName);
                const segmentDiff = Math.abs(playerIndex - otherIndex);
                const compatibility = Math.max(0, 1 - segmentDiff / 4); // 4个段位差为0兼容性
                totalScore += compatibility;
                playerCount++;
            }
        }

        return playerCount > 0 ? totalScore / playerCount : 1.0;
    }

    /**
     * 计算ELO兼容性
     */
    private static async calculateEloCompatibility(ctx: any, params: {
        playerMatches: any[];
        player: any;
    }) {
        const { playerMatches, player } = params;

        let totalScore = 0;
        let playerCount = 0;

        for (const playerMatch of playerMatches) {
            const otherPlayer = await ctx.db
                .query("players")
                .withIndex("by_uid", (q: any) => q.eq("uid", playerMatch.uid))
                .first();

            if (otherPlayer) {
                const eloDiff = Math.abs((player.eloScore || 1000) - (otherPlayer.eloScore || 1000));
                const compatibility = Math.max(0, 1 - eloDiff / 400); // 400分差为0兼容性
                totalScore += compatibility;
                playerCount++;
            }
        }

        return playerCount > 0 ? totalScore / playerCount : 1.0;
    }

    /**
     * 计算比赛优先级
     */
    private static calculateMatchPriority(match: any, playerCount: number, compatibilityScore: number): number {
        // 等待时间优先级
        const waitTime = new Date().getTime() - new Date(match.createdAt).getTime();
        const timePriority = Math.min(waitTime / 60000, 10); // 最多10分优先级

        // 人数平衡优先级
        const balancePriority = 10 - Math.abs(match.maxPlayers / 2 - playerCount);

        // 兼容性优先级
        const compatibilityPriority = compatibilityScore * 10;

        return timePriority + balancePriority + compatibilityPriority;
    }

    /**
     * 判断是否应该开始比赛
     */
    private static shouldStartMatch(ctx: any, params: {
        match: any;
        currentPlayers: any[];
        config: any;
    }) {
        const { match, currentPlayers, config } = params;
        const advanced = config.advanced;

        // 达到最小人数
        if (currentPlayers.length >= match.minPlayers) {
            // 达到最大人数
            if (currentPlayers.length >= match.maxPlayers) {
                return true;
            }

            // 等待时间过长
            const waitTime = new Date().getTime() - new Date(match.createdAt).getTime();
            const maxWaitTime = (advanced?.matching?.maxWaitTime || 60) * 1000; // 转换为毫秒

            if (waitTime > maxWaitTime) {
                return true;
            }

            // 如果配置了AI回退且等待时间超过阈值
            if (advanced?.matching?.fallbackToAI && waitTime > maxWaitTime / 2) {
                return true;
            }
        }

        return false;
    }

    /**
     * 获取比赛状态消息
     */
    private static getMatchStatusMessage(currentPlayers: number, minPlayers: number, status: string): string {
        switch (status) {
            case "started":
                return "比赛已开始";
            case "waiting":
                return `等待更多玩家加入 (${currentPlayers}/${minPlayers})`;
            default:
                return "匹配中...";
        }
    }

    /**
     * 获取匹配状态
     */
    static async getMatchStatus(ctx: any, params: {
        uid: string;
        tournamentId: string;
        gameType: string;
    }) {
        const { uid, tournamentId, gameType } = params;

        try {
            // 查找玩家的比赛
            const playerMatches = await ctx.db
                .query("player_matches")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .filter((q: any) => q.eq(q.field("tournamentId"), tournamentId))
                .filter((q: any) => q.eq(q.field("gameType"), gameType))
                .order("desc")
                .take(1);

            if (playerMatches.length === 0) {
                return {
                    inMatch: false,
                    message: "未找到匹配"
                };
            }

            const playerMatch = playerMatches[0];
            const match = await ctx.db.get(playerMatch.matchId);

            if (!match) {
                return {
                    inMatch: false,
                    message: "比赛不存在"
                };
            }

            // 获取所有玩家
            const allPlayers = await ctx.db
                .query("player_matches")
                .withIndex("by_match", (q: any) => q.eq("matchId", match._id))
                .collect();

            return {
                inMatch: true,
                matchId: match._id,
                playerMatchId: playerMatch._id,
                status: match.status,
                currentPlayers: allPlayers.length,
                maxPlayers: match.maxPlayers,
                minPlayers: match.minPlayers,
                gameId: match.gameId,
                serverUrl: match.serverUrl,
                message: this.getMatchStatusMessage(allPlayers.length, match.minPlayers, match.status)
            };

        } catch (error) {
            console.error("获取匹配状态失败:", error);
            throw error;
        }
    }

    /**
     * 离开匹配
     */
    static async leaveMatch(ctx: any, params: {
        uid: string;
        tournamentId: string;
        gameType: string;
    }) {
        const now = getTorontoDate();
        const { uid, tournamentId, gameType } = params;

        try {
            // 查找玩家的比赛
            const playerMatches = await ctx.db
                .query("player_matches")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .filter((q: any) => q.eq(q.field("tournamentId"), tournamentId))
                .filter((q: any) => q.eq(q.field("gameType"), gameType))
                .filter((q: any) => q.eq(q.field("completed"), false))
                .collect();

            for (const playerMatch of playerMatches) {
                const match = await ctx.db.get(playerMatch.matchId);
                if (match && match.status === "pending") {
                    // 删除玩家比赛记录
                    await ctx.db.delete(playerMatch._id);

                    // 记录离开事件
                    await ctx.db.insert("match_events", {
                        matchId: match._id,
                        tournamentId,
                        uid,
                        eventType: "player_left_match",
                        eventData: { reason: "manual_leave" },
                        timestamp: now.iso,
                        createdAt: now.iso
                    });
                }
            }

            return { success: true, message: "已离开匹配" };

        } catch (error) {
            console.error("离开匹配失败:", error);
            throw error;
        }
    }
}

// Convex 函数接口
export const joinTournamentMatch = (mutation as any)({
    args: {
        uid: v.string(),
        tournamentId: v.id("tournaments"),
        gameType: v.string(),
    },
    handler: async (ctx: any, args: any): Promise<any> => {
        // 获取玩家信息
        const player = await ctx.db
            .query("players")
            .withIndex("by_uid", (q: any) => q.eq("uid", args.uid))
            .first();
        if (!player) {
            throw new Error("玩家不存在");
        }

        // 获取锦标赛配置
        const tournament = await ctx.db.get(args.tournamentId);
        if (!tournament) {
            throw new Error("锦标赛不存在");
        }

        // 使用新的schema结构
        const config = {
            entryRequirements: tournament.config?.entryRequirements,
            matchRules: tournament.config?.matchRules,
            rewards: tournament.config?.rewards,
            schedule: tournament.config?.schedule,
            limits: tournament.config?.limits,
            advanced: tournament.config?.advanced
        };

        return await TournamentMatchingService.joinTournamentMatch(ctx, {
            uid: args.uid,
            tournamentId: args.tournamentId,
            gameType: args.gameType,
            player,
            config
        });
    },
});

export const getMatchStatus = (query as any)({
    args: {
        uid: v.string(),
        tournamentId: v.id("tournaments"),
        gameType: v.string(),
    },
    handler: async (ctx: any, args: any): Promise<any> => {
        return await TournamentMatchingService.getMatchStatus(ctx, args);
    },
});

export const leaveMatch = (mutation as any)({
    args: {
        uid: v.string(),
        tournamentId: v.id("tournaments"),
        gameType: v.string(),
    },
    handler: async (ctx: any, args: any): Promise<any> => {
        return await TournamentMatchingService.leaveMatch(ctx, args);
    },
}); 