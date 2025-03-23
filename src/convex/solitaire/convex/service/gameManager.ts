import { GameModel, Seat } from "../../../../component/solitaire/battle/types/CombatTypes";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { dealData } from "./DealData";

interface Card {
    id: string;
    suit: string;
    rank: string;
    seat?: number;
    field?: number;
    col?: number;
    row?: number;
    status?: number;
}

class GameManager {
    public dbCtx: any;
    public game: GameModel | null;


    constructor(ctx: any, game?: GameModel) {
        this.dbCtx = ctx;
        this.game = game ?? null;
    }
    async initGame(gameId: string) {
        try {
            const id = gameId as Id<"game">;
            const game = await this.dbCtx.db.get(id);

            if (game) {
                if (game.actDue) {
                    game.actDue = game.actDue - Date.now();
                }
                this.game = { ...game, _id: undefined, _creationTime: undefined, gameId: id };


            }
        } catch (error) {
            console.log("initGame error", error);
        }
    }
    async createGame() {
        const players = await this.dbCtx.runQuery(internal.dao.gamePlayerDao.findAll);
        console.log("players", players);
        const seats: Seat[] = players.map((player: any, index: number) => ({ field: index + 2, uid: player.uid }));
        const suits = ['♠', '♥', '♦', '♣'];
        const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        const newDeck: Card[] = [];
        let id = 0
        suits.forEach(suit => {
            values.forEach(rank => {
                id++
                newDeck.push({ field: 1, id: `${id}`, suit, rank } as Card)
            });
        });

        newDeck.forEach((card, index) => {
            const dealCard = dealData[index];
            if (dealCard) {
                card.field = dealCard.field || 2;
                card.col = dealCard.col;
                card.row = dealCard.row;
                card.status = dealCard.status || 0;
            }
        })
        const gameId = await this.dbCtx.db.insert("game", { seats, cards: newDeck, status: 0 });
        if (gameId) {
            this.game = { gameId, seats, cards: newDeck, status: 0 };
            await this.dbCtx.scheduler.runAfter(1000, internal.service.gameProxy.start, { gameId });
        }
    }
    getGame() {
        return this.game;
    }

    async start() {
        if (!this.game) return;

        this.game.status = 1;
        const shuffleEvent: any = { gameId: this.game.gameId, name: "shuffleCompleted", actor: "####", data: { status: 1 } };
        await this.dbCtx.db.insert("game_event", shuffleEvent);
        const dealEvent: any = { gameId: this.game.gameId, name: "dealCompleted", actor: "####", data: { status: 1 } };
        const dealEventId = await this.dbCtx.db.insert("game_event", dealEvent);
        await this.dbCtx.db.patch(this.game.gameId, { lastUpdate: dealEventId, status: 1 });

        await this.startRound(0);

    }
    async startRound(round: number) {
        if (!this.game) return;
        this.game.status = 2;
        this.game.currentRound = round;
        await this.dbCtx.db.patch(this.game.gameId, { currentRound: this.game.currentRound });
        const roundEvent: any = { gameId: this.game.gameId, name: "roundStarted", actor: "####", data: { round } };
        await this.dbCtx.db.insert("game_event", roundEvent);
        const field = this.game.seats?.[0]?.field;
        if (field) {
            await this.startTurn(field);
        }
    }
    async startTurn(field: number) {
        if (!this.game) return;
        this.game.currentTurn = { field, actions: { acted: 0, max: 3 }, status: 0 };
        await this.dbCtx.db.patch(this.game.gameId, { currentTurn: this.game.currentTurn });
        const turnEvent: any = { gameId: this.game.gameId, name: "turnStarted", actor: "####", data: this.game.currentTurn };
        await this.dbCtx.db.insert("game_event", turnEvent);
        await this.askAct(-1);
    }
    async askAct(dueTime: number) {
        if (!this.game) return;
        this.game.actDue = dueTime;
        const askActEvent: any = { gameId: this.game.gameId, name: "askAct", actor: "####", data: { dueTime } };
        await this.dbCtx.db.insert("game_event", askActEvent);
        await this.dbCtx.db.patch(this.game.gameId, { actDue: dueTime });
    }
    async flip(uid: string) {
        if (!this.game) return;
        const cards = this.game.cards?.filter((c) => c.field === 1 && !c.status);
        if (!cards || cards.length === 0) return;
        cards[0].status = 1;
        const flipEvent: any = { gameId: this.game.gameId, name: "flipCompleted", actor: "####", data: { open: [cards[0]] } };
        const eventId = await this.dbCtx.db.insert("game_event", flipEvent);
        await this.dbCtx.db.patch(this.game.gameId, { cards: this.game.cards, lastUpdate: eventId });
        return { ok: true, result: { open: [cards[0]] } }
    }

    async move(uid: string, cardId: string, to: { field: number, col: number, row: number }) {
        if (!this.game?.cards) return;
        const card = this.game.cards.find(card => card.id === cardId);
        if (!card) return;
        const data: any = { cardId, to }
        if (card.field && card.field > 1) {
            const precard = this.game.cards.find(c => c.field === card.field && c.col === card.col && c.row === ((card.row || 0) - 1));
            console.log("precard", precard);
            if (precard && !precard.status) {
                data.open = [precard];
                precard.status = 1;
            }
        }
        if (card.field && card.field > 1) {
            const group = this.game.cards.filter(c => card.field === c.field && (card.col || 0) === (c.col || 0) && (card.row || 0) <= (c.row || 0));
            group.sort((a, b) => (a.row || 0) - (b.row || 0)).forEach((c, index) => {
                c.field = to.field;
                c.col = to.col;
                c.row = to.row + index + 1;
            });
        } else {
            card.field = to.field;
            card.col = to.col;
            card.row = to.row + 1;
        }
        console.log("card", card, data);
        const event: any = { gameId: this.game.gameId, name: "moveCompleted", actor: uid, data };
        const eventId = await this.dbCtx.db.insert("game_event", event);
        await this.dbCtx.db.patch(this.game.gameId, { cards: this.game.cards, lastUpdate: eventId });
        // await this.askAct(-1);
        return { ok: true, result: { open: data.open } }
    }
    async timeout() {


    }
    async turnOffBot(seat: Seat) {
        if (!this.game) return;
        seat.botOn = false;
        const event: any = { gameId: this.game.gameId, name: "botOff", actor: "####", data: { field: seat.field } };
        const eventId = await this.dbCtx.db.insert("game_event", event);
        await this.dbCtx.db.patch(this.game.gameId, { lastUpdate: eventId, seats: this.game.seats });

    }


}
export default GameManager