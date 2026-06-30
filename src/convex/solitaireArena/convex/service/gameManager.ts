import { v } from "convex/values";

import { internal } from "../_generated/api";
import { internalMutation, internalQuery, mutation, query } from "../_generated/server";
import { parseCasualRunGameId } from "./casualGameLifecycle";
import {
    Card,
    GameInteractionPhase,
    SoloGameState,
    SoloGameStatus,
    ZoneType,
} from "../types/SoloTypes";
import { createZones, SoloGameEngine } from "./SoloGameEngine";
import { SoloRuleManager } from "./SoloRuleManager";
import {
    buildSolitaireCashGameReport,
    scoreDeltaForDraw,
    scoreDeltaForMove,
    scoreDeltaForRecycle,
    SOLITAIRE_MATCH_TIME_LIMIT_SEC,
} from "./seedPool/solitaireScoring";
import { toClientCardPatches, toClientGameState } from "./clientCardView";
import type {
    SolitaireRank,
    SolitaireRecordedStep,
    SolitaireSuit,
} from "./seedPool/solitaireRecordedOpTypes";

/** 同 `gameId` 多行时取最新 */
function latestSolitaireGameRow<T extends { _creationTime: number }>(rows: T[]): T | undefined {
    if (rows.length === 0) return undefined;
    return [...rows].sort((a, b) => b._creationTime - a._creationTime)[0];
}

async function collectSolitaireGamesByGameId(ctx: { db: any }, gameId: string): Promise<any[]> {
    return await ctx.db
        .query("game")
        .withIndex("by_gameId", (q: any) => q.eq("gameId", gameId))
        .collect();
}

async function healDuplicateSolitaireGamesForGameId(ctx: { db: any }, gameId: string): Promise<void> {
    const rows = await collectSolitaireGamesByGameId(ctx, gameId);
    if (rows.length <= 1) return;
    const sorted = [...rows].sort((a, b) => b._creationTime - a._creationTime);
    for (const r of sorted.slice(1)) {
        await ctx.db.delete(r._id);
    }
}

async function scheduleSolitaireCasualTimeout(
    ctx: { db: any; scheduler: any },
    gameId: string,
    gameRowId: string
): Promise<void> {
    if (!gameId.startsWith("game_")) return;
    const parsed = parseCasualRunGameId(gameId);
    if (!parsed?.uid || !gameRowId) return;
    const now = Date.now();
    const dueTime = now + SOLITAIRE_MATCH_TIME_LIMIT_SEC * 1000;
    try {
        const jobId = await ctx.scheduler.runAfter(
            SOLITAIRE_MATCH_TIME_LIMIT_SEC * 1000,
            internal.service.casualGameTimeoutAction.checkCasualGameTimeoutAndIngest,
            { gameRowId, gameId, uid: parsed.uid }
        );
        await ctx.db.patch(gameRowId, {
            dueTime,
            casualTimeoutScheduledId: jobId,
        });
    } catch (scheduleErr) {
        console.warn("[solitaire] casual timeout schedule failed", gameId, scheduleErr);
    }
}

/** 供 `proxy/controller` action：单事务内去重后返回当前局 */
export const loadGameRowAfterHeal = internalMutation({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId }) => {
        await healDuplicateSolitaireGamesForGameId(ctx, gameId);
        const rows = await collectSolitaireGamesByGameId(ctx, gameId);
        const game = latestSolitaireGameRow(rows);
        if (!game) return null;
        return { ...game, _creationTime: undefined };
    },
});

/** loadGame 时补挂缺失的 dueTime / 服务端 timeout job */
export const ensureCasualTimeoutScheduled = internalMutation({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId }) => {
        if (!gameId.startsWith("game_")) {
            return { ok: true as const, scheduled: false as const };
        }
        const rows = await collectSolitaireGamesByGameId(ctx, gameId);
        const row = latestSolitaireGameRow(rows);
        if (!row?._id) {
            return { ok: true as const, scheduled: false as const };
        }
        if (row.dueTime != null && row.casualTimeoutScheduledId != null) {
            return { ok: true as const, scheduled: false as const };
        }
        await scheduleSolitaireCasualTimeout(ctx, gameId, row._id);
        return { ok: true as const, scheduled: true as const };
    },
});

function appendRecordedStep(game: SoloGameState, step: SolitaireRecordedStep): void {
    const now = Date.now();
    const pacingMs =
        step.pacingMs ??
        (game.lastOpAt != null ? Math.max(50, now - game.lastOpAt) : undefined);
    const withPacing =
        pacingMs != null && step.pacingMs == null ? { ...step, pacingMs } : step;
    game.recordedOps = [...(game.recordedOps ?? []), withPacing];
    game.lastOpAt = now;
}

function ensurePlayStarted(game: SoloGameState): number {
    if (game.playStartedAt == null) {
        game.playStartedAt = Date.now();
    }
    return game.playStartedAt;
}

export class GameManager {
    private dbCtx: any;
    private game: any | null;
    constructor(dbCtx: any) {
        this.dbCtx = dbCtx;
        this.game = null;
    }
    async load(gameId: string) {
        const rows = await collectSolitaireGamesByGameId(this.dbCtx, gameId);
        const game = latestSolitaireGameRow(rows);
        if (!game) return;

        this.game = { ...game, _creationTime: undefined, recordedOps: game.recordedOps ?? [] } as SoloGameState;
        return this.game;
    }
    async save(data: {
        cards?: Card[];
        status?: SoloGameStatus;
        moves?: number;
        score?: number;
        playStartedAt?: number;
        recordedOps?: SolitaireRecordedStep[];
        lastOpAt?: number;
    }) {
        if (!this.game) return;
        if (data.cards) {
            for (const c of data.cards) {
                const card: Card | undefined = this.game.cards.find((cc: Card) => cc.id === c.id);

                if (card) {
                    card.isRevealed = c.isRevealed;
                    card.zone = c.zone;
                    card.zoneId = c.zoneId;
                    card.zoneIndex = c.zoneIndex;
                }
            }
        }
        if (data.status !== undefined) this.game.status = data.status;
        if (data.moves !== undefined) this.game.moves = data.moves;
        if (data.score !== undefined) this.game.score = data.score;
        if (data.playStartedAt !== undefined) this.game.playStartedAt = data.playStartedAt;
        if (data.recordedOps !== undefined) this.game.recordedOps = data.recordedOps;
        if (data.lastOpAt !== undefined) this.game.lastOpAt = data.lastOpAt;
        if (this.game.recordedOps === undefined) {
            this.game.recordedOps = [];
        }
        const patch: Record<string, unknown> = {
            cards: this.game.cards,
            status: this.game.status,
            moves: this.game.moves,
            score: this.game.score,
            recordedOps: this.game.recordedOps,
        };
        if (this.game.playStartedAt != null) {
            patch.playStartedAt = this.game.playStartedAt;
        }
        if (this.game.lastOpAt != null) {
            patch.lastOpAt = this.game.lastOpAt;
        }
        await this.dbCtx.db.patch(this.game._id, patch);
    }

    progressSnapshot(): { score: number; moves: number; gameStatus: number } {
        return {
            score: this.game?.score ?? 0,
            moves: this.game?.moves ?? 0,
            gameStatus: this.game?.status ?? -1,
        };
    }
    async createGame(seed?: string | number, gameId?: string, replayEpoch?: number): Promise<any> {
        const game = SoloGameEngine.createGame(seed);
        const zones = createZones();
        const gameState: SoloGameState = {
            ...game,
            gameId: gameId ?? "",
            zones,
        };
        const insertDoc: Record<string, unknown> = { ...gameState, recordedOps: [] };
        if (typeof replayEpoch === "number" && Number.isFinite(replayEpoch)) {
            insertDoc.replayEpoch = replayEpoch;
        }
        const gid = await this.dbCtx.db.insert("game", insertDoc);
        if (gid) {
            const patchData: Record<string, any> = {};
            if (gameState.seed) {
                patchData.seed = gameState.seed;
            }
            this.game = { ...gameState, _id: gid, recordedOps: [], _creationTime: undefined, ...insertDoc } as any;
            return this.game
        }
    }
    async deal(gameId: string) {
        const game = await this.load(gameId);
        if (!game) return;
        const cards = SoloGameEngine.deal(game.cards);
        await this.save({ cards, status: SoloGameStatus.DEALED });
        return { ok: true, data: { update: toClientCardPatches(cards) } };
    }
    async draw(cardId: string): Promise<any> {
        if (!this.game) return { ok: false };
        const result = SoloGameEngine.drawCard(this.game, cardId);
        if (!result.ok) return result;
        appendRecordedStep(this.game, { op: "draw" });
        const playStartedAt = ensurePlayStarted(this.game);
        const movesBefore = this.game.moves ?? 0;
        await this.save({
            cards: result.data?.draw,
            moves: movesBefore + 1,
            score: (this.game.score ?? 0) + scoreDeltaForDraw(),
            status: this.game.status === SoloGameStatus.DEALED ? SoloGameStatus.PLAYING : this.game.status,
            playStartedAt,
        });
        return {
            ...result,
            data: result.data?.draw
                ? { ...result.data, draw: toClientCardPatches(result.data.draw) }
                : result.data,
            ...this.progressSnapshot(),
        };
    }
    async move(cardId: string, toZone: string): Promise<any> {
        if (!this.game) return { ok: false };
        const card = this.game.cards.find((c: Card) => c.id === cardId);
        if (!card) return { ok: false };
        const from =
            card.zone === ZoneType.WASTE
                ? "waste"
                : card.zone === ZoneType.FOUNDATION
                    ? card.zoneId
                    : card.zoneId;
        const result = SoloGameEngine.moveCard(this.game, card, toZone);
        if (!result.ok) return result;
        appendRecordedStep(this.game, {
            op: "move",
            suit: card.suit as SolitaireSuit,
            rank: card.rank as SolitaireRank,
            from,
            to: toZone,
        });
        const flipCards = result.data?.flip ?? [];
        const updateCards = [...(result.data?.move || []), ...flipCards];
        const playStartedAt = ensurePlayStarted(this.game);
        const movesBefore = this.game.moves ?? 0;
        const delta = scoreDeltaForMove(
            from,
            toZone,
            flipCards.filter((c) => c.isRevealed).length
        );
        await this.save({
            cards: updateCards,
            moves: movesBefore + 1,
            score: (this.game.score ?? 0) + delta,
            status: this.game.status === SoloGameStatus.DEALED ? SoloGameStatus.PLAYING : this.game.status,
            playStartedAt,
        });
        const rm = new SoloRuleManager(this.game as SoloGameState, GameInteractionPhase.idle);
        if (rm.isGameWon()) {
            await this.save({
                status: SoloGameStatus.COMPLETED,
            });
        }
        const moveCards = result.data?.move ?? [];
        return {
            ...result,
            data: {
                ...result.data,
                move: toClientCardPatches(moveCards),
                ...(flipCards.length > 0 ? { flip: toClientCardPatches(flipCards) } : {}),
            },
            ...this.progressSnapshot(),
        };
    }
    async recycle() {
        const result = SoloGameEngine.recycle(this.game);
        if (!result.ok) return result;
        appendRecordedStep(this.game, { op: "recycle" });
        const cards = result.data?.update || [];
        const playStartedAt = ensurePlayStarted(this.game);
        const movesBefore = this.game.moves ?? 0;
        await this.save({
            cards,
            moves: movesBefore + 1,
            score: (this.game.score ?? 0) + scoreDeltaForRecycle(),
            status: this.game.status === SoloGameStatus.DEALED ? SoloGameStatus.PLAYING : this.game.status,
            playStartedAt,
        });
        return {
            ...result,
            data: result.data?.update
                ? { ...result.data, update: toClientCardPatches(result.data.update) }
                : result.data,
            ...this.progressSnapshot(),
        };
    }
    async gameOver() {
        if (!this.game) return { ok: false };
        await this.save({ status: 3 });
        return { ok: true };
    }

    /** 玩家主动结束：标记放弃，保留当前分数供上报 */
    async concedeGame(): Promise<
        ({ ok: true } & ReturnType<GameManager["progressSnapshot"]>) | { ok: false }
    > {
        if (!this.game) return { ok: false };
        const st = this.game.status as number;
        if (st === SoloGameStatus.COMPLETED || st === SoloGameStatus.CANCELLED) {
            return { ok: true, ...this.progressSnapshot() };
        }
        appendRecordedStep(this.game, { op: "concede" });
        await this.save({ status: SoloGameStatus.CANCELLED });
        return { ok: true, ...this.progressSnapshot() };
    }

    buildScoreReport(nowMs: number = Date.now()) {
        const baseScore = Math.max(0, Math.floor(this.game?.score ?? 0));
        const playStartedAt = this.game?.playStartedAt;
        const elapsedSec =
            playStartedAt == null
                ? 0
                : Math.max(0, Math.min(SOLITAIRE_MATCH_TIME_LIMIT_SEC, (nowMs - playStartedAt) / 1000));
        return buildSolitaireCashGameReport(baseScore, elapsedSec);
    }
}
// Convex 函数接口
export const createGame = internalMutation({
    args: {
        seed: v.optional(v.string()),
        gameId: v.string(),
        replayEpoch: v.optional(v.number()),
    },
    handler: async (ctx, { seed, gameId, replayEpoch }) => {
        try {
            await healDuplicateSolitaireGamesForGameId(ctx, gameId);
            const rows = await collectSolitaireGamesByGameId(ctx, gameId);
            const existing = latestSolitaireGameRow(rows);
            if (existing) {
                if (existing.recordedOps === undefined) {
                    await ctx.db.patch(existing._id, { recordedOps: [] });
                    existing.recordedOps = [];
                }
                return {
                    ok: true as const,
                    data: toClientGameState(existing as SoloGameState),
                    events: [],
                };
            }

            console.log("createGame...", seed, gameId);
            const gameManager = new GameManager(ctx);
            const game = await gameManager.createGame(seed, gameId, replayEpoch);
            if (!game) {
                return { ok: false as const, error: "insert_failed" as const };
            }

            const dealedCards = SoloGameEngine.deal(game.cards);
            await gameManager.save({ cards: dealedCards, status: SoloGameStatus.DEALED });

            if (gameId.startsWith("game_") && game._id) {
                await scheduleSolitaireCasualTimeout(ctx, gameId, game._id);
            }

            const fresh = await gameManager.load(gameId);
            return {
                ok: true as const,
                data: fresh ? toClientGameState(fresh) : fresh ?? (game ? toClientGameState(game) : game),
                events: [{ name: "deal", cards: toClientCardPatches(dealedCards) }],
            };
        } catch (err) {
            console.error("[solitaire] createGame failed", gameId, err);
            return { ok: false as const, error: "create_failed" as const };
        }
    },
});

/** 建局请统一走 `api.proxy.controller.loadGame`（action）；不在此暴露公开 mutation。 */

export const loadGame = query({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId }) => {
        console.log("loading game", gameId);
        const gameManager = new GameManager(ctx);
        try {
            const game = await gameManager.load(gameId);
            return { ok: true, data: game ? toClientGameState(game) : game };
        } catch (error) {

            return { ok: false };
        }
    },
});

export const findGame = internalQuery({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId }) => {
        console.log("finding game", gameId);
        const gameManager = new GameManager(ctx);
        const game = await gameManager.load(gameId);
        return game ? toClientGameState(game) : game;
    },
});

/** 休闲再战：同一 `gameId` 清档，由 `loadGame({ resetCasualRun: true })` 触发 */
export const deleteCasualGameForReplay = internalMutation({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId }) => {
        await ctx.runMutation(internal.service.casualGameLifecycle.cancelCasualTimeoutJob, {
            gameId,
        });
        const rows = await collectSolitaireGamesByGameId(ctx, gameId);
        for (const row of rows) {
            await ctx.db.delete(row._id);
        }
        return { ok: true as const, deleted: rows.length };
    },
});
export const findReport = query({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId }) => {
        const gameManager = new GameManager(ctx);
        const game = await gameManager.load(gameId);
        if (!game) {
            return { ok: false as const };
        }
        const report = gameManager.buildScoreReport();
        return {
            ok: true as const,
            data: {
                gameId,
                ...report,
            },
        };
    },
});
export const getGame = query({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId }) => {
        const gameManager = new GameManager(ctx);
        const game = await gameManager.load(gameId);
        return game ? toClientGameState(game) : game;
    },
});
export const getGameStatus = query({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId }) => {
        const gameManager = new GameManager(ctx);
        const game = await gameManager.load(gameId);
        return { status: game?.status ?? -1 };
    },
});

export const getRecordedOps = query({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId }) => {
        const row = await ctx.db
            .query("game")
            .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
            .unique();
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
export const gameOver = mutation({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId }) => {
        const gameManager = new GameManager(ctx);
        return await gameManager.gameOver();
    },
});

export const concedeGame = mutation({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId }) => {
        const gameManager = new GameManager(ctx);
        await gameManager.load(gameId);
        return await gameManager.concedeGame();
    },
});
export const deal = mutation({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId }) => {
        const gameManager = new GameManager(ctx);
        return await gameManager.deal(gameId);
    },
});
export const draw = mutation({
    args: { gameId: v.string(), cardId: v.string() },
    handler: async (ctx, { gameId, cardId }) => {
        const gameManager = new GameManager(ctx);
        await gameManager.load(gameId);
        const result = await gameManager.draw(cardId);
        return result;
    },
});
export const move = mutation({
    args: { gameId: v.string(), cardId: v.string(), toZone: v.string() },
    handler: async (ctx, { gameId, cardId, toZone }) => {
        console.log("move", gameId, cardId, toZone);
        const gameManager = new GameManager(ctx);
        await gameManager.load(gameId);
        const result = await gameManager.move(cardId, toZone);
        console.log("result", result);
        return result;
    },
});
export const recycle = mutation({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId }) => {
        const gameManager = new GameManager(ctx);
        await gameManager.load(gameId);
        const result = await gameManager.recycle();
        if (!result.ok) return { ok: false as const };
        return { ok: true as const, ...gameManager.progressSnapshot() };
    },
});

export default GameManager;
