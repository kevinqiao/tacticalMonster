import { v } from "convex/values";
import { SoloGameEngine } from "../../../../component/solitaireSolo/battle/service/SoloGameEngine";
import { ActionStatus, Card, SoloGameState, SoloGameStatus, ZoneType } from "../../../../component/solitaireSolo/battle/types/SoloTypes";
import { createZones } from "../../../../component/solitaireSolo/battle/Utils";
import { internalMutation, internalQuery, mutation, query } from "../_generated/server";
export class GameManager {
    private dbCtx: any;
    private game: SoloGameState | null;
    constructor(dbCtx: any) {
        this.dbCtx = dbCtx;
        this.game = null;
    }
    async load(gameId: string) {
        console.log("load game", gameId);
        const game = await this.dbCtx.db.query("game").withIndex("by_gameId", (q: any) => q.eq("gameId", gameId)).unique();
        if (!game) return;
        this.game = { ...game, _id: undefined, _creationTime: undefined } as SoloGameState;
        return this.game;
    }
    async save(data: { cards?: Card[], status?: SoloGameStatus }) {

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
        if (data.status)
            this.game.status = data.status;
        await this.dbCtx.db.patch(this.game.gameId, { cards: this.game.cards, status: this.game.status });
    }
    async createGame(seed?: string | number): Promise<any> {
        const game = SoloGameEngine.createGame(seed);
        const zones = createZones();
        const gameState: SoloGameState = { ...game, zones, actionStatus: ActionStatus.IDLE };
        const gameId = await this.dbCtx.db.insert("game", gameState);
        if (gameId) {
            const patchData: Record<string, any> = { gameId };
            if (gameState.seed) {
                patchData.seed = gameState.seed;
            }
            await this.dbCtx.db.patch(gameId, patchData);
            return { ...gameState, ...patchData };
        }
    }
    async deal(gameId: string) {
        const game = await this.load(gameId);
        if (!game) return;
        const cards = SoloGameEngine.deal(game.cards);
        await this.save({ cards, status: SoloGameStatus.START });
        return { ok: true, data: { update: cards } };
    }
    async draw(cardId: string): Promise<any> {
        if (!this.game) return { ok: false };
        const result = SoloGameEngine.drawCard(this.game, cardId);
        if (!result.ok) return result;
        await this.save({ cards: result.data?.draw });
        return result;
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
        await this.save({ cards: updateCards });
        // await this.dbCtx.db.patch(this.game.id, { cards: this.game.cards });
        return result;
    }
    async recycle(gameId: string) {
        const game = await this.dbCtx.db.get(gameId);
        if (!game) return;
        const cards = game.cards.filter((c: Card) => c.zone === ZoneType.TALON);
        if (cards.length === 0) return;
        game.cards = cards;
        await this.dbCtx.db.patch(gameId, { cards: game.cards });
        return cards;
    }
    async gameOver() {
        if (!this.game) return { ok: false };
        await this.save({ status: 3 });
        return { ok: true };
    }
}
// Convex 函数接口
export const create = internalMutation({
    args: {
        seed: v.optional(v.union(v.string(), v.number()))
    },
    handler: async (ctx: any, { seed }) => {
        const gameManager = new GameManager(ctx);
        const result = await gameManager.createGame(seed);

        return result;
    },
});
export const loadGame = query({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId }) => {
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
        const gameManager = new GameManager(ctx);
        const game = await gameManager.load(gameId);
        return game
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
        return await gameManager.recycle(gameId);
    },
});

export default GameManager;
