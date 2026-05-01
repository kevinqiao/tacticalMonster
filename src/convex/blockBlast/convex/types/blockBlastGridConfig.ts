/**
 * 棋盘规格：锦标赛 / 开局可通过枚举选择，与持久化字段 `gridSize` 对齐。
 */

export enum BlockBlastGridSize {
    Grid8 = 8,
    Grid9 = 9,
    Grid10 = 10,
}

/** 未传入 gridSize、值非法或无法从盘面推断时的默认边长 */
export const BLOCK_BLAST_DEFAULT_GRID_SIZE = BlockBlastGridSize.Grid8;

export interface BlockBlastGridPreset {
    /** 与枚举值相同，便于 UI 展示 */
    dimension: BlockBlastGridSize;
    label: string;
    shortLabel: string;
}

/** 枚举 → 展示与赛事文案（可扩展 tournamentId → gridSize 映射） */
export const BLOCK_BLAST_GRID_PRESETS: Record<BlockBlastGridSize, BlockBlastGridPreset> = {
    [BlockBlastGridSize.Grid8]: {
        dimension: BlockBlastGridSize.Grid8,
        label: '8×8',
        shortLabel: '8',
    },
    [BlockBlastGridSize.Grid9]: {
        dimension: BlockBlastGridSize.Grid9,
        label: '9×9',
        shortLabel: '9',
    },
    [BlockBlastGridSize.Grid10]: {
        dimension: BlockBlastGridSize.Grid10,
        label: '10×10',
        shortLabel: '10',
    },
};

const ALLOWED = new Set<number>([
    BlockBlastGridSize.Grid8,
    BlockBlastGridSize.Grid9,
    BlockBlastGridSize.Grid10,
]);

export function isBlockBlastGridSize(n: number): n is BlockBlastGridSize {
    return ALLOWED.has(n);
}

export function normalizeBlockBlastGridSize(raw: unknown): BlockBlastGridSize {
    const n = typeof raw === 'number' ? raw : Number(raw);
    if (isBlockBlastGridSize(n)) return n;
    return BLOCK_BLAST_DEFAULT_GRID_SIZE;
}

/** 旧存档无 gridSize 时，由盘面边长推断 */
export function inferGridSizeFromGrid(grid: number[][] | undefined | null): BlockBlastGridSize {
    const n = grid?.length;
    if (typeof n === 'number' && isBlockBlastGridSize(n)) {
        const row0 = grid![0];
        if (Array.isArray(row0) && row0.length === n) return n;
    }
    return BLOCK_BLAST_DEFAULT_GRID_SIZE;
}
