import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "../_generated/server";
import {
    BlockBlastGameStatus,
    normalizeBlockBlastGridSize,
    type BlockBlastGridSize,
} from "../types/BlockBlastTypes";
import { BlockBlastGameEngine, randomUuidCompat } from "./BlockBlastGameEngine";
import {
    blockBlastLinesBonus,
    blockBlastMovesBonus,
    computeBlockBlastTotalScore,
} from "./blockBlastScoreModel";
import type { BlockBlastRecordedStep } from "./seedPool/blockBlastRecordedOpTypes";

/** 同 `gameId` 多行时取最新；`collect`+排序避免依赖 `.order().first()` 在重复索引上的 `unique` 异常 */
function latestBlockBlastGameRow<T extends { _creationTime: number }>(rows: T[]): T | undefined {
    if (rows.length === 0) return undefined;
    return [...rows].sort((a, b) => b._creationTime - a._creationTime)[0];
}

/**
 * 按 `gameId` 拉取局文档。避免 `withIndex("by_gameId", …)`：同一 `gameId` 存在多行时，
 * 部分环境下索引等值读会触发 `unique() query returned more than one result`。
 */
async function collectBlockBlastGamesByGameId(ctx: { db: any }, gameId: string): Promise<any[]> {
    return await ctx.db
        .query("blockBlast_game")
        .filter((q: any) => q.eq(q.field("gameId"), gameId))
        .collect();
}

/** 保留最新一行并删除同 `gameId` 的其余行 */
async function healDuplicateBlockBlastGamesForGameId(ctx: { db: any }, gameId: string): Promise<void> {
    const rows = await collectBlockBlastGamesByGameId(ctx, gameId);
    if (rows.length <= 1) return;
    const sorted = [...rows].sort((a, b) => b._creationTime - a._creationTime);
    for (const r of sorted.slice(1)) {
        await ctx.db.delete(r._id);
    }
}

/**
 * 供 `proxy/controller` action：单事务内去重后返回当前局（不再走 internalQuery，避免索引路径 `unique`）。
 */
export const loadGameRowAfterHeal = internalMutation({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId }) => {
        await healDuplicateBlockBlastGamesForGameId(ctx, gameId);
        const rows = await collectBlockBlastGamesByGameId(ctx, gameId);
        const game = latestBlockBlastGameRow(rows);
        if (!game) return null;
        return { ...game, _creationTime: undefined };
    },
});

/** 休闲再战：删除同 `gameId` 的局文档 */
export const deleteCasualGameForReplay = internalMutation({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId }) => {
        const rows = await collectBlockBlastGamesByGameId(ctx, gameId);
        for (const row of rows) {
            await ctx.db.delete(row._id);
        }
        return { ok: true as const, deleted: rows.length };
    },
});

interface Shape {
    id: string;
    shape: number[][];
    color: number;
}

interface GameState {
    _id?: string;
    gameId: string;
    gridSize?: BlockBlastGridSize;
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
    recordedOps?: BlockBlastRecordedStep[];
    lastOpAt?: number;
}

/** 追加一条回放步骤；自动用 `lastOpAt` 估算 pacingMs（对齐 solitaireArena appendRecordedStep） */
function appendRecordedStep(game: GameState, step: BlockBlastRecordedStep): void {
    const now = Date.now();
    const pacingMs =
        step.pacingMs ??
        (game.lastOpAt != null ? Math.max(50, now - game.lastOpAt) : undefined);
    const withPacing =
        pacingMs != null && step.pacingMs == null ? { ...step, pacingMs } : step;
    game.recordedOps = [...(game.recordedOps ?? []), withPacing];
    game.lastOpAt = now;
}

export class BlockBlastGameManager {
    private dbCtx: any;
    private game: GameState | null;

    constructor(dbCtx: any) {
        this.dbCtx = dbCtx;
        this.game = null;
    }

    async load(gameId: string): Promise<GameState | undefined> {
        const rows = await collectBlockBlastGamesByGameId(this.dbCtx, gameId);
        const game = latestBlockBlastGameRow(rows);
        if (!game) return;

        this.game = { ...game, _creationTime: undefined, recordedOps: game.recordedOps ?? [] } as GameState;
        return this.game;
    }

    async save(data: Partial<GameState>): Promise<void> {
        if (!this.game) return;

        if (data.grid) this.game.grid = data.grid;
        if (data.gridSize !== undefined) this.game.gridSize = data.gridSize;
        if (data.shapes !== undefined) this.game.shapes = data.shapes;
        if (data.nextShapes !== undefined) this.game.nextShapes = data.nextShapes;
        if (data.score !== undefined) this.game.score = data.score;
        if (data.lines !== undefined) this.game.lines = data.lines;
        if (data.status !== undefined) this.game.status = data.status;
        if (data.moves !== undefined) this.game.moves = data.moves;
        if (data.shapeCounter !== undefined) this.game.shapeCounter = data.shapeCounter;
        if (data.recordedOps !== undefined) this.game.recordedOps = data.recordedOps;
        if (data.lastOpAt !== undefined) this.game.lastOpAt = data.lastOpAt;
        if (this.game.recordedOps === undefined) this.game.recordedOps = [];
        this.game.lastUpdate = Date.now();

        const patch: Record<string, unknown> = {
            grid: this.game.grid,
            gridSize: this.game.gridSize,
            shapes: this.game.shapes,
            nextShapes: this.game.nextShapes,
            score: this.game.score,
            lines: this.game.lines,
            status: this.game.status,
            moves: this.game.moves,
            shapeCounter: this.game.shapeCounter,
            lastUpdate: this.game.lastUpdate,
            recordedOps: this.game.recordedOps,
        };
        if (this.game.lastOpAt != null) {
            patch.lastOpAt = this.game.lastOpAt;
        }
        await this.dbCtx.db.patch(this.game._id, patch);
    }

    async createGame(
        seed?: string,
        gameId?: string,
        gridSizeArg?: BlockBlastGridSize | number
    ): Promise<GameState | null> {
        const normalizedSeed = seed !== undefined ? String(seed) : undefined;
        const gridSize = normalizeBlockBlastGridSize(gridSizeArg);
        const base = BlockBlastGameEngine.createInitialGame(
            gameId ?? `blockblast-${Date.now()}`,
            normalizedSeed,
            gridSize
        );
        const gameState: GameState = {
            ...base,
            lastUpdate: Date.now(),
            recordedOps: [],
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

        /** 落子前手牌中的槽位（与确定性重放盘面同序）；apply 后 shapes 会变，故先取 */
        const slot = this.game.shapes.findIndex((s) => s.id === shapeId);

        const res = BlockBlastGameEngine.applyPlaceShape(
            {
                grid: this.game.grid,
                gridSize: this.game.gridSize,
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

        if (slot >= 0) {
            appendRecordedStep(this.game, { op: "place", slot, row, col });
        }

        await this.save({
            recordedOps: this.game.recordedOps,
            lastOpAt: this.game.lastOpAt,
        });
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

    /** 玩家主动结束：标记放弃，保留当前分数供上报（对齐 solitaireArena `concedeGame`） */
    async concedeGame(): Promise<
        | { ok: true; score: number; lines: number; moves: number; gameStatus: number }
        | { ok: false }
    > {
        if (!this.game) return { ok: false };
        const st = this.game.status;
        if (st !== BlockBlastGameStatus.PLAYING) {
            return {
                ok: true,
                score: this.game.score,
                lines: this.game.lines,
                moves: this.game.moves,
                gameStatus: st,
            };
        }
        appendRecordedStep(this.game, { op: "concede" });
        await this.save({ status: BlockBlastGameStatus.CANCELLED });
        return {
            ok: true,
            score: this.game.score,
            lines: this.game.lines,
            moves: this.game.moves,
            gameStatus: BlockBlastGameStatus.CANCELLED,
        };
    }
}

export const createGame = internalMutation({
    args: {
        seed: v.optional(v.string()),
        gameId: v.string(),
        gridSize: v.optional(v.number()),
    },
    handler: async (ctx, { seed, gameId, gridSize }) => {
        await healDuplicateBlockBlastGamesForGameId(ctx, gameId);
        const rows = await collectBlockBlastGamesByGameId(ctx, gameId);
        const keep = latestBlockBlastGameRow(rows);
        if (keep) {
            return { ok: true as const, data: { ...keep, _creationTime: undefined } };
        }
        const gameManager = new BlockBlastGameManager(ctx);
        const game = await gameManager.createGame(seed, gameId, gridSize);
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
        gridSize: v.optional(v.number()),
    },
    handler: async (ctx, { seed, gameId: requestedId, gridSize }) => {
        const gameId =
            requestedId && String(requestedId).length > 0
                ? String(requestedId)
                : randomUuidCompat();
        await healDuplicateBlockBlastGamesForGameId(ctx, gameId);
        const rows = await collectBlockBlastGamesByGameId(ctx, gameId);
        const keep = latestBlockBlastGameRow(rows);
        if (keep) {
            return { ok: true as const, gameId, data: keep };
        }
        const gameManager = new BlockBlastGameManager(ctx);
        const game = await gameManager.createGame(
            seed !== undefined ? String(seed) : undefined,
            gameId,
            gridSize !== undefined ? normalizeBlockBlastGridSize(gridSize) : undefined
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
        await healDuplicateBlockBlastGamesForGameId(ctx, gameId);
        const gameManager = new BlockBlastGameManager(ctx);
        await gameManager.load(gameId);
        return await gameManager.placeShape(shapeId, row, col);
    },
});

export const gameOver = mutation({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId }) => {
        await healDuplicateBlockBlastGamesForGameId(ctx, gameId);
        const gameManager = new BlockBlastGameManager(ctx);
        await gameManager.load(gameId);
        return await gameManager.gameOver();
    },
});

export const concedeGame = mutation({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId }) => {
        await healDuplicateBlockBlastGamesForGameId(ctx, gameId);
        const gameManager = new BlockBlastGameManager(ctx);
        await gameManager.load(gameId);
        return await gameManager.concedeGame();
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
                linesBonus: blockBlastLinesBonus(game.lines),
                movesPenalty: blockBlastMovesBonus(game.moves),
                totalScore: computeBlockBlastTotalScore(game.score, game.lines, game.moves),
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

/** 回放/复盘：返回某局录制的落子序列（对齐 solitaireArena getRecordedOps） */
export const getRecordedOps = query({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId }) => {
        const rows = await collectBlockBlastGamesByGameId(ctx, gameId);
        const row = latestBlockBlastGameRow(rows);
        if (!row) {
            return { ok: false as const, error: "not_found" as const };
        }
        return {
            ok: true as const,
            gameId: row.gameId,
            seedId: row.seed,
            steps: row.recordedOps ?? [],
            score: row.score,
            moves: row.moves,
            status: row.status,
        };
    },
});

export default BlockBlastGameManager;

