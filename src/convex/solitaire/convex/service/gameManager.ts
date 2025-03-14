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
                if (card.row === 2) {
                    card.status = 1;
                }
            }
        })
        const gameId = await this.dbCtx.db.insert("game", { seats, cards: newDeck, status: 0 });
        if (gameId) {
            this.game = { gameId, seats, cards: newDeck, status: 0 };
        }
    }
    getGame() {
        return this.game;
    }

    async start() {
        if (!this.game || this.game.status !== -1) return;
        console.log("start game", this.game.gameId);
        this.game.status = 0;
        const event: any = { gameId: this.game.gameId, name: "gameStarted", actor: "####", data: { status: 0 } };
        const eventId = await this.dbCtx.db.insert("game_event", event);
        await this.dbCtx.db.patch(this.game.gameId, { lastUpdate: eventId, status: 0 });

    }


    async timeout() {


    }
    async turnOffBot(seat: Seat) {
        if (!this.game) return;
        seat.botOn = false;
        const event: any = { gameId: this.game.gameId, name: "botOff", actor: "####", data: { seat: seat.no } };
        const eventId = await this.dbCtx.db.insert("game_event", event);
        await this.dbCtx.db.patch(this.game.gameId, { lastUpdate: eventId, seats: this.game.seats });

    }


}
export default GameManager