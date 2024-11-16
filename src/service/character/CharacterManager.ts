import { Attributes, Character, Stats } from "component/kumu/service/model/characters/CharacterAttributes";

//key-character_id
interface LevelData {
    level: number;
    experience_required: number;
    attributes: Attributes;
}


export const generateStats = (character: Character): Stats => {
    const attributes = character.attributes;
    const hpMax = attributes.constitution * 10; // Example formula for HP
    const mpMax = attributes.intelligence * 5; // Example formula for MP
    const attack = attributes.strength * 2; // Example formula for attack
    const defense = attributes.constitution + attributes.dexterity; // Example for defense
    const speed = attributes.dexterity * 2; // Example for speed

    return {
        hp: { current: hpMax, max: hpMax },
        mp: { current: mpMax, max: mpMax },
        stamina: { current: 100, max: 100 },
        attack,
        defense,
        speed,
        crit_rate: 0.05 + attributes.dexterity * 0.001, // Example crit rate formula
        evasion: 0.03 + attributes.dexterity * 0.001 // Example evasion formula
    };
}

export const levelUp = (character: Character, nextLevel: LevelData) => {


    if (character.experience < nextLevel.experience_required) {
        console.log(`${character.name} does not have enough experience to level up.`);
        return;
    }
    character.level = nextLevel.level;
    character.attributes = nextLevel.attributes;
    // Update stats
    character.stats = generateStats(character);

    // Increase level
    character.level++;

    console.log(`${character.name} leveled up to level ${character.level}!`);
}

//  generateUniqueId(): string {
//     return `char_${Math.random().toString(36).substr(2, 9)}`;
// }

