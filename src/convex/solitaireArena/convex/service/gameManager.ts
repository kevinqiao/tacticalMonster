import { v } from "convex/values";

import { internalMutation, internalQuery, mutation, query } from "../_generated/server";
import {
    Card,
    GameInteractionPhase,
    SoloGameState,
    SoloGameStatus,
} from "../types/SoloTypes";
import { createZones, SoloGameEngine } from "./SoloGameEngine";
import { SoloRuleManager } from "./SoloRuleManager";

const SOLITAIRE_WIN_SCORE_BONUS = 100;

/** 与客户端 `SoloRuleManager.calculateMoveScore` 对齐（foundation/tableau/waste + 步数时间项） */
function scoreDeltaForStep(
    moveType: "foundation" | "move" | "waste",
    movesBefore: number
): number {
    let base = 0;
    if (moveType === "foundation") base = 10;
    else if (moveType === "move") base = 5;
    const timePart = Math.max(0, 100 - movesBefore * 10);
    return base + Math.floor(timePart / 10);
}

function inferMoveScoringKind(toZone: string): "foundation" | "move" {
    return toZone.startsWith("foundation-") ? "foundation" : "move";
}

export class GameManager {
    private dbCtx: any;
    private game: any | null;
    constructor(dbCtx: any) {
        this.dbCtx = dbCtx;
        this.game = null;
    }
    async load(gameId: string) {

        const game = await this.dbCtx.db.query("game").withIndex("by_gameId", (q: any) => q.eq("gameId", gameId)).unique();
        if (!game) return;

        this.game = { ...game, _creationTime: undefined } as SoloGameState;
        return this.game;
    }
    async save(data: {
        cards?: Card[];
        status?: SoloGameStatus;
        moves?: number;
        score?: number;
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
        await this.dbCtx.db.patch(this.game._id, {
            cards: this.game.cards,
            status: this.game.status,
            moves: this.game.moves,
            score: this.game.score,
        });
    }

    progressSnapshot(): { score: number; moves: number; gameStatus: number } {
        return {
            score: this.game?.score ?? 0,
            moves: this.game?.moves ?? 0,
            gameStatus: this.game?.status ?? -1,
        };
    }
    async createGame(seed?: string | number, gameId?: string): Promise<any> {
        const game = SoloGameEngine.createGame(seed);
        // console.log("createGame", game, seed);
        const zones = createZones();
        const gameState: SoloGameState = {
            ...game, gameId: gameId ?? "", zones
        };
        const gid = await this.dbCtx.db.insert("game", gameState);
        if (gid) {
            const patchData: Record<string, any> = {};
            if (gameState.seed) {
                patchData.seed = gameState.seed;
            }
            // console.log("documentId...", gid);
            // if (patchData.length > 0)
            //     await this.dbCtx.db.patch(gid, patchData);
            this.game = { ...gameState, _id: gid, _creationTime: undefined } as any;
            return this.game
        }
    }
    async deal(gameId: string) {
        const game = await this.load(gameId);
        if (!game) return;
        const cards = SoloGameEngine.deal(game.cards);
        // console.log('deal cards', cards);
        await this.save({ cards, status: SoloGameStatus.DEALED });
        return { ok: true, data: { update: cards } };
    }
    async draw(cardId: string): Promise<any> {
        if (!this.game) return { ok: false };
        const result = SoloGameEngine.drawCard(this.game, cardId);
        if (!result.ok) return result;
        const movesBefore = this.game.moves ?? 0;
        const delta = scoreDeltaForStep("waste", movesBefore);
        await this.save({
            cards: result.data?.draw,
            moves: movesBefore + 1,
            score: (this.game.score ?? 0) + delta,
        });
        return { ...result, ...this.progressSnapshot() };
    }
    async move(cardId: string, toZone: string): Promise<any> {
        // console.log("manager move", cardId, toZone);
        if (!this.game) return { ok: false };
        // console.log("manager move", this.game.cards);
        const card = this.game.cards.find((c: Card) => c.id === cardId);
        if (!card) return { ok: false };
        // console.log("manager move", card);
        const result = SoloGameEngine.moveCard(this.game, card, toZone);
        // console.log("manager move result", result);
        if (!result.ok) return result;
        const updateCards = [...(result.data?.move || []), ...(result.data?.flip || [])];
        const kind = inferMoveScoringKind(toZone);
        const movesBefore = this.game.moves ?? 0;
        const delta = scoreDeltaForStep(kind, movesBefore);
        await this.save({
            cards: updateCards,
            moves: movesBefore + 1,
            score: (this.game.score ?? 0) + delta,
        });
        const rm = new SoloRuleManager(this.game as SoloGameState, GameInteractionPhase.idle);
        if (rm.isGameWon()) {
            await this.save({
                status: SoloGameStatus.COMPLETED,
                score: (this.game.score ?? 0) + SOLITAIRE_WIN_SCORE_BONUS,
            });
        }
        return { ...result, ...this.progressSnapshot() };
    }
    async recycle() {
        const result = SoloGameEngine.recycle(this.game);
        if (!result.ok) return result;
        const cards = result.data?.update || [];
        const movesBefore = this.game.moves ?? 0;
        const delta = scoreDeltaForStep("waste", movesBefore);
        await this.save({
            cards,
            moves: movesBefore + 1,
            score: (this.game.score ?? 0) + delta,
        });
        return { ...result, ...this.progressSnapshot() };
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
        await this.save({ status: SoloGameStatus.CANCELLED });
        return { ok: true, ...this.progressSnapshot() };
    }
}
// Convex 函数接口
export const createGame = internalMutation({
    args: {
        seed: v.optional(v.string()),
        gameId: v.string()
    },
    handler: async (ctx, { seed, gameId }) => {
        console.log("createGame...", seed, gameId);
        const gameManager = new GameManager(ctx);
        const game = await gameManager.createGame(seed, gameId);
        if (game) {
            const initialGame = JSON.parse(JSON.stringify(game));
            const dealedCards = SoloGameEngine.deal(game.cards);
            await gameManager.save({ cards: dealedCards, status: SoloGameStatus.DEALED });
            return { ok: true, data: initialGame, events: [{ name: "deal", cards: dealedCards }] };
        }
        return { ok: false };

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
            return { ok: true, data: game };
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
        return game
    },
});

/** 休闲再战：同一 `gameId` 清档，由 `loadGame({ resetCasualRun: true })` 触发 */
export const deleteCasualGameForReplay = internalMutation({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId }) => {
        const rows = await ctx.db
            .query("game")
            .withIndex("by_gameId", (q: any) => q.eq("gameId", gameId))
            .collect();
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
        const total = game.score ?? 0;
        return {
            ok: true as const,
            data: {
                gameId,
                baseScore: total,
                timeBonus: 0,
                completeBonus: 0,
                totalScore: total,
            },
        };
    },
});
export const getGame = query({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId }) => {
        const gameManager = new GameManager(ctx);
        return await gameManager.load(gameId);
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
