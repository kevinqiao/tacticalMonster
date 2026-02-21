/**
 * Tactical Monster 六边形工具函数
 */

import { GridCellSprite, HexNode, MonsterSprite } from "../types/CombatTypes";
import { MapModel } from "../types/gameTypes";
import { getOffsetNeighborDirs } from "./PathFind";

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
 * 轴向六边形距离（cube/axial，与后端 hexUtils.hexDistance 一致）
 * 已弃用：移动/寻路/高亮统一使用 offsetHexDistance。
 */
export const calculateHexDistance = (from: { q: number; r: number }, to: { q: number; r: number }): number => {
    return (
        Math.abs(from.q - to.q) +
        Math.abs(from.q + from.r - to.q - to.r) +
        Math.abs(from.r - to.r)
    ) / 2;
};

/** 别名 */
export const hexDistance = calculateHexDistance;

/**
 * Offset (even-r) 六边形距离，与 PathFind/网格渲染一致
 * 统一用于：移动范围、可行走高亮、寻路、攻击范围校验
 */
export const offsetHexDistance = (from: { q: number; r: number }, to: { q: number; r: number }): number => {
    const dq = Math.abs(from.q - to.q);
    const dr = Math.abs(from.r - to.r);
    return Math.max(dq, dr) + Math.floor(Math.min(dq, dr) / 2);
};

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
            const distance = offsetHexDistance({ q: 0, r: 0 }, { q: dq, r: dr });
            if (distance > 0 && distance <= range) {
                neighbors.push({ q: q + dq, r: r + dr });
            }
        }
    }

    return neighbors;
}

export const getNeighbors = (pos: HexNode, characters: MonsterSprite[], gridCells: GridCellSprite[][]): HexNode[] => {
    const isWalkable = (q: number, r: number): boolean => {
        if (r < 0 || r >= gridCells.length || q < 0 || q >= (gridCells[0]?.length ?? 0)) return false;
        const cell = gridCells[r][q];
        // const character = characters.find((c) => c.q === q && c.r === r);
        // if (character) return false;
        return !cell.obstacle && !cell.disable;
    };
    return getOffsetNeighborDirs(pos.r)
        .map(({ dq, dr }) => ({ q: pos.q + dq, r: pos.r + dr }))
        .filter((neighbor) => {
            return isWalkable(neighbor.q, neighbor.r)
        });
};


