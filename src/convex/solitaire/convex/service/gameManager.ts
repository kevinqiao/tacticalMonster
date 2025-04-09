import { GameModel, Seat } from "../../../../component/solitaire/battle/types/CombatTypes";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { dealData } from "./DealData";
import SkillManager from "./skillManager";

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
    public skillManager: SkillManager;

    constructor(ctx: any, game?: GameModel) {
        this.dbCtx = ctx;
        this.game = game ?? null;
        this.skillManager = new SkillManager();
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
                this.skillManager.game = { ...game, _id: undefined, _creationTime: undefined, gameId: id };
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
        await this.dbCtx.db.insert("game_event", dealEvent);
        const startEvent: any = { gameId: this.game.gameId, name: "gameStarted", actor: "####", data: { status: 1 } };
        const startEventId = await this.dbCtx.db.insert("game_event", startEvent);
        await this.dbCtx.db.patch(this.game.gameId, { lastUpdate: startEventId, status: 1 });
        await this.dbCtx.scheduler.runAfter(2000, internal.service.gameProxy.startRound, { gameId: this.game.gameId });

    }
    async gameOver() {
        if (!this.game) return;
        const event: any = { gameId: this.game.gameId, name: "gameOver", actor: "####", data: { status: 3 } };
        const eventId = await this.dbCtx.db.insert("game_event", event);
        this.game.status = 3;
        await this.dbCtx.db.patch(this.game.gameId, { status: 3, lastUpdate: eventId });
    }
    async startRound() {
        if (!this.game) return;
        const round = this.game.currentRound?.no || 0;
        const roundEvent: any = { gameId: this.game.gameId, name: "roundStarted", actor: "####", data: { round } };
        const eventId = await this.dbCtx.db.insert("game_event", roundEvent);
        this.game.status = this.game.status === 1 ? 2 : this.game.status;
        this.game.currentRound = { no: round, turnOvers: [], status: 0 };
        await this.dbCtx.db.patch(this.game.gameId, { status: this.game.status, currentRound: this.game.currentRound, lastUpdate: eventId });
        const uid = this.game.seats?.[0]?.uid;
        if (uid) {
            await this.startTurn(uid);
        }
    }
    async roundOver() {
        if (!this.game || !this.game.currentRound) return;
        this.game.currentRound.status = 1;
        await this.dbCtx.db.patch(this.game.gameId, { currentRound: this.game.currentRound });
        if (this.game.currentRound.no < 2) {
            await this.startRound();
        } else {
            await this.gameOver();
        }
    }
    async startTurn(uid: string) {
        if (!this.game) return;
        this.game.currentTurn = { uid, actions: { acted: [], max: 3 }, status: 0 };
        const turnEvent: any = { gameId: this.game.gameId, name: "turnStarted", actor: "####", data: this.game.currentTurn };
        const eventId = await this.dbCtx.db.insert("game_event", turnEvent);
        await this.dbCtx.db.patch(this.game.gameId, { currentTurn: this.game.currentTurn, lastUpdate: eventId });
        await this.askAct(-1);
    }
    async turnOver() {
        if (!this.game || !this.game.currentRound || !this.game.currentTurn) return;
        this.game.currentRound.turnOvers.push(this.game.currentTurn.uid);
        this.game.currentTurn.status = 1;
        await this.dbCtx.db.patch(this.game.gameId, { currentTurn: this.game.currentTurn, currentRound: this.game.currentRound });
        const turnOverEvent: any = { gameId: this.game.gameId, name: "turnOver", actor: "####", data: this.game.currentTurn };
        await this.dbCtx.db.insert("game_event", turnOverEvent);
        if (this.game.currentRound.turnOvers.length === this.game.seats?.length) {
            await this.startRound();
        } else {
            const nextSeats = this.game.seats?.filter((s) => !this.game?.currentRound?.turnOvers.includes(s.uid))
            if (nextSeats && nextSeats.length > 0) {
                await this.startTurn(nextSeats[0].uid);
            }
        }
    }
    async askAct(dueTime: number) {
        if (!this.game || !this.game.currentTurn) return;
        if (this.game.currentTurn.actions.max === this.game.currentTurn.actions.acted.length) {
            this.turnOver();
        } else {
            this.game.actDue = dueTime;
            const act = this.game.currentTurn.actions.acted.length + 1;
            const askActEvent: any = { gameId: this.game.gameId, name: "askAct", actor: "####", data: { dueTime, act } };
            const eventId = await this.dbCtx.db.insert("game_event", askActEvent);
            await this.dbCtx.db.patch(this.game.gameId, { actDue: dueTime, lastUpdate: eventId });
        }
    }
    async flip(uid: string) {
        if (!this.game || !this.game.currentTurn) return;
        const cards = this.game.cards?.filter((c) => c.field === 1 && !c.status);
        if (!cards || cards.length === 0) return;
        cards[0].status = 1;
        const flipEvent: any = { gameId: this.game.gameId, name: "flip", actor: uid, data: { open: [cards[0]] } };
        const eventId = await this.dbCtx.db.insert("game_event", flipEvent);
        this.game.currentTurn.actions.acted.push({ type: "flip", result: { move: [], open: [cards[0]] } })
        await this.dbCtx.db.patch(this.game.gameId, { cards: this.game.cards, currentTurn: this.game.currentTurn, lastUpdate: eventId });
        if (this.game.currentTurn.actions.acted.length === this.game.currentTurn.actions.max) {
            await this.turnOver();
        } else {
            await this.askAct(-1);
        }
        return { ok: true, result: { open: [cards[0]] } }
    }

    async move(uid: string, cardId: string, to: { field: number, slot: number }) {
        if (!this.game?.cards || !this.game.currentTurn) return;
        const card = this.game.cards.find(card => card.id === cardId);
        if (!card || !card.field) return;
        const data: any = { cardId, to }
        if (card.field > 1) {
            const fromSlot = this.game.cards.filter(c => c.field === card.field && c.col === card.col && (c.row || 0) < (card.row || 0)).sort((a, b) => (b.row || 0) - (a.row || 0));
            // console.log("fromSlot", fromSlot);
            if (fromSlot.length > 0) {
                // console.log("open card", fromSlot[0]);
                //open the first card
                if (!fromSlot[0].status) {
                    fromSlot[0].status = 1;
                    data.open = [fromSlot[0]];
                }
            }
        }
        const targetSlot = this.game.cards.filter(c => c.field === to.field && c.col === to.slot);
        const row = targetSlot.length > 0 ? (targetSlot.sort((a, b) => (b.row || 0) - (a.row || 0))[0]['row'] || 0) : -1;
        if (card.field && card.field > 1) {
            const group = this.game.cards.filter(c => card.field === c.field && (card.col || 0) === (c.col || 0) && (card.row || 0) <= (c.row || 0));
            group.sort((a, b) => (a.row || 0) - (b.row || 0)).forEach((c, index) => {
                c.field = to.field;
                c.col = to.slot;
                c.row = row + index + 1;
            });
            data.move = group;
        } else {
            card.field = to.field;
            card.col = to.slot;
            card.row = row + 1;
            data.move = [card];
        }

        const event: any = { gameId: this.game.gameId, name: "move", actor: uid, data };
        const eventId = await this.dbCtx.db.insert("game_event", event);
        this.game.currentTurn.actions.acted.push({ type: "move", result: data })
        await this.dbCtx.db.patch(this.game.gameId, { cards: this.game.cards, currentTurn: this.game.currentTurn, lastUpdate: eventId });
        const skill = await this.skillManager?.triggerSkill();
        console.log("skill", skill);
        if (!skill) {
            if (this.game.currentTurn.actions.acted.length === this.game.currentTurn.actions.max) {
                await this.turnOver();
            } else {
                await this.askAct(-1);
            }
        } else {
            const skillEvent: any = { gameId: this.game.gameId, name: "skillTriggered", actor: "####", data: skill };
            const skillEventId = await this.dbCtx.db.insert("game_event", skillEvent);
            console.log("game id:", this.game.gameId)
            await this.dbCtx.db.patch(this.game.gameId, { lastUpdate: skillEventId, skillUse: skill });
        }
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