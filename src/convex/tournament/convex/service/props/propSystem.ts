// @ts-nocheck
import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";


// ============================================================================
// 道具系统核心实现
// ============================================================================

/**
 * 道具类型枚举
 */
export enum PropType {
    BOOST = "boost",           // 增益道具
    CONSUMABLE = "consumable", // 消耗品
    COSMETIC = "cosmetic",     // 装饰道具
    SPECIAL = "special"        // 特殊道具
}

/**
 * 道具效果类型
 */
export enum PropEffectType {
    SCORE_MULTIPLIER = "score_multiplier",     // 分数倍数
    TIME_BOOST = "time_boost",                 // 时间增益
    REROLL = "reroll",                         // 重掷
    SHIELD = "shield",                         // 护盾
    DOUBLE_POINTS = "double_points",           // 双倍积分
    EXTRA_LIFE = "extra_life",                 // 额外生命
    SKIP_LEVEL = "skip_level",                 // 跳过关卡
    HINT = "hint",                             // 提示
    COSMETIC_FRAME = "cosmetic_frame",         // 装饰边框
    COSMETIC_AVATAR = "cosmetic_avatar",       // 装饰头像
    COSMETIC_TITLE = "cosmetic_title"          // 装饰称号
}

/**
 * 道具配置接口
 */
export interface PropConfig {
    propId: string;
    name: string;
    description: string;
    type: PropType;
    effectType: PropEffectType;
    effectValue: number;
    duration?: number; // 持续时间（秒），0表示永久
    maxStack: number;  // 最大堆叠数量
    rarity: "common" | "rare" | "epic" | "legendary";
    icon: string;
    price: number;     // 价格（金币）
    isActive: boolean;
    gameTypes: string[]; // 适用的游戏类型
    unlockLevel?: number; // 解锁等级
}

/**
 * 玩家道具接口
 */
export interface PlayerProp {
    propId: string;
    quantity: number;
    lastUsed?: string; // ISO时间字符串
    expiresAt?: string; // ISO时间字符串，用于限时道具
    isActive: boolean;
}

/**
 * 道具使用记录接口
 */
export interface PropUsageRecord {
    propId: string;
    gameId: string;
    matchId?: string;
    tournamentId?: string;
    effectType: PropEffectType;
    effectValue: number;
    duration?: number;
    usedAt: string;
    expiresAt?: string;
}

/**
 * 道具系统核心类
 */
export class PropSystem {

    /**
     * 默认道具配置
     */
    static readonly DEFAULT_PROPS: PropConfig[] = [
        // 增益道具
        {
            propId: "score_boost_1.5x",
            name: "分数提升器",
            description: "将比赛分数提升1.5倍，持续一场比赛",
            type: PropType.BOOST,
            effectType: PropEffectType.SCORE_MULTIPLIER,
            effectValue: 1.5,
            duration: 0, // 一场比赛
            maxStack: 5,
            rarity: "common",
            icon: "boost_score",
            price: 100,
            isActive: true,
            gameTypes: ["solitaire", "uno", "rummy", "ludo"]
        },
        {
            propId: "time_boost_30s",
            name: "时间增益器",
            description: "增加30秒游戏时间",
            type: PropType.BOOST,
            effectType: PropEffectType.TIME_BOOST,
            effectValue: 30,
            duration: 0,
            maxStack: 3,
            rarity: "common",
            icon: "boost_time",
            price: 80,
            isActive: true,
            gameTypes: ["solitaire", "uno", "rummy"]
        },
        {
            propId: "reroll_chance",
            name: "重掷机会",
            description: "获得一次重掷机会",
            type: PropType.CONSUMABLE,
            effectType: PropEffectType.REROLL,
            effectValue: 1,
            duration: 0,
            maxStack: 10,
            rarity: "rare",
            icon: "reroll",
            price: 150,
            isActive: true,
            gameTypes: ["ludo", "uno"]
        },
        {
            propId: "shield_protection",
            name: "护盾保护",
            description: "保护一次免受惩罚",
            type: PropType.CONSUMABLE,
            effectType: PropEffectType.SHIELD,
            effectValue: 1,
            duration: 0,
            maxStack: 3,
            rarity: "epic",
            icon: "shield",
            price: 200,
            isActive: true,
            gameTypes: ["solitaire", "uno", "rummy", "ludo"]
        },
        {
            propId: "double_points",
            name: "双倍积分",
            description: "获得双倍积分，持续一场比赛",
            type: PropType.BOOST,
            effectType: PropEffectType.DOUBLE_POINTS,
            effectValue: 2.0,
            duration: 0,
            maxStack: 2,
            rarity: "epic",
            icon: "double_points",
            price: 300,
            isActive: true,
            gameTypes: ["solitaire", "uno", "rummy", "ludo"]
        },
        {
            propId: "extra_life",
            name: "额外生命",
            description: "获得一次额外生命",
            type: PropType.CONSUMABLE,
            effectType: PropEffectType.EXTRA_LIFE,
            effectValue: 1,
            duration: 0,
            maxStack: 5,
            rarity: "legendary",
            icon: "extra_life",
            price: 500,
            isActive: true,
            gameTypes: ["solitaire", "uno", "rummy", "ludo"]
        },
        // 装饰道具
        {
            propId: "golden_frame",
            name: "金色边框",
            description: "金色装饰边框",
            type: PropType.COSMETIC,
            effectType: PropEffectType.COSMETIC_FRAME,
            effectValue: 1,
            duration: 0, // 永久
            maxStack: 1,
            rarity: "rare",
            icon: "frame_golden",
            price: 1000,
            isActive: true,
            gameTypes: ["all"],
            unlockLevel: 10
        },
        {
            propId: "dragon_avatar",
            name: "龙形头像",
            description: "龙形装饰头像",
            type: PropType.COSMETIC,
            effectType: PropEffectType.COSMETIC_AVATAR,
            effectValue: 1,
            duration: 0,
            maxStack: 1,
            rarity: "epic",
            icon: "avatar_dragon",
            price: 2000,
            isActive: true,
            gameTypes: ["all"],
            unlockLevel: 20
        },
        {
            propId: "champion_title",
            name: "冠军称号",
            description: "冠军装饰称号",
            type: PropType.COSMETIC,
            effectType: PropEffectType.COSMETIC_TITLE,
            effectValue: 1,
            duration: 0,
            maxStack: 1,
            rarity: "legendary",
            icon: "title_champion",
            price: 5000,
            isActive: true,
            gameTypes: ["all"],
            unlockLevel: 50
        }
    ];

    /**
     * 初始化道具配置
     */
    static async initializeProps(ctx: any) {
        console.log("初始化道具配置");

        try {
            // 清空现有配置
            const existingProps = await ctx.db.query("prop_configs").collect();
            for (const prop of existingProps) {
                await ctx.db.delete(prop._id);
            }

            // 插入默认配置
            for (const propConfig of this.DEFAULT_PROPS) {
                await ctx.db.insert("prop_configs", {
                    ...propConfig,
                    createdAt: getTorontoDate().iso,
                    updatedAt: getTorontoDate().iso
                });
            }

            console.log(`成功初始化 ${this.DEFAULT_PROPS.length} 个道具配置`);
            return {
                success: true,
                message: `成功初始化 ${this.DEFAULT_PROPS.length} 个道具配置`
            };
        } catch (error) {
            console.error("初始化道具配置失败:", error);
            throw error;
        }
    }

    /**
     * 获取道具配置
     */
    static async getPropConfig(ctx: any, propId: string) {
        return await ctx.db.query("prop_configs")
            .withIndex("by_propId", (q: any) => q.eq("propId", propId))
            .unique();
    }

    /**
     * 获取所有道具配置
     */
    static async getAllPropConfigs(ctx: any) {
        return await ctx.db.query("prop_configs")
            .filter((q: any) => q.eq(q.field("isActive"), true))
            .collect();
    }

    /**
     * 获取玩家道具
     */
    static async getPlayerProps(ctx: any, uid: string) {
        const playerProps = await ctx.db.query("player_props")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .collect();

        const props = [];
        for (const playerProp of playerProps) {
            const config = await this.getPropConfig(ctx, playerProp.propId);
            if (config) {
                props.push({
                    ...playerProp,
                    config
                });
            }
        }

        return props;
    }

    /**
     * 获取玩家特定道具
     */
    static async getPlayerProp(ctx: any, uid: string, propId: string) {
        return await ctx.db.query("player_props")
            .withIndex("by_uid_propId", (q: any) => q.eq("uid", uid).eq("propId", propId))
            .unique();
    }

    /**
     * 添加道具到玩家
     */
    static async addPropToPlayer(ctx: any, uid: string, propId: string, quantity: number = 1) {
        try {
            const config = await this.getPropConfig(ctx, propId);
            if (!config) {
                throw new Error(`道具配置不存在: ${propId}`);
            }

            const existingProp = await this.getPlayerProp(ctx, uid, propId);

            if (existingProp) {
                // 更新现有道具数量
                const newQuantity = Math.min(existingProp.quantity + quantity, config.maxStack);
                await ctx.db.patch(existingProp._id, {
                    quantity: newQuantity,
                    updatedAt: getTorontoDate().iso
                });

                return {
                    success: true,
                    propId,
                    quantity: newQuantity,
                    message: `道具数量已更新为 ${newQuantity}`
                };
            } else {
                // 创建新道具
                const playerPropId = await ctx.db.insert("player_props", {
                    uid,
                    propId,
                    quantity: Math.min(quantity, config.maxStack),
                    isActive: true,
                    createdAt: getTorontoDate().iso,
                    updatedAt: getTorontoDate().iso
                });

                return {
                    success: true,
                    propId,
                    quantity: Math.min(quantity, config.maxStack),
                    message: `成功添加道具 ${config.name}`
                };
            }
        } catch (error) {
            console.error("添加道具失败:", error);
            throw error;
        }
    }

    /**
     * 使用道具
     */
    static async useProp(ctx: any, uid: string, propId: string, gameId: string, matchId?: string, tournamentId?: string) {
        try {
            const config = await this.getPropConfig(ctx, propId);
            if (!config) {
                throw new Error(`道具配置不存在: ${propId}`);
            }

            const playerProp = await this.getPlayerProp(ctx, uid, propId);
            if (!playerProp || playerProp.quantity <= 0) {
                throw new Error(`道具数量不足: ${propId}`);
            }

            // 检查道具是否过期
            if (playerProp.expiresAt && new Date(playerProp.expiresAt) < new Date()) {
                throw new Error(`道具已过期: ${propId}`);
            }

            // 减少道具数量
            const newQuantity = playerProp.quantity - 1;
            if (newQuantity <= 0) {
                // 删除道具
                await ctx.db.delete(playerProp._id);
            } else {
                // 更新数量
                await ctx.db.patch(playerProp._id, {
                    quantity: newQuantity,
                    lastUsed: getTorontoDate().iso,
                    updatedAt: getTorontoDate().iso
                });
            }

            // 记录使用记录
            const usageRecord = await ctx.db.insert("prop_usage_records", {
                uid,
                propId,
                gameId,
                matchId,
                tournamentId,
                effectType: config.effectType,
                effectValue: config.effectValue,
                duration: config.duration,
                usedAt: getTorontoDate().iso,
                expiresAt: config.duration > 0 ?
                    new Date(Date.now() + config.duration * 1000).toISOString() :
                    undefined
            });

            return {
                success: true,
                propId,
                config,
                effectType: config.effectType,
                effectValue: config.effectValue,
                duration: config.duration,
                remainingQuantity: newQuantity,
                usageRecordId: usageRecord,
                message: `成功使用道具 ${config.name}`
            };
        } catch (error) {
            console.error("使用道具失败:", error);
            throw error;
        }
    }

    /**
     * 购买道具
     */
    static async buyProp(ctx: any, uid: string, propId: string, quantity: number = 1) {
        try {
            const config = await this.getPropConfig(ctx, propId);
            if (!config) {
                throw new Error(`道具配置不存在: ${propId}`);
            }

            // 获取玩家信息
            const player = await ctx.db.query("players")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .unique();

            if (!player) {
                throw new Error("玩家不存在");
            }

            const totalCost = config.price * quantity;
            if (player.coins < totalCost) {
                throw new Error(`金币不足，需要 ${totalCost} 金币`);
            }

            // 扣除金币
            await ctx.db.patch(player._id, {
                coins: player.coins - totalCost,
                updatedAt: getTorontoDate().iso
            });

            // 添加道具
            const addResult = await this.addPropToPlayer(ctx, uid, propId, quantity);

            // 记录购买记录
            await ctx.db.insert("prop_purchase_records", {
                uid,
                propId,
                quantity,
                price: config.price,
                totalCost,
                purchasedAt: getTorontoDate().iso
            });

            return {
                success: true,
                propId,
                quantity,
                totalCost,
                remainingCoins: player.coins - totalCost,
                message: `成功购买 ${quantity} 个 ${config.name}`
            };
        } catch (error) {
            console.error("购买道具失败:", error);
            throw error;
        }
    }

    /**
     * 获取玩家活跃道具效果
     */
    static async getActivePropEffects(ctx: any, uid: string, gameId: string) {
        try {
            const now = getTorontoDate().iso;

            // 获取未过期的使用记录
            const activeRecords = await ctx.db.query("prop_usage_records")
                .withIndex("by_uid_gameId", (q: any) => q.eq("uid", uid).eq("gameId", gameId))
                .filter((q: any) =>
                    q.or(
                        q.eq(q.field("expiresAt"), undefined),
                        q.gt(q.field("expiresAt"), now)
                    )
                )
                .collect();

            const effects = {};
            for (const record of activeRecords) {
                if (!effects[record.effectType]) {
                    effects[record.effectType] = [];
                }
                effects[record.effectType].push({
                    effectValue: record.effectValue,
                    duration: record.duration,
                    expiresAt: record.expiresAt,
                    recordId: record._id
                });
            }

            return effects;
        } catch (error) {
            console.error("获取活跃道具效果失败:", error);
            throw error;
        }
    }

    /**
     * 清理过期道具
     */
    static async cleanupExpiredProps(ctx: any) {
        try {
            const now = getTorontoDate().iso;

            // 清理过期的玩家道具
            const expiredPlayerProps = await ctx.db.query("player_props")
                .filter((q: any) =>
                    q.and(
                        q.neq(q.field("expiresAt"), undefined),
                        q.lt(q.field("expiresAt"), now)
                    )
                )
                .collect();

            for (const prop of expiredPlayerProps) {
                await ctx.db.delete(prop._id);
            }

            // 清理过期的使用记录
            const expiredUsageRecords = await ctx.db.query("prop_usage_records")
                .filter((q: any) =>
                    q.and(
                        q.neq(q.field("expiresAt"), undefined),
                        q.lt(q.field("expiresAt"), now)
                    )
                )
                .collect();

            for (const record of expiredUsageRecords) {
                await ctx.db.delete(record._id);
            }

            return {
                success: true,
                cleanedPlayerProps: expiredPlayerProps.length,
                cleanedUsageRecords: expiredUsageRecords.length,
                message: `清理了 ${expiredPlayerProps.length} 个过期道具和 ${expiredUsageRecords.length} 条使用记录`
            };
        } catch (error) {
            console.error("清理过期道具失败:", error);
            throw error;
        }
    }

    /**
     * 获取道具统计信息
     */
    static async getPropStatistics(ctx: any, uid: string) {
        try {
            const playerProps = await this.getPlayerProps(ctx, uid);
            const totalProps = playerProps.reduce((sum, prop) => sum + prop.quantity, 0);

            const usageRecords = await ctx.db.query("prop_usage_records")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .collect();

            const purchaseRecords = await ctx.db.query("prop_purchase_records")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .collect();

            const totalSpent = purchaseRecords.reduce((sum, record) => sum + record.totalCost, 0);

            return {
                totalProps,
                totalUsed: usageRecords.length,
                totalPurchased: purchaseRecords.length,
                totalSpent,
                propTypes: playerProps.reduce((types, prop) => {
                    if (!types[prop.config.type]) {
                        types[prop.config.type] = 0;
                    }
                    types[prop.config.type] += prop.quantity;
                    return types;
                }, {})
            };
        } catch (error) {
            console.error("获取道具统计失败:", error);
            throw error;
        }
    }
}

// ============================================================================
// Convex 函数接口
// ============================================================================

/**
 * 初始化道具配置
 */
export const initializeProps = mutation({
    args: {},
    handler: async (ctx: any, args: any) => {
        return await PropSystem.initializeProps(ctx);
    }
});

/**
 * 获取所有道具配置
 */
export const getAllPropConfigs = query({
    args: {},
    handler: async (ctx: any, args: any) => {
        return await PropSystem.getAllPropConfigs(ctx);
    }
});

/**
 * 获取玩家道具
 */
export const getPlayerProps = query({
    args: {
        uid: v.string()
    },
    handler: async (ctx: any, args: any) => {
        return await PropSystem.getPlayerProps(ctx, args.uid);
    }
});

/**
 * 添加道具到玩家
 */
export const addPropToPlayer = mutation({
    args: {
        uid: v.string(),
        propId: v.string(),
        quantity: v.optional(v.number())
    },
    handler: async (ctx: any, args: any) => {
        return await PropSystem.addPropToPlayer(ctx, args.uid, args.propId, args.quantity || 1);
    }
});

/**
 * 使用道具
 */
export const useProp = mutation({
    args: {
        uid: v.string(),
        propId: v.string(),
        gameId: v.string(),
        matchId: v.optional(v.string()),
        tournamentId: v.optional(v.string())
    },
    handler: async (ctx: any, args: any) => {
        return await PropSystem.useProp(ctx, args.uid, args.propId, args.gameId, args.matchId, args.tournamentId);
    }
});

/**
 * 购买道具
 */
export const buyProp = mutation({
    args: {
        uid: v.string(),
        propId: v.string(),
        quantity: v.optional(v.number())
    },
    handler: async (ctx: any, args: any) => {
        return await PropSystem.buyProp(ctx, args.uid, args.propId, args.quantity || 1);
    }
});

/**
 * 获取活跃道具效果
 */
export const getActivePropEffects = query({
    args: {
        uid: v.string(),
        gameId: v.string()
    },
    handler: async (ctx: any, args: any) => {
        return await PropSystem.getActivePropEffects(ctx, args.uid, args.gameId);
    }
});

/**
 * 清理过期道具
 */
export const cleanupExpiredProps = mutation({
    args: {},
    handler: async (ctx: any, args: any) => {
        return await PropSystem.cleanupExpiredProps(ctx);
    }
});

/**
 * 获取道具统计信息
 */
export const getPropStatistics = query({
    args: {
        uid: v.string()
    },
    handler: async (ctx: any, args: any) => {
        return await PropSystem.getPropStatistics(ctx, args.uid);
    }
}); 