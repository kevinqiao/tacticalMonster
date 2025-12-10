/**
 * TacticalMonster 任务系统集成服务
 * 负责与 Tournament 模块的任务系统通信，并处理游戏特定奖励
 */

import { getTournamentUrl, TOURNAMENT_CONFIG } from "../../config/tournamentConfig";
import { MonsterService } from "../monster/monsterService";
import { ShardService } from "../monster/shardService";

/**
 * 任务系统集成服务
 */
export class TaskIntegration {
    /**
     * 处理任务事件
     */
    static async processTaskEvent(params: {
        uid: string;
        action: string;
        actionData: any;
        gameType?: string;
        tournamentId?: string;
        matchId?: string;
    }): Promise<{
        success: boolean;
        message: string;
        updatedTasks?: any[];
    }> {
        try {
            // 调用 Tournament 模块的任务系统
            const response = await fetch(
                getTournamentUrl(TOURNAMENT_CONFIG.ENDPOINTS.PROCESS_TASK_EVENT),
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(params),
                }
            );

            const result = await response.json();

            if (!response.ok || !result.ok) {
                throw new Error(result.error || "处理任务事件失败");
            }

            return {
                success: result.success,
                message: result.message,
                updatedTasks: result.updatedTasks,
            };
        } catch (error: any) {
            console.error("调用任务系统失败:", error);
            return {
                success: false,
                message: error.message || "网络错误",
            };
        }
    }

    /**
     * 管理玩家任务（登录时调用）
     */
    static async managePlayerTasks(uid: string): Promise<{
        success: boolean;
        message: string;
        allocatedTasks?: string[];
        movedTasks?: string[];
        totalExpired?: number;
    }> {
        try {
            // 调用 Tournament 模块的任务系统
            const response = await fetch(
                getTournamentUrl(TOURNAMENT_CONFIG.ENDPOINTS.MANAGE_PLAYER_TASKS),
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ uid }),
                }
            );

            const result = await response.json();

            if (!response.ok || !result.ok) {
                throw new Error(result.error || "管理玩家任务失败");
            }

            return {
                success: result.success,
                message: result.message,
                allocatedTasks: result.allocatedTasks,
                movedTasks: result.movedTasks,
                totalExpired: result.totalExpired,
            };
        } catch (error: any) {
            console.error("调用任务系统失败:", error);
            return {
                success: false,
                message: error.message || "网络错误",
            };
        }
    }

    /**
     * 获取玩家活跃任务
     */
    static async getPlayerActiveTasks(uid: string): Promise<{
        success: boolean;
        tasks?: any[];
        error?: string;
    }> {
        try {
            // 调用 Tournament 模块的任务系统
            const response = await fetch(
                getTournamentUrl(TOURNAMENT_CONFIG.ENDPOINTS.GET_PLAYER_ACTIVE_TASKS),
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ uid }),
                }
            );

            const result = await response.json();

            if (!response.ok || !result.ok) {
                throw new Error(result.error || "获取玩家任务失败");
            }

            return {
                success: true,
                tasks: result.tasks,
            };
        } catch (error: any) {
            console.error("调用任务系统失败:", error);
            return {
                success: false,
                error: error.message || "网络错误",
            };
        }
    }

    /**
     * 领取任务奖励（处理游戏特定奖励）
     */
    static async claimTaskRewards(
        ctx: any,
        params: {
            uid: string;
            taskId: string;
        }
    ): Promise<{
        success: boolean;
        message: string;
        rewards?: any;
        gameSpecificRewards?: any;
    }> {
        try {
            // 1. 调用 Tournament 模块领取通用奖励
            const response = await fetch(
                getTournamentUrl(TOURNAMENT_CONFIG.ENDPOINTS.CLAIM_TASK_REWARDS),
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(params),
                }
            );

            const result = await response.json();

            if (!response.ok || !result.ok) {
                throw new Error(result.error || "领取任务奖励失败");
            }

            // 2. 处理游戏特定奖励
            const gameSpecificRewards = await this.processGameSpecificRewards(
                ctx,
                params.uid,
                result.rewards
            );

            return {
                success: result.success,
                message: result.message,
                rewards: result.rewards,
                gameSpecificRewards,
            };
        } catch (error: any) {
            console.error("领取任务奖励失败:", error);
            return {
                success: false,
                message: error.message || "网络错误",
            };
        }
    }

    /**
     * 处理游戏特定奖励（Monsters, Shards, Energy）
     */
    private static async processGameSpecificRewards(
        ctx: any,
        uid: string,
        rewards: any
    ): Promise<{
        monsters?: any[];
        shards?: any[];
        energy?: number;
    }> {
        const gameSpecificRewards: {
            monsters?: any[];
            shards?: any[];
            energy?: number;
        } = {};

        // 处理怪物奖励
        if (rewards.monsters && Array.isArray(rewards.monsters)) {
            const grantedMonsters: any[] = [];
            for (const monster of rewards.monsters) {
                try {
                    await MonsterService.addMonsterToPlayer(ctx, {
                        uid,
                        monsterId: monster.monsterId,
                        level: monster.level || 1,
                        stars: monster.stars || 1,
                    });
                    grantedMonsters.push(monster);
                } catch (error) {
                    console.error(`发放怪物失败: ${monster.monsterId}`, error);
                }
            }
            if (grantedMonsters.length > 0) {
                gameSpecificRewards.monsters = grantedMonsters;
            }
        }

        // 处理怪物碎片奖励
        if (rewards.monsterShards && Array.isArray(rewards.monsterShards)) {
            const grantedShards: any[] = [];
            for (const shard of rewards.monsterShards) {
                try {
                    await ShardService.addShards(ctx, {
                        uid,
                        monsterId: shard.monsterId,
                        quantity: shard.quantity,
                        source: "task",
                        sourceId: "task_reward",
                    });
                    grantedShards.push(shard);
                } catch (error) {
                    console.error(`发放碎片失败: ${shard.monsterId}`, error);
                }
            }
            if (grantedShards.length > 0) {
                gameSpecificRewards.shards = grantedShards;
            }
        }

        // 处理能量奖励（通过 Tournament 模块）
        if (rewards.energy && rewards.energy > 0) {
            try {
                const { TournamentProxyService } = await import("../tournament/tournamentProxyService");
                const result = await TournamentProxyService.addEnergy(ctx, {
                    uid,
                    amount: rewards.energy,
                    source: "task",
                    sourceId: "task_reward",
                });
                if (result.success) {
                    gameSpecificRewards.energy = rewards.energy;
                }
            } catch (error) {
                console.error("发放能量失败", error);
            }
        }

        return gameSpecificRewards;
    }

    /**
     * 游戏完成时处理任务事件
     */
    static async onGameComplete(params: {
        uid: string;
        gameType: string;
        isWin: boolean;
        matchId: string;
        tournamentId?: string;
        score?: number;
        duration?: number;
    }): Promise<void> {
        // 处理游戏完成事件
        await this.processTaskEvent({
            uid: params.uid,
            action: "complete_match",
            actionData: {
                increment: 1,
                gameType: params.gameType,
                isWin: params.isWin,
                score: params.score,
                duration: params.duration,
            },
            gameType: params.gameType,
            matchId: params.matchId,
            tournamentId: params.tournamentId,
        });

        // 如果是胜利，处理胜利事件
        if (params.isWin) {
            await this.processTaskEvent({
                uid: params.uid,
                action: "win_match",
                actionData: {
                    increment: 1,
                    gameType: params.gameType,
                },
                gameType: params.gameType,
                matchId: params.matchId,
                tournamentId: params.tournamentId,
            });
        }
    }

    /**
     * 玩家登录时管理任务
     */
    static async onPlayerLogin(uid: string): Promise<void> {
        // 处理登录事件
        await this.processTaskEvent({
            uid,
            action: "login",
            actionData: { increment: 1 },
        });

        // 统一的任务管理
        await this.managePlayerTasks(uid);
    }
}

