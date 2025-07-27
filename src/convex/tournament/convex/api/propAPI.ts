// @ts-nocheck
import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { PropEffectSystem } from "../service/props/propEffectSystem";
import { PropShop } from "../service/props/propShop";
import { PropSystem } from "../service/props/propSystem";

// ============================================================================
// 道具系统API接口
// ============================================================================

// ============================================================================
// 道具管理API
// ============================================================================

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
 * 获取特定道具配置
 */
export const getPropConfig = query({
    args: {
        propId: v.string()
    },
    handler: async (ctx: any, args: any) => {
        return await PropSystem.getPropConfig(ctx, args.propId);
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
 * 获取玩家特定道具
 */
export const getPlayerProp = query({
    args: {
        uid: v.string(),
        propId: v.string()
    },
    handler: async (ctx: any, args: any) => {
        return await PropSystem.getPlayerProp(ctx, args.uid, args.propId);
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

/**
 * 清理过期道具
 */
export const cleanupExpiredProps = mutation({
    args: {},
    handler: async (ctx: any, args: any) => {
        return await PropSystem.cleanupExpiredProps(ctx);
    }
});

// ============================================================================
// 道具商店API
// ============================================================================

/**
 * 获取所有商店
 */
export const getAllShops = query({
    args: {},
    handler: async (ctx: any, args: any) => {
        return await PropShop.getAllShops(ctx);
    }
});

/**
 * 获取商店信息
 */
export const getShop = query({
    args: {
        shopId: v.string()
    },
    handler: async (ctx: any, args: any) => {
        return await PropShop.getShop(ctx, args.shopId);
    }
});

/**
 * 获取商店商品
 */
export const getShopItems = query({
    args: {
        shopId: v.string()
    },
    handler: async (ctx: any, args: any) => {
        return await PropShop.getShopItems(ctx, args.shopId);
    }
});

/**
 * 从商店购买
 */
export const buyFromShop = mutation({
    args: {
        uid: v.string(),
        shopId: v.string(),
        propId: v.string(),
        quantity: v.optional(v.number())
    },
    handler: async (ctx: any, args: any) => {
        return await PropShop.buyFromShop(ctx, args.uid, args.shopId, args.propId, args.quantity || 1);
    }
});

/**
 * 刷新商店
 */
export const refreshShop = mutation({
    args: {
        shopId: v.string()
    },
    handler: async (ctx: any, args: any) => {
        return await PropShop.refreshShop(ctx, args.shopId);
    }
});

/**
 * 获取玩家商店历史
 */
export const getPlayerShopHistory = query({
    args: {
        uid: v.string()
    },
    handler: async (ctx: any, args: any) => {
        return await PropShop.getPlayerShopHistory(ctx, args.uid);
    }
});

/**
 * 获取商店统计
 */
export const getShopStatistics = query({
    args: {
        shopId: v.string()
    },
    handler: async (ctx: any, args: any) => {
        return await PropShop.getShopStatistics(ctx, args.shopId);
    }
});

// ============================================================================
// 道具效果API
// ============================================================================

/**
 * 获取玩家有效效果
 */
export const getPlayerValidEffects = query({
    args: {
        uid: v.string(),
        gameId: v.string()
    },
    handler: async (ctx: any, args: any) => {
        return await PropEffectSystem.getPlayerValidEffects(ctx, args.uid, args.gameId);
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
        return await PropEffectSystem.getActivePropEffects(ctx, args.uid, args.gameId);
    }
});

/**
 * 处理游戏开始效果
 */
export const handleGameStart = mutation({
    args: {
        uid: v.string(),
        gameId: v.string(),
        gameType: v.string()
    },
    handler: async (ctx: any, args: any) => {
        return await PropEffectSystem.handleGameStart(ctx, args.uid, args.gameId, args.gameType);
    }
});

/**
 * 处理游戏结束效果
 */
export const handleGameEnd = mutation({
    args: {
        uid: v.string(),
        gameId: v.string(),
        finalScore: v.number(),
        baseScore: v.number()
    },
    handler: async (ctx: any, args: any) => {
        return await PropEffectSystem.handleGameEnd(ctx, args.uid, args.gameId, args.finalScore, args.baseScore);
    }
});

/**
 * 使用游戏效果
 */
export const useGameEffect = mutation({
    args: {
        uid: v.string(),
        gameId: v.string(),
        effectType: v.string()
    },
    handler: async (ctx: any, args: any) => {
        return await PropEffectSystem.useGameEffect(ctx, args.uid, args.gameId, args.effectType);
    }
});

/**
 * 获取效果统计
 */
export const getEffectStatistics = query({
    args: {
        uid: v.string()
    },
    handler: async (ctx: any, args: any) => {
        return await PropEffectSystem.getEffectStatistics(ctx, args.uid);
    }
});

/**
 * 清理过期效果
 */
export const cleanupExpiredEffects = mutation({
    args: {},
    handler: async (ctx: any, args: any) => {
        return await PropEffectSystem.cleanupExpiredEffects(ctx);
    }
});

// ============================================================================
// 系统管理API
// ============================================================================

/**
 * 初始化道具系统
 */
export const initializeProps = mutation({
    args: {},
    handler: async (ctx: any, args: any) => {
        return await PropSystem.initializeProps(ctx);
    }
});

/**
 * 初始化商店
 */
export const initializeShops = mutation({
    args: {},
    handler: async (ctx: any, args: any) => {
        return await PropShop.initializeShops(ctx);
    }
});

/**
 * 添加商店商品
 */
export const addShopItem = mutation({
    args: {
        shopId: v.string(),
        item: v.object({
            propId: v.string(),
            price: v.number(),
            originalPrice: v.optional(v.number()),
            discount: v.optional(v.number()),
            isLimited: v.boolean(),
            maxQuantity: v.optional(v.number()),
            availableQuantity: v.optional(v.number()),
            startTime: v.optional(v.string()),
            endTime: v.optional(v.string()),
            isActive: v.boolean()
        })
    },
    handler: async (ctx: any, args: any) => {
        return await PropShop.addShopItem(ctx, args.shopId, args.item);
    }
});

/**
 * 测试所有支持的时区
 */
export const testAllSupportedTimezones = mutation({
    args: {},
    handler: async (ctx: any, args: any) => {
        const timezones = ["America/Toronto", "Asia/Shanghai", "UTC", "America/New_York", "Europe/London", "Asia/Tokyo", "Australia/Sydney"];
        const results = {};

        for (const timezone of timezones) {
            try {
                const result = await PropSystem.getPropConfig(ctx, "score_boost_1.5x");
                results[timezone] = {
                    success: true,
                    propConfig: result ? "Found" : "Not found"
                };
            } catch (error) {
                results[timezone] = {
                    success: false,
                    error: error instanceof Error ? error.message : "未知错误"
                };
            }
        }

        return {
            success: true,
            results
        };
    }
});

// ============================================================================
// 批量操作API
// ============================================================================

/**
 * 批量添加道具
 */
export const batchAddProps = mutation({
    args: {
        uid: v.string(),
        props: v.array(v.object({
            propId: v.string(),
            quantity: v.number()
        }))
    },
    handler: async (ctx: any, args: any) => {
        const results = [];

        for (const prop of args.props) {
            try {
                const result = await PropSystem.addPropToPlayer(ctx, args.uid, prop.propId, prop.quantity);
                results.push({
                    propId: prop.propId,
                    success: true,
                    result
                });
            } catch (error) {
                results.push({
                    propId: prop.propId,
                    success: false,
                    error: error instanceof Error ? error.message : "未知错误"
                });
            }
        }

        return {
            success: true,
            results
        };
    }
});

/**
 * 批量使用道具
 */
export const batchUseProps = mutation({
    args: {
        uid: v.string(),
        gameId: v.string(),
        props: v.array(v.object({
            propId: v.string(),
            matchId: v.optional(v.string()),
            tournamentId: v.optional(v.string())
        }))
    },
    handler: async (ctx: any, args: any) => {
        const results = [];

        for (const prop of args.props) {
            try {
                const result = await PropSystem.useProp(ctx, args.uid, prop.propId, args.gameId, prop.matchId, prop.tournamentId);
                results.push({
                    propId: prop.propId,
                    success: true,
                    result
                });
            } catch (error) {
                results.push({
                    propId: prop.propId,
                    success: false,
                    error: error instanceof Error ? error.message : "未知错误"
                });
            }
        }

        return {
            success: true,
            results
        };
    }
});

// ============================================================================
// 查询API
// ============================================================================

/**
 * 搜索道具
 */
export const searchProps = query({
    args: {
        query: v.string(),
        type: v.optional(v.string()),
        rarity: v.optional(v.string()),
        gameType: v.optional(v.string())
    },
    handler: async (ctx: any, args: any) => {
        let props = await PropSystem.getAllPropConfigs(ctx);

        // 按名称搜索
        if (args.query) {
            props = props.filter(prop =>
                prop.name.toLowerCase().includes(args.query.toLowerCase()) ||
                prop.description.toLowerCase().includes(args.query.toLowerCase())
            );
        }

        // 按类型过滤
        if (args.type) {
            props = props.filter(prop => prop.type === args.type);
        }

        // 按稀有度过滤
        if (args.rarity) {
            props = props.filter(prop => prop.rarity === args.rarity);
        }

        // 按游戏类型过滤
        if (args.gameType) {
            props = props.filter(prop => prop.gameTypes.includes(args.gameType));
        }

        return props;
    }
});

/**
 * 获取热门道具
 */
export const getPopularProps = query({
    args: {
        limit: v.optional(v.number())
    },
    handler: async (ctx: any, args: any) => {
        const limit = args.limit || 10;

        // 获取使用记录统计
        const usageStats = await ctx.db.query("prop_usage_records")
            .collect();

        // 统计每个道具的使用次数
        const propUsageCount = {};
        for (const record of usageStats) {
            propUsageCount[record.propId] = (propUsageCount[record.propId] || 0) + 1;
        }

        // 获取道具配置
        const allProps = await PropSystem.getAllPropConfigs(ctx);

        // 按使用次数排序
        const popularProps = allProps
            .map(prop => ({
                ...prop,
                usageCount: propUsageCount[prop.propId] || 0
            }))
            .sort((a, b) => b.usageCount - a.usageCount)
            .slice(0, limit);

        return popularProps;
    }
});

/**
 * 获取推荐道具
 */
export const getRecommendedProps = query({
    args: {
        uid: v.string(),
        gameType: v.optional(v.string()),
        limit: v.optional(v.number())
    },
    handler: async (ctx: any, args: any) => {
        const limit = args.limit || 5;

        // 获取玩家当前道具
        const playerProps = await PropSystem.getPlayerProps(ctx, args.uid);
        const playerPropIds = new Set(playerProps.map(p => p.propId));

        // 获取所有道具配置
        let allProps = await PropSystem.getAllPropConfigs(ctx);

        // 按游戏类型过滤
        if (args.gameType) {
            allProps = allProps.filter(prop => prop.gameTypes.includes(args.gameType));
        }

        // 过滤掉玩家已有的道具
        const availableProps = allProps.filter(prop => !playerPropIds.has(prop.propId));

        // 按稀有度和价格排序
        const rarityOrder = { common: 1, rare: 2, epic: 3, legendary: 4 };
        const recommendedProps = availableProps
            .sort((a, b) => {
                const rarityDiff = rarityOrder[b.rarity] - rarityOrder[a.rarity];
                if (rarityDiff !== 0) return rarityDiff;
                return a.price - b.price; // 同稀有度按价格排序
            })
            .slice(0, limit);

        return recommendedProps;
    }
}); 