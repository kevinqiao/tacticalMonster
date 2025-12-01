/**
 * Battle Pass 集成服务
 * 负责与 Tournament 模块的 Battle Pass 系统交互
 */

import { getTournamentUrl } from "../../config/tournamentConfig";
import { TOURNAMENT_CONFIG } from "../../config/tournamentConfig";
import { ShardService } from "../monster/shardService";
import { MonsterService } from "../monster/monsterService";
import { EnergyService } from "../energy/energyService";

/**
 * Battle Pass 集成服务
 */
export class BattlePassIntegration {
    /**
     * 添加游戏赛季积分
     */
    static async addGameSeasonPoints(
        ctx: any,
        params: {
            uid: string;
            amount: number;
            source: string; // "tacticalMonster:monster_rumble", "tacticalMonster:monster_upgrade", etc.
            sourceDetails?: any;
        }
    ): Promise<{
        success: boolean;
        newLevel?: number;
        message: string;
        rewards?: any[];
    }> {
        try {
            // 调用 Tournament HTTP API
            const response = await fetch(
                getTournamentUrl(TOURNAMENT_CONFIG.ENDPOINTS.ADD_SEASON_POINTS),
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        uid: params.uid,
                        seasonPointsAmount: params.amount,
                        source: params.source,
                        sourceDetails: params.sourceDetails,
                    }),
                }
            );
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (!result.ok && !result.success) {
                return {
                    success: false,
                    message: result.message || result.error || "添加积分失败",
                };
            }
            
            return {
                success: result.success || result.ok,
                newLevel: result.newLevel,
                message: result.message || "成功添加积分",
                rewards: result.rewards,
            };
        } catch (error: any) {
            console.error("添加 Battle Pass 积分失败:", error);
            return {
                success: false,
                message: error.message || "添加积分失败，请稍后重试",
            };
        }
    }
    
    /**
     * 领取 Battle Pass 奖励
     */
    static async claimGameRewards(
        ctx: any,
        params: {
            uid: string;
            level: number;
        }
    ): Promise<{
        success: boolean;
        message: string;
        rewards?: any;
    }> {
        try {
            // 1. 调用 Tournament API 领取奖励
            const response = await fetch(
                getTournamentUrl(TOURNAMENT_CONFIG.ENDPOINTS.CLAIM_BATTLE_PASS_REWARD),
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        uid: params.uid,
                        level: params.level,
                    }),
                }
            );
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (!result.ok || !result.success) {
                return {
                    success: false,
                    message: result.message || result.error || "领取奖励失败",
                };
            }
            
            // 2. 处理游戏特有奖励
            if (result.rewards) {
                // 注意：当前 Tournament 模块的奖励配置可能不包含 gameSpecificRewards
                // 这里预留接口，未来可以扩展
                const gameRewards = result.rewards.gameSpecificRewards?.tacticalMonster;
                
                if (gameRewards) {
                    // 发放怪物碎片
                    if (gameRewards.monsterShards) {
                        for (const shard of gameRewards.monsterShards) {
                            await ShardService.addShards(ctx, {
                                uid: params.uid,
                                monsterId: shard.monsterId,
                                quantity: shard.quantity,
                                source: "battle_pass",
                                sourceId: `level_${params.level}`,
                            });
                        }
                    }
                    
                    // 发放完整怪物
                    if (gameRewards.monsters) {
                        for (const monster of gameRewards.monsters) {
                            await MonsterService.addMonsterToPlayer(ctx, {
                                uid: params.uid,
                                monsterId: monster.monsterId,
                                level: monster.level || 1,
                                stars: monster.stars || 1,
                            });
                        }
                    }
                    
                    // 发放能量
                    if (gameRewards.energy) {
                        await EnergyService.addEnergy(ctx, {
                            uid: params.uid,
                            amount: gameRewards.energy,
                            source: "battle_pass",
                            sourceId: `level_${params.level}`,
                        });
                    }
                }
            }
            
            return {
                success: true,
                message: result.message || "成功领取奖励",
                rewards: result.rewards,
            };
        } catch (error: any) {
            console.error("领取 Battle Pass 奖励失败:", error);
            return {
                success: false,
                message: error.message || "领取奖励失败，请稍后重试",
            };
        }
    }
    
    /**
     * 购买 Premium Battle Pass
     */
    static async purchasePremiumPass(
        ctx: any,
        params: {
            uid: string;
        }
    ): Promise<{
        success: boolean;
        message: string;
        battlePass?: any;
    }> {
        try {
            const response = await fetch(
                getTournamentUrl(TOURNAMENT_CONFIG.ENDPOINTS.PURCHASE_PREMIUM_BATTLE_PASS),
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        uid: params.uid,
                    }),
                }
            );
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            return {
                success: result.success || result.ok,
                message: result.message || (result.success ? "购买成功" : "购买失败"),
                battlePass: result.battlePass,
            };
        } catch (error: any) {
            console.error("购买 Premium Battle Pass 失败:", error);
            return {
                success: false,
                message: error.message || "购买失败，请稍后重试",
            };
        }
    }
    
    /**
     * 获取 Battle Pass 进度（带游戏数据）
     */
    static async getBattlePassWithGameData(
        ctx: any,
        params: {
            uid: string;
        }
    ): Promise<{
        success: boolean;
        battlePass?: any;
        gameData?: any;
    }> {
        try {
            // 1. 获取 Battle Pass 进度
            const response = await fetch(
                `${getTournamentUrl(TOURNAMENT_CONFIG.ENDPOINTS.GET_PLAYER_BATTLE_PASS)}?uid=${params.uid}`,
                {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (!result.ok || !result.battlePass) {
                return {
                    success: false,
                };
            }
            
            // 2. 补充游戏特定数据
            const gameData = {
                // 可以添加游戏特定的统计信息
                tacticalMonsterPoints: result.battlePass.progress?.gameSpecificPoints?.tacticalMonster || {},
            };
            
            return {
                success: true,
                battlePass: result.battlePass,
                gameData: gameData,
            };
        } catch (error: any) {
            console.error("获取 Battle Pass 进度失败:", error);
            return {
                success: false,
            };
        }
    }
}

