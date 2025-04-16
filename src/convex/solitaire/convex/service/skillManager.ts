import { Card, GameModel } from "../../../../component/solitaire/battle/types/CombatTypes";
import { CardRank, Skill, } from "../../../../component/solitaire/battle/types/PlayerTypes";
import { skillDefs } from "../../../../component/solitaire/battle/types/skillData";
import { SkillEffect, SkillEffectFactory } from "./skill/SkillEffectFactory";

class SkillManager {

    public game: GameModel | undefined;
    constructor(game?: GameModel) {
        this.game = game;
    }
    canTriggerSkill(triggerCard: CardRank): Skill | undefined {
        if (!this.game || !this.game.currentTurn) return;
        const len = this.game.currentTurn.actions.acted?.length ?? 0;
        if (len === 0) return;
        const lastAction = this.game.currentTurn.actions.acted ? this.game.currentTurn.actions.acted[len - 1] : null;
        if (!lastAction || lastAction.type !== "move" || !lastAction.result.move || lastAction.result.move.length > 1) return;
        const card = lastAction.result.move[0];
        if (card.field === 0) {
            // const seat = this.game.seats?.find((s) => s.uid === this.game?.currentTurn?.uid);
            // if (!seat) return;

            const skill = skillDefs.find((skill) => skill.triggerCard === triggerCard);
            return skill

            // const skillUse = seat.skillUses?.find((su) => su.id === s.id);
            // if (skill.maxUsesPerGame && (!skillUse || skillUse.currentUses < skill.maxUsesPerGame))



        }
        return

    };
    async triggerSkill(): Promise<{ id: string, status: number, data: any } | undefined> {

        if (!this.game || !this.game.currentTurn) return;
        const len = this.game.currentTurn.actions.acted?.length ?? 0;
        if (len === 0) return;
        const lastAction = this.game.currentTurn.actions.acted ? this.game.currentTurn.actions.acted[len - 1] : null;
        console.log("lastAction", lastAction)
        if (!lastAction || lastAction.type !== "move" || !lastAction.result.move || lastAction.result.move.length > 1) return;
        const card = lastAction.result.move[0] as Card;
        if (card.field === 0) {
            const skill: Skill | undefined = this.canTriggerSkill(card.rank as CardRank);
            console.log("trigger skill", skill)
            if (skill && this.game) {
                const effect: SkillEffect | undefined = SkillEffectFactory.getSkillEffect(skill.id);
                if (effect) {
                    const effectData = skill.instant ? effect.apply(this.game) : effect.init(this.game);
                    return effectData;
                }
            }
        }
        return

    }
    async useSkill(skillId: string, data?: any) {
        if (!this.game || !this.game.currentTurn) return;
        const skill = skillDefs.find((skill) => skill.id === skillId);
        if (!skill) return;
        const effect: SkillEffect | undefined = SkillEffectFactory.getSkillEffect(skillId);
        if (skill && this.game && effect) {
            const effectData = skill.instant ? effect.apply(this.game, data) : effect.init(this.game);
            return effectData;
        }
    }


    async completeSkill(data: any) {
        if (!this.game || !this.game.skillUse) return;
        const effect: SkillEffect | undefined = SkillEffectFactory.getSkillEffect(this.game.skillUse.skillId);
        if (effect) {
            const effectData = effect.apply(this.game, data);
            return effectData;
        }
        // this.game.skillUse = { id: "steal", status: 2, data: {} };
        // await this.dbCtx.db.patch(this.game.gameId, { skillUse: this.game.skillUse });
    }





}
export default SkillManager