import { Character } from "./Character";
import { Attributes, Stats } from "./CharacterAttributes";


export class Mage extends Character {
    constructor(id: string, name: string, attributes: Attributes, stats: Stats) {
        super(id, name, attributes, stats);
    }

    // Mage 的专属技能：火球术
    useFireball(target: Character) {
        console.log(`${this.name} 准备使用火球术攻击 ${target.name}`);
        // if (this.skillManager)
        this.skillManager.useSkill("fireball", target); // fireball 是技能 ID
    }
}
