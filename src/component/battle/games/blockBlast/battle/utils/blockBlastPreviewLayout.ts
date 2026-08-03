/** 待选区布局：按槽位尺寸为每块形状计算 preview cellSize，避免 I5 / 大 L 溢出。 */

export type PreviewSlotSize = { width: number; height: number };

export function shapeMatrixBounds(matrix: number[][]): { rows: number; cols: number } {
    return { rows: matrix.length, cols: matrix[0]?.length ?? 0 };
}

/** 单块在槽位内可容纳的最大 cellSize（像素）。 */
export function fitPreviewCellSizeForShape(
    matrix: number[][],
    slot: PreviewSlotSize,
    gridGap: number,
    minCell: number,
    maxCell: number
): number {
    const { rows, cols } = shapeMatrixBounds(matrix);
    if (rows <= 0 || cols <= 0) return minCell;

    const cellFromW = (slot.width - gridGap * Math.max(0, cols - 1)) / cols;
    const cellFromH = (slot.height - gridGap * Math.max(0, rows - 1)) / rows;
    const fit = Math.floor(Math.min(cellFromW, cellFromH));
    if (!Number.isFinite(fit) || fit <= 0) return minCell;
    return Math.max(minCell, Math.min(maxCell, fit));
}

const SCROLL_PAD_PX = 16;
const SHAPE_GAP_PX = 8;
const HAND_COUNT = 3;

/** 单行三槽（竖向布局）：按预览区宽高等分槽位 */
export function computeHandPreviewSlots(
    containerWidth: number,
    containerHeight: number
): PreviewSlotSize[] {
    const innerW = Math.max(1, containerWidth - SCROLL_PAD_PX);
    const innerH = Math.max(1, containerHeight - SCROLL_PAD_PX);

    const slotW = Math.max(1, (innerW - SHAPE_GAP_PX * (HAND_COUNT - 1)) / HAND_COUNT);
    const slotH = innerH;

    return Array.from({ length: HAND_COUNT }, () => ({ width: slotW, height: slotH }));
}

export function previewCellSizeCap(boardCellSize: number): number {
    return Math.max(22, Math.min(44, Math.floor(boardCellSize * 0.85)));
}
