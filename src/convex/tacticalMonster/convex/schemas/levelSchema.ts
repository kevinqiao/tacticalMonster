import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * 关卡配置Schema
 * 定义每个Tier+Boss组合的关卡配置，包括地图生成规则和位置配置
 */
export const levelSchema = {
    mr_level_configs: defineTable({
        levelId: v.string(),
        tier: v.string(),
        bossId: v.string(),
        
        // 地图生成配置
        mapGeneration: v.object({
            mapSize: v.object({
                rows: v.number(),
                cols: v.number(),
            }),
            generationType: v.string(),  // "template" | "procedural" | "random"
            templateId: v.optional(v.string()),
            
            // 障碍物生成规则
            obstacleRules: v.object({
                minObstacles: v.number(),
                maxObstacles: v.number(),
                obstacleTypes: v.array(v.string()),
                spawnZones: v.array(v.object({
                    type: v.string(),  // "exclude" | "include"
                    region: v.object({
                        minQ: v.number(),
                        maxQ: v.number(),
                        minR: v.number(),
                        maxR: v.number(),
                    }),
                })),
            }),
            
            // 模板调整规则（当generationType为"template"时使用）
            templateAdjustment: v.optional(v.object({
                adjustmentRatio: v.number(),  // 0.1-0.2，调整比例
                preserveCoreObstacles: v.boolean(),  // 是否保留核心障碍物
            })),
        }),
        
        // 位置配置
        positionConfig: v.object({
            bossZone: v.object({
                center: v.object({ q: v.number(), r: v.number() }),
                radius: v.number(),
                positions: v.optional(v.array(v.object({
                    q: v.number(),
                    r: v.number(),
                }))),
            }),
            playerZone: v.object({
                region: v.object({
                    minQ: v.number(),
                    maxQ: v.number(),
                    minR: v.number(),
                    maxR: v.number(),
                }),
            }),
        }),
        
        configVersion: v.number(),
    })
    .index("by_levelId", ["levelId"])
    .index("by_tier", ["tier"])
    .index("by_bossId", ["bossId"]),
    
    // 地图模板表（用于模板+随机生成方式）
    mr_map_templates: defineTable({
        templateId: v.string(),
        name: v.string(),
        tier: v.string(),  // 适用的Tier列表（逗号分隔或单个）
        mapSize: v.object({
            rows: v.number(),
            cols: v.number(),
        }),
        
        // 核心障碍物（不可调整的关键地形）
        coreObstacles: v.array(v.object({
            q: v.number(),
            r: v.number(),
            type: v.number(),
            asset: v.string(),
        })),
        
        // 可选障碍物（可随机调整的障碍物）
        optionalObstacles: v.array(v.object({
            q: v.number(),
            r: v.number(),
            type: v.number(),
            asset: v.string(),
        })),
        
        // 障碍物禁区（玩家区域、Boss区域、关键路径）
        restrictedZones: v.array(v.object({
            type: v.string(),  // "player" | "boss" | "path"
            region: v.object({
                minQ: v.number(),
                maxQ: v.number(),
                minR: v.number(),
                maxR: v.number(),
            }),
        })),
        
        configVersion: v.number(),
    })
    .index("by_templateId", ["templateId"])
    .index("by_tier", ["tier"]),
};
