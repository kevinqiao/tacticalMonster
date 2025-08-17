
// ============================================================================
// 统一门票系统 - 支持跨赛季保留
// ============================================================================

export type TicketType = "bronze" | "silver" | "gold";

// 硬编码的门票配置
const TICKET_CONFIGS: Record<TicketType, {
    name: string;
    description: string;
    price: { coins: number };
    maxUsagePerDay: number;
    seasonalRetention: number; // 跨赛季保留比例 (0-1)
}> = {
    bronze: {
        name: "青铜门票",
        description: "通用门票，适用于所有游戏和活动，跨赛季保留",
        price: { coins: 100 },
        maxUsagePerDay: 10,
        seasonalRetention: 1.0 // 完全保留
    },
    silver: {
        name: "白银门票",
        description: "通用高级门票，提供更好的奖励，50%跨赛季保留",
        price: { coins: 250 },
        maxUsagePerDay: 5,
        seasonalRetention: 0.5 // 50%保留
    },
    gold: {
        name: "黄金门票",
        description: "通用顶级门票，提供最佳奖励，赛季重置",
        price: { coins: 500 },
        maxUsagePerDay: 3,
        seasonalRetention: 0.0 // 完全重置
    }
};

export interface PlayerTicket {
    uid: string;
    type: string; // "bronze", "silver", "gold"
    quantity: number;
    lastUsedAt?: string;
    seasonId?: string; // 记录获得赛季
}

export class TicketSystem {
    // ============================================================================
    // 门票配置管理
    // ============================================================================

    /**
     * 获取门票配置
     */
    static getTicketConfig(type: TicketType) {
        return TICKET_CONFIGS[type];
    }

    /**
     * 获取所有门票配置
     */
    static getAllTicketConfigs() {
        return TICKET_CONFIGS;
    }

    /**
     * 检查门票类型是否有效
     */
    static isValidTicketType(type: string): type is TicketType {
        return type in TICKET_CONFIGS;
    }

    // ============================================================================
    // 玩家门票管理
    // ============================================================================

    /**
     * 获取玩家特定类型门票
     */
    static async getPlayerTicketByType(ctx: any, uid: string, ticketType: TicketType): Promise<PlayerTicket | null> {
        const ticket = await ctx.db.query("player_tickets")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .filter((q: any) => q.eq(q.field("type"), ticketType))
            .unique();

        if (!ticket) return null;

        return {
            uid: ticket.uid,
            type: ticket.type,
            quantity: ticket.quantity,
            lastUsedAt: ticket.lastUsedAt,
            seasonId: ticket.seasonId
        };
    }

    /**
     * 获取玩家门票（只返回数量大于0的有效门票）
     */
    static async getPlayerTickets(ctx: any, uid: string): Promise<PlayerTicket[]> {
        const playerTickets = await ctx.db.query("player_tickets")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .filter((q: any) => q.gt(q.field("quantity"), 0))
            .collect();

        return playerTickets.map((ticket: any) => ({
            uid: ticket.uid,
            type: ticket.type,
            quantity: ticket.quantity,
            lastUsedAt: ticket.lastUsedAt,
            seasonId: ticket.seasonId
        }));
    }

    // ============================================================================
    // 门票购买和使用
    // ============================================================================

    /**
     * 购买门票
     */
    static async purchaseTicket(ctx: any, params: {
        uid: string;
        type: string; // "bronze", "silver", "gold"
        quantity: number;
    }): Promise<{ success: boolean; message: string; ticket?: PlayerTicket; cost?: number }> {
        const { uid, type, quantity } = params;

        // 参数验证
        if (quantity <= 0) {
            return { success: false, message: "购买数量必须大于0" };
        }

        if (quantity > 100) {
            return { success: false, message: "单次购买数量不能超过100" };
        }

        // 检查门票类型是否有效
        if (!this.isValidTicketType(type)) {
            return { success: false, message: "无效的门票类型" };
        }

        const config = this.getTicketConfig(type);
        const totalCost = config.price.coins * quantity;

        // 检查玩家是否存在
        const player = await ctx.db.query("players")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .unique();

        if (!player) {
            return { success: false, message: "玩家不存在" };
        }

        // 检查金币是否足够
        if (player.coins < totalCost) {
            return {
                success: false,
                message: `金币不足，需要 ${totalCost} 金币，当前只有 ${player.coins} 金币`
            };
        }

        try {
            // 扣除金币
            await ctx.db.patch(player._id, {
                coins: player.coins - totalCost
            });

            // 添加门票到玩家库存
            await this.addTicketsToPlayer(ctx, uid, type, quantity);

            // 获取更新后的门票信息
            const updatedTicket = await this.getPlayerTicketByType(ctx, uid, type as TicketType);

            return {
                success: true,
                message: `成功购买 ${quantity} 个 ${config.name}`,
                ticket: updatedTicket || {
                    uid,
                    type,
                    quantity,
                    seasonId: this.getCurrentSeasonId()
                },
                cost: totalCost
            };
        } catch (error) {
            console.error("购买门票失败:", error);
            return {
                success: false,
                message: "购买失败，请稍后重试"
            };
        }
    }

    /**
     * 使用门票
     */
    static async useTicket(ctx: any, params: {
        uid: string;
        type: string; // "bronze", "silver", "gold"
    }): Promise<{ success: boolean; message: string; remainingQuantity?: number }> {
        const { uid, type } = params;

        // 参数验证
        if (!this.isValidTicketType(type)) {
            return { success: false, message: "无效的门票类型" };
        }

        const config = this.getTicketConfig(type);



        // 获取并检查门票记录
        const ticketRecord = await ctx.db.query("player_tickets")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .filter((q: any) => q.eq(q.field("type"), type))
            .unique();

        if (!ticketRecord || ticketRecord.quantity <= 0) {
            return { success: false, message: "门票数量不足" };
        }

        const nowISO = new Date().toISOString();

        try {
            // 减少门票数量
            const remainingQuantity = ticketRecord.quantity - 1;
            await ctx.db.patch(ticketRecord._id, {
                quantity: remainingQuantity,
                lastUsedAt: nowISO,
                updatedAt: nowISO
            });

            return {
                success: true,
                message: `成功使用 ${config.name}`,
                remainingQuantity
            };
        } catch (error) {
            console.error("使用门票失败:", error);
            return {
                success: false,
                message: "使用失败，请稍后重试"
            };
        }
    }

    // ============================================================================
    // 门票奖励和发放
    // ============================================================================

    /**
     * 发放门票奖励
     */
    static async grantTicketReward(ctx: any, params: {
        uid: string;
        type: string; // "bronze", "silver", "gold"
        quantity: number;
    }): Promise<{ success: boolean; message: string; ticket?: PlayerTicket }> {
        const { uid, type, quantity } = params;

        // 参数验证
        if (quantity <= 0) {
            return { success: false, message: "发放数量必须大于0" };
        }

        if (!this.isValidTicketType(type)) {
            return { success: false, message: "无效的门票类型" };
        }

        const config = this.getTicketConfig(type);

        try {
            // 添加门票到玩家库存
            await this.addTicketsToPlayer(ctx, uid, type, quantity);

            // 获取更新后的门票信息
            const updatedTicket = await this.getPlayerTicketByType(ctx, uid, type as TicketType);

            return {
                success: true,
                message: `成功发放 ${quantity} 个 ${config.name}`,
                ticket: updatedTicket || {
                    uid,
                    type,
                    quantity,
                    seasonId: this.getCurrentSeasonId()
                }
            };
        } catch (error) {
            console.error("发放门票奖励失败:", error);
            return {
                success: false,
                message: "发放失败，请稍后重试"
            };
        }
    }

    // ============================================================================
    // 赛季管理
    // ============================================================================

    /**
     * 处理赛季重置时的门票保留
     */
    static async handleSeasonalReset(ctx: any, uid: string): Promise<{ success: boolean; message: string; resetResults?: any }> {
        const nowISO = new Date().toISOString();
        const currentSeasonId = this.getCurrentSeasonId();
        const resetResults: any = {};

        try {
            const playerTickets = await ctx.db.query("player_tickets")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .collect();

            for (const ticket of playerTickets) {
                const config = this.getTicketConfig(ticket.type as TicketType);
                const retentionRate = config.seasonalRetention;
                const newQuantity = Math.floor(ticket.quantity * retentionRate);

                await ctx.db.patch(ticket._id, {
                    quantity: newQuantity,
                    seasonId: currentSeasonId,
                    updatedAt: nowISO
                });

                resetResults[ticket.type] = {
                    oldQuantity: ticket.quantity,
                    newQuantity,
                    retentionRate,
                    retained: newQuantity > 0
                };
            }

            return {
                success: true,
                message: "赛季门票重置完成",
                resetResults
            };
        } catch (error) {
            console.error("赛季门票重置失败:", error);
            return {
                success: false,
                message: "赛季门票重置失败，请稍后重试"
            };
        }
    }

    /**
     * 获取门票赛季统计
     */
    static async getSeasonalStats(ctx: any, uid: string): Promise<any> {
        const playerTickets = await this.getPlayerTickets(ctx, uid);
        const stats: any = {};

        for (const ticket of playerTickets) {
            const config = this.getTicketConfig(ticket.type as TicketType);
            stats[ticket.type] = {
                quantity: ticket.quantity,
                retentionRate: config.seasonalRetention,
                willRetain: ticket.quantity * config.seasonalRetention,
                seasonId: ticket.seasonId
            };
        }

        return stats;
    }

    // ============================================================================
    // 门票统计
    // ============================================================================

    /**
     * 获取玩家门票使用统计
     */
    static async getPlayerTicketStats(ctx: any, uid: string): Promise<any[]> {
        const stats = await ctx.db.query("ticket_usage_stats")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .collect();

        return stats.map((stat: any) => ({
            type: stat.type,
            totalUsed: stat.totalUsed,
            totalWon: stat.totalWon,
            totalLost: stat.totalLost,
            winRate: stat.winRate,
            lastUsedAt: stat.lastUsedAt
        }));
    }

    /**
     * 更新门票使用统计
     */
    static async updateTicketUsageStats(ctx: any, params: {
        uid: string;
        type: string;
        isWin: boolean;
    }): Promise<void> {
        const { uid, type, isWin } = params;

        const existingStat = await ctx.db.query("ticket_usage_stats")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .filter((q: any) => q.eq(q.field("type"), type))
            .unique();

        const nowISO = new Date().toISOString();

        if (existingStat) {
            const newTotalUsed = existingStat.totalUsed + 1;
            const newTotalWon = existingStat.totalWon + (isWin ? 1 : 0);
            const newTotalLost = existingStat.totalLost + (isWin ? 0 : 1);
            const newWinRate = newTotalUsed > 0 ? newTotalWon / newTotalUsed : 0;

            await ctx.db.patch(existingStat._id, {
                totalUsed: newTotalUsed,
                totalWon: newTotalWon,
                totalLost: newTotalLost,
                winRate: newWinRate,
                lastUsedAt: nowISO,
                updatedAt: nowISO
            });
        } else {
            await ctx.db.insert("ticket_usage_stats", {
                uid,
                type,
                totalUsed: 1,
                totalWon: isWin ? 1 : 0,
                totalLost: isWin ? 0 : 1,
                winRate: isWin ? 1 : 0,
                lastUsedAt: nowISO,
                createdAt: nowISO,
                updatedAt: nowISO
            });
        }
    }

    // ============================================================================
    // 工具方法
    // ============================================================================

    /**
     * 获取当前赛季ID
     */
    private static getCurrentSeasonId(): string {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        return `season_${year}_${month}`;
    }

    // ============================================================================
    // 私有辅助方法
    // ============================================================================

    /**
     * 添加门票到玩家库存
     */
    private static async addTicketsToPlayer(ctx: any, uid: string, type: string, quantity: number): Promise<void> {
        const nowISO = new Date().toISOString();
        const currentSeasonId = this.getCurrentSeasonId();

        // 直接查询现有门票记录
        const playerTicket = await ctx.db.query("player_tickets")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .filter((q: any) => q.eq(q.field("type"), type))
            .unique();

        if (playerTicket) {
            // 更新现有门票
            await ctx.db.patch(playerTicket._id, {
                quantity: playerTicket.quantity + quantity,
                seasonId: currentSeasonId,
                updatedAt: nowISO
            });
        } else {
            // 创建新门票记录
            await ctx.db.insert("player_tickets", {
                uid,
                type,
                quantity,
                seasonId: currentSeasonId,
                createdAt: nowISO,
                updatedAt: nowISO
            });
        }
    }

} 