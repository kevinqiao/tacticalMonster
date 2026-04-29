import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "../_generated/server";
import { BlockBlastGameEngine } from "./BlockBlastGameEngine";

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
        const base = BlockBlastGameEngine.createInitialGame(
            gameId ?? `blockblast-${Date.now()}`,
            normalizedSeed
        );
        const gameState: GameState = {
            ...base,
            lastUpdate: Date.now(),
        } as GameState;

        const gid = await this.dbCtx.db.insert("blockBlast_game", gameState);
        if (gid) {
            this.game = { ...gameState, _id: gid, _creationTime: undefined } as any;
            return this.game;
        }
        return null;
    }

    async placeShape(shapeId: string, row: number, col: number): Promise<{ ok: boolean, data?: any }> {
        if (!this.game) return { ok: false };

        const res = BlockBlastGameEngine.applyPlaceShape(
            {
                grid: this.game.grid,
                shapes: this.game.shapes,
                nextShapes: this.game.nextShapes,
                score: this.game.score,
                lines: this.game.lines,
                moves: this.game.moves,
                status: this.game.status,
                seed: this.game.seed,
                shapeCounter: this.game.shapeCounter,
            },
            shapeId,
            row,
            col
        );
        if (!res.ok) {
            return { ok: false, data: { error: res.error } };
        }

        this.game.grid = res.data.grid;
        this.game.shapes = res.data.shapes;
        this.game.nextShapes = res.data.nextShapes;
        this.game.score = res.data.score;
        this.game.lines = res.data.lines;
        this.game.moves = res.data.moves;
        this.game.status = res.data.status;
        this.game.shapeCounter = res.data.shapeCounter;

        await this.save({});
        return {
            ok: true,
            data: {
                grid: this.game.grid,
                shapes: this.game.shapes,
                nextShapes: this.game.nextShapes,
                score: this.game.score,
                lines: this.game.lines,
                status: this.game.status,
                shapeCounter: this.game.shapeCounter,
                cleared: res.data.cleared,
            },
        };
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

/** 客户端直接开新局（不依赖锦标赛 proxy）；与 internal createGame 一致 */
export const createBlockBlastGame = mutation({
    args: {
        seed: v.optional(v.string()),
        gameId: v.optional(v.string()),
    },
    handler: async (ctx, { seed, gameId: requestedId }) => {
        const gameId =
            requestedId && String(requestedId).length > 0
                ? String(requestedId)
                : crypto.randomUUID();
        const gameManager = new BlockBlastGameManager(ctx);
        const game = await gameManager.createGame(
            seed !== undefined ? String(seed) : undefined,
            gameId
        );
        if (!game) {
            return { ok: false as const };
        }
        return { ok: true as const, gameId, data: game };
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
                gameId,
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

