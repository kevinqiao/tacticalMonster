/**
 * 游戏特定奖励处理器
 * 处理需要调用游戏模块的奖励（如怪物、碎片、能量等）
 * 
 * 架构说明：
 * - Tournament 模块：通用基础设施，不包含游戏特定逻辑
 * - TacticalMonster 模块：游戏特定逻辑（怪物、碎片、能量等）
 * - 通过 HTTP 调用游戏模块处理游戏特定奖励
 */
export class GameSpecificRewardHandler {
    /**
     * 获取 TacticalMonster 模块的 URL
     */
    private static getTacticalMonsterUrl(): string {
        // 从环境变量获取，如果没有则使用默认值
        // 注意：实际部署时需要配置正确的 URL
        return process.env.TACTICAL_MONSTER_URL || "https://shocking-leopard-487.convex.site";
    }

    /**
     * 发放游戏特定奖励
     * 通过 HTTP 调用游戏模块处理
     */
    static async grant(ctx: any, params: {
        uid: string;
        gameType: string;
        rewards: {
            monsters?: Array<{ monsterId: string; level?: number; stars?: number }>;
            monsterShards?: Array<{ monsterId: string; quantity: number }>;
            // 注意：energy 已移除，现在由 EnergyRewardHandler 统一处理
        };
        source: string;
        sourceId?: string;
    }): Promise<{ success: boolean; message: string; grantedRewards?: any }> {
        try {
            // 如果游戏类型是 TacticalMonster，需要通过 HTTP 调用
            if (params.gameType === "tacticalMonster") {
                const tacticalMonsterUrl = this.getTacticalMonsterUrl();

                // 通过 HTTP 调用 TacticalMonster 模块
                const response = await fetch(
                    `${tacticalMonsterUrl}/grantGameSpecificRewards`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            uid: params.uid,
                            rewards: params.rewards,
                            source: params.source,
                            sourceId: params.sourceId,
                        }),
                    }
                );

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
                }

                const result = await response.json();

                if (!result.success) {
                    return {
                        success: false,
                        message: result.message || "发放游戏特定奖励失败",
                    };
                }

                return {
                    success: true,
                    message: result.message || "游戏特定奖励发放成功",
                    grantedRewards: result.grantedRewards || params.rewards,
                };
            }

            // 其他游戏类型的处理
            return {
                success: false,
                message: `不支持的游戏类型: ${params.gameType}`,
            };
        } catch (error: any) {
            console.error("调用游戏模块奖励服务失败:", error);
            return {
                success: false,
                message: `发放游戏特定奖励失败: ${error.message}`,
            };
        }
    }
}

