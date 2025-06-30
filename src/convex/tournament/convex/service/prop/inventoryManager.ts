import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";
import { getTorontoDate } from "../utils";

// 获取玩家库存
export const getPlayerInventory = (query as any)({
    args: { uid: v.string() },
    handler: async (ctx: any, args: any) => {
        const inventory = await ctx.db
            .query("player_inventory")
            .withIndex("by_uid", (q: any) => q.eq("uid", args.uid))
            .first();

        if (!inventory) {
            throw new Error("玩家库存不存在");
        }

        return inventory;
    }
});

// 添加道具到库存
export const addProps = (mutation as any)({
    args: {
        uid: v.string(),
        props: v.any()
    },
    handler: async (ctx: any, args: any) => {
        const { uid, props } = args;
        const now = getTorontoDate();

        const inventory = await ctx.db
            .query("player_inventory")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .first();

        if (!inventory) {
            throw new Error("玩家库存不存在");
        }

        // 更新道具数量
        const updatedProps = Array.from(inventory.props);

        for (const newProp of props) {
            const existingPropIndex = updatedProps.findIndex((p: any) =>
                p.gameType === newProp.gameType && p.propType === newProp.propType
            );

            if (existingPropIndex >= 0) {
                // 更新现有道具数量
                updatedProps[existingPropIndex] = Object.assign({}, updatedProps[existingPropIndex] as any, {
                    quantity: (updatedProps[existingPropIndex] as any).quantity + newProp.quantity
                });
            } else {
                // 添加新道具
                updatedProps.push({
                    gameType: newProp.gameType,
                    propType: newProp.propType,
                    quantity: newProp.quantity
                });
            }
        }

        await ctx.db.patch(inventory._id, {
            props: updatedProps,
            updatedAt: now.iso
        });

        return {
            success: true,
            addedProps: props,
            totalProps: updatedProps.length
        };
    }
});

// 移除道具
export const removeProps = (mutation as any)({
    args: {
        uid: v.string(),
        props: v.any()
    },
    handler: async (ctx: any, args: any) => {
        const { uid, props } = args;
        const now = getTorontoDate();

        const inventory = await ctx.db
            .query("player_inventory")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .first();

        if (!inventory) {
            throw new Error("玩家库存不存在");
        }

        // 验证道具数量是否足够
        for (const removeProp of props) {
            const existingProp = inventory.props.find((p: any) =>
                p.gameType === removeProp.gameType && p.propType === removeProp.propType
            );

            if (!existingProp || existingProp.quantity < removeProp.quantity) {
                throw new Error(`道具 ${removeProp.propType} 数量不足`);
            }
        }

        // 更新道具数量
        const updatedProps = inventory.props.map((p: any) => {
            const removeProp = props.find((rp: any) =>
                rp.gameType === p.gameType && rp.propType === p.propType
            );

            if (removeProp) {
                const newQuantity = p.quantity - removeProp.quantity;
                return newQuantity > 0 ? Object.assign({}, p, { quantity: newQuantity }) : null;
            }

            return p;
        }).filter((p: any): p is any => p !== null);

        await ctx.db.patch(inventory._id, {
            props: updatedProps,
            updatedAt: now.iso
        });

        return {
            success: true,
            removedProps: props,
            remainingProps: updatedProps.length
        };
    }
});

// 添加门票
export const addTickets = (mutation as any)({
    args: {
        uid: v.string(),
        tickets: v.any()
    },
    handler: async (ctx: any, args: any) => {
        const { uid, tickets } = args;
        const now = getTorontoDate();

        const inventory = await ctx.db
            .query("player_inventory")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .first();

        if (!inventory) {
            throw new Error("玩家库存不存在");
        }

        // 更新门票数量
        const updatedTickets = Array.from(inventory.tickets || []);

        for (const newTicket of tickets) {
            const existingTicketIndex = updatedTickets.findIndex((t: any) =>
                t.gameType === newTicket.gameType && t.tournamentType === newTicket.tournamentType
            );

            if (existingTicketIndex >= 0) {
                // 更新现有门票数量
                updatedTickets[existingTicketIndex] = Object.assign({}, updatedTickets[existingTicketIndex] as any, {
                    quantity: (updatedTickets[existingTicketIndex] as any).quantity + newTicket.quantity
                });
            } else {
                // 添加新门票
                updatedTickets.push({
                    gameType: newTicket.gameType,
                    tournamentType: newTicket.tournamentType,
                    quantity: newTicket.quantity
                });
            }
        }

        await ctx.db.patch(inventory._id, {
            tickets: updatedTickets,
            updatedAt: now.iso
        });

        return {
            success: true,
            addedTickets: tickets,
            totalTickets: updatedTickets.length
        };
    }
});

// 移除门票
export const removeTickets = (mutation as any)({
    args: {
        uid: v.string(),
        tickets: v.any()
    },
    handler: async (ctx: any, args: any) => {
        const { uid, tickets } = args;
        const now = getTorontoDate();

        const inventory = await ctx.db
            .query("player_inventory")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .first();

        if (!inventory) {
            throw new Error("玩家库存不存在");
        }

        // 验证门票数量是否足够
        for (const removeTicket of tickets) {
            const existingTicket = inventory.tickets?.find((t: any) =>
                t.gameType === removeTicket.gameType && t.tournamentType === removeTicket.tournamentType
            );

            if (!existingTicket || existingTicket.quantity < removeTicket.quantity) {
                throw new Error(`门票 ${removeTicket.tournamentType} 数量不足`);
            }
        }

        // 更新门票数量
        const updatedTickets = (inventory.tickets || []).map((t: any) => {
            const removeTicket = tickets.find((rt: any) =>
                rt.gameType === t.gameType && rt.tournamentType === t.tournamentType
            );

            if (removeTicket) {
                const newQuantity = t.quantity - removeTicket.quantity;
                return newQuantity > 0 ? Object.assign({}, t, { quantity: newQuantity }) : null;
            }

            return t;
        }).filter((t: any): t is any => t !== null);

        await ctx.db.patch(inventory._id, {
            tickets: updatedTickets,
            updatedAt: now.iso
        });

        return {
            success: true,
            removedTickets: tickets,
            remainingTickets: updatedTickets.length
        };
    }
});

// 更新金币
export const updateCoins = (mutation as any)({
    args: {
        uid: v.string(),
        amount: v.number(),
        reason: v.optional(v.string())
    },
    handler: async (ctx: any, args: any) => {
        const { uid, amount, reason } = args;
        const now = getTorontoDate();

        const inventory = await ctx.db
            .query("player_inventory")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .first();

        if (!inventory) {
            throw new Error("玩家库存不存在");
        }

        const newCoins = inventory.coins + amount;

        if (newCoins < 0) {
            throw new Error("金币不足");
        }

        await ctx.db.patch(inventory._id, {
            coins: newCoins,
            updatedAt: now.iso
        });

        // 记录金币变动
        await ctx.db.insert("coin_transactions", {
            uid,
            amount,
            balance: newCoins,
            reason: reason || "系统调整",
            createdAt: now.iso
        });

        return {
            success: true,
            oldCoins: inventory.coins,
            newCoins,
            change: amount
        };
    }
});

// 获取道具统计
export const getInventoryStats = (query as any)({
    args: { uid: v.string() },
    handler: async (ctx: any, args: any) => {
        const inventory = await ctx.db
            .query("player_inventory")
            .withIndex("by_uid", (q: any) => q.eq("uid", args.uid))
            .first();

        if (!inventory) {
            throw new Error("玩家库存不存在");
        }

        const propStats: any = {};
        for (const prop of inventory.props) {
            if (!propStats[prop.gameType]) {
                propStats[prop.gameType] = {};
            }
            propStats[prop.gameType][prop.propType] = prop.quantity;
        }

        const ticketStats: any = {};
        for (const ticket of inventory.tickets || []) {
            if (!ticketStats[ticket.gameType]) {
                ticketStats[ticket.gameType] = {};
            }
            ticketStats[ticket.gameType][ticket.tournamentType] = ticket.quantity;
        }

        return {
            coins: inventory.coins,
            props: propStats,
            tickets: ticketStats,
            totalProps: inventory.props.length,
            totalTickets: (inventory.tickets || []).length
        };
    }
});

// 检查道具是否足够
export const checkPropAvailability = (query as any)({
    args: {
        uid: v.string(),
        gameType: v.string(),
        propType: v.string(),
        quantity: v.number()
    },
    handler: async (ctx: any, args: any) => {
        const { uid, gameType, propType, quantity } = args;

        const inventory = await ctx.db
            .query("player_inventory")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .first();

        if (!inventory) {
            return { available: false, reason: "库存不存在" };
        }

        const prop = inventory.props.find((p: any) =>
            p.gameType === gameType && p.propType === propType
        );

        if (!prop) {
            return { available: false, reason: "道具不存在" };
        }

        if (prop.quantity < quantity) {
            return {
                available: false,
                reason: "数量不足",
                availableQuantity: prop.quantity,
                required: quantity
            };
        }

        return {
            available: true,
            availableQuantity: prop.quantity,
            required: quantity
        };
    }
});

// 批量检查道具可用性
export const checkMultiplePropsAvailability = (query as any)({
    args: {
        uid: v.string(),
        props: v.any()
    },
    handler: async (ctx: any, args: any) => {
        const { uid, props } = args;

        const inventory = await ctx.db
            .query("player_inventory")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .first();

        if (!inventory) {
            return { available: false, reason: "库存不存在" };
        }

        const results: any[] = [];
        let allAvailable = true;

        for (const prop of props) {
            const inventoryProp = inventory.props.find((p: any) =>
                p.gameType === prop.gameType && p.propType === prop.propType
            );

            const available = inventoryProp && inventoryProp.quantity >= prop.quantity;

            results.push({
                gameType: prop.gameType,
                propType: prop.propType,
                required: prop.quantity,
                available: inventoryProp ? inventoryProp.quantity : 0,
                sufficient: available
            });

            if (!available) {
                allAvailable = false;
            }
        }

        return {
            available: allAvailable,
            results
        };
    }
});

// 创建玩家库存（初始化）
export const createPlayerInventory = (mutation as any)({
    args: { uid: v.string() },
    handler: async (ctx: any, args: any) => {
        const now = getTorontoDate();

        // 检查是否已存在
        const existing = await ctx.db
            .query("player_inventory")
            .withIndex("by_uid", (q: any) => q.eq("uid", args.uid))
            .first();

        if (existing) {
            throw new Error("玩家库存已存在");
        }

        const inventoryId = await ctx.db.insert("player_inventory", {
            uid: args.uid,
            coins: 1000,
            props: [],
            tickets: [],
            updatedAt: now.iso
        });

        return {
            success: true,
            inventoryId,
            initialCoins: 1000
        };
    }
}); 