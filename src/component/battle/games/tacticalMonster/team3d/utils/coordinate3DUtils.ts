/**
 * 3D 坐标转换工具函数
 * 用于在 2D 六边形坐标和 Three.js 3D 世界坐标之间转换
 */

import * as THREE from "three";
import { MapDimension } from "../../service/TeamDeployManager";
import { hexToPixel } from "../../utils/coordinateUtils";

/**
 * 将六边形坐标转换为 Three.js 3D 世界坐标（返回六边形左上角位置）
 * @param q 六边形的列坐标（视图坐标）
 * @param r 六边形的行坐标（视图坐标）
 * @param mapDimension 地图尺寸信息
 * @param y 可选的 Y 坐标（高度），默认为 0
 * @returns THREE.Vector3 对象，如果 mapDimension 为 null 则返回 null
 */
export const hexTo3DPosition = (
    q: number,
    r: number,
    mapDimension: MapDimension | null,
    y: number = 0
): THREE.Vector3 | null => {
    if (!mapDimension) return null;

    const { hexWidth, hexHeight } = mapDimension;

    // 计算六边形的左上角坐标（与 2D 渲染保持一致）
    const isOddRow = r % 2 !== 0;
    const colOffset = isOddRow ? hexWidth / 2 : 0;
    const hexLeftX = q * hexWidth + colOffset;
    const hexTopY = r * hexHeight * 0.75;

    // 将 2D 像素坐标转换为 3D 世界坐标
    // Three.js 中 Y 轴向上，XZ 平面是地面
    // pixelX -> worldX, pixelY -> worldZ, y -> worldY
    return new THREE.Vector3(
        hexLeftX,
        y, // Y 轴是高度
        hexTopY // Z 轴对应原来的 Y 坐标
    );
};

/**
 * 将六边形坐标转换为 Three.js 3D 世界坐标（返回六边形中心位置）
 * 用于放置模型等需要居中的场景
 */
export const hexTo3DCenter = (
    q: number,
    r: number,
    mapDimension: MapDimension | null,
    y: number = 0
): THREE.Vector3 | null => {
    if (!mapDimension) return null;

    const { hexWidth, hexHeight } = mapDimension;

    // 计算六边形的左上角坐标
    const isOddRow = r % 2 !== 0;
    const colOffset = isOddRow ? hexWidth / 2 : 0;
    const hexLeftX = q * hexWidth + colOffset;
    const hexTopY = r * hexHeight * 0.75;

    // 计算六边形中心点
    const centerX = hexLeftX + hexWidth / 2;
    const centerZ = hexTopY + hexHeight / 2;

    return new THREE.Vector3(
        centerX,
        y,
        centerZ
    );
};

/**
 * 将 Three.js 3D 世界坐标转换为六边形坐标
 * @param worldPos THREE.Vector3 世界坐标
 * @param mapDimension 地图尺寸信息
 * @returns 六边形坐标 { q, r }，如果无法转换则返回 null
 */
export const world3DToHex = (
    worldPos: THREE.Vector3,
    mapDimension: MapDimension | null
): { q: number; r: number } | null => {
    if (!mapDimension) return null;

    // 将 3D 世界坐标转换回 2D 像素坐标
    // worldX -> pixelX, worldZ -> pixelY
    // 使用 hexToPixel 的反向计算
    const hexPos = hexToPixel(
        Math.round(worldPos.x / mapDimension.hexWidth),
        Math.round(worldPos.z / (mapDimension.hexHeight * 0.75)),
        mapDimension
    );

    if (!hexPos) return null;

    // 从像素坐标反推六边形坐标（简化版本，实际应该使用更精确的方法）
    const r = Math.round(worldPos.z / (mapDimension.hexHeight * 0.75));
    const isOddRow = r % 2 !== 0;
    const colOffset = isOddRow ? mapDimension.hexWidth / 2 : 0;
    const q = Math.floor((worldPos.x - colOffset) / mapDimension.hexWidth);

    return { q, r };
};

/**
 * 使用射线投射将鼠标/屏幕坐标转换为六边形坐标
 * @param raycaster THREE.Raycaster 对象
 * @param mouse THREE.Vector2 鼠标坐标（归一化到 -1 到 1）
 * @param camera THREE.Camera 相机对象
 * @param mapDimension 地图尺寸信息
 * @param planeY 地面的 Y 坐标（高度）
 * @returns 六边形坐标 { q, r }，如果无法转换则返回 null
 */
export const raycastToHex = (
    raycaster: THREE.Raycaster,
    mouse: THREE.Vector2,
    camera: THREE.Camera,
    mapDimension: MapDimension | null,
    planeY: number = 0
): { q: number; r: number } | null => {
    if (!mapDimension) return null;

    // 更新射线
    raycaster.setFromCamera(mouse, camera);

    // 创建一个 Y=0 的平面用于射线检测
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -planeY);
    const intersectionPoint = new THREE.Vector3();

    raycaster.ray.intersectPlane(plane, intersectionPoint);

    // 将交点转换为六边形坐标
    return world3DToHex(intersectionPoint, mapDimension);
};
