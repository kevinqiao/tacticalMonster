/**
 * Block Blast 游戏类型定义
 * 基于 solitaireSolo 的架构模式
 */

export enum BlockBlastGameStatus {
    PLAYING = 0,
    WON = 1,
    LOST = 2,
    COMPLETED = 3,
    CANCELLED = 4,
}

export enum ActionStatus {
    IDLE = 'idle',
    ACTING = 'acting',
    DROPPING = 'dropping',
}

export enum ActMode {
    DRAG = 'drag',
    CLICK = 'click',
}

export interface Shape {
    id: string;
    shape: number[][]; // 形状矩阵，1=有块，0=空
    color: number; // 颜色索引
    ele?: HTMLDivElement | null;
}

export interface GameModel {
    gameId: string;
    grid: number[][]; // 10x10 网格，0=空，1-7=颜色
    shapes: Shape[]; // 当前可用形状
    nextShapes: Shape[]; // 下一批形状
    score: number;
    lines: number;
    status: BlockBlastGameStatus;
    moves: number;
    seed?: string;
    lastUpdate?: number;
}

export interface BlockBlastGameState extends GameModel {
    actionStatus: ActionStatus;
    reportElement?: HTMLDivElement | null;
}

export interface BlockBlastGameConfig {
    scoring: {
        lineScore: number; // 消除一行/列的得分
        timeBonus: number; // 时间奖励
        movePenalty: number; // 移动惩罚
    };
    timeLimit?: number; // 时间限制（秒）
    maxMoves?: number; // 最大移动次数
}

export interface BoardDimension {
    left: number;
    top: number;
    width: number;
    height: number;
    cellSize: number;
    spacing: number;
    grid: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    shapePreview: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}

export interface GameReport {
    gameId: string;
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
        score?: number;
        lines?: number;
        status?: BlockBlastGameStatus;
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

// 游戏规则相关
export interface BlockBlastRule {
    canPlaceShape: (shape: Shape, position: { row: number, col: number }) => boolean;
    findValidPositions: (shape: Shape) => { row: number, col: number }[];
    checkLines: () => { rows: number[], cols: number[] };
    isGameOver: () => boolean;
    canPlaceAnyShape: () => boolean;
}

export interface BlockBlastActionData {
    shape?: Shape;
    position?: { row: number, col: number };
    offsetX?: number;
    offsetY?: number;
    lastPosition?: { x: number; y: number };
    status?: 'acting' | 'dragging' | 'dropping' | 'cancelled' | 'finished';
}

export const DEFAULT_GAME_CONFIG: BlockBlastGameConfig = {
    scoring: {
        lineScore: 10,
        timeBonus: 1,
        movePenalty: -1,
    },
};

// 颜色定义
export const SHAPE_COLORS = [
    '#FF6B6B', // 红色
    '#4ECDC4', // 青色
    '#45B7D1', // 蓝色
    '#96CEB4', // 绿色
    '#FFEAA7', // 黄色
    '#DDA15E', // 橙色
    '#A29BFE', // 紫色
];

