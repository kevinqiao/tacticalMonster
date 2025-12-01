/**
 * 玩家经验值奖励处理器
 * 处理需要调用游戏模块的玩家经验值奖励
 * 
 * 架构说明：
 * - Tournament 模块：通用基础设施，不包含游戏特定逻辑
 * - TacticalMonster 模块：游戏特定逻辑（玩家等级、经验值等）
 * - 通过 HTTP 调用游戏模块处理玩家经验值奖励
 */
export class PlayerExpRewardHandler {
    /**
     * 获取 TacticalMonster 模块的 URL
     */
    private static getTacticalMonsterUrl(): string {
        // 从环境变量获取，如果没有则使用默认值
        // 注意：实际部署时需要配置正确的 URL
        return process.env.TACTICAL_MONSTER_URL || "https://shocking-leopard-487.convex.site";
    }

    /**
     * 发放玩家经验值奖励
     * 通过 HTTP 调用游戏模块处理
     */
    static async grant(ctx: any, params: {
        uid: string;
        exp: number;
        source: string;
        sourceId?: string;
    }): Promise<{ success: boolean; message: string; grantedExp?: number; newLevel?: number; levelUp?: boolean }> {
        try {
            const tacticalMonsterUrl = this.getTacticalMonsterUrl();

            // 通过 HTTP 调用 TacticalMonster 模块
            const response = await fetch(
                `${tacticalMonsterUrl}/grantPlayerExperience`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        uid: params.uid,
                        exp: params.exp,
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
                    message: result.message || "发放玩家经验值失败",
                };
            }

            return {
                success: true,
                message: result.message || "玩家经验值发放成功",
                grantedExp: result.newExp,
                newLevel: result.newLevel,
                levelUp: result.levelUp,
            };
        } catch (error: any) {
            console.error("调用游戏模块玩家经验值服务失败:", error);
            return {
                success: false,
                message: `发放玩家经验值失败: ${error.message}`,
            };
        }
    }

    /**
     * 计算任务经验值
     * 通过 HTTP 调用游戏模块的计算函数
     */
    static async calculateTaskExp(
        taskType: "daily" | "weekly" | "achievement",
        taskDifficulty: "easy" | "medium" | "hard" = "medium",
        taskRewardValue: number = 0
    ): Promise<number> {
        try {
            const tacticalMonsterUrl = this.getTacticalMonsterUrl();

            const response = await fetch(
                `${tacticalMonsterUrl}/calculateTaskExp`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        taskType,
                        taskDifficulty,
                        taskRewardValue,
                    }),
                }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            if (!result.success) {
                console.error("计算任务经验值失败:", result.message);
                return 0;
            }

            return result.exp || 0;
        } catch (error: any) {
            console.error("调用任务经验值计算服务失败:", error);
            return 0; // 失败时返回0，不影响其他奖励发放
        }
    }

    /**
     * 计算锦标赛经验值
     * 通过 HTTP 调用游戏模块的计算函数
     */
    static async calculateTournamentExp(
        rank: number,
        totalParticipants: number,
        tier: string = "bronze"
    ): Promise<number> {
        try {
            const tacticalMonsterUrl = this.getTacticalMonsterUrl();

            const response = await fetch(
                `${tacticalMonsterUrl}/calculateTournamentExp`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        rank,
                        totalParticipants,
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
                console.error("计算锦标赛经验值失败:", result.message);
                return 0;
            }

            return result.exp || 0;
        } catch (error: any) {
            console.error("调用锦标赛经验值计算服务失败:", error);
            return 0; // 失败时返回0，不影响其他奖励发放
        }
    }

    /**
     * 计算活动经验值
     * 通过 HTTP 调用游戏模块的计算函数
     */
    static async calculateActivityExp(
        activityMultiplier: number = 1.0
    ): Promise<number> {
        try {
            const tacticalMonsterUrl = this.getTacticalMonsterUrl();

            const response = await fetch(
                `${tacticalMonsterUrl}/calculateActivityExp`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        activityMultiplier,
                    }),
                }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            if (!result.success) {
                console.error("计算活动经验值失败:", result.message);
                return 0;
            }

            return result.exp || 0;
        } catch (error: any) {
            console.error("调用活动经验值计算服务失败:", error);
            return 0; // 失败时返回0，不影响其他奖励发放
        }
    }
}

