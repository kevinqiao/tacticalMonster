/**
 * Block Blast 游戏引擎：与 solitaire SoloGameEngine 同层，纯状态推进，供 GameManager / 前端复用。
 */
import {
    BLOCK_BLAST_DEFAULT_GRID_SIZE,
    BlockBlastGameStatus,
    BlockBlastGridSize,
    normalizeBlockBlastGridSize,
    type GameModel,
    type Shape,
} from '../types/BlockBlastTypes';
import {
    canPlaceAnyShape,
    canPlaceShape,
    checkLines,
    clearLines,
    createEmptyGrid,
    normalizeShapeMatrix,
    placeShapeOnGrid,
} from '../utils/gameRules';
import { pickWeightedShapeTemplate } from './blockBlastShapeCatalog';
import {
    computeBlockBlastStepScoreFromClear,
} from './blockBlastScoreModel';

export { SHAPE_TEMPLATES } from './blockBlastShapeCatalog';

function createSeededRandom(seed: string | number): () => number {
    if (typeof seed === 'number') {
        let a = seed;
        return function () {
            let t = (a += 0x6d2b79f5);
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
    let h = 1779033703 ^ seed.length;
    for (let i = 0; i < seed.length; i++) {
        h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
        h = (h << 13) | (h >>> 19);
    }
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    const hash = (h ^= h >>> 16) >>> 0;
    let a = hash;
    return function () {
        let t = (a += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** 部分环境（非 HTTPS、旧浏览器）无 `crypto.randomUUID`；Convex/浏览器共用 */
export function randomUuidCompat(): string {
    const c = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
    if (c && typeof c.randomUUID === 'function') {
        return c.randomUUID();
    }
    if (c && typeof c.getRandomValues === 'function') {
        const bytes = new Uint8Array(16);
        c.getRandomValues(bytes);
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }
    return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

export function generateDeterministicId(seed: string, index: number): string {
    let hash = 0;
    const seedStr = `${seed}-${index}`;
    for (let i = 0; i < seedStr.length; i++) {
        const char = seedStr.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
    }
    const positiveHash = Math.abs(hash);
    return `${positiveHash.toString(16).padStart(8, '0')}-${(positiveHash * 2).toString(16).padStart(4, '0')}-${(positiveHash * 3).toString(16).padStart(4, '0')}-${(positiveHash * 4).toString(16).padStart(4, '0')}-${(positiveHash * 5).toString(16).padStart(12, '0')}`;
}

export function generateShape(template: number[][], color: number, shapeIndex: number, seed?: string): Shape {
    return {
        id: seed ? generateDeterministicId(seed, shapeIndex) : randomUuidCompat(),
        shape: normalizeShapeMatrix(template.map((row) => [...row])),
        color,
    };
}

export function generateShapes(count: number, seed?: string, startIndex: number = 0): Shape[] {
    const rng = seed ? createSeededRandom(seed) : Math.random;
    const shapes: Shape[] = [];

    if (seed && startIndex > 0) {
        for (let i = 0; i < startIndex * 2; i++) {
            rng();
        }
    }

    for (let i = 0; i < count; i++) {
        const shapeIndex = startIndex + i;
        const template = pickWeightedShapeTemplate(rng, shapeIndex);
        const color = Math.floor(rng() * 7) + 1;
        shapes.push(generateShape(template, color, shapeIndex, seed));
    }
    return shapes;
}

export type PlaceShapeSuccess = {
    grid: number[][];
    shapes: Shape[];
    nextShapes: Shape[];
    score: number;
    lines: number;
    moves: number;
    status: BlockBlastGameStatus;
    shapeCounter?: number;
    cleared: { rows: number[]; cols: number[] };
};

export type ApplyPlaceShapeInput = Pick<
    GameModel,
    | 'grid'
    | 'gridSize'
    | 'shapes'
    | 'nextShapes'
    | 'score'
    | 'lines'
    | 'moves'
    | 'status'
    | 'seed'
    | 'shapeCounter'
>;

/** 落子并换手后、尚未检测/消除满行满列的盘面（与 `applyPlaceShape` 前半段同一实现） */
export type ThroughPlacementData = {
    grid: number[][];
    shapes: Shape[];
    nextShapes: Shape[];
    shapeCounter?: number;
};

export class BlockBlastGameEngine {
    /** 新开一局内存模型（写入 DB 由 GameManager 负责） */
    static createInitialGame(
        gameId: string,
        seed?: string,
        gridSizeArg?: BlockBlastGridSize | number
    ): Omit<GameModel, 'lastUpdate'> {
        const normalizedSeed = seed !== undefined ? String(seed) : undefined;
        const gridSize = normalizeBlockBlastGridSize(
            gridSizeArg ?? BLOCK_BLAST_DEFAULT_GRID_SIZE
        );
        const grid = createEmptyGrid(gridSize);
        const initialShapes = generateShapes(3, normalizedSeed, 0);
        const nextShapes = generateShapes(3, normalizedSeed, 3);

        return {
            gameId,
            gridSize,
            grid,
            shapes: initialShapes,
            nextShapes,
            score: 0,
            lines: 0,
            status: BlockBlastGameStatus.PLAYING,
            moves: 0,
            seed: normalizedSeed,
            shapeCounter: 6,
        };
    }

    /**
     * 落子 + 从手牌移除 + 必要时补牌；不执行满行/满列消除（供客户端消行动画前展示）。
     * 与 `applyPlaceShape` 共享同一套分支，避免与后端分叉。
     */
    static applyPlaceShapeThroughPlacement(
        game: ApplyPlaceShapeInput,
        shapeId: string,
        row: number,
        col: number
    ): { ok: true; data: ThroughPlacementData } | { ok: false; error: string } {
        const shapeIndex = game.shapes.findIndex((s) => s.id === shapeId);
        if (shapeIndex === -1) return { ok: false, error: 'Shape not found' };

        const placedShape = game.shapes[shapeIndex];
        if (!canPlaceShape(game.grid, placedShape.shape, row, col)) {
            return { ok: false, error: 'Cannot place shape' };
        }

        let shapeCounter = game.shapeCounter ?? 6;

        const grid = game.grid.map((r) => [...r]);
        placeShapeOnGrid(grid, placedShape.shape, placedShape.color, row, col);

        const newShapes = [...game.shapes];
        newShapes.splice(shapeIndex, 1);

        let nextShapes = [...game.nextShapes];

        if (newShapes.length === 0) {
            newShapes.push(...nextShapes);
            const nextStartIndex = shapeCounter;
            nextShapes = generateShapes(3, game.seed, nextStartIndex);
            shapeCounter = nextStartIndex + 3;
        }

        return {
            ok: true,
            data: {
                grid,
                shapes: newShapes,
                nextShapes,
                shapeCounter,
            },
        };
    }

    /** 一步落子：与 gameManager.placeShape 逻辑一致，不触碰持久化 */
    static applyPlaceShape(
        game: ApplyPlaceShapeInput,
        shapeId: string,
        row: number,
        col: number
    ): { ok: true; data: PlaceShapeSuccess } | { ok: false; error: string } {
        const phase = BlockBlastGameEngine.applyPlaceShapeThroughPlacement(game, shapeId, row, col);
        if (!phase.ok) return phase;

        const grid = phase.data.grid.map((r) => [...r]);
        const newShapes = phase.data.shapes;
        const nextShapes = phase.data.nextShapes;
        const shapeCounter = phase.data.shapeCounter;

        let score = game.score;
        let lines = game.lines;
        const gridSize =
            game.gridSize ??
            normalizeBlockBlastGridSize(game.grid.length || BLOCK_BLAST_DEFAULT_GRID_SIZE);
        const { rows, cols } = checkLines(grid);
        const clearedRows = [...rows];
        const clearedCols = [...cols];
        const clearedCount = clearedRows.length + clearedCols.length;
        if (clearedCount > 0) {
            clearLines(grid, clearedRows, clearedCols);
            lines += clearedCount;
            score += computeBlockBlastStepScoreFromClear(clearedRows, clearedCols, gridSize);
        }

        let status = game.status;
        const moves = game.moves + 1;

        if (!canPlaceAnyShape(grid, newShapes)) {
            status = BlockBlastGameStatus.LOST;
        }

        return {
            ok: true,
            data: {
                grid,
                shapes: newShapes,
                nextShapes,
                score,
                lines,
                moves,
                status,
                shapeCounter,
                cleared: { rows: clearedRows, cols: clearedCols },
            },
        };
    }
}
