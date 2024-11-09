import { SkillManager } from "../../SkillManager";
import { Character } from "./Character";
import { Attributes, Stats } from "./CharacterAttributes";

export class Warrior extends Character {
    constructor(id: string, name: string, attributes: Attributes, stats: Stats, skillManager: SkillManager) {
        super(id, name, attributes, stats, skillManager);
    }

    // Warrior 的专属技能：强力攻击
    usePowerStrike(target: Character) {
        console.log(`${this.name} 准备使用强力攻击 ${target.name}`);
        this.skillManager.useSkill("power_strike", target); // power_strike 是技能 ID
    }
}
