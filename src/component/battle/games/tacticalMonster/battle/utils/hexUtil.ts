/**
 * Tactical Monster 六边形工具函数
 */

import { MapModel } from "../../types/gameTypes";

export const hexToPixel = (q: number, r: number, hexWidth: number, hexHeight: number): { q: number; r: number; x: number; y: number } => {
    const isOddRow = r % 2 !== 0;
    const offset = isOddRow ? hexWidth / 2 : 0;
    const x = q * hexWidth + offset;
    const y = r * hexHeight * 0.75;
    return { q, r, x, y };
};

export const coordToPixel = (q: number, r: number, hexCell: { width: number, height: number }, map: MapModel): { q: number; r: number; x: number; y: number } => {
    const { cols, direction } = map;
    const { width, height } = hexCell;
    const isOddRow = r % 2 !== 0;
    const offset = isOddRow ? (direction === 1 ? -width / 2 : width / 2) : 0;
    const col = direction === 1 ? cols - q - 1 : q;
    const x = col * width + offset;
    const y = r * height * 0.75;
    return { q, r, x, y };
};

export const offsetToCube = (col: number, row: number) => {
    const x = col - (row - (row & 1)) / 2;
    const z = row;
    const y = -x - z;
    return { x, y, z };
};

/**
 * 轴向六边形距离（与后端 convex hexUtils.hexDistance 一致）
 * 用于前后端统一：移动范围、攻击范围、寻路均按轴向距离。
 */
export const calculateHexDistance = (from: { q: number; r: number }, to: { q: number; r: number }): number => {
    return (
        Math.abs(from.q - to.q) +
        Math.abs(from.q + from.r - to.q - to.r) +
        Math.abs(from.r - to.r)
    ) / 2;
};

/** 别名，与后端命名一致 */
export const hexDistance = calculateHexDistance;

/**
 * 获取指定范围内的所有邻居位置
 * @param q - 中心位置的 q 坐标
 * @param r - 中心位置的 r 坐标
 * @param range - 范围（距离）
 * @returns 所有在范围内的位置列表
 */
export function getNeighborsInRange(
    q: number,
    r: number,
    range: number
): Array<{ q: number; r: number }> {
    const neighbors: Array<{ q: number; r: number }> = [];

    for (let dq = -range; dq <= range; dq++) {
        for (let dr = -range; dr <= range; dr++) {
            const distance = calculateHexDistance(
                { q: 0, r: 0 },
                { q: dq, r: dr }
            );
            if (distance > 0 && distance <= range) {
                neighbors.push({ q: q + dq, r: r + dr });
            }
        }
    }

    return neighbors;
}


