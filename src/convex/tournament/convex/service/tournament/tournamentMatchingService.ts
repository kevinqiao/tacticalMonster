import { v } from "convex/values";
import { internalMutation, mutation, query } from "../../_generated/server";
import { SegmentSystem } from "../segment/segmentSystem";
import { getTorontoDate } from "../utils";
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
        const now = getTorontoDate();
        const { tournament, tournamentType, player } = params;
        try {
            const config = tournamentType.config;

            // 1. 检查是否已在队列中
            const existingQueue = await ctx.db.query("matchingQueue").withIndex("by_uid", (q: any) => q.eq("uid", player.uid)).first();

            if (existingQueue) {
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
            const matchingConfig = {
                algorithm: config.advanced?.matching?.algorithm || "skill_based",
                maxWaitTime: config.advanced?.matching?.maxWaitTime || 300,
                skillRange: config.advanced?.matching?.skillRange || 200,
                eloRange: config.advanced?.matching?.eloRange || 100,
                segmentRange: config.advanced?.matching?.segmentRange || 1,
                fallbackToAI: config.advanced?.matching?.fallbackToAI || false
            };

            // 5. 加入匹配队列
            const queueId = await ctx.db.insert("matchingQueue", {
                uid: params.player.uid,
                tournamentId: tournament?._id,
                tournamentType,
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
                matchingConfig,
                status: "waiting",
                joinedAt: now.iso,
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
                createdAt: now.iso,
                updatedAt: now.iso
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
        const now = getTorontoDate();

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

            for (const group of queueGroups) {
                // 检查处理时间限制
                if (Date.now() - startTime > maxProcessingTime) {
                    console.log("达到最大处理时间限制，停止处理");
                    break;
                }

                try {
                    const groupResult = await this.processQueueGroup(ctx, group, now);
                    processedCount += groupResult.processed;
                    matchedCount += groupResult.matched;
                    errorCount += groupResult.errors;
                } catch (error) {
                    console.error(`处理队列组失败:`, error);
                    errorCount += group.length;
                }
            }

            console.log(`匹配任务完成: 处理${processedCount}个，匹配${matchedCount}个，错误${errorCount}个`);

            return {
                success: true,
                processedCount,
                matchedCount,
                errorCount,
                processingTime: Date.now() - startTime
            };

        } catch (error) {
            console.error("执行匹配任务失败:", error);
            throw error;
        }
    }

    /**
     * 处理队列组
     */
    private static async processQueueGroup(ctx: any, queueGroup: any[], now: any) {
        const { mode, tournamentId, gameType, tournamentType } = queueGroup[0];
        let processed = 0;
        let matched = 0;
        let errors = 0;

        // 按优先级排序
        queueGroup.sort((a, b) => b.priority - a.priority);

        // 查找兼容的玩家组合
        const compatibleGroups = await this.findCompatibleGroups(ctx, queueGroup);

        for (const group of compatibleGroups) {
            try {
                const matchResult = await this.createMatchFromGroup(ctx, group, now);
                if (matchResult.success) {
                    matched += group.length;
                    processed += group.length;
                } else {
                    errors += group.length;
                }
            } catch (error) {
                console.error("创建匹配失败:", error);
                errors += group.length;
            }
        }

        return { processed, matched, errors };
    }

    /**
     * 查找兼容的玩家组合
     */
    private static async findCompatibleGroups(ctx: any, queueGroup: any[]) {
        const compatibleGroups = [];
        const processed = new Set();

        for (const queueEntry of queueGroup) {
            if (processed.has(queueEntry._id)) continue;

            const compatiblePlayers = [queueEntry];
            processed.add(queueEntry._id);

            // 查找兼容的玩家
            for (const otherEntry of queueGroup) {
                if (processed.has(otherEntry._id)) continue;

                const compatibility = this.calculateCompatibility({
                    player1: queueEntry.playerInfo,
                    player2: otherEntry.playerInfo,
                    algorithm: queueEntry.matchingConfig.algorithm,
                    config: queueEntry.metadata.config
                });

                if (compatibility.compatible) {
                    compatiblePlayers.push(otherEntry);
                    processed.add(otherEntry._id);

                    // 检查是否达到最大玩家数
                    const maxPlayers = queueEntry.metadata.config.matchRules?.maxPlayers || 4;
                    if (compatiblePlayers.length >= maxPlayers) {
                        break;
                    }
                }
            }

            // 检查是否满足最小玩家数要求
            const minPlayers = queueEntry.metadata.config.matchRules?.minPlayers || 2;
            if (compatiblePlayers.length >= minPlayers) {
                compatibleGroups.push(compatiblePlayers);
            }
        }

        return compatibleGroups;
    }

    /**
     * 从玩家组创建匹配
     */
    private static async createMatchFromGroup(ctx: any, playerGroup: any[], now: any) {
        try {
            const firstPlayer = playerGroup[0];
            const { tournamentId, tournamentType } = firstPlayer;
            const uids = playerGroup.map((player: any) => player.uid);
            // 创建比赛
            const match = await MatchManager.createMatch(ctx, {
                uids,
                tournamentId,
                typeId: tournamentType,
            });

            // 更新所有相关玩家的队列状态
            for (const playerInfo of playerGroup) {
                await ctx.db.patch(playerInfo._id, {
                    status: "matched",
                    matchId: match._id,
                    tournamentId,
                    matchedAt: now.iso,
                    updatedAt: now.iso
                });
            }

            return {
                success: true,
                matchId: match._id,
                tournamentId,
                playerCount: playerGroup.length
            };

        } catch (error) {
            console.error("创建匹配失败:", error);
            return { success: false, error: error instanceof Error ? error.message : "未知错误" };
        }
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
     * 计算兼容性
     */
    private static calculateCompatibility(params: {
        player1: any;
        player2: any;
        algorithm: string;
        config: any;
    }) {
        const { player1, player2, algorithm, config } = params;
        const advanced = config.advanced;

        let score = 0;

        switch (algorithm) {
            case "skill_based":
                score = this.calculateSkillCompatibility(player1, player2);
                break;
            case "segment_based":
                score = this.calculateSegmentCompatibility(player1, player2);
                break;
            case "elo_based":
                score = this.calculateEloCompatibility(player1, player2);
                break;
            case "random":
                score = 0.5;
                break;
            default:
                score = this.calculateSkillCompatibility(player1, player2);
        }

        const threshold = advanced?.matching?.skillRange || 0.3;
        const compatible = score >= threshold;

        return { compatible, score };
    }

    /**
     * 计算技能兼容性
     */
    private static calculateSkillCompatibility(player1: any, player2: any): number {
        const skill1 = player1.totalPoints || 1000;
        const skill2 = player2.totalPoints || 1000;
        const skillDiff = Math.abs(skill1 - skill2);
        return Math.max(0, 1 - skillDiff / 2000);
    }

    /**
     * 计算段位兼容性（基于新的段位系统）
     */
    private static calculateSegmentCompatibility(player1: any, player2: any): number {
        // 使用新的段位系统计算兼容性
        const tier1 = player1.segmentTier || SegmentSystem.getSegmentTier(player1.segmentName || "Bronze");
        const tier2 = player2.segmentTier || SegmentSystem.getSegmentTier(player2.segmentName || "Bronze");

        // 计算段位差异
        const segmentDiff = Math.abs(tier1 - tier2);

        // 计算段位分数差异
        const points1 = player1.segmentPoints || 0;
        const points2 = player2.segmentPoints || 0;
        const pointsDiff = Math.abs(points1 - points2);

        // 段位差异权重（70%）
        const tierCompatibility = Math.max(0, 1 - segmentDiff / 8);

        // 分数差异权重（30%）
        const pointsCompatibility = Math.max(0, 1 - pointsDiff / 1000);

        // 综合兼容性分数
        return tierCompatibility * 0.7 + pointsCompatibility * 0.3;
    }

    /**
     * 计算ELO兼容性
     */
    private static calculateEloCompatibility(player1: any, player2: any): number {
        const elo1 = player1.eloScore || 1000;
        const elo2 = player2.eloScore || 1000;
        const eloDiff = Math.abs(elo1 - elo2);
        return Math.max(0, 1 - eloDiff / 400);
    }

    /**
     * 计算优先级（基于新的段位系统）
     */
    private static calculatePriority(player: any, config: any, playerSegment: any): number {
        let priority = 0;

        // 订阅用户优先级
        if (player.isSubscribed) {
            priority += 100;
        }

        // 段位优先级（基于新的段位系统）
        const segmentTier = playerSegment ? SegmentSystem.getSegmentTier(playerSegment.segmentName) : 1;
        priority += segmentTier * 15; // 增加段位权重

        // 段位分数优先级
        const segmentPoints = playerSegment?.currentPoints || 0;
        priority += Math.floor(segmentPoints / 50);

        // 技能优先级
        priority += Math.floor((player.totalPoints || 1000) / 100);

        // 等级优先级
        priority += (player.level || 1) * 5;

        return priority;
    }

    /**
     * 计算权重（基于新的段位系统）
     */
    private static calculateWeight(player: any, config: any, playerSegment: any): number {
        let weight = 1.0;

        // 订阅用户权重
        if (player.isSubscribed) {
            weight *= 1.2;
        }

        // 段位权重（基于新的段位系统）
        const segmentTier = playerSegment ? SegmentSystem.getSegmentTier(playerSegment.segmentName) : 1;
        weight *= (1 + segmentTier * 0.15); // 增加段位权重

        // 段位分数权重
        const segmentPoints = playerSegment?.currentPoints || 0;
        weight *= (1 + (segmentPoints / 1000) * 0.1);

        // 等级权重
        weight *= (1 + (player.level || 1) * 0.05);

        return weight;
    }

    /**
     * 获取匹配状态
     */
    static async getMatchingStatus(ctx: any, params: {
        uid: string;
        tournamentId?: string;
        tournamentType?: string; // 新增：独立模式下需要
        gameType?: string; // 新增：独立模式下需要
        mode?: string; // 新增：匹配模式
    }) {
        const { uid, tournamentId, tournamentType, gameType, mode = "traditional" } = params;

        try {
            let queueEntry;

            if (mode === "traditional" && tournamentId) {
                // 传统模式：按锦标赛ID查找
                queueEntry = await ctx.db
                    .query("matchingQueue")
                    .withIndex("by_uid_tournament", (q: any) =>
                        q.eq("uid", uid).eq("tournamentId", tournamentId)
                    )
                    .filter((q: any) => q.eq(q.field("status"), "waiting"))
                    .first();
            } else if (mode === "independent" && tournamentType && gameType) {
                // 独立模式：按锦标赛类型和游戏类型查找
                queueEntry = await ctx.db
                    .query("matchingQueue")
                    .withIndex("by_uid_tournament", (q: any) =>
                        q.eq("uid", uid).eq("tournamentId", null)
                    )
                    .filter((q: any) =>
                        q.and(
                            q.eq(q.field("status"), "waiting"),
                            q.eq(q.field("gameType"), gameType),
                            q.eq(q.field("tournamentType"), tournamentType)
                        )
                    )
                    .first();
            }

            if (!queueEntry) {
                return {
                    inQueue: false,
                    message: "未在匹配队列中"
                };
            }

            // 计算等待时间
            const waitTime = new Date().getTime() - new Date(queueEntry.joinedAt).getTime();
            const waitTimeSeconds = Math.floor(waitTime / 1000);

            // 获取同队列的其他玩家数量
            const otherPlayers = await this.getOtherPlayersInQueue(ctx, {
                tournamentId: queueEntry.tournamentId,
                gameType: queueEntry.gameType,
                tournamentType: queueEntry.tournamentType,
                excludeUid: uid,
                mode
            });

            return {
                inQueue: true,
                queueId: queueEntry._id,
                status: queueEntry.status,
                waitTime: waitTimeSeconds,
                priority: queueEntry.priority,
                algorithm: queueEntry.matchingConfig.algorithm,
                otherPlayers: otherPlayers.length,
                mode: queueEntry.metadata?.mode || mode,
                message: `等待匹配中 (${waitTimeSeconds}秒，队列中还有${otherPlayers.length}人)`
            };

        } catch (error) {
            console.error("获取匹配状态失败:", error);
            return {
                inQueue: false,
                error: error instanceof Error ? error.message : "未知错误"
            };
        }
    }

    /**
     * 获取队列中的其他玩家
     */
    private static async getOtherPlayersInQueue(ctx: any, params: {
        tournamentId?: string;
        gameType: string;
        tournamentType?: string;
        excludeUid: string;
        mode: string;
    }) {
        const { tournamentId, gameType, tournamentType, excludeUid, mode } = params;

        if (mode === "traditional" && tournamentId) {
            return await ctx.db
                .query("matchingQueue")
                .withIndex("by_tournament_status", (q: any) =>
                    q.eq("tournamentId", tournamentId).eq("status", "waiting")
                )
                .filter((q: any) =>
                    q.and(
                        q.eq(q.field("gameType"), gameType),
                        q.neq(q.field("uid"), excludeUid)
                    )
                )
                .collect();
        } else if (mode === "independent" && tournamentType) {
            return await ctx.db
                .query("matchingQueue")
                .withIndex("by_status_priority", (q: any) =>
                    q.eq("status", "waiting")
                )
                .filter((q: any) =>
                    q.and(
                        q.eq(q.field("gameType"), gameType),
                        q.eq(q.field("tournamentType"), tournamentType),
                        q.neq(q.field("uid"), excludeUid)
                    )
                )
                .collect();
        }

        return [];
    }

    /**
     * 取消匹配
     */
    static async cancelMatching(ctx: any, params: {
        uid: string;
        tournamentId?: string;
        tournamentType?: string; // 新增：独立模式下需要
        gameType?: string; // 新增：独立模式下需要
        reason?: string;
        mode?: string; // 新增：匹配模式
    }) {
        const { uid, tournamentId, tournamentType, gameType, reason = "user_cancelled", mode = "traditional" } = params;
        const now = getTorontoDate();

        try {
            // 查找队列条目
            let queueEntry;

            if (mode === "traditional" && tournamentId) {
                queueEntry = await ctx.db
                    .query("matchingQueue")
                    .withIndex("by_uid_tournament", (q: any) =>
                        q.eq("uid", uid).eq("tournamentId", tournamentId)
                    )
                    .filter((q: any) => q.eq(q.field("status"), "waiting"))
                    .first();
            } else if (mode === "independent" && tournamentType && gameType) {
                queueEntry = await ctx.db
                    .query("matchingQueue")
                    .withIndex("by_uid_tournament", (q: any) =>
                        q.eq("uid", uid).eq("tournamentId", null)
                    )
                    .filter((q: any) =>
                        q.and(
                            q.eq(q.field("status"), "waiting"),
                            q.eq(q.field("gameType"), gameType),
                            q.eq(q.field("tournamentType"), tournamentType)
                        )
                    )
                    .first();
            }

            if (!queueEntry) {
                return {
                    success: false,
                    message: "未找到匹配队列条目"
                };
            }

            // 更新状态
            await ctx.db.patch(queueEntry._id, {
                status: "cancelled",
                updatedAt: now.iso
            });

            // 记录事件
            await ctx.db.insert("match_events", {
                matchId: undefined,
                tournamentId: queueEntry.tournamentId,
                uid,
                eventType: "player_cancelled",
                eventData: {
                    reason,
                    waitTime: new Date().getTime() - new Date(queueEntry.joinedAt).getTime(),
                    queueId: queueEntry._id,
                    mode: queueEntry.metadata?.mode || mode
                },
                timestamp: now.iso,
                createdAt: now.iso
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
        const now = getTorontoDate();
        const expiredTime = new Date(now.localDate.getTime() - 30 * 60 * 1000); // 30分钟前

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
                    expiredAt: now.iso,
                    updatedAt: now.iso
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
                    timestamp: now.iso,
                    createdAt: now.iso
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
        let config;
        if (args.mode === "traditional" && args.tournamentId) {
            const tournament = await ctx.db.get(args.tournamentId);
            if (!tournament) {
                throw new Error("锦标赛不存在");
            }
            config = {
                entryRequirements: tournament.config?.entryRequirements,
                matchRules: tournament.config?.matchRules,
                rewards: tournament.config?.rewards,
                schedule: tournament.config?.schedule,
                limits: tournament.config?.limits,
                advanced: tournament.config?.advanced
            };
        } else if (args.mode === "independent" && args.tournamentType) {
            // 从锦标赛类型配置获取配置
            const tournamentType = await ctx.db
                .query("tournament_types")
                .withIndex("by_typeId", (q: any) => q.eq("typeId", args.tournamentType))
                .first();
            if (!tournamentType) {
                throw new Error("锦标赛类型不存在");
            }
            config = {
                entryRequirements: tournamentType.entryRequirements,
                matchRules: tournamentType.matchRules,
                rewards: tournamentType.rewards,
                schedule: tournamentType.schedule,
                limits: tournamentType.limits,
                advanced: tournamentType.advanced
            };
        } else {
            throw new Error("无效的匹配模式或缺少必要参数");
        }

        return await TournamentMatchingService.joinMatchingQueue(ctx, {
            tournament: args.tournament,
            tournamentType: args.tournamentType,
            player,
        });
    },
});

export const getMatchingStatus = (query as any)({
    args: {
        uid: v.string(),
        tournamentId: v.optional(v.id("tournaments")),
        tournamentType: v.optional(v.string()),
        gameType: v.optional(v.string()),
        mode: v.optional(v.union(v.literal("traditional"), v.literal("independent")))
    },
    handler: async (ctx: any, args: any) => {
        return await TournamentMatchingService.getMatchingStatus(ctx, args);
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