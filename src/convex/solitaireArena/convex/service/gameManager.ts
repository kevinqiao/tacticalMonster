import { SoloGameEngine } from "../../../../component/solitaireSolo/battle/service/SoloGameEngine";
import { SoloRuleManager } from "../../../../component/solitaireSolo/battle/service/SoloRuleManager";
import { ActionResult, ActionStatus, Card, SoloGameState, ZoneType } from "../../../../component/solitaireSolo/battle/types/SoloTypes";
import { createZones } from "../../../../component/solitaireSolo/battle/Utils";
export class GameManager {
    private dbCtx: any;
    private game: SoloGameState | null;
    constructor(dbCtx: any) {
        this.dbCtx = dbCtx;
        this.game = null;
    }
    async load(gameId: string) {
        const game = await this.dbCtx.db.get(gameId);
        if (!game) return;
        this.game = { ...game, _id: undefined, _creationTime: undefined } as SoloGameState;
        return this.game;
    }
    async createGame(): Promise<any> {
        const game = SoloGameEngine.createGame();
        SoloGameEngine.shuffleDeck(game.cards);
        const zones = createZones();
        const gameState: SoloGameState = { ...game, zones, actionStatus: ActionStatus.IDLE };
        const gameId = await this.dbCtx.db.insert("game", gameState);
        if (gameId) {
            await this.dbCtx.db.patch(gameId, { gameId });
            return { ...gameState, gameId };
        }
    }
    async draw(gameId: string) {
        const game = await this.dbCtx.db.get(gameId);
        if (!game) return;
        const card = game.cards.pop();
        if (!card) return;
        return card;
    }
    async move(cardId: string, toZone: string): Promise<any> {
        const result: ActionResult = { ok: false };
        if (!this.game) return result;
        const card = this.game.cards.find((c: Card) => c.id === cardId);
        if (!card) return;
        const ruleManager = new SoloRuleManager(this.game);
        if (!ruleManager.canMoveToZone(card, toZone)) return;


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
}
// Convex 函数接口
// export const createGame = (mutation as any)({

//     handler: async (ctx: any) => {
//         const gameManager = new GameManager(ctx);
//         const result = await gameManager.createGame();

//         return result;
//     },
// });
