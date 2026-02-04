/**
 * 几何体缓存管理器
 * 用于在多个组件实例之间共享相同的几何体对象
 */

import * as THREE from "three";
import { createHexagonExtrudeGeometry } from "./hex3DUtils";

// 几何体缓存：key = "width-depth-scale", value = Geometry 对象
const geometryCache = new Map<string, THREE.ExtrudeGeometry>();

/**
 * 获取或创建共享的六边形几何体
 * @param width 六边形宽度
 * @param depth 挤压深度
 * @param scale 缩放比例
 * @returns 共享的几何体对象
 */
export const getSharedHexagonGeometry = (
    width: number,
    depth: number,
    scale: number
): THREE.ExtrudeGeometry => {
    // 创建缓存键
    const cacheKey = `${width}-${depth}-${scale}`;
    
    // 检查缓存
    if (geometryCache.has(cacheKey)) {
        return geometryCache.get(cacheKey)!;
    }
    
    // 创建新几何体并缓存
    const geometry = createHexagonExtrudeGeometry(width, depth, scale, true);
    geometryCache.set(cacheKey, geometry);
    
    console.log(`[GeometryCache] 创建新几何体: ${cacheKey}, 缓存大小: ${geometryCache.size}`);
    
    return geometry;
};

/**
 * 清理缓存（可选，用于内存管理）
 */
export const clearGeometryCache = () => {
    geometryCache.forEach(geometry => geometry.dispose());
    geometryCache.clear();
    console.log("[GeometryCache] 已清理所有几何体缓存");
};

/**
 * 获取缓存统计信息
 */
export const getCacheStats = () => {
    return {
        size: geometryCache.size,
        keys: Array.from(geometryCache.keys()),
    };
};
