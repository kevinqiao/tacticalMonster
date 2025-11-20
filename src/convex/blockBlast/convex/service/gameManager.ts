import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "../_generated/server";
// 导入共享规则函数
import {
    canPlaceAnyShape,
    canPlaceShape,
    checkLines,
    clearLines,
    createEmptyGrid,
    placeShapeOnGrid
} from "../utils/gameRules";

// 形状定义 - 常见的1010游戏形状
const SHAPE_TEMPLATES: number[][][] = [
    // 单个方块
    [[1]],
    // L 形状
    [[1, 0], [1, 1]],
    [[1, 1], [0, 1]],
    [[0, 1], [1, 1]],
    [[1, 1], [1, 0]],
    // 直线
    [[1, 1]],
    [[1], [1]],
    [[1, 1, 1]],
    [[1], [1], [1]],
    // 方块
    [[1, 1], [1, 1]],
    // T 形状
    [[1, 1, 1], [0, 1, 0]],
    [[0, 1], [1, 1], [0, 1]],
    // Z 形状
    [[1, 1, 0], [0, 1, 1]],
    [[0, 1], [1, 1], [1, 0]],
];

interface Shape {
    id: string;
    shape: number[][];
    color: number;
}

interface GameState {
    _id?: string;
    gameId: string;
    grid: number[][];
    shapes: Shape[];
    nextShapes: Shape[];
    score: number;
    lines: number;
    status: number;
    moves: number;
    seed?: string;
    shapeCounter?: number; // 已生成的形状计数器（用于可重现性）
    lastUpdate?: number;
}

function createSeededRandom(seed: string | number): () => number {
    if (typeof seed === "number") {
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

/**
 * 生成基于 seed 的确定性 ID
 * 使用 seed 和索引生成可重现的 ID
 */
function generateDeterministicId(seed: string, index: number): string {
    // 使用 seed 和 index 生成哈希值
    let hash = 0;
    const seedStr = `${seed}-${index}`;
    for (let i = 0; i < seedStr.length; i++) {
        const char = seedStr.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    // 转换为正数并格式化为 UUID 格式
    const positiveHash = Math.abs(hash);
    return `${positiveHash.toString(16).padStart(8, '0')}-${(positiveHash * 2).toString(16).padStart(4, '0')}-${(positiveHash * 3).toString(16).padStart(4, '0')}-${(positiveHash * 4).toString(16).padStart(4, '0')}-${(positiveHash * 5).toString(16).padStart(12, '0')}`;
}

function generateShape(template: number[][], color: number, shapeIndex: number, seed?: string): Shape {
    return {
        id: seed ? generateDeterministicId(seed, shapeIndex) : crypto.randomUUID(),
        shape: template,
        color: color,
    };
}

/**
 * 生成形状列表
 * @param count 要生成的形状数量
 * @param seed 种子值（可选）
 * @param startIndex 起始索引（用于确保连续生成）
 * @returns 形状数组
 */
function generateShapes(count: number, seed?: string, startIndex: number = 0): Shape[] {
    const rng = seed ? createSeededRandom(seed) : Math.random;
    const shapes: Shape[] = [];

    // 如果使用 seed，需要跳过前面的随机数（用于连续生成）
    // 每个形状需要 2 个随机数：templateIndex 和 color
    // 所以需要跳过 startIndex * 2 个随机数
    if (seed && startIndex > 0) {
        for (let i = 0; i < startIndex * 2; i++) {
            rng(); // 跳过前面的随机数
        }
    }

    for (let i = 0; i < count; i++) {
        const templateIndex = Math.floor(rng() * SHAPE_TEMPLATES.length);
        const color = Math.floor(rng() * 7) + 1; // 1-7 颜色
        const shapeIndex = startIndex + i;
        shapes.push(generateShape(SHAPE_TEMPLATES[templateIndex], color, shapeIndex, seed));
    }
    return shapes;
}

// 规则函数已移至共享模块 ../utils/gameRules.ts

export class BlockBlastGameManager {
    private dbCtx: any;
    private game: GameState | null;

    constructor(dbCtx: any) {
        this.dbCtx = dbCtx;
        this.game = null;
    }

    async load(gameId: string): Promise<GameState | undefined> {
        const game = await this.dbCtx.db
            .query("blockBlast_game")
            .withIndex("by_gameId", (q: any) => q.eq("gameId", gameId))
            .unique();
        if (!game) return;

        this.game = { ...game, _creationTime: undefined } as GameState;
        return this.game;
    }

    async save(data: Partial<GameState>): Promise<void> {
        if (!this.game) return;

        if (data.grid) this.game.grid = data.grid;
        if (data.shapes !== undefined) this.game.shapes = data.shapes;
        if (data.nextShapes !== undefined) this.game.nextShapes = data.nextShapes;
        if (data.score !== undefined) this.game.score = data.score;
        if (data.lines !== undefined) this.game.lines = data.lines;
        if (data.status !== undefined) this.game.status = data.status;
        if (data.moves !== undefined) this.game.moves = data.moves;
        if (data.shapeCounter !== undefined) this.game.shapeCounter = data.shapeCounter;
        this.game.lastUpdate = Date.now();

        await this.dbCtx.db.patch(this.game._id, {
            grid: this.game.grid,
            shapes: this.game.shapes,
            nextShapes: this.game.nextShapes,
            score: this.game.score,
            lines: this.game.lines,
            status: this.game.status,
            moves: this.game.moves,
            shapeCounter: this.game.shapeCounter,
            lastUpdate: this.game.lastUpdate,
        });
    }

    async createGame(seed?: string, gameId?: string): Promise<GameState | null> {
        const normalizedSeed = seed !== undefined ? String(seed) : undefined;
        const grid = createEmptyGrid();
        // 使用连续索引确保可重现性
        // initialShapes: 索引 0-2, nextShapes: 索引 3-5
        const initialShapes = generateShapes(3, normalizedSeed, 0);
        const nextShapes = generateShapes(3, normalizedSeed, 3);

        const gameState: GameState = {
            gameId: gameId ?? `blockblast-${Date.now()}`,
            grid,
            shapes: initialShapes,
            nextShapes,
            score: 0,
            lines: 0,
            status: 0, // PLAYING
            moves: 0,
            seed: normalizedSeed,
            shapeCounter: 6, // 已生成 6 个形状（initialShapes: 0-2, nextShapes: 3-5）
            lastUpdate: Date.now(),
        };

        const gid = await this.dbCtx.db.insert("blockBlast_game", gameState);
        if (gid) {
            this.game = { ...gameState, _id: gid, _creationTime: undefined } as any;
            return this.game;
        }
        return null;
    }

    async placeShape(shapeId: string, row: number, col: number): Promise<{ ok: boolean, data?: any }> {
        if (!this.game) return { ok: false };

        const shapeIndex = this.game.shapes.findIndex(s => s.id === shapeId);
        if (shapeIndex === -1) return { ok: false, data: { error: "Shape not found" } };

        const shape = this.game.shapes[shapeIndex];
        if (!canPlaceShape(this.game.grid, shape.shape, row, col)) {
            return { ok: false, data: { error: "Cannot place shape" } };
        }

        // 放置形状
        placeShapeOnGrid(this.game.grid, shape.shape, shape.color, row, col);

        // 移除已使用的形状
        const newShapes = [...this.game.shapes];
        newShapes.splice(shapeIndex, 1);

        // 如果形状用完了，生成新的
        if (newShapes.length === 0) {
            newShapes.push(...this.game.nextShapes);
            // 使用 shapeCounter 作为起始索引，确保连续生成
            const nextStartIndex = this.game.shapeCounter ?? 6;
            this.game.nextShapes = generateShapes(3, this.game.seed, nextStartIndex);
            this.game.shapeCounter = nextStartIndex + 3; // 更新计数器
        }

        // 检查并清除满行/列
        const { rows, cols } = checkLines(this.game.grid);
        const clearedCount = rows.length + cols.length;
        if (clearedCount > 0) {
            clearLines(this.game.grid, rows, cols);
            this.game.lines += clearedCount;
            this.game.score += clearedCount * 10; // 每消除一行/列得10分
        }

        this.game.moves += 1;
        this.game.shapes = newShapes;

        // 检查游戏结束
        if (!canPlaceAnyShape(this.game.grid, this.game.shapes)) {
            this.game.status = 2; // LOST
        }

        await this.save({});
        return { ok: true, data: { grid: this.game.grid, shapes: this.game.shapes, score: this.game.score, lines: this.game.lines, status: this.game.status } };
    }

    async gameOver(): Promise<{ ok: boolean }> {
        if (!this.game) return { ok: false };
        await this.save({ status: 2 });
        return { ok: true };
    }
}

export const createGame = internalMutation({
    args: {
        seed: v.optional(v.string()),
        gameId: v.string(),
    },
    handler: async (ctx, { seed, gameId }) => {
        const gameManager = new BlockBlastGameManager(ctx);
        const game = await gameManager.createGame(seed, gameId);
        if (game) {
            return { ok: true, data: game };
        }
        return { ok: false };
    },
});

export const loadGame = query({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId }) => {
        const gameManager = new BlockBlastGameManager(ctx);
        try {
            const game = await gameManager.load(gameId);
            return { ok: true, data: game };
        } catch (error) {
            return { ok: false };
        }
    },
});

export const findGame = internalQuery({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId }) => {
        const gameManager = new BlockBlastGameManager(ctx);
        return await gameManager.load(gameId);
    },
});

export const placeShape = mutation({
    args: {
        gameId: v.string(),
        shapeId: v.string(),
        row: v.number(),
        col: v.number(),
    },
    handler: async (ctx, { gameId, shapeId, row, col }) => {
        const gameManager = new BlockBlastGameManager(ctx);
        await gameManager.load(gameId);
        return await gameManager.placeShape(shapeId, row, col);
    },
});

export const gameOver = mutation({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId }) => {
        const gameManager = new BlockBlastGameManager(ctx);
        await gameManager.load(gameId);
        return await gameManager.gameOver();
    },
});

export const findReport = query({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId }) => {
        const gameManager = new BlockBlastGameManager(ctx);
        const game = await gameManager.load(gameId);
        if (!game) return { ok: false };
        return {
            ok: true,
            data: {
                baseScore: game.score,
                linesBonus: game.lines * 5,
                movesPenalty: Math.max(0, 100 - game.moves),
                totalScore: game.score + game.lines * 5 + Math.max(0, 100 - game.moves),
            },
        };
    },
});

export const getGameStatus = query({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId }) => {
        const gameManager = new BlockBlastGameManager(ctx);
        const game = await gameManager.load(gameId);
        return { status: game?.status ?? -1 };
    },
});

export default BlockBlastGameManager;

