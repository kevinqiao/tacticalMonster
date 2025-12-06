/**
 * 地图模板服务
 * 处理地图模板的CRUD操作
 */

export interface MapTemplate {
    templateId: string;
    name: string;
    tier: string;  // 适用的Tier
    mapSize: {
        rows: number;
        cols: number;
    };
    coreObstacles: Array<{
        q: number;
        r: number;
        type: number;
        asset: string;
    }>;
    optionalObstacles: Array<{
        q: number;
        r: number;
        type: number;
        asset: string;
    }>;
    restrictedZones: Array<{
        type: string;  // "player" | "boss" | "path"
        region: {
            minQ: number;
            maxQ: number;
            minR: number;
            maxR: number;
        };
    }>;
    configVersion: number;
}

export class MapTemplateService {
    /**
     * 创建地图模板
     */
    static async createMapTemplate(
        ctx: any,
        template: Omit<MapTemplate, "configVersion">
    ): Promise<{ success: boolean; message: string; templateId?: string }> {
        try {
            // 检查模板ID是否已存在
            const existing = await ctx.db
                .query("mr_map_templates")
                .withIndex("by_templateId", (q: any) => q.eq("templateId", template.templateId))
                .first();

            if (existing) {
                return {
                    success: false,
                    message: `地图模板ID已存在: ${template.templateId}`,
                };
            }

            // 创建地图模板
            await ctx.db.insert("mr_map_templates", {
                ...template,
                configVersion: 1,
            });

            return {
                success: true,
                message: "地图模板创建成功",
                templateId: template.templateId,
            };
        } catch (error: any) {
            return {
                success: false,
                message: `创建地图模板失败: ${error.message}`,
            };
        }
    }

    /**
     * 更新地图模板
     */
    static async updateMapTemplate(
        ctx: any,
        templateId: string,
        updates: Partial<Omit<MapTemplate, "templateId">>
    ): Promise<{ success: boolean; message: string }> {
        try {
            const existing = await ctx.db
                .query("mr_map_templates")
                .withIndex("by_templateId", (q: any) => q.eq("templateId", templateId))
                .first();

            if (!existing) {
                return {
                    success: false,
                    message: `地图模板不存在: ${templateId}`,
                };
            }

            // 更新配置版本
            const updatedConfigVersion = (existing.configVersion || 1) + 1;

            await ctx.db.patch(existing._id, {
                ...updates,
                configVersion: updatedConfigVersion,
            });

            return {
                success: true,
                message: "地图模板更新成功",
            };
        } catch (error: any) {
            return {
                success: false,
                message: `更新地图模板失败: ${error.message}`,
            };
        }
    }

    /**
     * 获取地图模板
     */
    static async getMapTemplate(
        ctx: any,
        templateId: string
    ): Promise<MapTemplate | null> {
        const template = await ctx.db
            .query("mr_map_templates")
            .withIndex("by_templateId", (q: any) => q.eq("templateId", templateId))
            .first();

        if (!template) {
            return null;
        }

        return {
            templateId: template.templateId,
            name: template.name,
            tier: template.tier,
            mapSize: template.mapSize,
            coreObstacles: template.coreObstacles,
            optionalObstacles: template.optionalObstacles,
            restrictedZones: template.restrictedZones,
            configVersion: template.configVersion,
        };
    }

    /**
     * 根据Tier获取所有地图模板
     */
    static async getMapTemplatesByTier(
        ctx: any,
        tier: string
    ): Promise<MapTemplate[]> {
        const templates = await ctx.db
            .query("mr_map_templates")
            .withIndex("by_tier", (q: any) => q.eq("tier", tier))
            .collect();

        return templates.map((template: any) => ({
            templateId: template.templateId,
            name: template.name,
            tier: template.tier,
            mapSize: template.mapSize,
            coreObstacles: template.coreObstacles,
            optionalObstacles: template.optionalObstacles,
            restrictedZones: template.restrictedZones,
            configVersion: template.configVersion,
        }));
    }

    /**
     * 获取所有地图模板
     */
    static async getAllMapTemplates(ctx: any): Promise<MapTemplate[]> {
        const templates = await ctx.db.query("mr_map_templates").collect();

        return templates.map((template: any) => ({
            templateId: template.templateId,
            name: template.name,
            tier: template.tier,
            mapSize: template.mapSize,
            coreObstacles: template.coreObstacles,
            optionalObstacles: template.optionalObstacles,
            restrictedZones: template.restrictedZones,
            configVersion: template.configVersion,
        }));
    }

    /**
     * 删除地图模板
     */
    static async deleteMapTemplate(
        ctx: any,
        templateId: string
    ): Promise<{ success: boolean; message: string }> {
        try {
            const existing = await ctx.db
                .query("mr_map_templates")
                .withIndex("by_templateId", (q: any) => q.eq("templateId", templateId))
                .first();

            if (!existing) {
                return {
                    success: false,
                    message: `地图模板不存在: ${templateId}`,
                };
            }

            await ctx.db.delete(existing._id);

            return {
                success: true,
                message: "地图模板删除成功",
            };
        } catch (error: any) {
            return {
                success: false,
                message: `删除地图模板失败: ${error.message}`,
            };
        }
    }
}

