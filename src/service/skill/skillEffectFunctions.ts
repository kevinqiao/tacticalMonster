import { Character } from "component/kumu/service/model/CharacterModels";

export const skillEffectFunctions = {
    calculateFireballDamage: (character: Character, target: Character | null): number => {
        return character.stats && character.stats.attack ? character.stats.attack * 1.5 : 0;
    },
    calculateHealAmount: (character: Character): number => {
        return character.stats && character.stats.attack ? character.stats.attack * 0.2 : 0;
    },
    calculateCounterAttackDamage: (character: Character, target: Character | null): number => {
        return character.stats && character.stats.attack ? character.stats.attack * 0.8 : 0;
    }
};
