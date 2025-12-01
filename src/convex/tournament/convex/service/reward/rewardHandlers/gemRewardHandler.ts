/**
 * 宝石奖励处理器
 * 处理宝石的发放和扣除逻辑
 */
export class GemRewardHandler {
    /**
     * 发放宝石
     */
    static async grant(ctx: any, params: {
        uid: string;
        gems: number;
        source: string;
        sourceId?: string;
    }): Promise<{ success: boolean; message: string; grantedGems?: number }> {
        try {
            // 获取玩家库存
            const inventory = await ctx.db
                .query("player_inventory")
                .withIndex("by_uid", (q: any) => q.eq("uid", params.uid))
                .first();

            if (!inventory) {
                // 如果库存不存在，创建新的库存
                await ctx.db.insert("player_inventory", {
                    uid: params.uid,
                    gems: params.gems,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                });
            } else {
                // 更新宝石
                await ctx.db.patch(inventory._id, {
                    gems: (inventory.gems || 0) + params.gems,
                    updatedAt: new Date().toISOString(),
                });
            }

            return {
                success: true,
                message: `成功发放 ${params.gems} 宝石`,
                grantedGems: params.gems,
            };
        } catch (error: any) {
            return {
                success: false,
                message: `发放宝石失败: ${error.message}`,
            };
        }
    }

    /**
     * 扣除宝石
     */
    static async deduct(ctx: any, params: {
        uid: string;
        gems: number;
        source: string;
        sourceId?: string;
    }): Promise<{ success: boolean; message: string; deductedGems?: number; remainingGems?: number }> {
        try {
            // 获取玩家库存
            const inventory = await ctx.db
                .query("player_inventory")
                .withIndex("by_uid", (q: any) => q.eq("uid", params.uid))
                .first();

            if (!inventory) {
                return {
                    success: false,
                    message: "玩家库存不存在",
                };
            }

            const currentGems = inventory.gems || 0;
            if (currentGems < params.gems) {
                return {
                    success: false,
                    message: `宝石不足，需要 ${params.gems}，当前只有 ${currentGems}`,
                };
            }

            // 扣除宝石
            const newGems = currentGems - params.gems;
            await ctx.db.patch(inventory._id, {
                gems: newGems,
                updatedAt: new Date().toISOString(),
            });

            return {
                success: true,
                message: `成功扣除 ${params.gems} 宝石`,
                deductedGems: params.gems,
                remainingGems: newGems,
            };
        } catch (error: any) {
            return {
                success: false,
                message: `扣除宝石失败: ${error.message}`,
            };
        }
    }

    /**
     * 获取玩家宝石数量
     */
    static async getBalance(ctx: any, uid: string): Promise<number> {
        try {
            const inventory = await ctx.db
                .query("player_inventory")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .first();

            return inventory?.gems || 0;
        } catch (error) {
            return 0;
        }
    }
}

