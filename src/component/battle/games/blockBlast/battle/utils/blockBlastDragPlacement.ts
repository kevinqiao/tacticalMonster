import type { BoardDimension, Shape } from '../types/BlockBlastTypes';
import { SHAPE_COLORS } from '../types/BlockBlastTypes';
import { getBlockTileSurfaceStyle } from './blockTileStyle';

export type GridCellMatrix = (HTMLElement | null)[][];

export type GrabTile = { row: number; col: number };

export type PlacementCell = { row: number; col: number };

export function firstFilledTile(shapeMatrix: number[][]): GrabTile {
    for (let r = 0; r < shapeMatrix.length; r++) {
        for (let c = 0; c < (shapeMatrix[r]?.length ?? 0); c++) {
            if (shapeMatrix[r]![c] === 1) return { row: r, col: c };
        }
    }
    return { row: 0, col: 0 };
}

export function createBoardSizedDragGhost(shape: Shape, dim: BoardDimension): HTMLElement {
    const cellSize = dim.cellSize;
    const gap = dim.spacing;
    const matrix = shape.shape;
    const rows = matrix.length;
    const cols = matrix[0]?.length ?? 0;
    const tileStyle = getBlockTileSurfaceStyle(SHAPE_COLORS[shape.color - 1] || '#D6E2F0');

    const root = document.createElement('div');
    root.className = 'blockblast-shape blockblast-shape--drag-ghost';
    root.dataset.boardCellSize = String(cellSize);
    root.style.display = 'grid';
    root.style.gridTemplateColumns = `repeat(${cols}, ${cellSize}px)`;
    root.style.gridTemplateRows = `repeat(${rows}, ${cellSize}px)`;
    root.style.gap = `${gap}px`;
    root.style.padding = '0';
    root.style.margin = '0';
    root.style.background = 'transparent';
    root.style.border = 'none';
    root.style.boxShadow = 'none';
    root.style.borderRadius = '0';
    root.style.boxSizing = 'border-box';

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < (matrix[r]?.length ?? 0); c++) {
            const cell = document.createElement('div');
            cell.dataset.shapeRow = String(r);
            cell.dataset.shapeCol = String(c);
            cell.style.width = `${cellSize}px`;
            cell.style.height = `${cellSize}px`;
            cell.style.boxSizing = 'border-box';
            if (matrix[r]![c] === 1) {
                cell.className = 'blockblast-tile';
                if (tileStyle.background) cell.style.background = String(tileStyle.background);
                if (tileStyle.boxShadow) cell.style.boxShadow = String(tileStyle.boxShadow);
                if (tileStyle.borderRadius != null) {
                    cell.style.borderRadius =
                        typeof tileStyle.borderRadius === 'number'
                            ? `${tileStyle.borderRadius}px`
                            : String(tileStyle.borderRadius);
                }
                if (tileStyle.border) cell.style.border = String(tileStyle.border);
            } else {
                cell.setAttribute('aria-hidden', 'true');
            }
            root.appendChild(cell);
        }
    }
    return root;
}

export function resolveShapeRoot(flyEl: HTMLElement): HTMLElement {
    if (flyEl.classList.contains('blockblast-shape')) return flyEl;
    return (flyEl.querySelector('.blockblast-shape') as HTMLElement | null) ?? flyEl;
}

export function tileElement(root: HTMLElement, row: number, col: number): HTMLElement | null {
    return root.querySelector(
        `[data-shape-row="${row}"][data-shape-col="${col}"]`
    ) as HTMLElement | null;
}

export function positionGhostFromGrabTile(
    ghost: HTMLElement,
    previewRoot: HTMLElement,
    grabTile: GrabTile
): void {
    const previewTile = tileElement(previewRoot, grabTile.row, grabTile.col) ?? previewRoot;
    const pRect = previewTile.getBoundingClientRect();

    ghost.style.position = 'fixed';
    ghost.style.left = '0px';
    ghost.style.top = '0px';
    ghost.style.transform = 'none';
    void ghost.offsetHeight;

    const ghostTile = tileElement(ghost, grabTile.row, grabTile.col) ?? ghost;
    const gRect = ghost.getBoundingClientRect();
    const gtRect = ghostTile.getBoundingClientRect();
    const tileOffsetX = gtRect.left - gRect.left;
    const tileOffsetY = gtRect.top - gRect.top;

    ghost.style.left = `${Math.round(pRect.left - tileOffsetX)}px`;
    ghost.style.top = `${Math.round(pRect.top - tileOffsetY)}px`;
}

function tileCenter(el: HTMLElement): { x: number; y: number } {
    const br = el.getBoundingClientRect();
    return { x: (br.left + br.right) / 2, y: (br.top + br.bottom) / 2 };
}

export function nearestGridCellAtPoint(
    clientX: number,
    clientY: number,
    gridRefs: { current: GridCellMatrix | null }
): { row: number; col: number } | undefined {
    const matrix = gridRefs.current;
    if (!matrix) return undefined;
    const n = matrix.length;
    let best: { row: number; col: number; dist: number } | undefined;

    for (let row = 0; row < n; row++) {
        for (let col = 0; col < n; col++) {
            const cel = matrix[row]?.[col];
            if (!cel) continue;
            const cr = cel.getBoundingClientRect();
            const cx = (cr.left + cr.right) / 2;
            const cy = (cr.top + cr.bottom) / 2;
            const dist = Math.hypot(clientX - cx, clientY - cy);
            if (!best || dist < best.dist) {
                best = { row, col, dist };
            }
        }
    }
    if (!best) return undefined;
    const sample = matrix[best.row]?.[best.col];
    const cellW = sample?.getBoundingClientRect().width ?? 0;
    if (cellW > 0 && best.dist > cellW * 0.65) return undefined;
    return { row: best.row, col: best.col };
}

function originFromTileHit(
    tileRow: number,
    tileCol: number,
    hit: { row: number; col: number }
): PlacementCell {
    return { row: hit.row - tileRow, col: hit.col - tileCol };
}

/** Estimate matrix origin from ghost; prefers grab tile, then majority of filled tiles. */
export function visualHintFromGhost(
    flyEl: HTMLElement,
    shapeMatrix: number[][],
    gridRefs: { current: GridCellMatrix | null },
    grabTile?: GrabTile
): PlacementCell | undefined {
    const root = resolveShapeRoot(flyEl);
    const candidates: PlacementCell[] = [];

    const tryTile = (tileRow: number, tileCol: number, tileEl: HTMLElement) => {
        const center = tileCenter(tileEl);
        const hit = nearestGridCellAtPoint(center.x, center.y, gridRefs);
        if (hit) candidates.push(originFromTileHit(tileRow, tileCol, hit));
    };

    if (grabTile) {
        const grabEl = tileElement(root, grabTile.row, grabTile.col);
        if (grabEl?.classList.contains('blockblast-tile')) {
            tryTile(grabTile.row, grabTile.col, grabEl);
        }
    }

    for (let r = 0; r < shapeMatrix.length; r++) {
        for (let c = 0; c < (shapeMatrix[r]?.length ?? 0); c++) {
            if (shapeMatrix[r]![c] !== 1) continue;
            const tileEl = root.querySelector(
                `.blockblast-tile[data-shape-row="${r}"][data-shape-col="${c}"]`
            ) as HTMLElement | null;
            if (tileEl) tryTile(r, c, tileEl);
        }
    }

    if (candidates.length === 0) return undefined;

    const key = (o: PlacementCell) => `${o.row},${o.col}`;
    const counts = new Map<string, { origin: PlacementCell; n: number }>();
    for (const o of candidates) {
        const k = key(o);
        const cur = counts.get(k);
        if (cur) cur.n += 1;
        else counts.set(k, { origin: o, n: 1 });
    }
    let best: { origin: PlacementCell; n: number } | undefined;
    for (const entry of counts.values()) {
        if (!best || entry.n > best.n) best = entry;
    }
    return best?.origin;
}

function manhattan(a: PlacementCell, b: PlacementCell): number {
    return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

/**
 * Pointer-up only: use visual hint; if off by ≤1 cell, nudge to nearest legal origin.
 * Does NOT scan all valid positions (avoids snapping to unrelated holes).
 */
export function resolvePlacementOnRelease(
    flyEl: HTMLElement,
    shapeMatrix: number[][],
    gridRefs: { current: GridCellMatrix | null },
    grabTile: GrabTile | undefined,
    canPlaceAt: (origin: PlacementCell) => boolean
): PlacementCell | undefined {
    const hint = visualHintFromGhost(flyEl, shapeMatrix, gridRefs, grabTile);
    if (!hint) return undefined;
    if (canPlaceAt(hint)) return hint;

    let best: PlacementCell | undefined;
    let bestD = Infinity;
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const cand = { row: hint.row + dr, col: hint.col + dc };
            if (!canPlaceAt(cand)) continue;
            const d = manhattan(cand, hint);
            if (d < bestD) {
                bestD = d;
                best = cand;
            }
        }
    }
    return best;
}

export function snapGhostToPlacementOrigin(
    flyEl: HTMLElement,
    placement: PlacementCell,
    gridRefs: { current: GridCellMatrix | null }
): void {
    const root = resolveShapeRoot(flyEl);
    const originCell = tileElement(root, 0, 0);
    const target = gridRefs.current?.[placement.row]?.[placement.col];
    if (!originCell || !target) return;

    const o = originCell.getBoundingClientRect();
    const t = target.getBoundingClientRect();
    const dx = t.left - o.left;
    const dy = t.top - o.top;
    const left = Number.parseFloat(flyEl.style.left || '0');
    const top = Number.parseFloat(flyEl.style.top || '0');
    flyEl.style.left = `${Math.round(left + dx)}px`;
    flyEl.style.top = `${Math.round(top + dy)}px`;
}

export function readGrabTileFromPointer(event: { target: EventTarget | null }): GrabTile | undefined {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return undefined;
    const tile = target.closest('.blockblast-tile') as HTMLElement | null;
    if (!tile) return undefined;
    const row = Number.parseInt(tile.dataset.shapeRow ?? '', 10);
    const col = Number.parseInt(tile.dataset.shapeCol ?? '', 10);
    if (!Number.isFinite(row) || !Number.isFinite(col)) return undefined;
    return { row, col };
}
