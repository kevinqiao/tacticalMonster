/**
 * 3D 坐标转换工具函数 - 战斗系统
 * 用于在六边形坐标和 Three.js 3D 世界坐标之间转换
 */

import * as THREE from "three";

/** 战斗地图尺寸信息（从 mapDimension + game.map 派生） */
export interface BattleMapDimension {
    hexWidth: number;
    hexHeight: number;
    width: number;
    height: number;
    cols: number;
    rows: number;
    direction?: number; // 0: 默认, 1: 镜像
    isPortrait: boolean; // 是否竖屏（竖屏时 logicToView 会旋转坐标）
}

/**
 * 将六边形坐标转换为 Three.js 3D 世界坐标（返回六边形左上角位置）
 */
export const hexTo3DPosition = (
    q: number,
    r: number,
    mapDimension: BattleMapDimension | null,
    y: number = 0
): THREE.Vector3 | null => {
    if (!mapDimension) return null;

    const { hexWidth, hexHeight, cols, direction = 0 } = mapDimension;

    const isOddRow = r % 2 !== 0;
    const colOffset = isOddRow ? hexWidth / 2 : 0;
    const col = direction === 1 ? cols - q - 1 : q;
    const hexLeftX = col * hexWidth + (direction === 1 ? -colOffset : colOffset);
    const hexTopZ = r * hexHeight * 0.75;

    return new THREE.Vector3(hexLeftX, y, hexTopZ);
};

/**
 * 将六边形坐标转换为 Three.js 3D 世界坐标（返回六边形中心位置）
 * 用于放置模型等需要居中的场景
 */
export const hexTo3DCenter = (
    q: number,
    r: number,
    mapDimension: BattleMapDimension | null,
    y: number = 0
): THREE.Vector3 | null => {
    if (!mapDimension) return null;

    const { hexWidth, hexHeight, cols, direction = 0 } = mapDimension;

    const isOddRow = r % 2 !== 0;
    const colOffset = isOddRow ? hexWidth / 2 : 0;
    const col = direction === 1 ? cols - q - 1 : q;
    const hexLeftX = col * hexWidth + (direction === 1 ? -colOffset : colOffset);
    const hexTopZ = r * hexHeight * 0.75;

    const centerX = hexLeftX + hexWidth / 2;
    // 六边形几何体旋转 -90° 后 Y 变为 -Z，中心在 topZ - hexHeight/2（与 team StageGrid3D 一致）
    const centerZ = hexTopZ - hexHeight / 2;

    return new THREE.Vector3(centerX, y, centerZ);
};

/**
 * 六边形网格几何中心（平顶布局：X 跨度为 (cols+0.5)*hexWidth，Z 为行方向）
 * 用于相机 target，使 GridGround 居中
 */
export const getGridCenter3D = (
    mapDimension: BattleMapDimension | null
): [number, number, number] | null => {
    if (!mapDimension) return null;
    const { cols, rows, hexWidth, hexHeight } = mapDimension;
    const x = ((cols + 0.5) * hexWidth) / 2;
    const z = ((rows - 1) * 0.75 * hexHeight - hexHeight) / 2;
    return [x, 0, z];
};

/**
 * 将 Three.js 3D 世界坐标转换为六边形坐标
 */
export const world3DToHex = (
    worldPos: THREE.Vector3,
    mapDimension: BattleMapDimension | null
): { q: number; r: number } | null => {
    if (!mapDimension) return null;

    const { hexWidth, hexHeight, cols, rows } = mapDimension;

    const r = Math.round(worldPos.z / (hexHeight * 0.75));
    if (r < 0 || r >= rows) return null;

    const isOddRow = r % 2 !== 0;
    const colOffset = isOddRow ? hexWidth / 2 : 0;
    const col = Math.floor((worldPos.x - colOffset) / hexWidth);
    if (col < 0 || col >= cols) return null;

    const q = mapDimension.direction === 1 ? cols - col - 1 : col;
    return { q, r };
};

/**
 * 使用射线投射将鼠标/屏幕坐标转换为六边形坐标
 */
export const raycastToHex = (
    raycaster: THREE.Raycaster,
    mouse: THREE.Vector2,
    camera: THREE.Camera,
    mapDimension: BattleMapDimension | null,
    planeY: number = 0
): { q: number; r: number } | null => {
    if (!mapDimension) return null;

    raycaster.setFromCamera(mouse, camera);

    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -planeY);
    const intersectionPoint = new THREE.Vector3();

    raycaster.ray.intersectPlane(plane, intersectionPoint);

    return world3DToHex(intersectionPoint, mapDimension);
};
