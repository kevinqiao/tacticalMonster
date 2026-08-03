/**
 * 障碍物工具类
 * 处理障碍物类型转换和资源路径
 */

export class ObstacleUtils {
    /**
     * 获取障碍物类型代码
     */
    static getObstacleTypeCode(type: string): number {
        const typeMap: Record<string, number> = {
            rock: 1,
            tree: 2,
            wall: 3,
        };
        return typeMap[type] || 1;
    }

    /**
     * 获取障碍物资源路径
     */
    static getObstacleAsset(type: string): string {
        const assetMap: Record<string, string> = {
            rock: "/assets/obstacles/rock.glb",
            tree: "/assets/obstacles/tree.glb",
            wall: "/assets/obstacles/wall.glb",
        };
        return assetMap[type] || "/assets/obstacles/rock.glb";
    }
}

