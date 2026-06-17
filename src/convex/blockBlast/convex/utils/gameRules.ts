/**
 * Block Blast 游戏规则（纯函数，无状态）
 * 前后端共享的核心逻辑
 * 棋盘为 N×N，N 由 `grid.length` 推导（须与各行长度一致）
 */

function gridDimension(grid: number[][]): number {
    const n = grid.length;
    if (n === 0 || !Array.isArray(grid[0])) return 0;
    for (let i = 0; i < n; i++) {
        if (!Array.isArray(grid[i]) || grid[i].length !== n) return 0;
    }
    return n;
}

/** Pad ragged rows to a rectangle (horizontal T row2 must be `[0,1,0]` not `[0,1]`). */
export function normalizeShapeMatrix(shape: number[][]): number[][] {
    if (shape.length === 0) return [];
    const width = Math.max(0, ...shape.map((row) => row.length));
    return shape.map((row) => {
        const out = row.slice();
        while (out.length < width) out.push(0);
        return out;
    });
}

/**
 * 检查形状是否可以放置在指定位置
 */
export function canPlaceShape(
    grid: number[][],
    shape: number[][],
    row: number,
    col: number
): boolean {
    const n = gridDimension(grid);
    if (n === 0) return false;
    const matrix = normalizeShapeMatrix(shape);
    for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
            if (matrix[r][c] === 1) {
                const gridRow = row + r;
                const gridCol = col + c;

                if (gridRow < 0 || gridRow >= n || gridCol < 0 || gridCol >= n) {
                    return false;
                }

                if (grid[gridRow][gridCol] !== 0) {
                    return false;
                }
            }
        }
    }
    return true;
}

/**
 * 放置形状到网格上（原地修改 grid）
 */
export function placeShapeOnGrid(
    grid: number[][],
    shape: number[][],
    color: number,
    row: number,
    col: number
): void {
    const matrix = normalizeShapeMatrix(shape);
    for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
            if (matrix[r][c] === 1) {
                grid[row + r][col + c] = color;
            }
        }
    }
}

/**
 * 检查哪些行/列已填满，需要消除
 */
export function checkLines(grid: number[][]): { rows: number[]; cols: number[] } {
    const fullRows: number[] = [];
    const fullCols: number[] = [];
    const n = gridDimension(grid);
    if (n === 0) return { rows: fullRows, cols: fullCols };

    for (let row = 0; row < n; row++) {
        if (grid[row].every((cell) => cell !== 0)) {
            fullRows.push(row);
        }
    }

    for (let col = 0; col < n; col++) {
        let isFull = true;
        for (let row = 0; row < n; row++) {
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
 * 清除指定的行和列（原地修改 grid）
 */
export function clearLines(grid: number[][], rows: number[], cols: number[]): void {
    const n = gridDimension(grid);
    if (n === 0) return;

    for (const row of rows) {
        if (row >= 0 && row < n) {
            grid[row].fill(0);
        }
    }

    for (const col of cols) {
        if (col >= 0 && col < n) {
            for (let row = 0; row < n; row++) {
                grid[row][col] = 0;
            }
        }
    }
}

/**
 * 检查是否有任何形状可以放置在网格上
 */
export function canPlaceAnyShape(
    grid: number[][],
    shapes: Array<{ shape: number[][] }>
): boolean {
    const n = gridDimension(grid);
    if (n === 0) return false;

    for (const shapeObj of shapes) {
        const shape = normalizeShapeMatrix(shapeObj.shape);
        const sh = shape.length;
        const sw = shape[0]?.length ?? 0;
        for (let row = 0; row <= n - sh; row++) {
            for (let col = 0; col <= n - sw; col++) {
                if (canPlaceShape(grid, shape, row, col)) {
                    return true;
                }
            }
        }
    }
    return false;
}

/**
 * 创建空的 N×N 网格
 */
export function createEmptyGrid(size: number): number[][] {
    const n = Math.max(1, Math.floor(size));
    return Array.from({ length: n }, () => Array(n).fill(0));
}
