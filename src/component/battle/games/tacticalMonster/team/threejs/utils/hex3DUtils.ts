/**
 * 3D 六边形工具函数
 * 用于创建 Three.js 中的六边形几何体
 */

import * as THREE from "three";
import { calculateHexMetrics } from "../../../battle/utils/gridUtils";

/**
 * 创建六边形 Shape（用于 ExtrudeGeometry）
 * @param width 六边形的宽度
 * @param scale 缩放比例（0-1），用于创建格子间距，默认 0.92
 * @returns THREE.Shape 对象
 */
export const createHexagonShape = (width: number, scale: number = 1): THREE.Shape => {
    const metrics = calculateHexMetrics(width);
    const centerX = metrics.width / 2;
    const centerY = metrics.height / 2;

    // 应用缩放以创建间距
    const scaledHorizontalRadius = metrics.horizontalRadius * scale;
    const scaledVerticalRadius = metrics.verticalRadius * scale;
    const scaledHalfHeight = (metrics.height / 2) * scale;

    const shape = new THREE.Shape();
    
    // 从顶点开始，顺时针排列（相对于中心点缩放）
    shape.moveTo(centerX, centerY - scaledHalfHeight); // 上顶点
    shape.lineTo(centerX + scaledHorizontalRadius, centerY - scaledVerticalRadius / 2); // 右上
    shape.lineTo(centerX + scaledHorizontalRadius, centerY + scaledVerticalRadius / 2); // 右下
    shape.lineTo(centerX, centerY + scaledHalfHeight); // 下顶点
    shape.lineTo(centerX - scaledHorizontalRadius, centerY + scaledVerticalRadius / 2); // 左下
    shape.lineTo(centerX - scaledHorizontalRadius, centerY - scaledVerticalRadius / 2); // 左上
    shape.lineTo(centerX, centerY - scaledHalfHeight); // 闭合

    return shape;
};

/**
 * 创建六边形几何体（平面）
 * @param width 六边形的宽度
 * @param scale 缩放比例（0-1），用于创建格子间距
 * @returns THREE.ShapeGeometry 对象
 */
export const createHexagonGeometry = (width: number, scale: number = 1): THREE.ShapeGeometry => {
    const shape = createHexagonShape(width, scale);
    return new THREE.ShapeGeometry(shape);
};

/**
 * 创建六边形挤压几何体（有厚度的立体柱状）
 * @param width 六边形的宽度
 * @param depth 挤压的深度（厚度）
 * @param scale 缩放比例（0-1），用于创建格子间距，默认 0.92
 * @param bevel 是否启用斜角，使边缘更平滑
 * @returns THREE.ExtrudeGeometry 对象
 */
export const createHexagonExtrudeGeometry = (
    width: number,
    depth: number = 0.1,
    scale: number = 0.92,
    bevel: boolean = true
): THREE.ExtrudeGeometry => {
    const shape = createHexagonShape(width, scale);
    const extrudeSettings = {
        depth,
        bevelEnabled: bevel,
        bevelThickness: bevel ? depth * 0.15 : 0, // 斜角厚度
        bevelSize: bevel ? width * 0.02 : 0,      // 斜角大小
        bevelOffset: 0,
        bevelSegments: bevel ? 2 : 0,             // 斜角分段数
    };
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
};

/**
 * 创建六边形材质
 * @param color 颜色（十六进制或颜色名称）
 * @param opacity 透明度（0-1）
 * @returns THREE.MeshStandardMaterial 对象
 */
export const createHexagonMaterial = (
    color: string | number = 0xffffff,
    opacity: number = 1
): THREE.MeshStandardMaterial => {
    return new THREE.MeshStandardMaterial({
        color: typeof color === "string" ? new THREE.Color(color) : color,
        opacity,
        transparent: opacity < 1,
        side: THREE.FrontSide, // 只渲染正面，避免 Z-fighting
        polygonOffset: true, // 启用多边形偏移
        polygonOffsetFactor: 1, // 偏移因子
        polygonOffsetUnits: 1, // 偏移单位
    });
};
