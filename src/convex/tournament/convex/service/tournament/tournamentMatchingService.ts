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
        tournamentId?: string; // 可选，独立模式下不需要     
        typeId: string; // 新增：锦标赛类型，独立模式下需要
        uid: string;
        gameType?: string; // 游戏类型（用于判断是否需要 tier/power 匹配）
        metadata?: any; // 元数据（包含 tier, teamPower 等）
    }) {
        const nowISO = new Date().toISOString();
        const { tournamentId, typeId, uid } = params;
        try {


            // 1. 检查是否已在队列中
            const existingQueue = await ctx.db.query("matchingQueue").withIndex("by_uid", (q: any) => q.eq("uid", uid)).first();

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

            // 5. 加入匹配队列（保存 metadata，包含 tier 和 teamPower）
            const queueId = await ctx.db.insert("matchingQueue", {
                uid,
                tournamentId,
                tournamentType: typeId,
                status: "waiting",
                joinedAt: nowISO,
                createdAt: nowISO,
                updatedAt: nowISO,
                metadata: params.metadata || undefined, // 保存 tier 和 teamPower 信息
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
     * 对于 TacticalMonster 游戏，在 tier 内按 power 范围（动态范围）匹配
     * 
     * 优化：
     * - 支持动态匹配范围（根据等待时间扩大）
     * - 使用匹配度评分系统
     * - 优先匹配等待时间长的玩家
     */
    private static async processQueueGroup(ctx: any, queueGroup: any[], now: any) {
        const { tournamentId, tournamentType } = queueGroup[0];
        const config = await ctx.db.query("tournament_types").withIndex("by_typeId", (q: any) => q.eq("typeId", tournamentType)).first();

        // 如果是 TacticalMonster 游戏且有 metadata（包含 tier 和 teamPower），进行 power 范围匹配
        let matchedGroup = queueGroup;
        if (config.gameType === "tacticalMonster" && queueGroup[0].metadata?.tier && queueGroup[0].metadata?.teamPower) {
            matchedGroup = this.matchByPowerRange(queueGroup, config.matchRules.maxPlayers);
        }

        if (config.matchRules.minPlayers > matchedGroup.length) {
            return;
        }
        const group = matchedGroup.length < config.matchRules.maxPlayers ? matchedGroup : matchedGroup.slice(0, config.matchRules.maxPlayers);
        const uids = group.map((player: any) => player.uid);
        let tid;
        if (!tournamentId) {
            console.log("createTournament players:", uids)
            tid = await createTournament(ctx, {
                tournamentType: config,
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
     * 按 Power 范围匹配（动态范围，参考 Clash Royale）
     * 用于 TacticalMonster 游戏的 tier 内匹配
     * 
     * 优化策略：
     * 1. 基础匹配范围：±10%
     * 2. 动态扩大范围：根据等待时间扩大匹配范围
     *    - 等待 30 秒：扩大到 ±15%
     *    - 等待 60 秒：扩大到 ±20%
     *    - 等待 90 秒：扩大到 ±30%
     * 3. 匹配度评分：综合考虑 Power 差异和等待时间
     * 4. 优先匹配等待时间长的玩家
     */
    private static matchByPowerRange(queues: any[], maxPlayers: number): any[] {
        if (queues.length === 0) return [];

        const now = Date.now();

        // 按加入时间排序（先加入的优先匹配）
        const sortedQueues = [...queues].sort((a, b) =>
            new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()
        );

        // 以第一个玩家（等待时间最长）为中心进行匹配
        const firstPlayer = sortedQueues[0];
        const teamPower = firstPlayer.metadata?.teamPower || 0;

        if (teamPower === 0) {
            // 如果没有 power 信息，返回所有玩家（降级处理）
            return sortedQueues.slice(0, maxPlayers);
        }

        // 计算第一个玩家的等待时间（毫秒）
        const firstPlayerWaitTime = now - new Date(firstPlayer.joinedAt).getTime();

        // 动态计算 power 匹配范围
        let powerRangePercent = 0.1; // 基础 ±10%

        if (firstPlayerWaitTime > 90000) { // 等待超过 90 秒
            powerRangePercent = 0.3; // ±30%
        } else if (firstPlayerWaitTime > 60000) { // 等待超过 60 秒
            powerRangePercent = 0.2; // ±20%
        } else if (firstPlayerWaitTime > 30000) { // 等待超过 30 秒
            powerRangePercent = 0.15; // ±15%
        }

        const powerRange = {
            min: Math.floor(teamPower * (1 - powerRangePercent)),
            max: Math.ceil(teamPower * (1 + powerRangePercent)),
        };

        // 计算所有候选玩家的匹配度分数
        const candidates: Array<{ queue: any; score: number }> = [];

        for (let i = 1; i < sortedQueues.length; i++) {
            const other = sortedQueues[i];
            const otherPower = other.metadata?.teamPower || 0;

            // 如果 power 在范围内，计算匹配度分数
            if (otherPower >= powerRange.min && otherPower <= powerRange.max) {
                const score = this.calculateMatchScore(
                    firstPlayer,
                    other,
                    teamPower,
                    otherPower,
                    now
                );
                candidates.push({ queue: other, score });
            }
        }

        // 按匹配度分数排序（分数越高越好）
        candidates.sort((a, b) => b.score - a.score);

        // 构建匹配组
        const matchedGroup = [firstPlayer];
        for (const candidate of candidates) {
            if (matchedGroup.length >= maxPlayers) break;
            matchedGroup.push(candidate.queue);
        }

        return matchedGroup;
    }

    /**
     * 计算匹配度分数
     * 综合考虑 Power 差异和等待时间
     * 
     * @param firstPlayer 第一个玩家（等待时间最长）
     * @param candidate 候选玩家
     * @param firstPower 第一个玩家的 Power
     * @param candidatePower 候选玩家的 Power
     * @param now 当前时间戳
     * @returns 匹配度分数（越高越好）
     */
    private static calculateMatchScore(
        firstPlayer: any,
        candidate: any,
        firstPower: number,
        candidatePower: number,
        now: number
    ): number {
        let score = 100;

        // 1. Power 差异（越小越好）
        const powerDiff = Math.abs(firstPower - candidatePower);
        const powerDiffPercent = powerDiff / Math.max(firstPower, candidatePower);
        score -= powerDiffPercent * 50; // 每 1% 差异扣 0.5 分

        // 2. 等待时间奖励（优先匹配等待时间长的玩家）
        const candidateWaitTime = now - new Date(candidate.joinedAt).getTime();
        const waitTimeBonus = Math.min(candidateWaitTime / 1000, 30); // 最多加 30 分
        score += waitTimeBonus;

        // 3. Power 接近度奖励（Power 越接近，分数越高）
        const powerRatio = Math.min(firstPower, candidatePower) / Math.max(firstPower, candidatePower);
        score += powerRatio * 20; // 最多加 20 分

        return Math.max(0, score);
    }

    private static async getPlayers(ctx: any, tournamentType: any, group: any[]): Promise<string[]> {
        const player = group[0].playerInfo;
        return [];
    }
    private static async processMatching(ctx: any, typeId: string) {
        const tournamentType = await ctx.db.query("tournament_types").withIndex("by_typeId", (q: any) => q.eq("typeId", typeId)).first();
        const group = await ctx.db.query("matchingQueue").withIndex("by_tournament_type", (q: any) => q.eq("tournamentType", typeId)).collect();
        if (group.length > 0) {
            const players = await this.getPlayers(ctx, tournamentType, group);
            if (players.length > 0) {
                await MatchManager.createMatch(ctx, {
                    uids: players,
                    tournamentId: tournamentType._id,
                    typeId: tournamentType.typeId,
                });
            }
        }
    }

    /**
     * 按类型分组队列
     * 对于 TacticalMonster 游戏，同时按 tier 分组
     */
    private static groupQueuesByType(queues: any[]) {
        const groups = new Map();

        for (const queue of queues) {
            // 基础分组键：tournamentType
            let key = `${queue.tournamentId ?? queue.tournamentType}`;

            // 对于 TacticalMonster 游戏，同时按 tier 分组
            if (queue.metadata?.tier) {
                key = `${key}_tier_${queue.metadata.tier}`;
            }

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

                    // 段位系统已移除，不再统计段位分布
                    // const segment = player.playerInfo.segmentName;
                    // stats.segmentDistribution[segment] = (stats.segmentDistribution[segment] || 0) + 1;

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
export const joinMatchingQueue = mutation({
    args: {
        uid: v.string(),
        tournamentId: v.optional(v.string()),
        typeId: v.string(),
        gameType: v.optional(v.string()),
        metadata: v.optional(v.any()), // 包含 tier, teamPower 等
    },
    handler: async (ctx: any, args: any) => {
        // 获取玩家信息
        return await TournamentMatchingService.joinMatchingQueue(ctx, {
            tournamentId: args.tournamentId,
            typeId: args.typeId,
            uid: args.uid,
            gameType: args.gameType,
            metadata: args.metadata,
        });
    },
});


export const cancelMatching = mutation({
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

export const cleanupExpiredQueue = mutation({
    args: {},
    handler: async (ctx: any, args: any) => {
        return await TournamentMatchingService.cleanupExpiredQueue(ctx);
    },
});

export const getQueueStats = query({
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
export const executeMatchingTask = internalMutation({
    args: {},
    handler: async (ctx: any) => {
        const tournamentTypes = await ctx.db.query("tournament_types").collect();
        for (const tournamentType of tournamentTypes) {
            ctx.scheduler.runAfter(0, "processMatching", { typeId: tournamentType.typeId });
        }

    },
});
export const processMatching = internalMutation({
    args: { typeId: v.string() },
    handler: async (ctx: any, { typeId }) => {

    },
});