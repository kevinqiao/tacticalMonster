import { Card, GameModel } from "../../../../../component/solitaire/battle/types/CombatTypes";
interface SkillHandler {
    init: (game: GameModel, data: any) => any;
    complete: (game: GameModel) => any;
}
export class StealHandler implements SkillHandler {

    init(game: GameModel, data: any): any {
        const opponent = game.seats?.find(s => s.uid !== game.currentTurn?.uid);
        const source: Card[] = [];
        for (let i = 0; i < 7; i++) {
            const cards = game.cards?.filter(c => c.col === i && c.field === opponent?.field && c.status === 1).sort((a, b) => (b?.row ?? 0) - (a?.row ?? 0));
            if (cards && cards.length > 0) {
                source.push(cards[0]);
            }
        }
        const actor = game.seats?.find(s => s.uid === game.currentTurn?.uid);
        const target = [0, 2].map((slot) => {
            const cards = game.cards?.filter(c => c.col === slot && c.field === actor?.field && c.status === 1).sort((a, b) => (b?.row ?? 0) - (a?.row ?? 0));
            if (cards && cards.length > 0) {
                return cards[0];
            }
            return null;
        })
        return {
            skillId: "steal",
            status: 1,
            data: {
                source: source.map((s) => s.id),
                target: target.filter((t) => t != null).map((c) => c.id)
            }
        }
    }
    complete(game: GameModel): any {
        return {
            skillId: "steal",
            status: 2,
            data: {}
        }
    }
}

export class SkillHandlerFactory {
    static getSkillHandler(skillId: string): SkillHandler {
        switch (skillId) {
            case "steal":
                return new StealHandler();
            default:
                throw new Error("Skill handler not found");
        }
    }
}

export default SkillHandler;
