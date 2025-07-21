import { v } from "convex/values";
import { internalMutation, mutation, query } from "../../_generated/server";
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
 */
export class TournamentMatchingService {

    /**
     * 加入匹配队列
     * 只负责将玩家加入队列，不执行匹配逻辑
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
            const existingQueue = await this.findExistingQueue(ctx, {
                uid: params.player.uid,
                tournamentId: tournament._id,
                gameType: tournamentType.gameType,
                tournamentType: tournamentType.typeId,
            });

            if (existingQueue) {
                return {
                    success: true,
                    queueId: existingQueue._id,
                    status: "already_in_queue",
                    message: "已在匹配队列中"
                };
            }

            // 2. 计算优先级和权重
            const priority = this.calculatePriority(player, config);
            const weight = this.calculateWeight(player, config);

            // 3. 创建匹配配置
            const matchingConfig = {
                algorithm: config.advanced?.matching?.algorithm || "skill_based",
                maxWaitTime: config.advanced?.matching?.maxWaitTime || 300,
                skillRange: config.advanced?.matching?.skillRange || 200,
                eloRange: config.advanced?.matching?.eloRange || 100,
                segmentRange: config.advanced?.matching?.segmentRange || 1,
                fallbackToAI: config.advanced?.matching?.fallbackToAI || false
            };

            // 4. 加入匹配队列
            const queueId = await ctx.db.insert("matchingQueue", {
                uid: params.player.uid,
                tournamentId: tournament._id || null, // 独立模式下为null
                gameType: tournamentType.gameType,
                tournamentType: tournamentType || null, // 独立模式下需要
                playerInfo: {
                    uid: player.uid,
                    skill: player.totalPoints || 1000,
                    segmentName: player.segmentName,
                    eloScore: player.eloScore,
                    totalPoints: player.totalPoints,
                    isSubscribed: player.isSubscribed
                },
                matchingConfig,
                status: "waiting",
                joinedAt: now.iso,
                priority,
                weight,
                metadata: {
                    config: config,
                    playerLevel: player.level,
                    playerRank: player.rank,
                },
                createdAt: now.iso,
                updatedAt: now.iso
            });

            // 5. 记录匹配事件
            await ctx.db.insert("match_events", {
                matchId: undefined,
                tournamentId: tournament._id || undefined,
                uid: params.player.uid,
                eventType: "player_joined_queue",
                eventData: {
                    algorithm: matchingConfig.algorithm,
                    priority,
                    weight,
                    queueId,
                },
                timestamp: now.iso,
                createdAt: now.iso
            });

            return {
                success: true,
                queueId,
                status: "waiting",
                message: "已加入匹配队列，等待匹配中",
                waitTime: 0,
                estimatedWaitTime: this.estimateWaitTime(ctx, tournamentType.gameType, tournamentType.typeId)
            };

        } catch (error) {
            console.error("加入匹配队列失败:", error);
            throw error;
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
     * 发送匹配成功通知
     */
    private static async sendMatchNotification(ctx: any, params: {
        players: any[];
        matchId: string;
        tournamentId: string;
        gameId: string;
        serverUrl: string;
    }) {
        const { players, matchId, tournamentId, gameId, serverUrl } = params;
        const now = getTorontoDate();

        for (const player of players) {
            try {
                // 创建通知记录
                await ctx.db.insert("notifications", {
                    uid: player.uid,
                    type: "match_success",
                    title: "匹配成功",
                    message: "已找到合适的对手，比赛即将开始",
                    data: {
                        matchId,
                        tournamentId,
                        gameId,
                        serverUrl,
                        playerCount: players.length,
                        joinedAt: player.joinedAt
                    },
                    read: false,
                    createdAt: now.iso
                });

                // 记录事件
                await ctx.db.insert("match_events", {
                    matchId,
                    tournamentId,
                    uid: player.uid,
                    eventType: "match_notification_sent",
                    eventData: {
                        gameId,
                        serverUrl
                    },
                    timestamp: now.iso,
                    createdAt: now.iso
                });

            } catch (error) {
                console.error(`发送匹配通知失败 (${player.uid}):`, error);
            }
        }
    }

    /**
     * 按类型分组队列
     */
    private static groupQueuesByType(queues: any[]) {
        const groups = new Map();

        for (const queue of queues) {
            const key = `${queue.metadata?.mode || 'traditional'}_${queue.tournamentId || 'null'}_${queue.gameType}_${queue.tournamentType || 'null'}`;

            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key).push(queue);
        }

        return Array.from(groups.values());
    }

    /**
     * 估算等待时间
     */
    private static estimateWaitTime(ctx: any, gameType: string, tournamentType?: string, mode?: string): number {
        // 基于历史数据估算等待时间
        // 这里可以查询历史匹配数据来计算平均等待时间
        const baseWaitTime = 30; // 基础等待时间30秒

        // 根据游戏类型调整
        const gameTypeMultiplier = {
            'solitaire': 1.0,
            'chess': 1.5,
            'poker': 2.0
        }[gameType] || 1.0;

        // 根据模式调整
        const modeMultiplier = mode === 'independent' ? 0.8 : 1.0;

        return Math.floor(baseWaitTime * gameTypeMultiplier * modeMultiplier);
    }

    /**
     * 查找现有队列条目
     */
    private static async findExistingQueue(ctx: any, params: {
        uid: string;
        tournamentId?: string;
        gameType: string;
        tournamentType?: string;
    }) {
        const { uid, tournamentId, gameType, tournamentType } = params;

        // 独立模式：按锦标赛类型查找
        return await ctx.db
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

    /**
     * 创建独立锦标赛（独立模式）
     */
    private static async createIndependentTournament(ctx: any, params: {
        gameType: string;
        tournamentType: string;
        players: any[];
        config: any;
        now: any;
    }) {
        const { gameType, tournamentType, players, config, now } = params;

        // 获取赛季信息（简化处理）
        const season = await ctx.db
            .query("seasons")
            .filter((q: any) => q.eq(q.field("isActive"), true))
            .first();

        if (!season) {
            throw new Error("没有活跃的赛季");
        }

        // 创建新的独立锦标赛
        const tournamentId = await ctx.db.insert("tournaments", {
            seasonId: season._id,
            gameType,
            segmentName: "all", // 独立锦标赛对所有段位开放
            status: "open",
            tournamentType,
            isSubscribedRequired: config.entryRequirements?.isSubscribedRequired || false,
            isSingleMatch: true, // 独立锦标赛是单场比赛
            prizePool: config.entryRequirements?.entryFee?.coins ? config.entryRequirements.entryFee.coins * players.length * 0.8 : 0,
            config: {
                entryRequirements: config.entryRequirements,
                matchRules: config.matchRules,
                rewards: config.rewards,
                schedule: config.schedule,
                limits: config.limits,
                advanced: config.advanced,
                independentMode: {
                    createdFromMatching: true,
                    playerCount: players.length,
                    createdAt: now.iso
                }
            },
            createdAt: now.iso,
            updatedAt: now.iso,
            endTime: new Date(now.localDate.getTime() + (config.schedule?.duration || 3600) * 1000).toISOString(),
        });

        // 为所有玩家创建参与关系
        for (const playerInfo of players) {
            await ctx.db.insert("player_tournaments", {
                uid: playerInfo.uid,
                tournamentId,
                tournamentType,
                gameType,
                status: "active",
                joinedAt: now.iso,
                createdAt: now.iso,
                updatedAt: now.iso,
            });
        }

        console.log(`创建独立锦标赛 ${tournamentId}，包含 ${players.length} 名玩家`);
        return tournamentId;
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
     * 计算段位兼容性
     */
    private static calculateSegmentCompatibility(player1: any, player2: any): number {
        const segments = ["bronze", "silver", "gold", "platinum", "diamond"];
        const level1 = segments.indexOf(player1.segmentName?.toLowerCase()) + 1;
        const level2 = segments.indexOf(player2.segmentName?.toLowerCase()) + 1;
        const segmentDiff = Math.abs(level1 - level2);
        return Math.max(0, 1 - segmentDiff / 4);
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
     * 计算优先级
     */
    private static calculatePriority(player: any, config: any): number {
        let priority = 0;

        // 订阅用户优先级
        if (player.isSubscribed) {
            priority += 100;
        }

        // 段位优先级
        const segments = ["bronze", "silver", "gold", "platinum", "diamond"];
        const segmentLevel = segments.indexOf(player.segmentName?.toLowerCase()) + 1;
        priority += segmentLevel * 10;

        // 技能优先级
        priority += Math.floor((player.totalPoints || 1000) / 100);

        // 等级优先级
        priority += (player.level || 1) * 5;

        return priority;
    }

    /**
     * 计算权重
     */
    private static calculateWeight(player: any, config: any): number {
        let weight = 1.0;

        // 订阅用户权重
        if (player.isSubscribed) {
            weight *= 1.2;
        }

        // 段位权重
        const segments = ["bronze", "silver", "gold", "platinum", "diamond"];
        const segmentLevel = segments.indexOf(player.segmentName?.toLowerCase()) + 1;
        weight *= (1 + segmentLevel * 0.1);

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