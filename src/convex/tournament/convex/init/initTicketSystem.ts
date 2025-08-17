

// ============================================================================
// 简化门票系统初始化 - 无时效设计
// ============================================================================

/**
 * 初始化门票系统
 */
export async function initTicketSystem(ctx: any) {
    const nowISO = new Date().toISOString();
    console.log("开始初始化简化门票系统（无时效设计）...");

    try {
        // 清理现有门票模板
        const existingTemplates = await ctx.db.query("ticket_templates").collect();
        for (const template of existingTemplates) {
            await ctx.db.delete(template._id);
        }

        // 创建简化的门票模板（无时效）
        const ticketTemplates = [
            // 青铜门票 - 新手友好
            {
                templateId: "bronze_ticket",
                name: "青铜门票",
                description: "适合新手的锦标赛门票，价格实惠",
                type: "bronze",
                price: {
                    coins: 50
                },
                maxUsagePerDay: 3,
                gameTypes: ["ludo", "solitaire", "rummy", "uno"],
                isActive: true,
                createdAt: nowISO,
                updatedAt: nowISO
            },

            // 白银门票 - 进阶玩家
            {
                templateId: "silver_ticket",
                name: "白银门票",
                description: "进阶玩家的锦标赛门票，平衡性价比",
                type: "silver",
                price: {
                    coins: 100
                },
                maxUsagePerDay: 5,
                gameTypes: ["ludo", "solitaire", "rummy", "uno"],
                isActive: true,
                createdAt: nowISO,
                updatedAt: nowISO
            },

            // 黄金门票 - 高级玩家
            {
                templateId: "gold_ticket",
                name: "黄金门票",
                description: "高级玩家的锦标赛门票，顶级奖励",
                type: "gold",
                price: {
                    coins: 200
                },
                maxUsagePerDay: 10,
                gameTypes: ["ludo", "solitaire", "rummy", "uno"],
                isActive: true,
                createdAt: nowISO,
                updatedAt: nowISO
            }
        ];

        // 插入门票模板
        for (const template of ticketTemplates) {
            await ctx.db.insert("ticket_templates", template);
        }

        // 清理现有套餐
        const existingBundles = await ctx.db.query("ticket_bundles").collect();
        for (const bundle of existingBundles) {
            await ctx.db.delete(bundle._id);
        }

        // 创建简化的门票套餐（无时效）
        const ticketBundles = [
            {
                bundleId: "starter_pack",
                name: "新手套餐",
                description: "适合新手的门票组合，性价比高",
                tickets: [
                    { templateId: "bronze_ticket", quantity: 5 },
                    { templateId: "silver_ticket", quantity: 2 }
                ],
                price: {
                    coins: 300
                },
                maxPurchases: 3,
                isActive: true,
                createdAt: nowISO,
                updatedAt: nowISO
            },
            {
                bundleId: "advanced_pack",
                name: "进阶套餐",
                description: "进阶玩家的门票组合",
                tickets: [
                    { templateId: "silver_ticket", quantity: 5 },
                    { templateId: "gold_ticket", quantity: 2 }
                ],
                price: {
                    coins: 800
                },
                maxPurchases: 2,
                isActive: true,
                createdAt: nowISO,
                updatedAt: nowISO
            },
            {
                bundleId: "pro_pack",
                name: "专业套餐",
                description: "高级玩家的门票组合",
                tickets: [
                    { templateId: "gold_ticket", quantity: 5 },
                    { templateId: "silver_ticket", quantity: 3 }
                ],
                price: {
                    coins: 1200
                },
                maxPurchases: 1,
                isActive: true,
                createdAt: nowISO,
                updatedAt: nowISO
            }
        ];

        // 插入门票套餐
        for (const bundle of ticketBundles) {
            await ctx.db.insert("ticket_bundles", bundle);
        }

        console.log("简化门票系统初始化完成（无时效设计）");
        return {
            success: true,
            message: "简化门票系统初始化完成（无时效设计）",
            templatesCount: ticketTemplates.length,
            bundlesCount: ticketBundles.length
        };

    } catch (error) {
        console.error("初始化门票系统失败:", error);
        throw error;
    }
}

/**
 * 重置门票系统
 */
export async function resetTicketSystem(ctx: any) {
    console.log("开始重置门票系统...");

    try {
        // 删除所有门票相关数据
        const tables = [
            "ticket_templates",
            "player_tickets",
            "ticket_transactions",
            "ticket_bundles",
            "bundle_purchases",
            "ticket_usage_stats",
            "ticket_recommendations"
        ];

        for (const tableName of tables) {
            const records = await ctx.db.query(tableName as any).collect();
            for (const record of records) {
                await ctx.db.delete(record._id);
            }
        }

        console.log("门票系统重置完成");
        return {
            success: true,
            message: "门票系统重置完成"
        };

    } catch (error) {
        console.error("重置门票系统失败:", error);
        throw error;
    }
}

/**
 * 检查门票系统状态
 */
export async function checkTicketSystemStatus(ctx: any) {
    try {
        const templateCount = await ctx.db.query("ticket_templates").collect();
        const bundleCount = await ctx.db.query("ticket_bundles").collect();
        const playerTicketCount = await ctx.db.query("player_tickets").collect();
        const transactionCount = await ctx.db.query("ticket_transactions").collect();

        return {
            success: true,
            status: {
                templates: templateCount.length,
                bundles: bundleCount.length,
                playerTickets: playerTicketCount.length,
                transactions: transactionCount.length
            }
        };

    } catch (error) {
        console.error("检查门票系统状态失败:", error);
        throw error;
    }
}

/**
 * 创建测试门票数据
 */
export async function createTestTicketData(ctx: any) {
    const nowISO = new Date().toISOString();
    console.log("开始创建测试门票数据...");

    try {
        // 为测试用户创建门票
        const testUsers = ["test_user_1", "test_user_2", "test_user_3"];
        const testTemplates = ["bronze_ticket", "silver_ticket", "gold_ticket"];

        for (const uid of testUsers) {
            for (const templateId of testTemplates) {
                await ctx.db.insert("player_tickets", {
                    uid,
                    templateId,
                    quantity: Math.floor(Math.random() * 5) + 1,
                    createdAt: nowISO,
                    updatedAt: nowISO
                });
            }
        }

        console.log("测试门票数据创建完成");
        return {
            success: true,
            message: "测试门票数据创建完成"
        };

    } catch (error) {
        console.error("创建测试门票数据失败:", error);
        throw error;
    }
}

/**
 * 发放每日门票奖励
 */
export async function grantDailyTicketRewards(ctx: any) {
    const nowISO = new Date().toISOString();
    console.log("开始发放每日门票奖励...");

    try {
        // 获取所有活跃玩家
        const players = await ctx.db.query("players").collect();
        let grantedCount = 0;

        for (const player of players) {
            // 随机发放门票奖励
            const ticketTypes = ["bronze_ticket", "silver_ticket", "gold_ticket"];
            const randomTicket = ticketTypes[Math.floor(Math.random() * ticketTypes.length)];

            // 检查是否已有该门票
            const existingTicket = await ctx.db.query("player_tickets")
                .withIndex("by_uid", (q: any) => q.eq("uid", player.uid))
                .filter((q: any) => q.eq(q.field("templateId"), randomTicket))
                .unique();

            if (existingTicket) {
                // 更新现有门票
                await ctx.db.patch(existingTicket._id, {
                    quantity: existingTicket.quantity + 1,
                    updatedAt: nowISO
                });
            } else {
                // 创建新门票
                await ctx.db.insert("player_tickets", {
                    uid: player.uid,
                    templateId: randomTicket,
                    quantity: 1,
                    createdAt: nowISO,
                    updatedAt: nowISO
                });
            }

            // 记录奖励交易
            await ctx.db.insert("ticket_transactions", {
                uid: player.uid,
                templateId: randomTicket,
                quantity: 1,
                transactionType: "reward",
                source: "daily",
                context: {},
                createdAt: nowISO
            });

            grantedCount++;
        }

        console.log(`每日门票奖励发放完成，共发放给 ${grantedCount} 个玩家`);
        return {
            success: true,
            message: "每日门票奖励发放完成",
            grantedCount
        };

    } catch (error) {
        console.error("发放每日门票奖励失败:", error);
        throw error;
    }
} 