/**
 * 坐标转换工具函数
 */

import { calculateHexPoints, isPointInHex } from "../../battle/utils/gridUtils";
import { HexPoint } from "../../types/GridTypes";
import { MapDimension } from "../service/TeamDeployManager";

/**
 * 计算地图比例
 */
export const calculateMapRatio = (cols: number, rows: number, isPortrait?: boolean): number => {
    if (isPortrait) {
        ((cols + 0.5) * Math.sqrt(3)) / 2 / (1 + (rows * 3) / 4)
    }
    return ((cols + 0.5) * Math.sqrt(3)) / 2 / (1 + ((rows - 1) * 3) / 4);
};

// export const calculateMapDimension = (containerWidth: number, containerHeight: number): { width: number, height: number, hexWidth: number, hexHeight: number, cols: number, rows: number, isPortrait: boolean } => {
//     const containerRatio = containerWidth / containerHeight;
//     const isPortrait = containerHeight * 0.95 > containerWidth;
//     const mapSize: { width: number; height: number } = { width: 0, height: 0 };
//     if (isPortrait) {
//         const mapRatio = ((7 + 0.5) * Math.sqrt(3)) / 2 / (1 + (8 * 3) / 4);
//         if (mapRatio < containerRatio) {
//             mapSize.height = containerHeight;
//             mapSize.width = mapSize.height * mapRatio;
//         } else {
//             mapSize.width = containerWidth;
//             mapSize.height = mapSize.width / mapRatio;
//         }
//         const hexWidth = mapSize.width / (7 + 0.5);
//         const hexHeight = (hexWidth * 2) / Math.sqrt(3);
//         return { width: mapSize.width, height: mapSize.height, hexWidth, hexHeight, cols: 7, rows: 8, isPortrait };
//     } else {
//         const mapRatio = ((8 + 0.5) * Math.sqrt(3)) / 2 / (1 + (7 * 3) / 4);
//         if (mapRatio < containerRatio) {
//             mapSize.height = containerHeight;
//             mapSize.width = mapSize.height * mapRatio;
//         } else {
//             mapSize.width = containerWidth;
//             mapSize.height = mapSize.width / mapRatio;
//         }
//         const hexWidth = mapSize.width / (8 + 0.5);
//         const hexHeight = (hexWidth * 2) / Math.sqrt(3);
//         return { width: mapSize.width, height: mapSize.height, hexWidth, hexHeight, cols: 8, rows: 7, isPortrait };
//     }

// };
export const calculateMapDimension = (containerWidth: number, containerHeight: number): { width: number, height: number, hexWidth: number, hexHeight: number, cols: number, rows: number, isPortrait: boolean, zoom?: number } => {
    const hratio = ((9.5 + 0.5) * Math.sqrt(3)) / 2 / (2.5 + (6 * 3) / 4);
    const containerRatio = containerWidth / containerHeight;
    const isPortrait = containerRatio < hratio;
    const dimension: { width: number; height: number, hexWidth: number, hexHeight: number, cols: number, rows: number, isPortrait: boolean, zoom?: number } = { width: 0, height: 0, hexWidth: 0, hexHeight: 0, cols: 8, rows: 7, isPortrait, zoom: 1 };
    if (isPortrait) {
        const hexWidth = containerWidth / (9 + 0.5);
        const hexHeight = (hexWidth * 2) / Math.sqrt(3);
        const hzoom = containerHeight / (hexWidth * 10.5);
        const vzoom = containerWidth / (hexHeight * (2 + 6 * 3 / 4));
        dimension.zoom = Math.min(hzoom, vzoom);
        dimension.height = hexWidth * 8.5 * dimension.zoom;
        dimension.width = hexHeight * dimension.zoom * (1 + 6 * 3 / 4);
        dimension.hexWidth = hexWidth;
        dimension.hexHeight = hexHeight;
    } else {
        const hexHeight = containerHeight / (2 + (6 * 3 / 4));
        const hexWidth = hexHeight * Math.sqrt(3) / 2;
        dimension.height = hexHeight * (1 + (6 * 3 / 4));
        dimension.width = hexWidth * 8.5;
        dimension.hexWidth = hexWidth;
        dimension.hexHeight = hexHeight;
    }
    return dimension;
};
/**
 * 视图坐标 → 逻辑坐标（发送给后端时使用）
 * 横屏：从左到右 q 增加 (0→7)
 * 竖屏：从下到上 对应横屏的 q 增加
 * 竖屏时 rows=8，视图 r 范围是 0-7
 * 逻辑 q=0 对应视图 r=7（最下面），逻辑 q=7 对应视图 r=0（最上面）
 */
export const viewToLogic = (
    viewQ: number,
    viewR: number,
    mapDimension: MapDimension | null
): { q: number; r: number } => {
    if (mapDimension?.isPortrait) {
        const { rows } = mapDimension;
        // 竖屏：视图(q, r) → 逻辑(rows-1-r, q)
        // 视图的 r 从下到上对应逻辑的 q 从小到大
        return { q: rows - 1 - viewR, r: viewQ };
    }
    return { q: viewQ, r: viewR };
};

/**
 * 逻辑坐标 → 视图坐标（从后端接收数据时使用）
 */
export const logicToView = (
    logicQ: number,
    logicR: number,
    mapDimension: MapDimension | null
): { q: number; r: number } => {
    if (mapDimension?.isPortrait) {
        const { rows } = mapDimension;
        // 竖屏：逻辑(q, r) → 视图(r, rows-1-q)
        // 逻辑的 q 从小到大对应视图的 r 从下到上（即 r 从大到小）
        return { q: logicR, r: rows - 1 - logicQ };
    }
    return { q: logicQ, r: logicR };
};

/**
 * 像素坐标转六边形坐标（返回视图坐标）
 */
export const pixelToHex = (
    x: number,
    y: number,
    mapDimension: MapDimension | null
): { q: number; r: number } | null => {
    if (!mapDimension) return null;

    const { hexWidth, hexHeight, cols, rows } = mapDimension;

    const r = Math.round(y / (hexHeight * 0.75));
    if (r < 0 || r >= rows) return null;

    const isOddRow = r % 2 !== 0;
    const colOffset = isOddRow ? hexWidth / 2 : 0;
    const q = Math.floor((x - colOffset) / hexWidth);
    if (q < 0 || q >= cols) return null;

    const hexPoints = calculateHexPoints(hexWidth);
    const mousePoint: HexPoint = { x, y };

    const neighbors: Array<{ dq: number; dr: number }> = isOddRow
        ? [
            { dq: 0, dr: 0 },
            { dq: 1, dr: 0 },
            { dq: 1, dr: 1 },
            { dq: 0, dr: 1 },
            { dq: -1, dr: 0 },
            { dq: 0, dr: -1 },
            { dq: 1, dr: -1 },
        ]
        : [
            { dq: 0, dr: 0 },
            { dq: 1, dr: 0 },
            { dq: 0, dr: 1 },
            { dq: -1, dr: 1 },
            { dq: -1, dr: 0 },
            { dq: -1, dr: -1 },
            { dq: 0, dr: -1 },
        ];

    for (const { dq, dr } of neighbors) {
        const testQ = q + dq;
        const testR = r + dr;

        // 使用动态行列进行边界检查
        if (testQ < 0 || testQ >= cols || testR < 0 || testR >= rows) {
            continue;
        }

        const testIsOddRow = testR % 2 !== 0;
        const testColOffset = testIsOddRow ? hexWidth / 2 : 0;
        const hexLeftX = testQ * hexWidth + testColOffset;
        const hexTopY = testR * hexHeight * 0.75;

        const worldHexPoints: HexPoint[] = hexPoints.map(point => ({
            x: hexLeftX + point.x,
            y: hexTopY + point.y,
        }));

        if (isPointInHex(mousePoint, worldHexPoints)) {
            return { q: testQ, r: testR };
        }
    }

    return null;
};

/**
 * 六边形坐标转像素坐标（返回六边形中心点的像素坐标）
 * 这是 pixelToHex 的反转方法
 * 
 * @param q 六边形的列坐标（视图坐标）
 * @param r 六边形的行坐标（视图坐标）
 * @param mapDimension 地图尺寸信息
 * @returns 六边形中心点的像素坐标 { x, y }，如果 mapDimension 为 null 则返回 null
 */
export const hexToPixel = (
    q: number,
    r: number,
    mapDimension: MapDimension | null
): { x: number; y: number } | null => {
    if (!mapDimension) return null;

    const { hexWidth, hexHeight, cols, rows } = mapDimension;

    // 边界检查
    if (q < 0 || q >= cols || r < 0 || r >= rows) {
        return null;
    }

    // 计算六边形的左上角坐标
    const isOddRow = r % 2 !== 0;
    const colOffset = isOddRow ? hexWidth / 2 : 0;
    const hexLeftX = q * hexWidth + colOffset;
    const hexTopY = r * hexHeight * 0.75;

    // 计算六边形的中心点
    // 从 calculateHexPoints 可知，六边形的中心点相对于左上角的偏移是：
    // centerX = hexWidth / 2
    // centerY = hexHeight / 2
    const centerX = hexLeftX + hexWidth / 2;
    const centerY = hexTopY + hexHeight / 2;

    return { x: centerX, y: centerY };
};
