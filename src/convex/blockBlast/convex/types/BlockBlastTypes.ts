/**
 * Block Blast 共享类型（Convex ↔ 前端）
 * DOM 字段（Shape.ele、战报 DOM）仅在前端文件中扩展。
 */

import type { BlockBlastGridSize } from './blockBlastGridConfig';

export type { BlockBlastGridPreset } from './blockBlastGridConfig';
export {
    BLOCK_BLAST_DEFAULT_GRID_SIZE,
    BlockBlastGridSize,
    BLOCK_BLAST_GRID_PRESETS,
    inferGridSizeFromGrid,
    isBlockBlastGridSize,
    normalizeBlockBlastGridSize,
} from './blockBlastGridConfig';

export enum BlockBlastGameStatus {
    PLAYING = 0,
    WON = 1,
    LOST = 2,
    COMPLETED = 3,
    CANCELLED = 4,
}

/** 客户端交互阶段（不写入 Convex game 文档），与 solitaire SoloTypes 对齐 */
export enum GameInteractionPhase {
    idle = 'idle',
    pointerDrag = 'pointerDrag',
    animating = 'animating',
}

export enum ActMode {
    DRAG = 'drag',
    CLICK = 'click',
}

/** 棋盘上的形状实例（无时序 DOM） */
export interface Shape {
    id: string;
    shape: number[][];
    color: number;
}

export interface GameModel {
    gameId: string;
    /** 正方形边长；缺省时由 `inferGridSizeFromGrid(grid)` 兼容旧数据 */
    gridSize?: BlockBlastGridSize;
    grid: number[][];
    shapes: Shape[];
    nextShapes: Shape[];
    score: number;
    lines: number;
    status: BlockBlastGameStatus;
    moves: number;
    seed?: string;
    shapeCounter?: number;
    lastUpdate?: number;
}

export interface BlockBlastRule {
    getActModes: (shape: Shape) => ActMode[];
    canPlaceShape: (shape: Shape, position: { row: number; col: number }) => boolean;
    findValidPositions: (shape: Shape) => { row: number; col: number }[];
    checkLines: () => { rows: number[]; cols: number[] };
    isGameOver: () => boolean;
    canPlaceAnyShape: () => boolean;
}
