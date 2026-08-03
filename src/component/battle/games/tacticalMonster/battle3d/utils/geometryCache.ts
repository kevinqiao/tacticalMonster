/**
 * 几何体缓存管理器 - 战斗 3D 系统
 * 用于在多个组件实例之间共享相同的几何体对象
 */

import * as THREE from "three";
import { createHexagonExtrudeGeometry } from "./hex3DUtils";

const geometryCache = new Map<string, THREE.ExtrudeGeometry>();

/**
 * 获取或创建共享的六边形几何体
 */
export const getSharedHexagonGeometry = (
    width: number,
    depth: number,
    scale: number
): THREE.ExtrudeGeometry => {
    const cacheKey = `${width}-${depth}-${scale}`;

    if (geometryCache.has(cacheKey)) {
        return geometryCache.get(cacheKey)!;
    }

    const geometry = createHexagonExtrudeGeometry(width, depth, scale, true);
    geometryCache.set(cacheKey, geometry);

    return geometry;
};

/**
 * 清理缓存（可选，用于内存管理）
 */
export const clearGeometryCache = () => {
    geometryCache.forEach((geometry) => geometry.dispose());
    geometryCache.clear();
};
