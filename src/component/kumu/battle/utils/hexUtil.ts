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
