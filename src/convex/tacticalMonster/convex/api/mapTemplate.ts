/**
 * 地图模板管理 API
 * 提供地图模板的创建、查询、更新、删除接口
 */

import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { MapTemplateService } from "../service/level/mapTemplateService";

/**
 * 创建地图模板
 */
export const createMapTemplate = mutation({
    args: {
        templateId: v.string(),
        name: v.string(),
        tier: v.string(),
        mapSize: v.object({
            rows: v.number(),
            cols: v.number(),
        }),
        coreObstacles: v.array(
            v.object({
                q: v.number(),
                r: v.number(),
                type: v.number(),
                asset: v.string(),
            })
        ),
        optionalObstacles: v.array(
            v.object({
                q: v.number(),
                r: v.number(),
                type: v.number(),
                asset: v.string(),
            })
        ),
        restrictedZones: v.array(
            v.object({
                type: v.string(),
                region: v.object({
                    minQ: v.number(),
                    maxQ: v.number(),
                    minR: v.number(),
                    maxR: v.number(),
                }),
            })
        ),
    },
    handler: async (ctx, args) => {
        return await MapTemplateService.createMapTemplate(ctx, args);
    },
});

/**
 * 更新地图模板
 */
export const updateMapTemplate = mutation({
    args: {
        templateId: v.string(),
        name: v.optional(v.string()),
        tier: v.optional(v.string()),
        mapSize: v.optional(
            v.object({
                rows: v.number(),
                cols: v.number(),
            })
        ),
        coreObstacles: v.optional(
            v.array(
                v.object({
                    q: v.number(),
                    r: v.number(),
                    type: v.number(),
                    asset: v.string(),
                })
            )
        ),
        optionalObstacles: v.optional(
            v.array(
                v.object({
                    q: v.number(),
                    r: v.number(),
                    type: v.number(),
                    asset: v.string(),
                })
            )
        ),
        restrictedZones: v.optional(
            v.array(
                v.object({
                    type: v.string(),
                    region: v.object({
                        minQ: v.number(),
                        maxQ: v.number(),
                        minR: v.number(),
                        maxR: v.number(),
                    }),
                })
            )
        ),
    },
    handler: async (ctx, args) => {
        const { templateId, ...updates } = args;
        return await MapTemplateService.updateMapTemplate(ctx, templateId, updates);
    },
});

/**
 * 获取地图模板
 */
export const getMapTemplate = query({
    args: {
        templateId: v.string(),
    },
    handler: async (ctx, args) => {
        return await MapTemplateService.getMapTemplate(ctx, args.templateId);
    },
});

/**
 * 根据Tier获取所有地图模板
 */
export const getMapTemplatesByTier = query({
    args: {
        tier: v.string(),
    },
    handler: async (ctx, args) => {
        return await MapTemplateService.getMapTemplatesByTier(ctx, args.tier);
    },
});

/**
 * 获取所有地图模板
 */
export const getAllMapTemplates = query({
    args: {},
    handler: async (ctx) => {
        return await MapTemplateService.getAllMapTemplates(ctx);
    },
});

/**
 * 删除地图模板
 */
export const deleteMapTemplate = mutation({
    args: {
        templateId: v.string(),
    },
    handler: async (ctx, args) => {
        return await MapTemplateService.deleteMapTemplate(ctx, args.templateId);
    },
});

