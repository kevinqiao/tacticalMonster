/**
 * Block Blast 类型：共享部分与 `convex/blockBlast/convex/types/BlockBlastTypes` 一致；
 * UI 专用字段在本文件扩展（与 solitaire 的 SoloTypes 在 convex、UI 扩展 同构）。
 */
import type {
    BlockBlastGridPreset,
    BlockBlastRule,
    GameModel as SharedGameModel,
    Shape as SharedShape,
} from '@/convex/blockBlast/convex/types/BlockBlastTypes';
import {
    ActMode,
    BLOCK_BLAST_DEFAULT_GRID_SIZE,
    BLOCK_BLAST_GRID_PRESETS,
    BlockBlastGameStatus,
    BlockBlastGridSize,
    GameInteractionPhase,
    inferGridSizeFromGrid,
    normalizeBlockBlastGridSize,
} from '@/convex/blockBlast/convex/types/BlockBlastTypes';

export {
    ActMode,
    BLOCK_BLAST_DEFAULT_GRID_SIZE,
    BLOCK_BLAST_GRID_PRESETS,
    BlockBlastGameStatus,
    BlockBlastGridSize,
    GameInteractionPhase,
    inferGridSizeFromGrid,
    normalizeBlockBlastGridSize,
};
export type { BlockBlastGridPreset, BlockBlastRule };

export interface Shape extends SharedShape {
    ele?: HTMLDivElement | null;
}

export type GameModel = SharedGameModel;

export interface BlockBlastGameState extends GameModel {
    reportElement?: HTMLDivElement | null;
}

export interface BlockBlastGameConfig {
    scoring: {
        lineScore: number;
        timeBonus: number;
        movePenalty: number;
    };
    /** 新建对局时棋盘边长（加载已有 gameId 时以存档为准） */
    gridSize?: BlockBlastGridSize;
    timeLimit?: number;
    maxMoves?: number;
}

export interface BoardDimension {
    left: number;
    top: number;
    width: number;
    height: number;
    /** 与 gameState.grid 边长一致，供命中检测与 ref 矩阵维度 */
    gridDimension: number;
    cellSize: number;
    spacing: number;
    gridPadding: number;
    grid: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    shapePreview: {
        x: number;
        y: number;
        /** `intrinsic`：竖屏时由内容撑开宽度（水平居中） */
        width: number | 'intrinsic';
        /** `intrinsic`：竖屏时由 hand/next 内容撑开高度 */
        height: number | 'intrinsic';
    };
}

export interface GameReport {
    gameId?: string;
    baseScore: number;
    linesBonus?: number;
    movesPenalty?: number;
    totalScore: number;
}

export interface ActionResult {
    ok: boolean;
    code?: number;
    message?: string;
    data?: {
        grid?: number[][];
        shapes?: Shape[];
        nextShapes?: Shape[];
        score?: number;
        lines?: number;
        status?: BlockBlastGameStatus;
        cleared?: { rows: number[]; cols: number[] };
        shapeCounter?: number;
    };
}

export enum ActionResultCode {
    SUCCESS = 0,
    FAIL = 1,
    INVALID_OPERATION = 2,
    NOT_FOUND = 3,
    CANNOT_PLACE = 4,
    OUT_OF_BOUNDS = 5,
}

export interface BlockBlastActionData {
    shape?: Shape;
    actModes?: ActMode[];
    position?: { row: number; col: number };
    offsetX?: number;
    offsetY?: number;
    lastPosition?: { x: number; y: number };
    pointerId?: number;
    maxDragFromStart?: number;
    status?: 'acting' | 'dragging' | 'dropping' | 'cancelled' | 'finished';
    dragGhostEl?: HTMLElement | null;
    dragGhostTransform?: string;
    /** Pointer-down tile in shape matrix (for WYSIWYG placement). */
    grabTile?: { row: number; col: number };
}

export const DEFAULT_GAME_CONFIG: BlockBlastGameConfig = {
    scoring: {
        lineScore: 10,
        timeBonus: 1,
        movePenalty: -1,
    },
    gridSize: BLOCK_BLAST_DEFAULT_GRID_SIZE,
};

export const SHAPE_COLORS = [
    '#FFE32A',
    '#FF2D8B',
    '#1EC8FF',
    '#FF3B4A',
    '#5EE14A',
    '#FF9A1A',
    '#D6E2F0',
];
