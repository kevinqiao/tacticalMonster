import { GameModel } from "../../../../../component/solitaire/battle/types/CombatTypes";
import StealEffect from "./effect/StealEffect";

export interface SkillEffect {
    init: (game: GameModel) => any;
    apply: (game: GameModel, data?: any) => any;
}

export class SkillEffectFactory {
    static getSkillEffect(skillId: string): SkillEffect {
        switch (skillId) {
            case "steal":
                return new StealEffect();
            default:
                throw new Error("Skill Effect not found");
        }
    }
}
