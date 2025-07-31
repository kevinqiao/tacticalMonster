import { getTorontoMidnight } from "../simpleTimezoneUtils";

// ============================================================================
// 简化门票系统核心服务 - 无时效设计
// ============================================================================

export interface TicketTemplate {
    templateId: string;
    name: string;
    description: string;
    type: "bronze" | "silver" | "gold";  // 简化为三种类型
    price: {
        coins: number;
    };
    maxUsagePerDay: number;
    gameTypes: string[];  // 支持的游戏类型
}

export interface PlayerTicket {
    uid: string;
    templateId: string;
    quantity: number;
    lastUsedAt?: string;
}

export interface TicketTransaction {
    uid: string;
    templateId: string;
    quantity: number;
    transactionType: "purchase" | "reward" | "usage" | "refund";
    source: "shop" | "tournament" | "achievement" | "gift" | "daily" | "weekly" | "seasonal" | "bundle" | "system" | string;
    context?: {
        tournamentId?: string;
        matchId?: string;
        bundleId?: string;
    };
}

export class TicketSystem {
    // ============================================================================
    // 门票模板管理
    // ============================================================================

    /**
     * 获取所有门票模板
     */
    static async getAllTicketTemplates(ctx: any): Promise<TicketTemplate[]> {
        const templates = await ctx.db.query("ticket_templates").collect();
        return templates.map((template: any) => ({
            templateId: template.templateId,
            name: template.name,
            description: template.description,
            type: template.type,
            price: template.price,
            maxUsagePerDay: template.maxUsagePerDay,
            gameTypes: template.gameTypes
        }));
    }

    /**
     * 根据类型获取门票模板
     */
    static async getTicketTemplatesByType(ctx: any, type: "bronze" | "silver" | "gold"): Promise<TicketTemplate[]> {
        const templates = await ctx.db.query("ticket_templates")
            .withIndex("by_type", (q: any) => q.eq("type", type))
            .collect();

        return templates.map((template: any) => ({
            templateId: template.templateId,
            name: template.name,
            description: template.description,
            type: template.type,
            price: template.price,
            maxUsagePerDay: template.maxUsagePerDay,
            gameTypes: template.gameTypes
        }));
    }

    /**
     * 根据游戏类型获取门票模板
     */
    static async getTicketTemplatesByGameType(ctx: any, gameType: string): Promise<TicketTemplate[]> {
        const templates = await ctx.db.query("ticket_templates").collect();
        return templates
            .filter((template: any) => template.gameTypes.includes(gameType))
            .map((template: any) => ({
                templateId: template.templateId,
                name: template.name,
                description: template.description,
                type: template.type,
                price: template.price,
                maxUsagePerDay: template.maxUsagePerDay,
                gameTypes: template.gameTypes
            }));
    }

    // ============================================================================
    // 玩家门票管理
    // ============================================================================

    /**
     * 获取玩家所有门票
     */
    static async getPlayerTickets(ctx: any, uid: string): Promise<PlayerTicket[]> {
        const playerTickets = await ctx.db.query("player_tickets")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .collect();

        return playerTickets.map((ticket: any) => ({
            uid: ticket.uid,
            templateId: ticket.templateId,
            quantity: ticket.quantity,
            lastUsedAt: ticket.lastUsedAt
        }));
    }

    /**
     * 获取玩家特定门票
     */
    static async getPlayerTicket(ctx: any, uid: string, templateId: string): Promise<PlayerTicket | null> {
        const playerTickets = await ctx.db.query("player_tickets")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .filter((q: any) => q.eq(q.field("templateId"), templateId))
            .collect();

        if (playerTickets.length === 0) return null;

        const ticket = playerTickets[0];
        return {
            uid: ticket.uid,
            templateId: ticket.templateId,
            quantity: ticket.quantity,
            lastUsedAt: ticket.lastUsedAt
        };
    }

    /**
     * 获取玩家有效门票（数量大于0）
     */
    static async getPlayerValidTickets(ctx: any, uid: string): Promise<PlayerTicket[]> {
        const playerTickets = await ctx.db.query("player_tickets")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .filter((q: any) => q.gt(q.field("quantity"), 0))
            .collect();

        return playerTickets.map((ticket: any) => ({
            uid: ticket.uid,
            templateId: ticket.templateId,
            quantity: ticket.quantity,
            lastUsedAt: ticket.lastUsedAt
        }));
    }

    /**
     * 获取玩家特定游戏类型的有效门票
     */
    static async getPlayerValidTicketsByGameType(ctx: any, uid: string, gameType: string): Promise<PlayerTicket[]> {
        const validTickets = await this.getPlayerValidTickets(ctx, uid);
        const templates = await this.getTicketTemplatesByGameType(ctx, gameType);
        const validTemplateIds = templates.map(t => t.templateId);

        return validTickets.filter(ticket => validTemplateIds.includes(ticket.templateId));
    }

    // ============================================================================
    // 门票购买和使用
    // ============================================================================

    /**
     * 购买门票
     */
    static async purchaseTicket(ctx: any, params: {
        uid: string;
        templateId: string;
        quantity: number;
        source: string;
        context?: any;
    }): Promise<{ success: boolean; message: string; ticket?: PlayerTicket }> {
        const { uid, templateId, quantity, source, context } = params;

        // 获取门票模板
        const template = await ctx.db.query("ticket_templates")
            .withIndex("by_templateId", (q: any) => q.eq("templateId", templateId))
            .unique();

        if (!template) {
            return { success: false, message: "门票模板不存在" };
        }

        // 检查玩家金币是否足够
        const player = await ctx.db.query("players")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .unique();

        if (!player) {
            return { success: false, message: "玩家不存在" };
        }

        const totalCost = template.price.coins * quantity;
        if (player.coins < totalCost) {
            return { success: false, message: "金币不足" };
        }

        // 扣除金币
        await ctx.db.patch(player._id, {
            coins: player.coins - totalCost
        });

        // 添加门票到玩家库存
        const existingTicket = await this.getPlayerTicket(ctx, uid, templateId);
        const now = getTorontoMidnight();

        if (existingTicket) {
            // 更新现有门票
            const playerTicket = await ctx.db.query("player_tickets")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .filter((q: any) => q.eq(q.field("templateId"), templateId))
                .unique();

            await ctx.db.patch(playerTicket._id, {
                quantity: playerTicket.quantity + quantity,
                updatedAt: now.iso
            });
        } else {
            // 创建新门票记录
            await ctx.db.insert("player_tickets", {
                uid,
                templateId,
                quantity,
                createdAt: now.iso,
                updatedAt: now.iso
            });
        }

        // 记录交易
        await this.recordTransaction(ctx, {
            uid,
            templateId,
            quantity,
            transactionType: "purchase",
            source,
            context
        });

        return {
            success: true,
            message: "门票购买成功",
            ticket: {
                uid,
                templateId,
                quantity: (existingTicket?.quantity || 0) + quantity,
                lastUsedAt: existingTicket?.lastUsedAt
            }
        };
    }

    /**
     * 使用门票
     */
    static async useTicket(ctx: any, params: {
        uid: string;
        templateId: string;
        gameType: string;
        tournamentId?: string;
        matchId?: string;
    }): Promise<{ success: boolean; message: string; remainingQuantity?: number }> {
        const { uid, templateId, gameType, tournamentId, matchId } = params;

        // 检查门票是否存在且有效
        const playerTicket = await this.getPlayerTicket(ctx, uid, templateId);
        if (!playerTicket) {
            return { success: false, message: "门票不存在" };
        }

        if (playerTicket.quantity <= 0) {
            return { success: false, message: "门票数量不足" };
        }

        // 检查每日使用限制
        const template = await ctx.db.query("ticket_templates")
            .withIndex("by_templateId", (q: any) => q.eq("templateId", templateId))
            .unique();

        if (template) {
            const todayStart = new Date(getTorontoMidnight().localDate.getTime() - getTorontoMidnight().localDate.getHours() * 60 * 60 * 1000 - getTorontoMidnight().localDate.getMinutes() * 60 * 1000 - getTorontoMidnight().localDate.getSeconds() * 1000).toISOString();
            const todayEnd = new Date(todayStart).toISOString();

            const todayUsage = await ctx.db.query("ticket_transactions")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .filter((q: any) => q.eq(q.field("templateId"), templateId))
                .filter((q: any) => q.eq(q.field("transactionType"), "usage"))
                .filter((q: any) => q.gte(q.field("createdAt"), todayStart))
                .filter((q: any) => q.lte(q.field("createdAt"), todayEnd))
                .collect();

            const totalUsedToday = todayUsage.reduce((sum: number, transaction: any) => sum + transaction.quantity, 0);
            if (totalUsedToday >= template.maxUsagePerDay) {
                return { success: false, message: "今日使用次数已达上限" };
            }
        }

        // 检查游戏类型是否匹配
        if (template && !template.gameTypes.includes(gameType)) {
            return { success: false, message: "门票不适用于此游戏类型" };
        }

        // 减少门票数量
        const ticketRecord = await ctx.db.query("player_tickets")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .filter((q: any) => q.eq(q.field("templateId"), templateId))
            .unique();

        await ctx.db.patch(ticketRecord._id, {
            quantity: ticketRecord.quantity - 1,
            lastUsedAt: getTorontoMidnight().iso,
            updatedAt: getTorontoMidnight().iso
        });

        // 记录使用交易
        await this.recordTransaction(ctx, {
            uid,
            templateId,
            quantity: 1,
            transactionType: "usage",
            source: "tournament",
            context: { tournamentId, matchId }
        });

        return {
            success: true,
            message: "门票使用成功",
            remainingQuantity: ticketRecord.quantity - 1
        };
    }

    // ============================================================================
    // 门票奖励和发放
    // ============================================================================

    /**
     * 发放门票奖励
     */
    static async grantTicketReward(ctx: any, params: {
        uid: string;
        templateId: string;
        quantity: number;
        source: string;
        context?: any;
    }): Promise<{ success: boolean; message: string }> {
        const { uid, templateId, quantity, source, context } = params;

        // 检查门票模板是否存在
        const template = await ctx.db.query("ticket_templates")
            .withIndex("by_templateId", (q: any) => q.eq("templateId", templateId))
            .unique();

        if (!template) {
            return { success: false, message: "门票模板不存在" };
        }

        // 添加门票到玩家库存
        const existingTicket = await this.getPlayerTicket(ctx, uid, templateId);
        const now = getTorontoMidnight();

        if (existingTicket) {
            // 更新现有门票
            const playerTicket = await ctx.db.query("player_tickets")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .filter((q: any) => q.eq(q.field("templateId"), templateId))
                .unique();

            await ctx.db.patch(playerTicket._id, {
                quantity: playerTicket.quantity + quantity,
                updatedAt: now.iso
            });
        } else {
            // 创建新门票记录
            await ctx.db.insert("player_tickets", {
                uid,
                templateId,
                quantity,
                createdAt: now.iso,
                updatedAt: now.iso
            });
        }

        // 记录奖励交易
        await this.recordTransaction(ctx, {
            uid,
            templateId,
            quantity,
            transactionType: "reward",
            source,
            context
        });

        return { success: true, message: "门票奖励发放成功" };
    }

    // ============================================================================
    // 门票套餐管理
    // ============================================================================

    /**
     * 获取所有门票套餐
     */
    static async getAllTicketBundles(ctx: any): Promise<any[]> {
        const bundles = await ctx.db.query("ticket_bundles")
            .withIndex("by_active", (q: any) => q.eq("isActive", true))
            .collect();

        return bundles.map((bundle: any) => ({
            bundleId: bundle.bundleId,
            name: bundle.name,
            description: bundle.description,
            tickets: bundle.tickets,
            price: bundle.price,
            maxPurchases: bundle.maxPurchases
        }));
    }

    /**
     * 购买门票套餐
     */
    static async purchaseTicketBundle(ctx: any, params: {
        uid: string;
        bundleId: string;
        quantity: number;
    }): Promise<{ success: boolean; message: string; tickets?: PlayerTicket[] }> {
        const { uid, bundleId, quantity } = params;

        // 获取套餐信息
        const bundle = await ctx.db.query("ticket_bundles")
            .withIndex("by_bundleId", (q: any) => q.eq("bundleId", bundleId))
            .unique();

        if (!bundle || !bundle.isActive) {
            return { success: false, message: "套餐不存在或已停售" };
        }

        // 检查玩家金币是否足够
        const player = await ctx.db.query("players")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .unique();

        if (!player) {
            return { success: false, message: "玩家不存在" };
        }

        const totalCost = bundle.price.coins * quantity;
        if (player.coins < totalCost) {
            return { success: false, message: "金币不足" };
        }

        // 扣除金币
        await ctx.db.patch(player._id, {
            coins: player.coins - totalCost
        });

        // 发放套餐中的门票
        const now = getTorontoMidnight();
        const grantedTickets: PlayerTicket[] = [];

        for (const ticketItem of bundle.tickets) {
            const template = await ctx.db.query("ticket_templates")
                .withIndex("by_templateId", (q: any) => q.eq("templateId", ticketItem.templateId))
                .unique();

            if (template) {
                const totalQuantity = ticketItem.quantity * quantity;

                // 添加到玩家库存
                const existingTicket = await this.getPlayerTicket(ctx, uid, ticketItem.templateId);

                if (existingTicket) {
                    const playerTicket = await ctx.db.query("player_tickets")
                        .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                        .filter((q: any) => q.eq(q.field("templateId"), ticketItem.templateId))
                        .unique();

                    await ctx.db.patch(playerTicket._id, {
                        quantity: playerTicket.quantity + totalQuantity,
                        updatedAt: now.iso
                    });

                    grantedTickets.push({
                        uid,
                        templateId: ticketItem.templateId,
                        quantity: playerTicket.quantity + totalQuantity,
                        lastUsedAt: existingTicket.lastUsedAt
                    });
                } else {
                    await ctx.db.insert("player_tickets", {
                        uid,
                        templateId: ticketItem.templateId,
                        quantity: totalQuantity,
                        createdAt: now.iso,
                        updatedAt: now.iso
                    });

                    grantedTickets.push({
                        uid,
                        templateId: ticketItem.templateId,
                        quantity: totalQuantity
                    });
                }

                // 记录交易
                await this.recordTransaction(ctx, {
                    uid,
                    templateId: ticketItem.templateId,
                    quantity: totalQuantity,
                    transactionType: "purchase",
                    source: "bundle",
                    context: { bundleId }
                });
            }
        }

        // 记录套餐购买
        await ctx.db.insert("bundle_purchases", {
            uid,
            bundleId,
            quantity,
            totalPrice: {
                coins: totalCost
            },
            createdAt: now.iso
        });

        return {
            success: true,
            message: "套餐购买成功",
            tickets: grantedTickets
        };
    }

    // ============================================================================
    // 门票统计和分析
    // ============================================================================

    /**
     * 获取玩家门票使用统计
     */
    static async getPlayerTicketStats(ctx: any, uid: string): Promise<any[]> {
        const stats = await ctx.db.query("ticket_usage_stats")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .collect();

        return stats.map((stat: any) => ({
            templateId: stat.templateId,
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
        templateId: string;
        isWin: boolean;
    }): Promise<void> {
        const { uid, templateId, isWin } = params;

        const existingStat = await ctx.db.query("ticket_usage_stats")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .filter((q: any) => q.eq(q.field("templateId"), templateId))
            .unique();

        const now = getTorontoMidnight();

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
                lastUsedAt: now.iso,
                updatedAt: now.iso
            });
        } else {
            await ctx.db.insert("ticket_usage_stats", {
                uid,
                templateId,
                totalUsed: 1,
                totalWon: isWin ? 1 : 0,
                totalLost: isWin ? 0 : 1,
                winRate: isWin ? 1 : 0,
                lastUsedAt: now.iso,
                createdAt: now.iso,
                updatedAt: now.iso
            });
        }
    }

    // ============================================================================
    // 门票推荐系统
    // ============================================================================

    /**
     * 获取玩家门票推荐
     */
    static async getPlayerTicketRecommendations(ctx: any, uid: string): Promise<any[]> {
        const recommendations = await ctx.db.query("ticket_recommendations")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .filter((q: any) => q.gt(q.field("expiresAt"), getTorontoMidnight().iso))
            .order("desc")
            .collect();

        return recommendations.map((rec: any) => ({
            templateId: rec.templateId,
            reason: rec.reason,
            score: rec.score,
            expiresAt: rec.expiresAt
        }));
    }

    /**
     * 生成门票推荐
     */
    static async generateTicketRecommendations(ctx: any, uid: string): Promise<void> {
        const now = getTorontoMidnight();

        // 清除过期推荐
        const expiredRecommendations = await ctx.db.query("ticket_recommendations")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .filter((q: any) => q.lte(q.field("expiresAt"), now.iso))
            .collect();

        for (const rec of expiredRecommendations) {
            await ctx.db.delete(rec._id);
        }

        // 获取玩家统计
        const playerStats = await this.getPlayerTicketStats(ctx, uid);
        const playerTickets = await this.getPlayerValidTickets(ctx, uid);
        const allTemplates = await this.getAllTicketTemplates(ctx);

        // 基于使用统计推荐
        for (const stat of playerStats) {
            if (stat.totalUsed > 0 && stat.winRate > 0.6) {
                // 推荐高胜率门票
                const template = allTemplates.find(t => t.templateId === stat.templateId);
                if (template && !playerTickets.find(pt => pt.templateId === stat.templateId)) {
                    await ctx.db.insert("ticket_recommendations", {
                        uid,
                        templateId: stat.templateId,
                        reason: "high_win_rate",
                        score: stat.winRate,
                        expiresAt: new Date(now.localDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                        createdAt: now.iso
                    });
                }
            }
        }

        // 推荐热门门票
        const popularTemplates = await this.getPopularTicketTemplates(ctx);
        for (const template of popularTemplates.slice(0, 3)) {
            if (!playerTickets.find(pt => pt.templateId === template.templateId)) {
                await ctx.db.insert("ticket_recommendations", {
                    uid,
                    templateId: template.templateId,
                    reason: "popular",
                    score: 0.8,
                    expiresAt: new Date(now.localDate.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
                    createdAt: now.iso
                });
            }
        }
    }

    /**
     * 获取热门门票模板
     */
    static async getPopularTicketTemplates(ctx: any): Promise<TicketTemplate[]> {
        // 基于使用统计获取热门门票
        const usageStats = await ctx.db.query("ticket_usage_stats").collect();
        const templateUsage = new Map<string, number>();

        for (const stat of usageStats) {
            const current = templateUsage.get(stat.templateId) || 0;
            templateUsage.set(stat.templateId, current + stat.totalUsed);
        }

        const sortedTemplates = Array.from(templateUsage.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        const templates = await this.getAllTicketTemplates(ctx);
        return templates.filter(t => sortedTemplates.some(st => st[0] === t.templateId));
    }

    // ============================================================================
    // 工具方法
    // ============================================================================

    /**
     * 记录门票交易
     */
    private static async recordTransaction(ctx: any, transaction: TicketTransaction): Promise<void> {
        const now = getTorontoMidnight();
        await ctx.db.insert("ticket_transactions", {
            uid: transaction.uid,
            templateId: transaction.templateId,
            quantity: transaction.quantity,
            transactionType: transaction.transactionType,
            source: transaction.source,
            context: transaction.context || {},
            createdAt: now.iso
        });
    }

    /**
     * 检查门票是否适用于特定游戏和玩家
     */
    static async checkTicketEligibility(ctx: any, params: {
        uid: string;
        templateId: string;
        gameType: string;
    }): Promise<{ eligible: boolean; reason?: string }> {
        const { uid, templateId, gameType } = params;

        // 获取门票模板
        const template = await ctx.db.query("ticket_templates")
            .withIndex("by_templateId", (q: any) => q.eq("templateId", templateId))
            .unique();

        if (!template) {
            return { eligible: false, reason: "门票模板不存在" };
        }

        // 检查游戏类型
        if (!template.gameTypes.includes(gameType)) {
            return { eligible: false, reason: "门票不适用于此游戏类型" };
        }

        // 获取玩家信息
        const player = await ctx.db.query("players")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .unique();

        if (!player) {
            return { eligible: false, reason: "玩家不存在" };
        }

        return { eligible: true };
    }
} 