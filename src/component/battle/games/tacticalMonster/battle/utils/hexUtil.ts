/**
 * Tactical Monster 六边形工具函数
 */

import { MapModel } from "../types/CombatTypes";

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

export const calculateHexDistance = (from: { q: number, r: number }, to: { q: number, r: number }): number => {
    const fromX = from.q - Math.floor(from.r / 2);
    const fromZ = from.r;
    const fromY = -fromX - fromZ;

    const toX = to.q - Math.floor(to.r / 2);
    const toZ = to.r;
    const toY = -toX - toZ;

    return Math.max(
        Math.abs(fromX - toX),
        Math.abs(fromY - toY),
        Math.abs(fromZ - toZ)
    );
};


