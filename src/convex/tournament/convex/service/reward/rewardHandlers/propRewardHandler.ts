/**
 * 道具奖励处理器
 */
export class PropRewardHandler {
    static async grant(ctx: any, params: {
        uid: string;
        props: Array<{
            gameType: string;
            propType: string;
            quantity: number;
            rarity?: string;
        }>;
        source: string;
        sourceId?: string;
    }): Promise<{ success: boolean; message: string; grantedProps?: any[] }> {
        try {
            // 获取玩家库存
            const inventory = await ctx.db
                .query("player_inventory")
                .withIndex("by_uid", (q: any) => q.eq("uid", params.uid))
                .first();

            const grantedProps: any[] = [];
            const currentProps = inventory?.props || [];

            // 合并道具
            for (const prop of params.props) {
                const existingPropIndex = currentProps.findIndex(
                    (p: any) => p.gameType === prop.gameType && p.propType === prop.propType
                );

                if (existingPropIndex >= 0) {
                    // 如果道具已存在，增加数量
                    currentProps[existingPropIndex].quantity += prop.quantity;
                } else {
                    // 如果道具不存在，添加新道具
                    currentProps.push({
                        gameType: prop.gameType,
                        propType: prop.propType,
                        quantity: prop.quantity,
                    });
                }

                grantedProps.push(prop);
            }

            // 更新库存
            if (!inventory) {
                await ctx.db.insert("player_inventory", {
                    uid: params.uid,
                    coins: 0,
                    props: currentProps,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                });
            } else {
                await ctx.db.patch(inventory._id, {
                    props: currentProps,
                    updatedAt: new Date().toISOString(),
                });
            }

            return {
                success: true,
                message: `成功发放 ${grantedProps.length} 种道具`,
                grantedProps: grantedProps,
            };
        } catch (error: any) {
            return {
                success: false,
                message: `发放道具失败: ${error.message}`,
            };
        }
    }
}

