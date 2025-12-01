/**
 * 游戏特定奖励服务
 * 处理 TacticalMonster 游戏特有的奖励（怪物、碎片、能量等）
 */
import { EnergyService } from "../energy/energyService";
import { MonsterService } from "../monster/monsterService";
import { ShardService } from "../monster/shardService";

export class GameSpecificRewardService {
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

