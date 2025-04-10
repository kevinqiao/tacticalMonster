import { Card, GameModel } from "../../../../../../component/solitaire/battle/types/CombatTypes";
import { SkillStatus } from "../../../../../../component/solitaire/battle/types/PlayerTypes";
import { SkillEffect } from "../SkillEffectFactory";


export class StealEffect implements SkillEffect {

    init(game: GameModel): any {
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
            status: SkillStatus.Init,
            data: {
                source: source.map((s) => s.id),
                target: target.filter((t) => t != null).map((c) => c.id)
            }
        }
    }
    apply(game: GameModel, data: any): any {
        return { skillId: "steal", status: SkillStatus.Completed, data: data };
    }
}



export default StealEffect;
