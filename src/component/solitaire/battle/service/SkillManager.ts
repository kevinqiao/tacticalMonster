import { SkillEffectFactory } from "../../../../convex/solitaire/convex/service/skill/SkillEffectFactory";
import { GameModel } from "../types/CombatTypes";
import { skillDefs } from "../types/skillData";

class SkillManager {

    public game: GameModel | undefined;
    constructor(game?: GameModel) {
        this.game = game;
    }
    triggerSkill(): { id: string, status: number, data: any } | undefined {

        if (!this.game || !this.game.currentTurn) return;
        const len = this.game.currentTurn.actions.acted.length;
        if (len === 0) return;
        const lastAction = this.game.currentTurn.actions.acted[len - 1];
        if (lastAction.type !== "move" || !lastAction.result.move || lastAction.result.move.length > 1) return;
        const card = lastAction.result.move[0];
        if (card.field === 0) {
            const skill = skillDefs.find(s => s.triggerCard === "Q");
            if (skill && this.game) {
                const skillInit = SkillEffectFactory.getSkillEffect(skill.id).init(this.game, lastAction);
                return skillInit;
            }
        }
        return

    }

    async completeSkill() {
        // if (!this.game) return;
        // this.game.skillUse = { id: "steal", status: 2, data: {} };
        // await this.dbCtx.db.patch(this.game.gameId, { skillUse: this.game.skillUse });
    }





}
export default SkillManager