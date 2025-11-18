import { v } from "convex/values";
import { SoloGameEngine } from "../../../../component/solitaireSolo/battle/service/SoloGameEngine";
import { ActionStatus, Card, SoloGameState, SoloGameStatus } from "../../../../component/solitaireSolo/battle/types/SoloTypes";
import { createZones } from "../../../../component/solitaireSolo/battle/Utils";
import { internalMutation, internalQuery, mutation, query } from "../_generated/server";
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
    async save(data: { cards?: Card[], status?: SoloGameStatus }) {

        if (!this.game) return;
        console.log("save game", data);
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
        await this.dbCtx.db.patch(this.game._id, { cards: this.game.cards, status: this.game.status });
    }
    async createGame(seed?: string | number, gameId?: string): Promise<any> {
        const game = SoloGameEngine.createGame(seed);
        console.log("createGame", game, seed);
        const zones = createZones();
        const gameState: SoloGameState = {
            ...game, gameId: gameId ?? "", zones, actionStatus: ActionStatus.IDLE
        };
        const gid = await this.dbCtx.db.insert("game", gameState);
        if (gid) {
            const patchData: Record<string, any> = {};
            if (gameState.seed) {
                patchData.seed = gameState.seed;
            }
            console.log("documentId...", gid);
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
        console.log('deal cards', cards);
        await this.save({ cards, status: SoloGameStatus.DEALED });
        return { ok: true, data: { update: cards } };
    }
    async draw(cardId: string): Promise<any> {
        if (!this.game) return { ok: false };
        const result = SoloGameEngine.drawCard(this.game, cardId);
        if (!result.ok) return result;
        console.log("draw result", result);
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
    async recycle() {
        const result = SoloGameEngine.recycle(this.game);
        if (!result.ok) return result;
        const cards = result.data?.update || [];
        await this.save({ cards });
        return result;
    }
    async gameOver() {
        if (!this.game) return { ok: false };
        await this.save({ status: 3 });
        return { ok: true };
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
export const findReport = query({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId }) => {
        return { ok: true, data: { baseScore: 100, timeBonus: 0, completeBonus: 0, totalScore: 100 } };
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
        await gameManager.load(gameId);
        const result = await gameManager.recycle();
        return { ok: result.ok };
    },
});

export default GameManager;
