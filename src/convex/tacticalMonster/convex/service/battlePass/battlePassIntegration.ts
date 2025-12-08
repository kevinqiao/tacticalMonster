/**
 * Battle Pass 集成服务
 * 负责与 Tournament 模块的 Battle Pass 系统交互
 */

import { getTournamentUrl, TOURNAMENT_CONFIG } from "../../config/tournamentConfig";

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
     * 注意：Battle Pass 奖励领取方法已移除
     * 
     * 设计变更：
     * - 前端直接调用 Tournament 模块的 /claimBattlePassReward 接口
     * - Tournament 模块处理通用奖励（金币、门票等）
     * - 如果奖励中包含游戏特有资源（怪物碎片、怪物、能量等），
     *   Tournament 模块会调用 TacticalMonster 的 /grantGameSpecificRewards 端点
     * 
     * 这种方式与锦标赛奖励领取保持一致：
     * - 前端 → Tournament 模块 → TacticalMonster 模块（如果需要）
     */

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

