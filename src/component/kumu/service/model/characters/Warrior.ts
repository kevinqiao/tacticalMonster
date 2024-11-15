import { Character } from "./Character";
import { Attributes } from "./CharacterAttributes";

export class Warrior extends Character {
    constructor(id: string, name: string, level: number, attributes: Attributes, equipment: { weapon_bonus: number; armor_bonus: number }) {
        super(id, name, level, attributes, equipment);
    }

    // Warrior 的专属技能：强力攻击
    usePowerStrike(target: Character) {
        console.log(`${this.name} 准备使用强力攻击 ${target.name}`);
        this.skillManager.useSkill("power_strike", target); // power_strike 是技能 ID
    }
}
