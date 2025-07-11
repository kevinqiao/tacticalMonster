import { getTorontoDate } from "../utils";

/**
 * 玩家锦标赛参与状态枚举
 */
export enum PlayerTournamentStatus {
    ACTIVE = "active",           // 活跃参与中
    COMPLETED = "completed",     // 已完成
    WITHDRAWN = "withdrawn",     // 主动退出
    DISQUALIFIED = "disqualified", // 被取消资格
    EXPIRED = "expired"          // 已过期（锦标赛结束但未完成）
}

/**
 * 状态流转规则
 */
export const STATUS_TRANSITIONS: Record<PlayerTournamentStatus, PlayerTournamentStatus[]> = {
    [PlayerTournamentStatus.ACTIVE]: [
        PlayerTournamentStatus.COMPLETED,
        PlayerTournamentStatus.WITHDRAWN,
        PlayerTournamentStatus.DISQUALIFIED,
        PlayerTournamentStatus.EXPIRED
    ],
    [PlayerTournamentStatus.COMPLETED]: [], // 终态
    [PlayerTournamentStatus.WITHDRAWN]: [], // 终态
    [PlayerTournamentStatus.DISQUALIFIED]: [], // 终态
    [PlayerTournamentStatus.EXPIRED]: [] // 终态
};

/**
 * 玩家锦标赛状态管理器
 */
export class PlayerTournamentStatusManager {

    /**
     * 验证状态流转是否有效
     */
    static isValidTransition(fromStatus: string, toStatus: string): boolean {
        const allowedTransitions = STATUS_TRANSITIONS[fromStatus as PlayerTournamentStatus] || [];
        return allowedTransitions.includes(toStatus as PlayerTournamentStatus);
    }

    /**
     * 更新玩家锦标赛状态
     */
    static async updatePlayerTournamentStatus(ctx: any, params: {
        uid: string;
        tournamentId: string;
        newStatus: PlayerTournamentStatus;
        reason?: string;
        metadata?: any;
    }) {
        const { uid, tournamentId, newStatus, reason, metadata } = params;
        const now = getTorontoDate();

        // 查找现有的参与记录
        const playerTournament = await ctx.db
            .query("player_tournaments")
            .withIndex("by_uid_tournament", (q: any) =>
                q.eq("uid", uid).eq("tournamentId", tournamentId)
            )
            .first();

        if (!playerTournament) {
            throw new Error("玩家锦标赛参与记录不存在");
        }

        // 验证状态流转
        if (!this.isValidTransition(playerTournament.status, newStatus)) {
            throw new Error(`无效的状态流转: ${playerTournament.status} -> ${newStatus}`);
        }

        // 更新状态
        await ctx.db.patch(playerTournament._id, {
            status: newStatus,
            updatedAt: now.iso
        });

        // 记录状态变更日志
        await this.logStatusChange(ctx, {
            uid,
            tournamentId,
            oldStatus: playerTournament.status,
            newStatus,
            reason,
            metadata,
            timestamp: now.iso
        });

        console.log(`玩家 ${uid} 在锦标赛 ${tournamentId} 中的状态已更新: ${playerTournament.status} -> ${newStatus}`);
    }

    /**
     * 批量更新玩家锦标赛状态
     */
    static async batchUpdatePlayerTournamentStatus(ctx: any, params: {
        tournamentId: string;
        newStatus: PlayerTournamentStatus;
        reason?: string;
        metadata?: any;
    }) {
        const { tournamentId, newStatus, reason, metadata } = params;
        const now = getTorontoDate();

        // 获取所有参与该锦标赛的玩家
        const playerTournaments = await ctx.db
            .query("player_tournaments")
            .withIndex("by_tournament", (q: any) => q.eq("tournamentId", tournamentId))
            .collect();

        const updatePromises = playerTournaments.map(async (pt: any) => {
            if (this.isValidTransition(pt.status, newStatus)) {
                await ctx.db.patch(pt._id, {
                    status: newStatus,
                    updatedAt: now.iso
                });

                // 记录状态变更日志
                await this.logStatusChange(ctx, {
                    uid: pt.uid,
                    tournamentId,
                    oldStatus: pt.status,
                    newStatus,
                    reason,
                    metadata,
                    timestamp: now.iso
                });
            }
        });

        await Promise.all(updatePromises);
        console.log(`锦标赛 ${tournamentId} 的所有参与者状态已更新为: ${newStatus}`);
    }

    /**
     * 完成锦标赛时更新所有参与者状态
     */
    static async completeTournamentForAllPlayers(ctx: any, params: {
        tournamentId: string;
        completedPlayers: string[]; // 完成比赛的玩家列表
        reason?: string;
    }) {
        const { tournamentId, completedPlayers, reason } = params;
        const now = getTorontoDate();

        // 获取所有参与该锦标赛的玩家
        const playerTournaments = await ctx.db
            .query("player_tournaments")
            .withIndex("by_tournament", (q: any) => q.eq("tournamentId", tournamentId))
            .collect();

        const updatePromises = playerTournaments.map(async (pt: any) => {
            let newStatus: PlayerTournamentStatus;

            if (completedPlayers.includes(pt.uid)) {
                newStatus = PlayerTournamentStatus.COMPLETED;
            } else {
                newStatus = PlayerTournamentStatus.EXPIRED;
            }

            if (this.isValidTransition(pt.status, newStatus)) {
                await ctx.db.patch(pt._id, {
                    status: newStatus,
                    updatedAt: now.iso
                });

                // 记录状态变更日志
                await this.logStatusChange(ctx, {
                    uid: pt.uid,
                    tournamentId,
                    oldStatus: pt.status,
                    newStatus,
                    reason: reason || (newStatus === PlayerTournamentStatus.COMPLETED ? "锦标赛完成" : "锦标赛过期"),
                    metadata: {
                        completed: newStatus === PlayerTournamentStatus.COMPLETED
                    },
                    timestamp: now.iso
                });
            }
        });

        await Promise.all(updatePromises);
        console.log(`锦标赛 ${tournamentId} 完成，参与者状态已更新`);
    }

    /**
     * 处理玩家退出锦标赛
     */
    static async withdrawPlayerFromTournament(ctx: any, params: {
        uid: string;
        tournamentId: string;
        reason?: string;
    }) {
        const { uid, tournamentId, reason } = params;

        await this.updatePlayerTournamentStatus(ctx, {
            uid,
            tournamentId,
            newStatus: PlayerTournamentStatus.WITHDRAWN,
            reason: reason || "玩家主动退出",
            metadata: {
                withdrawalTime: getTorontoDate().iso
            }
        });
    }

    /**
     * 处理玩家被取消资格
     */
    static async disqualifyPlayerFromTournament(ctx: any, params: {
        uid: string;
        tournamentId: string;
        reason: string;
        metadata?: any;
    }) {
        const { uid, tournamentId, reason, metadata } = params;

        await this.updatePlayerTournamentStatus(ctx, {
            uid,
            tournamentId,
            newStatus: PlayerTournamentStatus.DISQUALIFIED,
            reason,
            metadata: {
                disqualificationTime: getTorontoDate().iso,
                ...metadata
            }
        });
    }

    /**
     * 清理过期的参与记录
     */
    static async cleanupExpiredParticipations(ctx: any, params: {
        daysToKeep?: number;
    }) {
        const { daysToKeep = 30 } = params;
        const now = getTorontoDate();
        const cutoffDate = new Date(now.localDate.getTime() - daysToKeep * 24 * 60 * 60 * 1000);

        // 查找过期的参与记录（已完成、退出、取消资格且超过保留期限）
        const expiredParticipations = await ctx.db
            .query("player_tournaments")
            .filter((q: any) =>
                q.and(
                    q.or(
                        q.eq(q.field("status"), PlayerTournamentStatus.COMPLETED),
                        q.eq(q.field("status"), PlayerTournamentStatus.WITHDRAWN),
                        q.eq(q.field("status"), PlayerTournamentStatus.DISQUALIFIED)
                    ),
                    q.lt(q.field("updatedAt"), cutoffDate.toISOString())
                )
            )
            .collect();

        // 删除过期记录
        for (const participation of expiredParticipations) {
            await ctx.db.delete(participation._id);
        }

        console.log(`清理了 ${expiredParticipations.length} 条过期的参与记录`);
        return expiredParticipations.length;
    }

    /**
     * 获取玩家锦标赛参与统计
     */
    static async getPlayerParticipationStats(ctx: any, params: {
        uid: string;
        timeRange?: "daily" | "weekly" | "seasonal" | "total";
    }) {
        const { uid, timeRange = "total" } = params;
        const now = getTorontoDate();

        let startDate: Date;
        switch (timeRange) {
            case "daily":
                startDate = new Date(now.localDate.getTime() - 24 * 60 * 60 * 1000);
                break;
            case "weekly":
                startDate = new Date(now.localDate.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case "seasonal":
                startDate = new Date(now.localDate.getTime() - 90 * 24 * 60 * 60 * 1000);
                break;
            default:
                startDate = new Date(0); // 从开始时间
        }

        const participations = await ctx.db
            .query("player_tournaments")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .filter((q: any) => q.gte(q.field("createdAt"), startDate.toISOString()))
            .collect();

        const stats = {
            total: participations.length,
            active: participations.filter((p: any) => p.status === PlayerTournamentStatus.ACTIVE).length,
            completed: participations.filter((p: any) => p.status === PlayerTournamentStatus.COMPLETED).length,
            withdrawn: participations.filter((p: any) => p.status === PlayerTournamentStatus.WITHDRAWN).length,
            disqualified: participations.filter((p: any) => p.status === PlayerTournamentStatus.DISQUALIFIED).length,
            expired: participations.filter((p: any) => p.status === PlayerTournamentStatus.EXPIRED).length
        };

        return {
            timeRange,
            stats,
            participations: participations.slice(0, 10) // 只返回最近10条记录
        };
    }

    /**
     * 记录状态变更日志
     */
    private static async logStatusChange(ctx: any, params: {
        uid: string;
        tournamentId: string;
        oldStatus: string;
        newStatus: string;
        reason?: string;
        metadata?: any;
        timestamp: string;
    }) {
        const { uid, tournamentId, oldStatus, newStatus, reason, metadata, timestamp } = params;

        try {
            await ctx.db.insert("player_tournament_status_logs", {
                uid,
                tournamentId,
                oldStatus,
                newStatus,
                reason: reason || "状态更新",
                metadata: metadata || {},
                timestamp,
                createdAt: timestamp
            });
        } catch (error) {
            console.error("记录状态变更日志失败:", error);
            // 不抛出错误，避免影响主要业务逻辑
        }
    }

    /**
     * 批量处理巨量用户的锦标赛完成状态
     * 专门针对 daily tournament 等大量用户场景优化
     */
    static async batchCompleteDailyTournament(ctx: any, params: {
        tournamentId: string;
        batchSize?: number;
        maxConcurrency?: number;
        progressCallback?: (progress: any) => void;
    }) {
        const { tournamentId, batchSize = 100, maxConcurrency = 5, progressCallback } = params;
        const now = getTorontoDate();

        console.log(`开始批量处理锦标赛 ${tournamentId} 的参与者状态`);

        // 1. 获取所有参与该锦标赛的玩家
        const allPlayerTournaments = await ctx.db
            .query("player_tournaments")
            .withIndex("by_tournament", (q: any) => q.eq("tournamentId", tournamentId))
            .collect();

        const totalPlayers = allPlayerTournaments.length;
        console.log(`锦标赛 ${tournamentId} 共有 ${totalPlayers} 个参与者`);

        if (totalPlayers === 0) {
            return { success: true, processed: 0, message: "没有参与者需要处理" };
        }

        // 2. 获取完成比赛的玩家列表
        const completedMatches = await ctx.db
            .query("matches")
            .withIndex("by_tournament", (q: any) => q.eq("tournamentId", tournamentId))
            .filter((q: any) => q.eq(q.field("status"), "completed"))
            .collect();

        const completedPlayers = new Set<string>();

        // 批量获取比赛中的玩家记录
        for (const match of completedMatches) {
            const playerMatches = await ctx.db
                .query("player_matches")
                .withIndex("by_match", (q: any) => q.eq("matchId", match._id))
                .collect();

            for (const playerMatch of playerMatches) {
                if (playerMatch.completed) {
                    completedPlayers.add(playerMatch.uid);
                }
            }
        }

        console.log(`完成比赛的玩家数量: ${completedPlayers.size}`);

        // 3. 分批处理状态更新
        const batches = this.createBatches(allPlayerTournaments, batchSize);
        const results = {
            success: true,
            total: totalPlayers,
            processed: 0,
            completed: 0,
            expired: 0,
            errors: 0,
            batches: batches.length,
            startTime: now.iso,
            endTime: null as string | null
        };

        // 4. 并发处理批次
        for (let i = 0; i < batches.length; i += maxConcurrency) {
            const currentBatches = batches.slice(i, i + maxConcurrency);

            const batchPromises = currentBatches.map(async (batch, batchIndex) => {
                return await this.processBatch(ctx, {
                    batch,
                    completedPlayers,
                    batchNumber: i + batchIndex + 1,
                    totalBatches: batches.length,
                    progressCallback
                });
            });

            const batchResults = await Promise.allSettled(batchPromises);

            // 汇总批次结果
            for (const result of batchResults) {
                if (result.status === 'fulfilled') {
                    results.processed += result.value.processed;
                    results.completed += result.value.completed;
                    results.expired += result.value.expired;
                    results.errors += result.value.errors;
                } else {
                    results.errors += batchSize; // 估算错误数量
                    console.error("批次处理失败:", result.reason);
                }
            }

            // 报告进度
            if (progressCallback) {
                progressCallback({
                    currentBatch: i + maxConcurrency,
                    totalBatches: batches.length,
                    processed: results.processed,
                    total: results.total,
                    progress: Math.round((results.processed / results.total) * 100)
                });
            }
        }

        results.endTime = getTorontoDate().iso;

        console.log(`锦标赛 ${tournamentId} 批量处理完成:`, {
            processed: results.processed,
            completed: results.completed,
            expired: results.expired,
            errors: results.errors,
            duration: this.calculateDuration(results.startTime, results.endTime)
        });

        return results;
    }

    /**
     * 处理单个批次
     */
    private static async processBatch(ctx: any, params: {
        batch: any[];
        completedPlayers: Set<string>;
        batchNumber: number;
        totalBatches: number;
        progressCallback?: (progress: any) => void;
    }) {
        const { batch, completedPlayers, batchNumber, totalBatches, progressCallback } = params;
        const now = getTorontoDate();

        const batchResult = {
            processed: 0,
            completed: 0,
            expired: 0,
            errors: 0
        };

        // 并发处理批次内的每个玩家
        const playerPromises = batch.map(async (playerTournament: any) => {
            try {
                let newStatus: PlayerTournamentStatus;

                if (completedPlayers.has(playerTournament.uid)) {
                    newStatus = PlayerTournamentStatus.COMPLETED;
                    batchResult.completed++;
                } else {
                    newStatus = PlayerTournamentStatus.EXPIRED;
                    batchResult.expired++;
                }

                if (this.isValidTransition(playerTournament.status, newStatus)) {
                    await ctx.db.patch(playerTournament._id, {
                        status: newStatus,
                        updatedAt: now.iso
                    });

                    // 记录状态变更日志（可选，避免日志过多）
                    if (batchNumber % 10 === 0) { // 每10个批次记录一次
                        await this.logStatusChange(ctx, {
                            uid: playerTournament.uid,
                            tournamentId: playerTournament.tournamentId,
                            oldStatus: playerTournament.status,
                            newStatus,
                            reason: newStatus === PlayerTournamentStatus.COMPLETED ? "锦标赛完成" : "锦标赛过期",
                            metadata: {
                                batchNumber,
                                totalBatches,
                                completed: newStatus === PlayerTournamentStatus.COMPLETED
                            },
                            timestamp: now.iso
                        });
                    }
                }

                batchResult.processed++;
            } catch (error) {
                batchResult.errors++;
                console.error(`处理玩家 ${playerTournament.uid} 状态失败:`, error);
            }
        });

        await Promise.allSettled(playerPromises);

        console.log(`批次 ${batchNumber}/${totalBatches} 处理完成:`, batchResult);

        return batchResult;
    }

    /**
     * 创建批次
     */
    private static createBatches(items: any[], batchSize: number): any[][] {
        const batches = [];
        for (let i = 0; i < items.length; i += batchSize) {
            batches.push(items.slice(i, i + batchSize));
        }
        return batches;
    }

    /**
     * 计算处理时长
     */
    private static calculateDuration(startTime: string, endTime: string): string {
        const start = new Date(startTime);
        const end = new Date(endTime);
        const duration = end.getTime() - start.getTime();

        const minutes = Math.floor(duration / 60000);
        const seconds = Math.floor((duration % 60000) / 1000);

        return `${minutes}分${seconds}秒`;
    }

    /**
     * 异步批量处理（适用于超大数据量）
     */
    static async asyncBatchCompleteDailyTournament(ctx: any, params: {
        tournamentId: string;
        batchSize?: number;
        maxConcurrency?: number;
    }) {
        const { tournamentId, batchSize = 50, maxConcurrency = 3 } = params;

        // 创建异步任务记录
        const taskId = await ctx.db.insert("batch_processing_tasks", {
            tournamentId,
            taskType: "daily_tournament_completion",
            status: "running",
            batchSize,
            maxConcurrency,
            createdAt: getTorontoDate().iso,
            updatedAt: getTorontoDate().iso
        });

        // 启动异步处理
        this.startAsyncBatchProcessing(ctx, {
            taskId,
            tournamentId,
            batchSize,
            maxConcurrency
        });

        return {
            success: true,
            taskId,
            message: "批量处理任务已启动，请通过任务ID查询进度"
        };
    }

    /**
     * 启动异步批量处理
     */
    private static async startAsyncBatchProcessing(ctx: any, params: {
        taskId: string;
        tournamentId: string;
        batchSize: number;
        maxConcurrency: number;
    }) {
        const { taskId, tournamentId, batchSize, maxConcurrency } = params;

        try {
            // 获取所有参与者
            const allPlayerTournaments = await ctx.db
                .query("player_tournaments")
                .withIndex("by_tournament", (q: any) => q.eq("tournamentId", tournamentId))
                .collect();

            const totalPlayers = allPlayerTournaments.length;
            const batches = this.createBatches(allPlayerTournaments, batchSize);

            let processed = 0;
            let completed = 0;
            let expired = 0;
            let errors = 0;

            // 分批处理
            for (let i = 0; i < batches.length; i += maxConcurrency) {
                const currentBatches = batches.slice(i, i + maxConcurrency);

                const batchPromises = currentBatches.map(async (batch) => {
                    return await this.processBatchAsync(ctx, {
                        batch,
                        tournamentId
                    });
                });

                const batchResults = await Promise.allSettled(batchPromises);

                // 更新进度
                for (const result of batchResults) {
                    if (result.status === 'fulfilled') {
                        processed += result.value.processed;
                        completed += result.value.completed;
                        expired += result.value.expired;
                        errors += result.value.errors;
                    }
                }

                // 更新任务状态
                await ctx.db.patch(taskId, {
                    processed,
                    completed,
                    expired,
                    errors,
                    progress: Math.round((processed / totalPlayers) * 100),
                    updatedAt: getTorontoDate().iso
                });

                // 避免过度占用资源
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            // 完成任务
            await ctx.db.patch(taskId, {
                status: "completed",
                updatedAt: getTorontoDate().iso
            });

        } catch (error) {
            console.error("异步批量处理失败:", error);
            await ctx.db.patch(taskId, {
                status: "failed",
                error: error instanceof Error ? error.message : String(error),
                updatedAt: getTorontoDate().iso
            });
        }
    }

    /**
     * 异步处理单个批次
     */
    private static async processBatchAsync(ctx: any, params: {
        batch: any[];
        tournamentId: string;
    }) {
        const { batch, tournamentId } = params;

        // 获取完成比赛的玩家
        const completedMatches = await ctx.db
            .query("matches")
            .withIndex("by_tournament", (q: any) => q.eq("tournamentId", tournamentId))
            .filter((q: any) => q.eq(q.field("status"), "completed"))
            .collect();

        const completedPlayers = new Set<string>();

        for (const match of completedMatches) {
            const playerMatches = await ctx.db
                .query("player_matches")
                .withIndex("by_match", (q: any) => q.eq("matchId", match._id))
                .collect();

            for (const playerMatch of playerMatches) {
                if (playerMatch.completed) {
                    completedPlayers.add(playerMatch.uid);
                }
            }
        }

        const result = {
            processed: 0,
            completed: 0,
            expired: 0,
            errors: 0
        };

        for (const playerTournament of batch) {
            try {
                let newStatus: PlayerTournamentStatus;

                if (completedPlayers.has(playerTournament.uid)) {
                    newStatus = PlayerTournamentStatus.COMPLETED;
                    result.completed++;
                } else {
                    newStatus = PlayerTournamentStatus.EXPIRED;
                    result.expired++;
                }

                if (this.isValidTransition(playerTournament.status, newStatus)) {
                    await ctx.db.patch(playerTournament._id, {
                        status: newStatus,
                        updatedAt: getTorontoDate().iso
                    });
                }

                result.processed++;
            } catch (error) {
                result.errors++;
            }
        }

        return result;
    }

    /**
     * 优化处理锦标赛结算（避免获取所有完成玩家列表）
     * 专门针对巨量用户的锦标赛结算场景
     */
    static async optimizedCompleteTournament(ctx: any, params: {
        tournamentId: string;
        batchSize?: number;
        maxConcurrency?: number;
    }) {
        const { tournamentId, batchSize = 100, maxConcurrency = 5 } = params;
        const now = getTorontoDate();

        console.log(`开始优化处理锦标赛 ${tournamentId} 的结算`);

        // 1. 获取所有参与该锦标赛的玩家
        const allPlayerTournaments = await ctx.db
            .query("player_tournaments")
            .withIndex("by_tournament", (q: any) => q.eq("tournamentId", tournamentId))
            .collect();

        const totalPlayers = allPlayerTournaments.length;
        console.log(`锦标赛 ${tournamentId} 共有 ${totalPlayers} 个参与者`);

        if (totalPlayers === 0) {
            return { success: true, processed: 0, message: "没有参与者需要处理" };
        }

        // 2. 分批处理，避免一次性获取所有完成玩家
        const batches = this.createBatches(allPlayerTournaments, batchSize);
        const results = {
            success: true,
            total: totalPlayers,
            processed: 0,
            completed: 0,
            expired: 0,
            errors: 0,
            batches: batches.length,
            startTime: now.iso,
            endTime: null as string | null
        };

        // 3. 并发处理批次
        for (let i = 0; i < batches.length; i += maxConcurrency) {
            const currentBatches = batches.slice(i, i + maxConcurrency);

            const batchPromises = currentBatches.map(async (batch, batchIndex) => {
                return await this.processBatchWithMatchCheck(ctx, {
                    batch,
                    tournamentId,
                    batchNumber: i + batchIndex + 1,
                    totalBatches: batches.length
                });
            });

            const batchResults = await Promise.allSettled(batchPromises);

            // 汇总批次结果
            for (const result of batchResults) {
                if (result.status === 'fulfilled') {
                    results.processed += result.value.processed;
                    results.completed += result.value.completed;
                    results.expired += result.value.expired;
                    results.errors += result.value.errors;
                } else {
                    results.errors += batchSize;
                    console.error("批次处理失败:", result.reason);
                }
            }

            // 报告进度
            console.log(`批次 ${i + maxConcurrency}/${batches.length} 处理完成，进度: ${Math.round((results.processed / results.total) * 100)}%`);
        }

        results.endTime = getTorontoDate().iso;

        console.log(`锦标赛 ${tournamentId} 优化处理完成:`, {
            processed: results.processed,
            completed: results.completed,
            expired: results.expired,
            errors: results.errors,
            duration: this.calculateDuration(results.startTime, results.endTime)
        });

        return results;
    }

    /**
     * 处理单个批次（包含比赛检查）
     */
    private static async processBatchWithMatchCheck(ctx: any, params: {
        batch: any[];
        tournamentId: string;
        batchNumber: number;
        totalBatches: number;
    }) {
        const { batch, tournamentId, batchNumber, totalBatches } = params;
        const now = getTorontoDate();

        const batchResult = {
            processed: 0,
            completed: 0,
            expired: 0,
            errors: 0
        };

        // 并发处理批次内的每个玩家
        const playerPromises = batch.map(async (playerTournament: any) => {
            try {
                // 检查该玩家是否有完成的比赛
                const playerMatches = await ctx.db
                    .query("player_matches")
                    .withIndex("by_tournament_uid", (q: any) =>
                        q.eq("tournamentId", tournamentId).eq("uid", playerTournament.uid)
                    )
                    .collect();

                let newStatus: PlayerTournamentStatus;
                let hasCompletedMatch = false;

                // 检查是否有完成的比赛
                for (const playerMatch of playerMatches) {
                    if (playerMatch.completed) {
                        hasCompletedMatch = true;
                        break;
                    }
                }

                if (hasCompletedMatch) {
                    newStatus = PlayerTournamentStatus.COMPLETED;
                    batchResult.completed++;
                } else {
                    newStatus = PlayerTournamentStatus.EXPIRED;
                    batchResult.expired++;
                }

                if (this.isValidTransition(playerTournament.status, newStatus)) {
                    await ctx.db.patch(playerTournament._id, {
                        status: newStatus,
                        updatedAt: now.iso
                    });

                    // 减少日志记录频率，避免日志过多
                    if (batchNumber % 20 === 0) {
                        await this.logStatusChange(ctx, {
                            uid: playerTournament.uid,
                            tournamentId: playerTournament.tournamentId,
                            oldStatus: playerTournament.status,
                            newStatus,
                            reason: newStatus === PlayerTournamentStatus.COMPLETED ? "锦标赛完成" : "锦标赛过期",
                            metadata: {
                                batchNumber,
                                totalBatches,
                                completed: newStatus === PlayerTournamentStatus.COMPLETED
                            },
                            timestamp: now.iso
                        });
                    }
                }

                batchResult.processed++;
            } catch (error) {
                batchResult.errors++;
                console.error(`处理玩家 ${playerTournament.uid} 状态失败:`, error);
            }
        });

        await Promise.allSettled(playerPromises);

        console.log(`批次 ${batchNumber}/${totalBatches} 处理完成:`, batchResult);

        return batchResult;
    }

    /**
     * 查询批量处理任务状态
     */
    static async getBatchProcessingStatus(ctx: any, taskId: string) {
        const task = await ctx.db.get(taskId);

        if (!task) {
            throw new Error("任务不存在");
        }

        return {
            taskId,
            status: task.status,
            progress: task.progress || 0,
            processed: task.processed || 0,
            completed: task.completed || 0,
            expired: task.expired || 0,
            errors: task.errors || 0,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt,
            error: task.error
        };
    }
} 