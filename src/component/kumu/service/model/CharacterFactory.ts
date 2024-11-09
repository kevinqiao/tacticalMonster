import { SkillManager } from "../SkillManager";
import { Character } from "./characters/Character";
import { Attributes, Stats } from "./characters/CharacterAttributes";


type CharacterConstructor = new (
    id: string,
    name: string,
    attributes: Attributes,
    stats: Stats,
    skillManager: SkillManager
) => Character;

export class CharacterFactory {
    private static characterRegistry = new Map<string, CharacterConstructor>();

    // 注册角色类型
    static registerCharacterType(type: string, ctor: CharacterConstructor) {
        this.characterRegistry.set(type, ctor);
    }

    // 根据类型动态创建角色实例
    static createCharacter(
        type: string,
        id: string,
        name: string,
        attributes: Attributes,
        stats: Stats,
        skillManager: SkillManager
    ): Character {
        const CharacterClass = this.characterRegistry.get(type);
        if (!CharacterClass) {
            throw new Error(`Character type "${type}" is not registered.`);
        }
        return new CharacterClass(id, name, attributes, stats, skillManager);
    }
}
