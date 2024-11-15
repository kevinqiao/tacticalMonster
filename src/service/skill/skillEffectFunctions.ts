import { Character } from "component/kumu/service/model/characters/CharacterAttributes";

export const skillEffectFunctions = {
    calculateFireballDamage: (character: Character, target: Character | null): number => {
        return character.stats.attack * 1.5;
    },
    calculateHealAmount: (character: Character): number => {
        return character.stats.attack * 0.2;
    },
    calculateCounterAttackDamage: (character: Character, target: Character | null): number => {
        return character.stats.attack * 0.8;
    }
};
