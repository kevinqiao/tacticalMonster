// src/utils/hexUtils.ts

/**
 * 将六边形网格坐标转换为像素坐标（中心点）
 * @param q - 列坐标
 * @param r - 行坐标
 * @param hexWidth - 六边形宽度
 * @param hexHeight - 六边形高度
 * @returns 六边形中心点的像素坐标 {x, y}
 */
export const hexToPixel = (q: number, r: number, hexWidth: number, hexHeight: number): {q:number;r:number;x: number; y: number } => {
    console.log("hexToPixel",q,r,hexWidth,hexHeight);
    // 奇数行的列号需要偏移
    const isOddRow = r % 2 !== 0;
    
    // 奇数行向右偏移半个六边形宽度
    const offset = isOddRow ? hexWidth / 2 : 0;

    // 计算六边形中心点的像素坐标
    const x = q * hexWidth + offset;  // 加上半个宽度得到中心点
    const y = r * hexHeight * 0.75;  // 加上半个高度得到中心点

    return {q,r,x, y };
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
 * @param depth - 当前行号（0-6）
 * @param maxDepth - 总行数（7）
 * @param baseScale - 基础缩放比例（0.5）
 * @param perspective - 透视强度（1200）
 * @param rotateXAngle - X轴旋转角度（45度）
 * @returns 包含 scale 和 skewX
 */
export const calculatePerspective = (
    depth: number,       // 当前行号（0-6）
    maxDepth: number,    // 总行数（7）
    baseScale: number,   // 基础缩放比例（0.5）
    perspective: number, // 透视强度（1200）
    rotateXAngle: number // X轴旋转角度（45度）
) => {
    // 计算深度比例 (0-1)
    const depthRatio = depth / maxDepth;
    
    // 基于深度计算缩放
    // 距越远（depth越大），缩放越小
    const scale = baseScale * (1 - depthRatio * 0.3);
    
    // 基于深度和转角度计算倾斜
    // 距离越远，倾斜越大
    const skewX = (depthRatio * rotateXAngle) / perspective;

    return { scale, skewX };
};

export const pixelToHex = (x: number, y: number, hexWidth: number, hexHeight: number) => {

    // 调整Y坐标以考虑3D透视压缩
    const adjustedY = y / 0.75;  // 反向补偿垂直压缩

    // 计算粗略的行号
    const row = Math.floor(adjustedY / hexHeight);
    
    // 确定是否为奇数行
    const isOddRow = row % 2 !== 0;
    
    // 计算X轴偏移
    const offset = isOddRow ? hexWidth / 2 : 0;
    
    // 计算列号，考虑奇数行的偏移
    const col = Math.floor((x - offset) / hexWidth);

    // 计算六边形的中心点
    const centerX = col * hexWidth + offset + hexWidth / 2;
    const centerY = row * hexHeight * 0.75 + hexHeight / 2;

    // 计算点击位置到中心的距离
    const dx = x - centerX;
    const dy = y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // 如果点击位置在六边形边缘区域，需要进行额外的碰撞检测
    if (distance > hexWidth * 0.4) {  // 可以调整这个阈值
        // 检查周围的六边形
        const neighbors = [
            { col, row },
            { col: col + 1, row },
            { col: col - 1, row },
            { col: isOddRow ? col + 1 : col, row: row - 1 },
            { col: isOddRow ? col : col - 1, row: row - 1 },
            { col: isOddRow ? col + 1 : col, row: row + 1 },
            { col: isOddRow ? col : col - 1, row: row + 1 }
        ];

        // 找到最近的六边形中心
        let minDistance = distance;
        let closestHex = { col, row };

        neighbors.forEach(hex => {
            const hexCenterX = hex.col * hexWidth + (hex.row % 2 ? hexWidth / 2 : 0) + hexWidth / 2;
            const hexCenterY = hex.row * hexHeight * 0.75 + hexHeight / 2;
            const dist = Math.sqrt(
                Math.pow(x - hexCenterX, 2) + 
                Math.pow(y - hexCenterY, 2)
            );
            if (dist < minDistance) {
                minDistance = dist;
                closestHex = hex;
            }
        });
         console.log('closestHex', closestHex);
         console.log(x,y)
        return closestHex;
    }

    return { col, row };
};
