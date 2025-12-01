/**
 * 金币奖励处理器
 */
export class CoinRewardHandler {
    static async grant(ctx: any, params: {
        uid: string;
        coins: number;
        source: string;
        sourceId?: string;
    }): Promise<{ success: boolean; message: string; grantedCoins?: number }> {
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
                    coins: params.coins,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                });
            } else {
                // 更新金币
                await ctx.db.patch(inventory._id, {
                    coins: (inventory.coins || 0) + params.coins,
                    updatedAt: new Date().toISOString(),
                });
            }

            return {
                success: true,
                message: `成功发放 ${params.coins} 金币`,
                grantedCoins: params.coins,
            };
        } catch (error: any) {
            return {
                success: false,
                message: `发放金币失败: ${error.message}`,
            };
        }
    }

    /**
     * 扣除金币
     */
    static async deduct(ctx: any, params: {
        uid: string;
        coins: number;
        source: string;
        sourceId?: string;
    }): Promise<{ success: boolean; message: string; deductedCoins?: number; remainingCoins?: number }> {
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

            const currentCoins = inventory.coins || 0;
            if (currentCoins < params.coins) {
                return {
                    success: false,
                    message: `金币不足，需要 ${params.coins}，当前只有 ${currentCoins}`,
                };
            }

            // 扣除金币
            const newCoins = currentCoins - params.coins;
            await ctx.db.patch(inventory._id, {
                coins: newCoins,
                updatedAt: new Date().toISOString(),
            });

            return {
                success: true,
                message: `成功扣除 ${params.coins} 金币`,
                deductedCoins: params.coins,
                remainingCoins: newCoins,
            };
        } catch (error: any) {
            return {
                success: false,
                message: `扣除金币失败: ${error.message}`,
            };
        }
    }

    /**
     * 获取玩家金币数量
     */
    static async getBalance(ctx: any, uid: string): Promise<number> {
        try {
            const inventory = await ctx.db
                .query("player_inventory")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .first();

            return inventory?.coins || 0;
        } catch (error) {
            return 0;
        }
    }
}

