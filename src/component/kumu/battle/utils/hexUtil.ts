// src/utils/hexUtils.ts

import { MapModel } from "../types/CombatTypes";

/**
 * 将六边形网格坐标转换为像素坐标（中心点）
 * @param q - 列坐标
 * @param r - 行坐标
 * @param hexWidth - 六边形宽度
 * @param hexHeight - 六边形高度
 * @returns 六边形中心点的像素坐标 {x, y}
 */
export const hexToPixel = (q: number, r: number, hexWidth: number, hexHeight: number): {q:number;r:number;x: number; y: number } => {

    // 奇数行的列号需要偏移
    const isOddRow = r % 2 !== 0;
    
    // 奇数行向右偏移半个六边形宽度
    const offset = isOddRow ? hexWidth / 2 : 0;

    // 计算六边形中心点的像素坐标
    const x = q * hexWidth + offset;  // 加上半个宽度得到中心点
    const y = r * hexHeight * 0.75;  // 加上半个高度得到中心点

    return {q,r,x, y };
};
export const coordToPixel = (q: number, r: number, hexCell: {width:number,height:number}, map: MapModel): {q:number;r:number;x: number; y: number } => {
    const {cols,direction} = map;   
    const {width,height} = hexCell;
    // 奇数行的列号需要偏移
    const isOddRow = r % 2 !== 0;
    
    // 奇数行向右偏移半个六边形宽度
    const offset = isOddRow ? (direction===1?-width / 2 :width / 2) :0;

    // 计算六边形中心点的像素坐标
    const col = direction === 1 ? cols - q - 1 : q;
    const x = col * width + offset;  // 加上半个宽度得到中心点
    const y = r * height * 0.75;  // 加上半个高度得到中心点

    return {q,r,x, y };
};

// 将偏移坐标(offset coordinates)转换为立方坐标(cube coordinates)
export const offsetToCube = (col: number, row: number) => {
    const x = col - (row - (row & 1)) / 2;
    const z = row;
    const y = -x - z;
    return { x, y, z };
};

/** Offset (even-r) 六边形距离，与 PathFind/网格渲染一致，统一使用 */
export const offsetHexDistance = (from: { q: number, r: number }, to: { q: number, r: number }): number => {
    const dq = Math.abs(from.q - to.q);
    const dr = Math.abs(from.r - to.r);
    return Math.max(dq, dr) + Math.floor(Math.min(dq, dr) / 2);
};

/** 已弃用，请用 offsetHexDistance */
export const calculateHexDistance = offsetHexDistance;
