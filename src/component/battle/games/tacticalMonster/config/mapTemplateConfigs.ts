/**
 * 地图模板配置文件
 * 包含所有预配置的地图模板信息
 * 所有模板配置都在这里手动维护，不从数据库读取
 */

/**
 * 地图模板接口定义
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
    configVersion?: number;  // 可选，用于数据库存储
}

/**
 * 地图模板配置集合
 */
export const MAP_TEMPLATE_CONFIGS: Record<string, Omit<MapTemplate, "configVersion">> = {
    // 青铜Tier基础模板
    "template_bronze_basic": {
        templateId: "template_bronze_basic",
        name: "青铜基础地图",
        tier: "bronze",
        mapSize: {
            rows: 7,
            cols: 8,
        },
        // 核心障碍物（必须保留）
        coreObstacles: [
            { q: 5, r: 5, type: 1, asset: "/assets/obstacles/rock.glb" },
            { q: 7, r: 3, type: 1, asset: "/assets/obstacles/rock.glb" },
        ],
        // 可选障碍物（随机筛选）
        optionalObstacles: [
            { q: 3, r: 4, type: 2, asset: "/assets/obstacles/tree.glb" },
            { q: 6, r: 6, type: 2, asset: "/assets/obstacles/tree.glb" },
            { q: 6, r: 5, type: 2, asset: "/assets/obstacles/tree.glb" },
        ],
        // 限制区域（适配 7 行 8 列）
        restrictedZones: [
            {
                type: "player",
                region: { minQ: 0, maxQ: 3, minR: 5, maxR: 6 },
            },
            {
                type: "boss",
                region: { minQ: 5, maxQ: 7, minR: 0, maxR: 3 },
            },
        ],
    },
    // 可以添加更多模板配置...
};

/**
 * 获取地图模板配置
 * @param templateId 模板ID
 * @returns 模板配置，如果不存在则返回 null
 */
export function getMapTemplateConfig(templateId: string): Omit<MapTemplate, "configVersion"> | null {
    return MAP_TEMPLATE_CONFIGS[templateId] || null;
}

/**
 * 获取所有模板配置
 */
export function getAllMapTemplateConfigs(): Array<Omit<MapTemplate, "configVersion">> {
    return Object.values(MAP_TEMPLATE_CONFIGS);
}

/**
 * 根据Tier获取模板配置
 */
export function getMapTemplateConfigsByTier(tier: string): Array<Omit<MapTemplate, "configVersion">> {
    return Object.values(MAP_TEMPLATE_CONFIGS).filter(template => template.tier === tier);
}

