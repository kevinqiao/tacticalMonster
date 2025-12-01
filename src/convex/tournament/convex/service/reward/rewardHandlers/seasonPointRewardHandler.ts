/**
 * 赛季点奖励处理器
 */
export class SeasonPointRewardHandler {
    /**
     * 获取 TacticalMonster 模块的 URL
     */
    private static getTacticalMonsterUrl(): string {
        return process.env.TACTICAL_MONSTER_URL || "https://shocking-leopard-487.convex.site";
    }

    static async grant(ctx: any, params: {
        uid: string;
        seasonPoints: number;
        source: string;
        sourceId?: string;
    }): Promise<{ success: boolean; message: string; grantedPoints?: number; newLevel?: number }> {
        try {
            // 导入 Battle Pass 系统
            const { BattlePassSystem } = await import("../../../battlePass/battlePassSystem");
            
            // 调用 Battle Pass 系统添加赛季积分
            const result = await BattlePassSystem.addSeasonPoints(
                ctx,
                params.uid,
                params.seasonPoints,
                params.source
            );
            
            if (result.success) {
                return {
                    success: true,
                    message: `成功发放 ${params.seasonPoints} 赛季点`,
                    grantedPoints: params.seasonPoints,
                    newLevel: result.newLevel,
                };
            } else {
                return {
                    success: false,
                    message: result.message || "发放赛季点失败",
                };
            }
        } catch (error: any) {
            return {
                success: false,
                message: `发放赛季点失败: ${error.message}`,
            };
        }
    }

    /**
     * 计算游戏完成赛季积分
     * 通过 HTTP 调用游戏模块的计算函数
     */
    static async calculateMonsterRumblePoints(
        rank: number,
        score: number,
        tier: string = "bronze"
    ): Promise<number> {
        try {
            const tacticalMonsterUrl = this.getTacticalMonsterUrl();
            
            const response = await fetch(
                `${tacticalMonsterUrl}/calculateMonsterRumblePoints`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        rank,
                        score,
                        tier,
                    }),
                }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            if (!result.success) {
                console.error("计算游戏完成赛季积分失败:", result.message);
                return 0;
            }

            return result.points || 0;
        } catch (error: any) {
            console.error("调用游戏完成赛季积分计算服务失败:", error);
            return 0;
        }
    }

    /**
     * 计算升级赛季积分
     */
    static async calculateUpgradePoints(
        rarity: string,
        level: number,
        previousLevel: number = 0
    ): Promise<number> {
        try {
            const tacticalMonsterUrl = this.getTacticalMonsterUrl();
            
            const response = await fetch(
                `${tacticalMonsterUrl}/calculateUpgradePoints`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        rarity,
                        level,
                        previousLevel,
                    }),
                }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            if (!result.success) {
                console.error("计算升级赛季积分失败:", result.message);
                return 0;
            }

            return result.points || 0;
        } catch (error: any) {
            console.error("调用升级赛季积分计算服务失败:", error);
            return 0;
        }
    }

    /**
     * 计算升星赛季积分
     */
    static async calculateStarUpPoints(
        rarity: string,
        stars: number
    ): Promise<number> {
        try {
            const tacticalMonsterUrl = this.getTacticalMonsterUrl();
            
            const response = await fetch(
                `${tacticalMonsterUrl}/calculateStarUpPoints`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        rarity,
                        stars,
                    }),
                }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            if (!result.success) {
                console.error("计算升星赛季积分失败:", result.message);
                return 0;
            }

            return result.points || 0;
        } catch (error: any) {
            console.error("调用升星赛季积分计算服务失败:", error);
            return 0;
        }
    }

    /**
     * 计算宝箱开启赛季积分
     */
    static async calculateChestPoints(
        chestType: string
    ): Promise<number> {
        try {
            const tacticalMonsterUrl = this.getTacticalMonsterUrl();
            
            const response = await fetch(
                `${tacticalMonsterUrl}/calculateChestPoints`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        chestType,
                    }),
                }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            if (!result.success) {
                console.error("计算宝箱开启赛季积分失败:", result.message);
                return 0;
            }

            return result.points || 0;
        } catch (error: any) {
            console.error("调用宝箱开启赛季积分计算服务失败:", error);
            return 0;
        }
    }

    /**
     * 计算 Boss 击败赛季积分
     */
    static async calculateBossDefeatPoints(
        bossDifficulty: string
    ): Promise<number> {
        try {
            const tacticalMonsterUrl = this.getTacticalMonsterUrl();
            
            const response = await fetch(
                `${tacticalMonsterUrl}/calculateBossDefeatPoints`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        bossDifficulty,
                    }),
                }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            if (!result.success) {
                console.error("计算 Boss 击败赛季积分失败:", result.message);
                return 0;
            }

            return result.points || 0;
        } catch (error: any) {
            console.error("调用 Boss 击败赛季积分计算服务失败:", error);
            return 0;
        }
    }
}

