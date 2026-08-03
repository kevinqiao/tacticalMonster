/**
 * 3D 六边形工具函数 - 战斗系统
 */

import * as THREE from "three";
import { calculateHexMetrics } from "../../utils/gridUtils";

/**
 * 创建六边形 Shape（用于 ExtrudeGeometry）
 */
export const createHexagonShape = (width: number, scale: number = 1): THREE.Shape => {
    const metrics = calculateHexMetrics(width);
    const centerX = metrics.width / 2;
    const centerY = metrics.height / 2;

    const scaledHorizontalRadius = metrics.horizontalRadius * scale;
    const scaledVerticalRadius = metrics.verticalRadius * scale;
    const scaledHalfHeight = (metrics.height / 2) * scale;

    const shape = new THREE.Shape();

    shape.moveTo(centerX, centerY - scaledHalfHeight);
    shape.lineTo(centerX + scaledHorizontalRadius, centerY - scaledVerticalRadius / 2);
    shape.lineTo(centerX + scaledHorizontalRadius, centerY + scaledVerticalRadius / 2);
    shape.lineTo(centerX, centerY + scaledHalfHeight);
    shape.lineTo(centerX - scaledHorizontalRadius, centerY + scaledVerticalRadius / 2);
    shape.lineTo(centerX - scaledHorizontalRadius, centerY - scaledVerticalRadius / 2);
    shape.lineTo(centerX, centerY - scaledHalfHeight);

    return shape;
};

/**
 * 创建六边形挤压几何体
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
        bevelThickness: bevel ? depth * 0.15 : 0,
        bevelSize: bevel ? width * 0.02 : 0,
        bevelOffset: 0,
        bevelSegments: bevel ? 2 : 0,
    };
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
};

/**
 * 创建六边形材质
 */
export const createHexagonMaterial = (
    color: string | number = 0xffffff,
    opacity: number = 1
): THREE.MeshStandardMaterial => {
    return new THREE.MeshStandardMaterial({
        color: typeof color === "string" ? new THREE.Color(color) : color,
        opacity,
        transparent: opacity < 1,
        side: THREE.FrontSide,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1,
    });
};
