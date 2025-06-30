// @ts-nocheck
import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";
import { getTorontoDate } from "../utils";
import { TicketSystem } from "./ticketSystem";

// 门票与任务系统集成
export class TaskTicketIntegration {

    /**
     * 创建门票相关任务
     */
    static async createTicketTask({
        ctx,
        taskId,
        taskName,
        taskDescription,
        taskType,
        requirements,
        rewards,
        expiryDate
    }: {
        ctx: any;
        taskId: string;
        taskName: string;
        taskDescription: string;
        taskType: string;
        requirements: any;
        rewards: any;
        expiryDate?: string;
    }) {
        const now = getTorontoDate();

        try {
            const taskData = {
                taskId,
                taskName,
                taskDescription,
                taskType,
                category: "ticket",
                requirements,
                rewards,
                isActive: true,
                progress: 0,
                maxProgress: this.calculateMaxProgress(requirements),
                expiryDate: expiryDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                createdAt: now.iso
            };

            const taskDbId = await ctx.db.insert("tasks", taskData);

            return {
                success: true,
                taskId: taskDbId,
                task: taskData
            };

        } catch (error: any) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 计算任务最大进度
     */
    private static calculateMaxProgress(requirements: any): number {
        switch (requirements.type) {
            case "ticket_collection":
                return requirements.count || 1;
            case "ticket_usage":
                return requirements.count || 1;
            case "tournament_participation":
                return requirements.count || 1;
            case "tournament_victory":
                return requirements.count || 1;
            case "ticket_mastery":
                return Object.keys(TicketSystem.TICKET_TYPES).length;
            default:
                return 1;
        }
    }

    /**
     * 检查任务进度
     */
    static async checkTaskProgress({
        ctx,
        uid,
        gameType,
        taskId
    }: {
        ctx: any;
        uid: string;
        gameType: string;
        taskId: string;
    }) {
        try {
            // 获取任务信息
            const task = await ctx.db
                .query("tasks")
                .withIndex("by_task_id", (q: any) => q.eq("taskId", taskId))
                .first();

            if (!task) {
                return {
                    success: false,
                    error: "任务不存在"
                };
            }

            // 根据任务类型检查进度
            let currentProgress = 0;
            let progressDetails = {};

            switch (task.taskType) {
                case "ticket_collection":
                    const collectionProgress = await this.checkTicketCollectionProgress({
                        ctx,
                        uid,
                        gameType,
                        requirements: task.requirements
                    });
                    currentProgress = collectionProgress.progress;
                    progressDetails = collectionProgress.details;
                    break;

                case "ticket_usage":
                    const usageProgress = await this.checkTicketUsageProgress({
                        ctx,
                        uid,
                        gameType,
                        requirements: task.requirements
                    });
                    currentProgress = usageProgress.progress;
                    progressDetails = usageProgress.details;
                    break;

                case "tournament_participation":
                    const participationProgress = await this.checkTournamentParticipationProgress({
                        ctx,
                        uid,
                        gameType,
                        requirements: task.requirements
                    });
                    currentProgress = participationProgress.progress;
                    progressDetails = participationProgress.details;
                    break;

                case "tournament_victory":
                    const victoryProgress = await this.checkTournamentVictoryProgress({
                        ctx,
                        uid,
                        gameType,
                        requirements: task.requirements
                    });
                    currentProgress = victoryProgress.progress;
                    progressDetails = victoryProgress.details;
                    break;

                case "ticket_mastery":
                    const masteryProgress = await this.checkTicketMasteryProgress({
                        ctx,
                        uid,
                        gameType
                    });
                    currentProgress = masteryProgress.progress;
                    progressDetails = masteryProgress.details;
                    break;
            }

            // 更新任务进度
            await ctx.db.patch(task._id, {
                progress: currentProgress,
                lastUpdated: getTorontoDate().iso
            });

            // 检查是否完成任务
            const isCompleted = currentProgress >= task.maxProgress;
            if (isCompleted && !task.isCompleted) {
                await this.completeTask(ctx, task, uid, gameType);
            }

            return {
                success: true,
                taskId,
                currentProgress,
                maxProgress: task.maxProgress,
                isCompleted,
                progressDetails
            };

        } catch (error: any) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 检查门票收集进度
     */
    private static async checkTicketCollectionProgress({
        ctx,
        uid,
        gameType,
        requirements
    }: {
        ctx: any;
        uid: string;
        gameType: string;
        requirements: any;
    }) {
        const tickets = await ctx.db
            .query("tickets")
            .withIndex("by_uid_game", (q: any) => q.eq("uid", uid).eq("gameType", gameType))
            .collect();

        let progress = 0;
        const details = {
            collectedTickets: [] as any[],
            requiredType: requirements.ticketType,
            requiredCount: requirements.count
        };

        tickets.forEach((ticket: any) => {
            if (ticket.ticketType === requirements.ticketType && !ticket.isUsed) {
                progress++;
                details.collectedTickets.push({
                    ticketId: ticket._id,
                    ticketType: ticket.ticketType,
                    createdAt: ticket.createdAt
                });
            }
        });

        return { progress, details };
    }

    /**
     * 检查门票使用进度
     */
    private static async checkTicketUsageProgress({
        ctx,
        uid,
        gameType,
        requirements
    }: {
        ctx: any;
        uid: string;
        gameType: string;
        requirements: any;
    }) {
        const usageLogs = await ctx.db
            .query("ticket_usage_logs")
            .withIndex("by_uid_game", (q: any) => q.eq("uid", uid).eq("gameType", gameType))
            .collect();

        let progress = 0;
        const details = {
            usedTickets: [] as any[],
            requiredType: requirements.ticketType,
            requiredCount: requirements.count
        };

        usageLogs.forEach((log: any) => {
            if (log.ticketType === requirements.ticketType) {
                progress++;
                details.usedTickets.push({
                    ticketId: log.ticketId,
                    tournamentId: log.tournamentId,
                    usedAt: log.usedAt
                });
            }
        });

        return { progress, details };
    }

    /**
     * 检查锦标赛参与进度
     */
    private static async checkTournamentParticipationProgress({
        ctx,
        uid,
        gameType,
        requirements
    }: {
        ctx: any;
        uid: string;
        gameType: string;
        requirements: any;
    }) {
        const participants = await ctx.db
            .query("tournament_participants")
            .withIndex("by_uid_game", (q: any) => q.eq("uid", uid).eq("gameType", gameType))
            .collect();

        let progress = 0;
        const details = {
            participatedTournaments: [] as any[],
            requiredType: requirements.tournamentType,
            requiredCount: requirements.count
        };

        participants.forEach((participant: any) => {
            // 这里需要根据锦标赛类型进行过滤
            // 假设锦标赛类型存储在tournament_participants表中
            if (participant.tournamentType === requirements.tournamentType) {
                progress++;
                details.participatedTournaments.push({
                    tournamentId: participant.tournamentId,
                    ticketType: participant.ticketType,
                    joinedAt: participant.joinedAt
                });
            }
        });

        return { progress, details };
    }

    /**
     * 检查锦标赛胜利进度
     */
    private static async checkTournamentVictoryProgress({
        ctx,
        uid,
        gameType,
        requirements
    }: {
        ctx: any;
        uid: string;
        gameType: string;
        requirements: any;
    }) {
        const participants = await ctx.db
            .query("tournament_participants")
            .withIndex("by_uid_game", (q: any) => q.eq("uid", uid).eq("gameType", gameType))
            .collect();

        let progress = 0;
        const details = {
            victories: [] as any[],
            requiredType: requirements.tournamentType,
            requiredCount: requirements.count
        };

        participants.forEach((participant: any) => {
            if (participant.result === "win" && participant.tournamentType === requirements.tournamentType) {
                progress++;
                details.victories.push({
                    tournamentId: participant.tournamentId,
                    ticketType: participant.ticketType,
                    reward: participant.reward,
                    completedAt: participant.completedAt
                });
            }
        });

        return { progress, details };
    }

    /**
     * 检查门票精通进度
     */
    private static async checkTicketMasteryProgress({
        ctx,
        uid,
        gameType
    }: {
        ctx: any;
        uid: string;
        gameType: string;
    }) {
        const usageLogs = await ctx.db
            .query("ticket_usage_logs")
            .withIndex("by_uid_game", (q: any) => q.eq("uid", uid).eq("gameType", gameType))
            .collect();

        const usedTicketTypes = new Set();
        const details = {
            usedTicketTypes: [] as string[],
            totalTicketTypes: Object.keys(TicketSystem.TICKET_TYPES).length
        };

        usageLogs.forEach((log: any) => {
            usedTicketTypes.add(log.ticketType);
        });

        details.usedTicketTypes = Array.from(usedTicketTypes);
        const progress = usedTicketTypes.size;

        return { progress, details };
    }

    /**
     * 完成任务
     */
    private static async completeTask(ctx: any, task: any, uid: string, gameType: string) {
        const now = getTorontoDate();

        try {
            // 标记任务为已完成
            await ctx.db.patch(task._id, {
                isCompleted: true,
                completedAt: now.iso
            });

            // 记录任务完成
            await ctx.db.insert("task_completions", {
                taskId: task.taskId,
                uid,
                gameType,
                taskType: task.taskType,
                completedAt: now.iso,
                rewards: task.rewards,
                createdAt: now.iso
            });

            // 发放奖励
            await this.distributeTaskRewards(ctx, task.rewards, uid, gameType);

            return {
                success: true,
                taskId: task.taskId,
                rewards: task.rewards
            };

        } catch (error: any) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 发放任务奖励
     */
    private static async distributeTaskRewards(ctx: any, rewards: any, uid: string, gameType: string) {
        const now = getTorontoDate();

        try {
            // 发放门票奖励
            if (rewards.tickets) {
                for (const ticketReward of rewards.tickets) {
                    const ticket = TicketSystem.createTicket({
                        ticketType: ticketReward.type,
                        uid,
                        gameType,
                        expiryDate: ticketReward.expiryDate
                    });

                    await ctx.db.insert("tickets", {
                        ...ticket,
                        createdAt: now.iso
                    });
                }
            }

            // 发放游戏积分奖励
            if (rewards.gamePoints && rewards.gamePoints > 0) {
                const season = await ctx.db.query("seasons").filter((q: any) => q.eq(q.field("isActive"), true)).first();
                if (season) {
                    const playerSeason = await ctx.db
                        .query("player_seasons")
                        .withIndex("by_uid_season", (q: any) => q.eq("uid", uid).eq("seasonId", season._id))
                        .first();
                    if (playerSeason) {
                        await ctx.db.patch(playerSeason._id, {
                            seasonPoints: playerSeason.seasonPoints + rewards.gamePoints,
                            gamePoints: {
                                ...playerSeason.gamePoints,
                                [gameType]: (playerSeason.gamePoints[gameType] || 0) + rewards.gamePoints,
                            },
                            updatedAt: now.iso,
                        });
                    }
                }
            }

            // 发放段位积分(SP)奖励
            if (rewards.segmentPoints && rewards.segmentPoints > 0) {
                const playerSegment = await ctx.db
                    .query("player_segments")
                    .withIndex("by_uid_game", (q: any) => q.eq("uid", uid).eq("gameType", gameType))
                    .first();

                if (playerSegment) {
                    await ctx.db.patch(playerSegment._id, {
                        points: playerSegment.points + rewards.segmentPoints,
                        lastUpdated: now.iso,
                    });
                } else {
                    // 如果玩家段位记录不存在，创建一个新的
                    await ctx.db.insert("player_segments", {
                        uid: uid,
                        gameType: gameType,
                        segment: "bronze",
                        points: rewards.segmentPoints,
                        elo: 1000,
                        lastUpdated: now.iso,
                    });
                }
            }

            // 发放其他积分奖励（兼容旧格式）
            if (rewards.points && rewards.points > 0) {
                const playerSegment = await ctx.db
                    .query("player_segments")
                    .withIndex("by_uid_game", (q: any) => q.eq("uid", uid).eq("gameType", gameType))
                    .first();

                if (playerSegment) {
                    await ctx.db.patch(playerSegment._id, {
                        points: (playerSegment.points || 0) + rewards.points,
                        lastUpdated: now.iso
                    });
                }
            }

            // 记录奖励发放
            await ctx.db.insert("task_rewards", {
                uid,
                gameType,
                rewards,
                distributedAt: now.iso,
                createdAt: now.iso
            });

            return {
                success: true,
                rewards
            };

        } catch (error: any) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 获取玩家任务列表
     */
    static async getPlayerTasks({
        ctx,
        uid,
        gameType
    }: {
        ctx: any;
        uid: string;
        gameType: string;
    }) {
        try {
            // 获取所有门票相关任务
            const tasks = await ctx.db
                .query("tasks")
                .withIndex("by_category", (q: any) => q.eq("category", "ticket"))
                .collect();

            const playerTasks = [];

            for (const task of tasks) {
                const progress = await this.checkTaskProgress({
                    ctx,
                    uid,
                    gameType,
                    taskId: task.taskId
                });

                if (progress.success) {
                    playerTasks.push({
                        ...task,
                        currentProgress: progress.currentProgress,
                        isCompleted: progress.isCompleted,
                        progressDetails: progress.progressDetails
                    });
                }
            }

            return {
                success: true,
                tasks: playerTasks
            };

        } catch (error: any) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 创建每日任务
     */
    static async createDailyTasks(ctx: any) {
        const now = getTorontoDate();
        const dailyTasks = [
            {
                taskId: "daily_ticket_usage",
                taskName: "每日门票使用",
                taskDescription: "使用任意门票参加锦标赛",
                taskType: "ticket_usage",
                requirements: {
                    type: "ticket_usage",
                    count: 1
                },
                rewards: {
                    tickets: [
                        { type: "normal", expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() }
                    ],
                    points: 50
                }
            },
            {
                taskId: "daily_tournament_victory",
                taskName: "每日锦标赛胜利",
                taskDescription: "在锦标赛中获胜",
                taskType: "tournament_victory",
                requirements: {
                    type: "tournament_victory",
                    count: 1
                },
                rewards: {
                    tickets: [
                        { type: "advanced", expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() }
                    ],
                    points: 100
                }
            }
        ];

        const createdTasks = [];

        for (const taskData of dailyTasks) {
            const result = await this.createTicketTask({
                ctx,
                ...taskData,
                expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24小时后过期
            });

            if (result.success) {
                createdTasks.push(result.task);
            }
        }

        return {
            success: true,
            createdTasks,
            count: createdTasks.length
        };
    }

    /**
     * 创建成就任务
     */
    static async createAchievementTasks(ctx: any) {
        const achievementTasks = [
            {
                taskId: "ticket_master_achievement",
                taskName: "门票大师",
                taskDescription: "使用所有类型的门票",
                taskType: "ticket_mastery",
                requirements: {
                    type: "ticket_mastery"
                },
                rewards: {
                    tickets: [
                        { type: "master_exclusive", expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() }
                    ],
                    points: 500
                }
            },
            {
                taskId: "tournament_champion_achievement",
                taskName: "锦标赛冠军",
                taskDescription: "使用高级门票在锦标赛中获胜10次",
                taskType: "tournament_victory",
                requirements: {
                    type: "tournament_victory",
                    tournamentType: "高级",
                    count: 10
                },
                rewards: {
                    tickets: [
                        { type: "elite_exclusive", expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() }
                    ],
                    points: 1000
                }
            }
        ];

        const createdTasks = [];

        for (const taskData of achievementTasks) {
            const result = await this.createTicketTask({
                ctx,
                ...taskData
            });

            if (result.success) {
                createdTasks.push(result.task);
            }
        }

        return {
            success: true,
            createdTasks,
            count: createdTasks.length
        };
    }
}

// ===== Convex 函数接口 =====

// 创建门票任务
export const createTicketTask = (mutation as any)({
    args: {
        taskId: v.string(),
        taskName: v.string(),
        taskDescription: v.string(),
        taskType: v.string(),
        requirements: v.any(),
        rewards: v.any(),
        expiryDate: v.optional(v.string())
    },
    handler: async (ctx: any, args: any) => {
        return await TaskTicketIntegration.createTicketTask({
            ctx,
            ...args
        });
    }
});

// 检查任务进度
export const checkTaskProgress = (mutation as any)({
    args: {
        uid: v.string(),
        gameType: v.string(),
        taskId: v.string()
    },
    handler: async (ctx: any, args: any) => {
        return await TaskTicketIntegration.checkTaskProgress({
            ctx,
            ...args
        });
    }
});

// 获取玩家任务列表
export const getPlayerTasks = (query as any)({
    args: {
        uid: v.string(),
        gameType: v.string()
    },
    handler: async (ctx: any, args: any) => {
        return await TaskTicketIntegration.getPlayerTasks({
            ctx,
            ...args
        });
    }
});

// 创建每日任务
export const createDailyTasks = (mutation as any)({
    args: {},
    handler: async (ctx: any) => {
        return await TaskTicketIntegration.createDailyTasks(ctx);
    }
});

// 创建成就任务
export const createAchievementTasks = (mutation as any)({
    args: {},
    handler: async (ctx: any) => {
        return await TaskTicketIntegration.createAchievementTasks(ctx);
    }
});

// 获取任务统计
export const getTaskStatistics = (query as any)({
    args: {
        uid: v.string(),
        gameType: v.string()
    },
    handler: async (ctx: any, args: any) => {
        const { uid, gameType } = args;

        try {
            // 获取任务完成记录
            const taskCompletions = await ctx.db
                .query("task_completions")
                .withIndex("by_uid_game", (q: any) => q.eq("uid", uid).eq("gameType", gameType))
                .collect();

            // 获取奖励记录
            const taskRewards = await ctx.db
                .query("task_rewards")
                .withIndex("by_uid_game", (q: any) => q.eq("uid", uid).eq("gameType", gameType))
                .collect();

            // 统计信息
            const stats = {
                totalTasksCompleted: taskCompletions.length,
                totalRewardsEarned: taskRewards.length,
                totalTicketsEarned: 0,
                totalPointsEarned: 0,
                taskTypeBreakdown: {} as any,
                recentCompletions: taskCompletions.slice(-10) // 最近10个完成的任务
            };

            // 统计各类型任务完成情况
            taskCompletions.forEach((completion: any) => {
                const taskType = completion.taskType;
                if (!stats.taskTypeBreakdown[taskType]) {
                    stats.taskTypeBreakdown[taskType] = 0;
                }
                stats.taskTypeBreakdown[taskType]++;
            });

            // 统计奖励
            taskRewards.forEach((reward: any) => {
                if (reward.rewards.tickets) {
                    stats.totalTicketsEarned += reward.rewards.tickets.length;
                }
                if (reward.rewards.points) {
                    stats.totalPointsEarned += reward.rewards.points;
                }
            });

            return {
                success: true,
                uid,
                gameType,
                stats
            };

        } catch (error: any) {
            return {
                success: false,
                error: error.message
            };
        }
    }
});

// 重置每日任务
export const resetDailyTasks = (mutation as any)({
    args: {},
    handler: async (ctx: any) => {
        const now = getTorontoDate();

        try {
            // 获取过期的每日任务
            const expiredTasks = await ctx.db
                .query("tasks")
                .withIndex("by_category", (q: any) => q.eq("category", "ticket"))
                .collect();

            const expiredDailyTasks = expiredTasks.filter((task: any) => {
                const expiryDate = new Date(task.expiryDate);
                const current = new Date(now.iso);
                return current > expiryDate && task.taskId.startsWith("daily_");
            });

            // 删除过期任务
            for (const task of expiredDailyTasks) {
                await ctx.db.delete(task._id);
            }

            // 创建新的每日任务
            const newTasks = await TaskTicketIntegration.createDailyTasks(ctx);

            return {
                success: true,
                deletedTasks: expiredDailyTasks.length,
                newTasks: newTasks.createdTasks,
                message: "每日任务已重置"
            };

        } catch (error: any) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}); 