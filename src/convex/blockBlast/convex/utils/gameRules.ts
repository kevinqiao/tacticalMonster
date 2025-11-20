/**
 * Block Blast 游戏规则（纯函数，无状态）
 * 前后端共享的核心逻辑
 * 此文件是前端 utils/gameRules.ts 的副本，供 Convex 后端使用
 */

/**
 * 检查形状是否可以放置在指定位置
 * @param grid 10x10 游戏网格
 * @param shape 形状矩阵（2D数组，1=有块，0=空）
 * @param row 起始行
 * @param col 起始列
 * @returns 是否可以放置
 */
export function canPlaceShape(
    grid: number[][],
    shape: number[][],
    row: number,
    col: number
): boolean {
    for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
            if (shape[r][c] === 1) {
                const gridRow = row + r;
                const gridCol = col + c;
                
                // 检查边界
                if (gridRow < 0 || gridRow >= 10 || gridCol < 0 || gridCol >= 10) {
                    return false;
                }
                
                // 检查是否已被占用
                if (grid[gridRow][gridCol] !== 0) {
                    return false;
                }
            }
        }
    }
    return true;
}

/**
 * 放置形状到网格上
 * @param grid 游戏网格（会被修改）
 * @param shape 形状矩阵
 * @param color 颜色索引（1-7）
 * @param row 起始行
 * @param col 起始列
 */
export function placeShapeOnGrid(
    grid: number[][],
    shape: number[][],
    color: number,
    row: number,
    col: number
): void {
    for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
            if (shape[r][c] === 1) {
                grid[row + r][col + c] = color;
            }
        }
    }
}

/**
 * 检查哪些行/列已填满，需要消除
 * @param grid 游戏网格
 * @returns 需要消除的行和列索引
 */
export function checkLines(grid: number[][]): { rows: number[], cols: number[] } {
    const fullRows: number[] = [];
    const fullCols: number[] = [];
    
    // 检查行
    for (let row = 0; row < 10; row++) {
        if (grid[row].every(cell => cell !== 0)) {
            fullRows.push(row);
        }
    }
    
    // 检查列
    for (let col = 0; col < 10; col++) {
        let isFull = true;
        for (let row = 0; row < 10; row++) {
            if (grid[row][col] === 0) {
                isFull = false;
                break;
            }
        }
        if (isFull) {
            fullCols.push(col);
        }
    }
    
    return { rows: fullRows, cols: fullCols };
}

/**
 * 清除指定的行和列
 * @param grid 游戏网格（会被修改）
 * @param rows 要清除的行索引数组
 * @param cols 要清除的列索引数组
 */
export function clearLines(
    grid: number[][],
    rows: number[],
    cols: number[]
): void {
    // 清除行
    for (const row of rows) {
        grid[row].fill(0);
    }
    
    // 清除列
    for (const col of cols) {
        for (let row = 0; row < 10; row++) {
            grid[row][col] = 0;
        }
    }
}

/**
 * 检查是否有任何形状可以放置在网格上
 * @param grid 游戏网格
 * @param shapes 形状数组（每个形状包含 shape 属性）
 * @returns 是否可以放置任何形状
 */
export function canPlaceAnyShape(
    grid: number[][],
    shapes: Array<{ shape: number[][] }>
): boolean {
    for (const shapeObj of shapes) {
        const shape = shapeObj.shape;
        for (let row = 0; row <= 10 - shape.length; row++) {
            for (let col = 0; col <= 10 - shape[0].length; col++) {
                if (canPlaceShape(grid, shape, row, col)) {
                    return true;
                }
            }
        }
    }
    return false;
}

/**
 * 创建空的 10x10 网格
 */
export function createEmptyGrid(): number[][] {
    return Array.from({ length: 10 }, () => Array(10).fill(0));
}

