// src/utils/hexUtils.ts

/**
 * 将六边形坐标转换为像素坐标（基于奇数行偏移坐标系）
 * @param q - 六边形的 q 坐标
 * @param r - 六边形的 r 坐标
 * @param gridSize - 六边形的大小（半径）
 * @returns 包含 x 和 y 的像素坐标
 */
export const hexToPixel = (q: number, r: number, gridSize: number): { x: number; y: number } => {
    const width = Math.sqrt(3) * gridSize; // 六边形的宽度
    const height = 2 * gridSize; // 六边形的高度
    const horizontalSpacing = width; // 水平间距
    const verticalSpacing = (3 / 2) * gridSize; // 垂直间距

    // 奇数行偏移（Odd-R）
    const offset = r % 2 !== 0 ? width / 2 : 0;

    const x = q * horizontalSpacing + offset;
    const y = r * verticalSpacing;

    return { x, y };
};

/**
 * 计算从起点到终点的旋转角度（弧度）
 * @param start - 起点，包含 x 和 y
 * @param end - 终点，包含 x 和 y
 * @returns 旋转角度（弧度）
 */
export const calculateRotation = (start: { x: number; y: number }, end: { x: number; y: number }): number => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    return Math.atan2(dy, dx); // 返回弧度
};

/**
 * 根据角色的深度计算缩放和倾斜参数，模拟3D透视效果
 * @param r - 角色所在的行数（深度）
 * @param maxDepth - 最大深度，用于限制缩放
 * @param baseScale - 基础缩放比例
 * @param perspective - 透视参数
 * @param rotateXAngle - 旋转X轴的角度（度）
 * @returns 包含 scale 和 skewX
 */
export const calculatePerspective = (
    r: number,
    maxDepth: number,
    baseScale: number,
    perspective: number,
    rotateXAngle: number
): { scale: number; skewX: number } => {
    const clampedR = Math.min(r, maxDepth); // 限制最大深度
    const scale = baseScale * (perspective / (perspective + clampedR * 100)); // 100为每层深度的单位距离

    // 计算倾斜角度（弧度）
    const skewX = (rotateXAngle * Math.PI) / 180;

    return { scale, skewX };
};
