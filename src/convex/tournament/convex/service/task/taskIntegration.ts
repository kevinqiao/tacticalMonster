import { getTorontoMidnight } from "../simpleTimezoneUtils";
import { TaskSystem } from "./taskSystem";

// ============================================================================
// 任务系统集成服务 - 与其他系统的集成
// ============================================================================

export class TaskIntegration {
    // ============================================================================
    // 与道具系统集成
    // ============================================================================

    /**
     * 处理道具使用事件并更新任务进度
     */
    static async handlePropUseEvent(ctx: any, params: {
        uid: string;
        gameType: string;
        propType: string;
        propId: string;
        matchId?: string;
        tournamentId?: string;
    }): Promise<{ success: boolean; message: string; taskUpdates?: any[] }> {
        const { uid, gameType, propType, propId, matchId, tournamentId } = params;
        const now = getTorontoMidnight();

        // 记录道具使用事件
        await ctx.db.insert("task_events", {
            uid,
            action: "use_prop",
            actionData: {
                increment: 1,
                gameType,
                propType,
                propId
            },
            gameType,
            matchId,
            tournamentId,
            processed: false,
            createdAt: now.iso,
            updatedAt: now.iso
        });

        // 处理任务事件
        const taskResult = await TaskSystem.processTaskEvent(ctx, {
            uid,
            action: "use_prop",
            actionData: {
                increment: 1,
                gameType,
                propType,
                propId
            },
            gameType,
            matchId,
            tournamentId
        });

        return {
            success: true,
            message: "道具使用事件处理完成",
            taskUpdates: taskResult.updatedTasks
        };
    }

    /**
     * 发放道具奖励
     */
    static async grantPropRewards(ctx: any, uid: string, props: any[]): Promise<{ success: boolean; message: string; grantedProps?: any[] }> {
        const now = getTorontoMidnight();
        const grantedProps: any[] = [];

        for (const prop of props) {
            try {
                // 这里应该调用道具系统的发放接口
                // await PropSystem.grantProp(ctx, {
                //     uid,
                //     gameType: prop.gameType,
                //     propType: prop.propType,
                //     quantity: prop.quantity,
                //     source: "task"
                // });

                // 记录道具发放
                await ctx.db.insert("prop_transactions", {
                    uid,
                    gameType: prop.gameType,
                    propType: prop.propType,
                    quantity: prop.quantity,
                    source: "task",
                    createdAt: now.iso
                });

                grantedProps.push(prop);
            } catch (error) {
                console.error(`发放道具失败: ${prop.propType}`, error);
            }
        }

        return {
            success: grantedProps.length > 0,
            message: `成功发放 ${grantedProps.length}/${props.length} 个道具`,
            grantedProps
        };
    }

    // ============================================================================
    // 与门票系统集成
    // ============================================================================

    /**
     * 处理锦标赛参与事件
     */
    static async handleTournamentJoinEvent(ctx: any, params: {
        uid: string;
        gameType: string;
        tournamentId: string;
        tournamentType: string;
        ticketTemplateId?: string;
    }): Promise<{ success: boolean; message: string; taskUpdates?: any[] }> {
        const { uid, gameType, tournamentId, tournamentType, ticketTemplateId } = params;
        const now = getTorontoMidnight();

        // 记录锦标赛参与事件
        await ctx.db.insert("task_events", {
            uid,
            action: "tournament_join",
            actionData: {
                increment: 1,
                gameType,
                tournamentType,
                ticketTemplateId
            },
            gameType,
            tournamentId,
            processed: false,
            createdAt: now.iso,
            updatedAt: now.iso
        });

        // 处理任务事件
        const taskResult = await TaskSystem.processTaskEvent(ctx, {
            uid,
            action: "tournament_join",
            actionData: {
                increment: 1,
                gameType,
                tournamentType,
                ticketTemplateId
            },
            gameType,
            tournamentId
        });

        return {
            success: true,
            message: "锦标赛参与事件处理完成",
            taskUpdates: taskResult.updatedTasks
        };
    }

    /**
     * 发放门票奖励
     */
    static async grantTicketRewards(ctx: any, uid: string, tickets: any[]): Promise<{ success: boolean; message: string; grantedTickets?: any[] }> {
        const now = getTorontoMidnight();
        const grantedTickets: any[] = [];

        for (const ticket of tickets) {
            try {
                // 这里应该调用门票系统的发放接口
                // await TicketSystem.grantTicketReward(ctx, {
                //     uid,
                //     templateId: ticket.templateId,
                //     quantity: ticket.quantity,
                //     source: "task"
                // });

                // 记录门票发放
                await ctx.db.insert("ticket_transactions", {
                    uid,
                    templateId: ticket.templateId,
                    quantity: ticket.quantity,
                    transactionType: "reward",
                    source: "task",
                    createdAt: now.iso
                });

                grantedTickets.push(ticket);
            } catch (error) {
                console.error(`发放门票失败: ${ticket.templateId}`, error);
            }
        }

        return {
            success: grantedTickets.length > 0,
            message: `成功发放 ${grantedTickets.length}/${tickets.length} 个门票`,
            grantedTickets
        };
    }

    // ============================================================================
    // 与赛季系统集成
    // ============================================================================

    /**
     * 处理段位变更事件
     */
    static async handleSegmentChangeEvent(ctx: any, params: {
        uid: string;
        oldSegment: string;
        newSegment: string;
        seasonId?: string;
    }): Promise<{ success: boolean; message: string; taskUpdates?: any[] }> {
        const { uid, oldSegment, newSegment, seasonId } = params;
        const now = getTorontoMidnight();

        // 记录段位变更事件
        await ctx.db.insert("task_events", {
            uid,
            action: "segment_change",
            actionData: {
                increment: 1,
                oldSegment,
                newSegment,
                seasonId
            },
            processed: false,
            createdAt: now.iso,
            updatedAt: now.iso
        });

        // 处理任务事件
        const taskResult = await TaskSystem.processTaskEvent(ctx, {
            uid,
            action: "segment_change",
            actionData: {
                increment: 1,
                oldSegment,
                newSegment,
                seasonId
            }
        });

        return {
            success: true,
            message: "段位变更事件处理完成",
            taskUpdates: taskResult.updatedTasks
        };
    }

    /**
     * 发放赛季点奖励
     */
    static async grantSeasonPoints(ctx: any, uid: string, seasonPoints: number): Promise<{ success: boolean; message: string; grantedPoints?: number }> {
        const now = getTorontoMidnight();

        try {
            // 这里应该调用赛季积分系统的发放接口
            // await SeasonSystem.addSeasonPoints(ctx, {
            //     uid,
            //     points: seasonPoints,
            //     source: "task"
            // });

            // 记录赛季点发放
            await ctx.db.insert("season_point_transactions", {
                uid,
                points: seasonPoints,
                source: "task",
                createdAt: now.iso
            });

            return {
                success: true,
                message: `成功发放 ${seasonPoints} 赛季点`,
                grantedPoints: seasonPoints
            };
        } catch (error) {
            console.error("发放赛季点失败", error);
            return {
                success: false,
                message: "发放赛季点失败",
                grantedPoints: 0
            };
        }
    }

    // ============================================================================
    // 与积分系统集成
    // ============================================================================

    /**
     * 发放游戏积分奖励
     */
    static async grantGamePoints(ctx: any, uid: string, gamePoints: any): Promise<{ success: boolean; message: string; grantedPoints?: any }> {
        const now = getTorontoMidnight();

        try {
            // 这里应该调用积分转换系统的发放接口
            // await ConvertPoints.convertPoints(ctx, {
            //     uid,
            //     source: "task",
            //     gamePoints
            // });

            // 记录积分发放
            await ctx.db.insert("game_point_transactions", {
                uid,
                generalPoints: gamePoints.general || 0,
                specificPoints: gamePoints.specific || {},
                source: "task",
                createdAt: now.iso
            });

            return {
                success: true,
                message: "成功发放游戏积分",
                grantedPoints: gamePoints
            };
        } catch (error) {
            console.error("发放游戏积分失败", error);
            return {
                success: false,
                message: "发放游戏积分失败",
                grantedPoints: null
            };
        }
    }

    // ============================================================================
    // 综合奖励发放
    // ============================================================================

    /**
     * 发放综合任务奖励
     */
    static async grantComprehensiveRewards(ctx: any, uid: string, rewards: any): Promise<{ success: boolean; message: string; grantedRewards?: any }> {
        const results: any = {
            coins: 0,
            props: [],
            tickets: [],
            seasonPoints: 0,
            gamePoints: null
        };

        // 发放金币
        if (rewards.coins > 0) {
            const player = await ctx.db.query("players")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .unique();

            if (player) {
                await ctx.db.patch(player._id, {
                    coins: player.coins + rewards.coins
                });
                results.coins = rewards.coins;
            }
        }

        // 发放道具
        if (rewards.props && rewards.props.length > 0) {
            const propResult = await this.grantPropRewards(ctx, uid, rewards.props);
            if (propResult.success) {
                results.props = propResult.grantedProps || [];
            }
        }

        // 发放门票
        if (rewards.tickets && rewards.tickets.length > 0) {
            const ticketResult = await this.grantTicketRewards(ctx, uid, rewards.tickets);
            if (ticketResult.success) {
                results.tickets = ticketResult.grantedTickets || [];
            }
        }

        // 发放赛季点
        if (rewards.seasonPoints > 0) {
            const seasonResult = await this.grantSeasonPoints(ctx, uid, rewards.seasonPoints);
            if (seasonResult.success) {
                results.seasonPoints = seasonResult.grantedPoints || 0;
            }
        }

        // 发放游戏积分
        if (rewards.gamePoints) {
            const gamePointsResult = await this.grantGamePoints(ctx, uid, rewards.gamePoints);
            if (gamePointsResult.success) {
                results.gamePoints = gamePointsResult.grantedPoints;
            }
        }

        return {
            success: true,
            message: "综合奖励发放完成",
            grantedRewards: results
        };
    }

    // ============================================================================
    // 事件监听器
    // ============================================================================

    /**
     * 监听游戏完成事件
     */
    static async onGameComplete(ctx: any, params: {
        uid: string;
        gameType: string;
        isWin: boolean;
        matchId: string;
        tournamentId?: string;
        score?: number;
        duration?: number;
    }): Promise<void> {
        const { uid, gameType, isWin, matchId, tournamentId } = params;

        // 处理游戏完成事件
        await TaskSystem.processTaskEvent(ctx, {
            uid,
            action: "complete_match",
            actionData: {
                increment: 1,
                gameType,
                isWin
            },
            gameType,
            matchId,
            tournamentId
        });

        // 如果是胜利，处理胜利事件
        if (isWin) {
            await TaskSystem.processTaskEvent(ctx, {
                uid,
                action: "win_match",
                actionData: {
                    increment: 1,
                    gameType
                },
                gameType,
                matchId,
                tournamentId
            });
        }
    }

    /**
     * 监听登录事件 - 优化版本，替代定时任务
     */
    static async onPlayerLogin(ctx: any, uid: string): Promise<void> {
        // 先进行任务管理，确保新用户有任务可以处理登录事件
        const taskManagementResults = await this.managePlayerTasks(ctx, uid);

        // 然后处理登录事件
        await TaskSystem.processTaskEvent(ctx, {
            uid,
            action: "login",
            actionData: { increment: 1 }
        });

        console.log(`玩家 ${uid} 登录，任务管理结果:`, taskManagementResults);
    }

    /**
     * 统一的任务管理方法 - 合并周期性任务管理和新玩家任务分配
     */
    static async managePlayerTasks(ctx: any, uid: string): Promise<{
        daily: { success: boolean; resetCount?: number; reallocatedCount?: number };
        weekly: { success: boolean; resetCount?: number; reallocatedCount?: number };
        monthly: { success: boolean; resetCount?: number; reallocatedCount?: number };
        newTasksAllocated?: number;
        isNewPlayer?: boolean;
    }> {
        const results = {
            daily: { success: false, resetCount: 0, reallocatedCount: 0 },
            weekly: { success: false, resetCount: 0, reallocatedCount: 0 },
            monthly: { success: false, resetCount: 0, reallocatedCount: 0 },
            newTasksAllocated: 0,
            isNewPlayer: false
        };

        try {
            // 检查玩家是否为新玩家（没有任务）
            const playerTasks = await TaskSystem.getPlayerTasks(ctx, uid);
            const isNewPlayer = playerTasks.length === 0;
            results.isNewPlayer = isNewPlayer;

            if (isNewPlayer) {
                // 新玩家：直接分配任务
                const allocationResult = await TaskSystem.allocateTasksForPlayer(ctx, uid);
                if (allocationResult.success) {
                    results.newTasksAllocated = allocationResult.allocatedTasks?.length || 0;
                }
                console.log(`新玩家 ${uid} 分配了 ${results.newTasksAllocated} 个任务`);
            } else {
                // 现有玩家：管理周期性任务
                // 检查并管理每日任务
                const dailyResult = await TaskSystem.managePeriodicTasks(ctx, uid, "daily");
                if (dailyResult.success) {
                    results.daily = {
                        success: true,
                        resetCount: dailyResult.resetTasks?.length || 0,
                        reallocatedCount: dailyResult.reallocatedTasks?.length || 0
                    };
                }

                // 检查并管理每周任务
                const weeklyResult = await TaskSystem.managePeriodicTasks(ctx, uid, "weekly");
                if (weeklyResult.success) {
                    results.weekly = {
                        success: true,
                        resetCount: weeklyResult.resetTasks?.length || 0,
                        reallocatedCount: weeklyResult.reallocatedTasks?.length || 0
                    };
                }

                // 检查并管理每月任务
                const monthlyResult = await TaskSystem.managePeriodicTasks(ctx, uid, "monthly");
                if (monthlyResult.success) {
                    results.monthly = {
                        success: true,
                        resetCount: monthlyResult.resetTasks?.length || 0,
                        reallocatedCount: monthlyResult.reallocatedTasks?.length || 0
                    };
                }

                // 智能分配任务（如果需要）
                const allocationResult = await TaskSystem.allocateTasksForPlayer(ctx, uid);
                if (allocationResult.success) {
                    results.newTasksAllocated = allocationResult.allocatedTasks?.length || 0;
                }

                console.log(`现有玩家 ${uid} 任务管理完成：每日(${results.daily.resetCount}重置,${results.daily.reallocatedCount}重分配) 每周(${results.weekly.resetCount}重置,${results.weekly.reallocatedCount}重分配) 每月(${results.monthly.resetCount}重置,${results.monthly.reallocatedCount}重分配) 新分配(${results.newTasksAllocated})`);
            }

        } catch (error) {
            console.error(`玩家 ${uid} 任务管理失败:`, error);
        }

        return results;
    }


    /**
     * 监听社交事件
     */
    static async onSocialEvent(ctx: any, params: {
        uid: string;
        action: string;
        actionData: any;
    }): Promise<void> {
        const { uid, action, actionData } = params;

        await TaskSystem.processTaskEvent(ctx, {
            uid,
            action,
            actionData
        });
    }
    static async loadTaskConfig(ctx: any) {
        const preconfigs = await ctx.db.query("task_templates").collect();

        preconfigs.forEach(async (preconfig: any) => {
            await ctx.db.delete(preconfig._id);
        });

        // 导入任务模板配置
        const { TASK_TEMPLATES } = await import("../../data/taskTemplate");

        TASK_TEMPLATES.forEach(async (taskTemplate: any) => {
            await ctx.db.insert("task_templates", taskTemplate);
        });
    }

} 