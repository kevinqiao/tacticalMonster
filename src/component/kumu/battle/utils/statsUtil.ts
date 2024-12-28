import { Character } from "../types/CharacterTypes";

const getStats = (character: Character) => {
    const { attributes } = character;
    const { strength=0, constitution=0, intelligence=0, dexterity=0  } = attributes ?? {};
    // const {weapon,armor} = equipment;
    const attack = strength * 2;
    const defense = constitution * 1.5;
    const speed = dexterity + Math.floor(character.level / 2);
    return { attack, defense, speed };
}
export { getStats };

