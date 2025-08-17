import { v } from "convex/values";
import { internalMutation, mutation, query } from "../../_generated/server";
import { createTournament, joinTournament } from "./common";
import { MatchManager } from "./matchManager";

/**
 * 基于 matchingQueue 表的锦标赛匹配服务
 * 支持多人匹配、优先级队列、智能算法
 * 支持两种模式：
 * 1. 传统模式：先创建锦标赛，再进行匹配
 * 2. 独立模式：先进行匹配，匹配成功后为每场比赛创建独立锦标赛
 * 
 * 架构设计：
 * - 前端只负责加入/退出队列和查询状态
 * - 后台定时任务负责执行匹配逻辑
 * - 通过事件系统通知匹配结果
 * - 集成段位系统进行智能匹配
 */
export class TournamentMatchingService {

    /**
     * 加入匹配队列
     * 只负责将玩家加入队列，不执行匹配逻辑
     * 集成段位系统，确保玩家段位已初始化
     */
    static async joinMatchingQueue(ctx: any, params: {
        tournament: any; // 可选，独立模式下不需要     
        tournamentType: any; // 新增：锦标赛类型，独立模式下需要
        player: any;

    }) {
        const nowISO = new Date().toISOString();
        const { tournament, tournamentType, player } = params;
        try {
            const config = tournamentType.config;

            // 1. 检查是否已在队列中
            const existingQueue = await ctx.db.query("matchingQueue").withIndex("by_uid", (q: any) => q.eq("uid", player.uid)).first();

            if (existingQueue) {
                console.log("existingQueue", existingQueue)
                return {
                    success: true,
                    queueId: existingQueue._id,
                    status: "already_in_queue",
                    message: "已在匹配队列中"
                };
            }

            // 2. 确保玩家段位已初始化
            // let playerSegment = await ctx.db
            //     .query("player_segments")
            //     .withIndex("by_uid_game", (q: any) => q.eq("uid", player.uid).eq("gameType", tournamentType.gameType))
            //     .first();

            // if (!playerSegment) {
            //     // 初始化玩家段位
            //     await SegmentSystem.initializePlayerSegment(ctx, player.uid, tournamentType.gameType);
            //     playerSegment = await ctx.db
            //         .query("player_segments")
            //         .withIndex("by_uid_game", (q: any) => q.eq("uid", player.uid).eq("gameType", tournamentType.gameType))
            //         .first();
            // }

            // 3. 计算优先级和权重（基于段位系统）
            // const priority = this.calculatePriority(player, config, playerSegment);
            // const weight = this.calculateWeight(player, config, playerSegment);

            // 4. 创建匹配配置
            // const matchingConfig = {
            //     algorithm: config.advanced?.matching?.algorithm || "skill_based",
            //     maxWaitTime: config.advanced?.matching?.maxWaitTime || 300,
            //     skillRange: config.advanced?.matching?.skillRange || 200,
            //     eloRange: config.advanced?.matching?.eloRange || 100,
            //     segmentRange: config.advanced?.matching?.segmentRange || 1,
            //     fallbackToAI: config.advanced?.matching?.fallbackToAI || false
            // };

            // 5. 加入匹配队列
            const queueId = await ctx.db.insert("matchingQueue", {
                uid: params.player.uid,
                tournamentId: tournament?._id,
                tournamentType: tournamentType.typeId,
                playerInfo: {
                    uid: player.uid,
                    skill: player.totalPoints || 1000,
                    // segmentName: playerSegment?.segmentName || "Bronze",
                    // segmentTier: SegmentSystem.getSegmentTier(playerSegment?.segmentName || "Bronze"),
                    // segmentPoints: playerSegment?.currentPoints || 0,
                    eloScore: player.eloScore,
                    totalPoints: player.totalPoints,
                    isSubscribed: player.isSubscribed
                },
                // matchingConfig,
                status: "waiting",
                joinedAt: nowISO,
                // priority,
                // weight,
                metadata: {
                    config: config,
                    playerLevel: player.level,
                    playerRank: player.rank,
                    // segmentInfo: {
                    //     name: playerSegment?.segmentName,
                    //     tier: SegmentSystem.getSegmentTier(playerSegment?.segmentName || "Bronze"),
                    //     points: playerSegment?.currentPoints || 0
                    // }
                },
                createdAt: nowISO,
                updatedAt: nowISO
            });

            // 6. 记录匹配事件
            // await ctx.db.insert("match_events", {
            //     matchId: undefined,
            //     tournamentId: tournament._id || undefined,
            //     uid: params.player.uid,
            //     eventType: "player_joined_queue",
            //     eventData: {
            //         algorithm: matchingConfig.algorithm,
            //         // priority,
            //         // weight,
            //         queueId,
            //         segmentInfo: {
            //             name: playerSegment?.segmentName,
            //             tier: SegmentSystem.getSegmentTier(playerSegment?.segmentName || "Bronze"),
            //             points: playerSegment?.currentPoints || 0
            //         }
            //     },
            //     timestamp: now.iso,
            //     createdAt: now.iso
            // });

            return {
                success: true,
                queueId,
                status: "joined",
                message: "成功加入匹配队列",
                // segmentInfo: {
                //     name: playerSegment?.segmentName,
                //     tier: SegmentSystem.getSegmentTier(playerSegment?.segmentName || "Bronze"),
                //     points: playerSegment?.currentPoints || 0
                // }
            };

        } catch (error) {
            console.error("加入匹配队列失败:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "未知错误",
                message: "加入匹配队列失败"
            };
        }
    }

    /**
     * 后台执行匹配任务
     * 由定时任务调用，执行实际的匹配逻辑
     */
    static async executeMatchingTask(ctx: any, params: {
        batchSize?: number;
        maxProcessingTime?: number;
    }) {
        const { batchSize = 50, maxProcessingTime = 30000 } = params; // 默认30秒处理时间
        const startTime = Date.now();
        const nowISO = new Date().toISOString();

        console.log("开始执行匹配任务");

        try {
            let processedCount = 0;
            let matchedCount = 0;
            let errorCount = 0;

            // 1. 获取所有等待中的队列条目
            const waitingQueues = await ctx.db
                .query("matchingQueue")
                .withIndex("by_status_priority", (q: any) => q.eq("status", "waiting"))
                .order("asc") // 按优先级排序，优先级高的先处理
                .take(batchSize);

            if (waitingQueues.length === 0) {
                return {
                    success: true,
                    message: "没有等待中的匹配队列",
                    processedCount: 0,
                    matchedCount: 0,
                    errorCount: 0
                };
            }

            // 2. 按模式和锦标赛类型分组处理
            const queueGroups = this.groupQueuesByType(waitingQueues);
            console.log("queueGroups", queueGroups)
            for (const group of queueGroups) {
                // 检查处理时间限制
                if (Date.now() - startTime > maxProcessingTime) {
                    console.log("达到最大处理时间限制，停止处理");
                    break;
                }

                try {
                    await this.processQueueGroup(ctx, group, nowISO);
                } catch (error) {
                    console.error(`处理队列组失败:`, error);
                    errorCount += group.length;
                }
            }

            console.log(`匹配任务完成: 处理${processedCount}个，匹配${matchedCount}个，错误${errorCount}个`);
            return;

        } catch (error) {
            console.error("执行匹配任务失败:", error);
            throw error;
        }
    }

    /**
     * 处理队列组
     */
    private static async processQueueGroup(ctx: any, queueGroup: any[], now: any) {
        const { tournamentId, tournamentType } = queueGroup[0];
        const config = await ctx.db.query("tournament_types").withIndex("by_typeId", (q: any) => q.eq("typeId", tournamentType)).first();

        if (config.matchRules.minPlayers > queueGroup.length) {
            return;
        }
        const group = queueGroup.length < config.matchRules.maxPlayers ? queueGroup : queueGroup.slice(0, config.matchRules.maxPlayers);
        const uids = group.map((player: any) => player.uid);
        let tid;
        if (!tournamentId) {
            console.log("createTournament players:", uids)
            tid = await createTournament(ctx, {
                config,
                uids
            });
        } else {
            await joinTournament(ctx, { tournamentId, uids });
        }
        await MatchManager.createMatch(ctx, {
            uids,
            tournamentId: tid,
            typeId: tournamentType,
        });
        await Promise.all(group.map(async (item: any) => {
            await ctx.db.delete(item._id);
        }));
        return;
    }


    /**
     * 按类型分组队列
     */
    private static groupQueuesByType(queues: any[]) {
        const groups = new Map();

        for (const queue of queues) {
            const key = `${queue.tournamentId ?? queue.tournamentType}`;

            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key).push(queue);
        }

        return Array.from(groups.values());
    }

    /**
     * 取消匹配
     */
    static async cancelMatching(ctx: any, params: {
        uid: string;
    }) {
        const { uid, } = params;
        const nowISO = new Date().toISOString();

        try {
            // 查找队列条目
            const queueEntry = await ctx.db
                .query("matchingQueue")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .first();


            // 更新状态
            await ctx.db.patch(queueEntry._id, {
                status: "cancelled",
                updatedAt: nowISO
            });
            return {
                success: true,
                message: "已取消匹配"
            };

        } catch (error) {
            console.error("取消匹配失败:", error);
            throw error;
        }
    }

    /**
     * 清理过期队列
     */
    static async cleanupExpiredQueue(ctx: any) {
        const nowISO = new Date().toISOString();
        const expiredTime = new Date(Date.now() - 30 * 60 * 1000); // 30分钟前

        try {
            // 查找过期的队列条目
            const expiredEntries = await ctx.db
                .query("matchingQueue")
                .withIndex("by_joined_at", (q: any) =>
                    q.lt("joinedAt", expiredTime.toISOString())
                )
                .filter((q: any) => q.eq(q.field("status"), "waiting"))
                .collect();

            let cleanedCount = 0;

            for (const entry of expiredEntries) {
                await ctx.db.patch(entry._id, {
                    status: "expired",
                    expiredAt: nowISO,
                    updatedAt: nowISO
                });

                // 记录过期事件
                await ctx.db.insert("match_events", {
                    matchId: undefined,
                    tournamentId: entry.tournamentId,
                    uid: entry.uid,
                    eventType: "player_expired",
                    eventData: {
                        waitTime: new Date().getTime() - new Date(entry.joinedAt).getTime(),
                        queueId: entry._id,
                        mode: entry.metadata?.mode || "traditional"
                    },
                    timestamp: nowISO,
                    createdAt: nowISO
                });

                cleanedCount++;
            }

            return {
                success: true,
                cleanedCount,
                message: `清理了 ${cleanedCount} 个过期队列条目`
            };

        } catch (error) {
            console.error("清理过期队列失败:", error);
            throw error;
        }
    }

    /**
     * 获取队列统计信息
     */
    static async getQueueStats(ctx: any, params: {
        tournamentId?: string;
        gameType?: string;
        tournamentType?: string; // 新增：独立模式下需要
        mode?: string; // 新增：匹配模式
    }) {
        const { tournamentId, gameType, tournamentType, mode = "traditional" } = params;

        try {
            let query = ctx.db.query("matchingQueue");

            if (mode === "traditional" && tournamentId) {
                query = query.withIndex("by_tournament_status", (q: any) =>
                    q.eq("tournamentId", tournamentId).eq("status", "waiting")
                );
            } else if (mode === "independent" && tournamentType) {
                query = query.withIndex("by_status_priority", (q: any) =>
                    q.eq("status", "waiting")
                );
            } else {
                query = query.withIndex("by_status_priority", (q: any) =>
                    q.eq("status", "waiting")
                );
            }

            const waitingPlayers = await query.collect();

            // 过滤条件
            let filteredPlayers = waitingPlayers;

            if (mode === "traditional" && tournamentId) {
                filteredPlayers = waitingPlayers.filter((p: any) => p.tournamentId === tournamentId);
            } else if (mode === "independent" && tournamentType) {
                filteredPlayers = waitingPlayers.filter((p: any) =>
                    p.tournamentType === tournamentType &&
                    (!gameType || p.gameType === gameType)
                );
            } else if (gameType) {
                filteredPlayers = waitingPlayers.filter((p: any) => p.gameType === gameType);
            }

            // 计算统计信息
            const stats = {
                totalWaiting: filteredPlayers.length,
                averageWaitTime: 0,
                oldestWait: 0,
                algorithmDistribution: {} as Record<string, number>,
                segmentDistribution: {} as Record<string, number>,
                priorityDistribution: {
                    high: 0,
                    medium: 0,
                    low: 0
                },
                modeDistribution: {
                    traditional: 0,
                    independent: 0
                }
            };

            if (filteredPlayers.length > 0) {
                const now = new Date().getTime();
                let totalWaitTime = 0;

                for (const player of filteredPlayers) {
                    const waitTime = now - new Date(player.joinedAt).getTime();
                    totalWaitTime += waitTime;

                    // 算法分布
                    const algorithm = player.matchingConfig.algorithm;
                    stats.algorithmDistribution[algorithm] = (stats.algorithmDistribution[algorithm] || 0) + 1;

                    // 段位分布
                    const segment = player.playerInfo.segmentName;
                    stats.segmentDistribution[segment] = (stats.segmentDistribution[segment] || 0) + 1;

                    // 优先级分布
                    if (player.priority >= 150) {
                        stats.priorityDistribution.high++;
                    } else if (player.priority >= 100) {
                        stats.priorityDistribution.medium++;
                    } else {
                        stats.priorityDistribution.low++;
                    }

                    // 模式分布
                    const playerMode = player.metadata?.mode || "traditional";
                    if (playerMode === "traditional" || playerMode === "independent") {
                        stats.modeDistribution[playerMode as keyof typeof stats.modeDistribution]++;
                    }
                }

                stats.averageWaitTime = Math.floor(totalWaitTime / filteredPlayers.length / 1000);
                stats.oldestWait = Math.floor(Math.max(...filteredPlayers.map((p: any) =>
                    now - new Date(p.joinedAt).getTime()
                )) / 1000);
            }

            return {
                success: true,
                stats
            };

        } catch (error) {
            console.error("获取队列统计失败:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "未知错误"
            };
        }
    }
}

// Convex 函数接口
export const joinMatchingQueue = (mutation as any)({
    args: {
        player: v.any(),
        tournament: v.any(),
        tournamentType: v.any(),
    },
    handler: async (ctx: any, args: any) => {
        // 获取玩家信息
        const player = await ctx.db
            .query("players")
            .withIndex("by_uid", (q: any) => q.eq("uid", args.uid))
            .first();
        if (!player) {
            throw new Error("玩家不存在");
        }

        // 获取锦标赛配置


        return await TournamentMatchingService.joinMatchingQueue(ctx, {
            tournament: args.tournament,
            tournamentType: args.tournamentType,
            player,
        });
    },
});


export const cancelMatching = (mutation as any)({
    args: {
        uid: v.string(),
        tournamentId: v.optional(v.id("tournaments")),
        tournamentType: v.optional(v.string()),
        gameType: v.optional(v.string()),
        reason: v.optional(v.string()),
        mode: v.optional(v.union(v.literal("traditional"), v.literal("independent")))
    },
    handler: async (ctx: any, args: any) => {
        return await TournamentMatchingService.cancelMatching(ctx, args);
    },
});

export const cleanupExpiredQueue = (mutation as any)({
    args: {},
    handler: async (ctx: any, args: any) => {
        return await TournamentMatchingService.cleanupExpiredQueue(ctx);
    },
});

export const getQueueStats = (query as any)({
    args: {
        tournamentId: v.optional(v.id("tournaments")),
        gameType: v.optional(v.string()),
        tournamentType: v.optional(v.string()),
        mode: v.optional(v.union(v.literal("traditional"), v.literal("independent")))
    },
    handler: async (ctx: any, args: any) => {
        return await TournamentMatchingService.getQueueStats(ctx, args);
    },
});

// 后台任务接口
export const executeMatchingTask = (internalMutation as any)({
    args: {
        batchSize: v.optional(v.number()),
        maxProcessingTime: v.optional(v.number())
    },
    handler: async (ctx: any, args: any) => {
        return await TournamentMatchingService.executeMatchingTask(ctx, args);
    },
}); 