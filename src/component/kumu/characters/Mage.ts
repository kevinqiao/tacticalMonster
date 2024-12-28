import { Character } from "./Character";
import { Attributes, Equipment } from "./CharacterAttributes";


export class Mage extends Character {
    constructor(id: string, name: string, level: number, attributes: Attributes, equipment: { weapon?: Equipment; armor?: Equipment; accessories: Equipment[] }) {
        super(id, name, level, attributes, equipment);
    }

    // Mage 的专属技能：火球术
    useFireball(target: Character) {
        console.log(`${this.name} 准备使用火球术攻击 ${target.name}`);
        // if (this.skillManager)
        this.skillManager.useSkill("fireball", target); // fireball 是技能 ID
    }
}
