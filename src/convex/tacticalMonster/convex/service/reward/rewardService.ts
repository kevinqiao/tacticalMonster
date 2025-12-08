import { v } from "convex/values";
import { mutation } from "../../_generated/server";
import { EnergyService } from "../energy/energyService";
import { MonsterService } from "../monster/monsterService";
import { ShardService } from "../monster/shardService";

/**
 * 奖励服务
 * 处理 TacticalMonster 游戏相关的奖励逻辑
 */
export class RewardService {
    /**
     * 领取锦标赛奖励
     * 玩家从前端主动触发，处理通用资源奖励和游戏专用资源奖励
     */
    static async claimTournamentRewards(ctx: any, params: {
        uid: string;
        tournamentId: string;
    }): Promise<{
        success: boolean;
        message: string;
        rewards?: {
            coins?: number;
            gems?: number;
        };
        chests?: any[];
        gameSpecificRewards?: {
            monsters?: Array<{ monsterId: string; level?: number; stars?: number }>;
            monsterShards?: Array<{ monsterId: string; quantity: number }>;
            energy?: number;
        };
    }> {
        const { TournamentProxyService } = await import("../tournament/tournamentProxyService");
        const { ChestService } = await import("../chest/chestService");

        try {
            // 1. 调用 Tournament 模块 claim 接口
            const tournamentResult = await TournamentProxyService.claimTournamentRewards({
                uid: params.uid,
                tournamentId: params.tournamentId,
            });

            if (!tournamentResult.ok) {
                return {
                    success: false,
                    message: tournamentResult.error || "领取奖励失败",
                };
            }

            const result: {
                success: boolean;
                message: string;
                rewards?: {
                    coins?: number;
                    gems?: number;
                };
                chests?: any[];
                gameSpecificRewards?: {
                    monsters?: Array<{ monsterId: string; level?: number; stars?: number }>;
                    monsterShards?: Array<{ monsterId: string; quantity: number }>;
                    energy?: number;
                };
            } = {
                success: true,
                message: "奖励领取成功",
                rewards: tournamentResult.rewards,
            };

            // 2. 处理宝箱生成（如果触发）
            if (tournamentResult.chestTriggered) {
                // 需要获取游戏信息来确定 tier
                // 从 participant 中找到该 tournamentId 对应的游戏
                // 通过查询 participant 表找到玩家在该 tournament 中的游戏
                const participant = await ctx.db
                    .query("mr_game_participants")
                    .withIndex("by_uid", (q: any) => q.eq("uid", params.uid))
                    .filter((q: any) =>
                        q.and(
                            q.eq(q.field("status"), "finished"),
                            q.neq(q.field("gameId"), null)
                        )
                    )
                    .first();

                let playerGames = null;
                if (participant) {
                    playerGames = await ctx.db
                        .query("tacticalMonster_game")
                        .withIndex("by_gameId", (q: any) => q.eq("gameId", participant.gameId))
                        .filter((q: any) =>
                            q.and(
                                q.eq(q.field("tournamentId"), params.tournamentId),
                                q.eq(q.field("status"), "ended")
                            )
                        )
                        .first();
                }

                if (playerGames) {
                    try {
                        // 获取玩家在该游戏中的参与记录
                        const participant = await ctx.db
                            .query("mr_game_participants")
                            .withIndex("by_gameId_uid", (q: any) =>
                                q.eq("gameId", playerGames.gameId).eq("uid", params.uid)
                            )
                            .first();

                        if (participant) {
                            const chestResults = await ChestService.processChestRewards(ctx, {
                                gameId: playerGames.gameId,
                                tier: playerGames.tier || "bronze",
                                players: [{
                                    uid: params.uid,
                                    rank: participant.rank || 1,
                                    score: participant.finalScore || 0,
                                }],
                                chestTriggered: { [params.uid]: true },
                            });

                            // processChestRewards 返回 Record<string, any>，转换为数组
                            if (chestResults && Object.keys(chestResults).length > 0) {
                                result.chests = Object.values(chestResults);
                            }
                        }
                    } catch (error: any) {
                        console.error("处理宝箱生成失败:", error);
                        // 宝箱生成失败不影响奖励领取
                    }
                }
            }

            // 3. 处理游戏专用资源奖励
            if (tournamentResult.gameSpecificRewards) {
                const gameSpecificResult = await this.grantRewards(ctx, {
                    uid: params.uid,
                    rewards: {
                        monsters: tournamentResult.gameSpecificRewards.monsters,
                        monsterShards: tournamentResult.gameSpecificRewards.monsterShards,
                        energy: tournamentResult.gameSpecificRewards.energy,
                    },
                    source: "tournament_reward",
                    sourceId: params.tournamentId,
                });

                if (gameSpecificResult.success && gameSpecificResult.grantedRewards) {
                    result.gameSpecificRewards = gameSpecificResult.grantedRewards;
                } else {
                    console.warn("游戏专用资源奖励发放失败:", gameSpecificResult.message);
                }
            }

            return result;
        } catch (error: any) {
            console.error("领取锦标赛奖励失败:", error);
            return {
                success: false,
                message: error.message || "领取奖励失败",
            };
        }
    }

    /**
     * 发放游戏特定奖励
     */
    static async grantRewards(ctx: any, params: {
        uid: string;
        rewards: {
            monsters?: Array<{ monsterId: string; level?: number; stars?: number }>;
            monsterShards?: Array<{ monsterId: string; quantity: number }>;
            energy?: number;
        };
        source: string;
        sourceId?: string;
    }): Promise<{
        success: boolean;
        message: string;
        grantedRewards?: {
            monsters?: Array<{ monsterId: string; level?: number; stars?: number }>;
            monsterShards?: Array<{ monsterId: string; quantity: number }>;
            energy?: number;
        };
    }> {
        const grantedRewards: {
            monsters?: Array<{ monsterId: string; level?: number; stars?: number }>;
            monsterShards?: Array<{ monsterId: string; quantity: number }>;
            energy?: number;
        } = {};

        try {
            // 处理怪物奖励
            if (params.rewards.monsters && Array.isArray(params.rewards.monsters)) {
                const grantedMonsters: any[] = [];
                for (const monster of params.rewards.monsters) {
                    try {
                        await MonsterService.addMonsterToPlayer(ctx, {
                            uid: params.uid,
                            monsterId: monster.monsterId,
                            level: monster.level || 1,
                            stars: monster.stars || 1,
                        });
                        grantedMonsters.push(monster);
                    } catch (error: any) {
                        console.error(`发放怪物失败: ${monster.monsterId}`, error);
                        throw new Error(`发放怪物失败: ${monster.monsterId} - ${error.message}`);
                    }
                }
                if (grantedMonsters.length > 0) {
                    grantedRewards.monsters = grantedMonsters;
                }
            }

            // 处理怪物碎片奖励
            if (params.rewards.monsterShards && Array.isArray(params.rewards.monsterShards)) {
                const grantedShards: any[] = [];
                for (const shard of params.rewards.monsterShards) {
                    try {
                        await ShardService.addShards(ctx, {
                            uid: params.uid,
                            monsterId: shard.monsterId,
                            quantity: shard.quantity,
                            source: params.source,
                            sourceId: params.sourceId || "reward",
                        });
                        grantedShards.push(shard);
                    } catch (error: any) {
                        console.error(`发放碎片失败: ${shard.monsterId}`, error);
                        throw new Error(`发放碎片失败: ${shard.monsterId} - ${error.message}`);
                    }
                }
                if (grantedShards.length > 0) {
                    grantedRewards.monsterShards = grantedShards;
                }
            }

            // 处理能量奖励
            if (params.rewards.energy && params.rewards.energy > 0) {
                try {
                    await EnergyService.addEnergy(ctx, {
                        uid: params.uid,
                        amount: params.rewards.energy,
                        source: params.source,
                        sourceId: params.sourceId || "reward",
                    });
                    grantedRewards.energy = params.rewards.energy;
                } catch (error: any) {
                    console.error("发放能量失败", error);
                    throw new Error(`发放能量失败: ${error.message}`);
                }
            }

            return {
                success: true,
                message: "游戏特定奖励发放成功",
                grantedRewards,
            };
        } catch (error: any) {
            return {
                success: false,
                message: `发放游戏特定奖励失败: ${error.message}`,
            };
        }
    }
}

/**
 * 领取锦标赛奖励
 * 玩家从前端主动触发，处理通用资源奖励和游戏专用资源奖励
 */
export const claimTournamentRewards = mutation({
    args: {
        uid: v.string(),
        tournamentId: v.string(),
    },
    handler: async (ctx, args) => {
        return await RewardService.claimTournamentRewards(ctx, args);
    },
});

