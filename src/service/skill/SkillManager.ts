
import { Character, Skill, SkillEffect, Stats } from "component/kumu/service/model/CharacterModels";
import { Engine, TopLevelCondition } from "json-rules-engine";
import { skillEffectFunctions } from "./skillEffectFunctions";

type NumericStatKey = {
    [K in keyof Stats]: Stats[K] extends number ? K : never;
}[keyof Stats];

interface TriggerSkillParams {
    skillId: string;
    effects: SkillEffect[];
}

interface ConditionSet {
    conditions: TopLevelCondition;
    effects: SkillEffect[];
}

class SkillManager {
    private engine: Engine;

    constructor() {
        this.engine = new Engine();
    }

    // ** Trigger Effects by Phase or Event **
    triggerEffects(
        character: Character,
        options: { phase?: "immediate" | "turn_start" | "turn_end"; event?: string },
        target: Character | null
    ) {
        const { phase, event } = options;

        character.statusEffects = character.statusEffects?.filter(effect => {
            if ((phase && effect.trigger_phase === phase) || (event && effect.trigger_event === event)) {
                this.applyEffect(character, effect, target);
            }

            // Decrease remaining duration if applicable
            if (effect.remaining_duration !== undefined) {
                effect.remaining_duration -= 1;
                if (effect.remaining_duration <= 0) {
                    console.log(`${effect.name} has expired.`);
                    return false; // Remove expired effect
                }
            }
            return true; // Keep valid effect
        });
    }

    // ** Apply a Single Effect **
    applyEffect(character: Character, effect: SkillEffect, target: Character | null) {
        let effectValue: string | number = effect.value;

        // Calculate effect value dynamically if necessary
        if (typeof effectValue === "string" && effectValue in skillEffectFunctions) {
            const effectFunction = skillEffectFunctions[effectValue as keyof typeof skillEffectFunctions];
            effectValue = effectFunction(character, target);
        }

        const finalValue = Math.ceil(Number(effectValue));

        if (effect.effect_type === "damage" && target?.stats?.hp?.current) {
            target.stats.hp.current = Math.max(0, target.stats.hp.current - finalValue);
            console.log(`${target.name} takes ${finalValue} damage.`);
        } else if (effect.effect_type === "heal" && character.stats?.hp?.current) {
            character.stats.hp.current = Math.min(character.stats.hp.max, character.stats.hp.current + finalValue);
            console.log(`${character.name} heals ${finalValue} HP.`);
        } else if (["dot", "hot", "buff", "debuff"].includes(effect.effect_type)) {
            target?.statusEffects?.push({ ...effect, value: finalValue });
            console.log(`${target?.name} is affected by ${effect.name} (${effect.effect_type}) for ${effect.remaining_duration} turns.`);
        } else if (effect.target_attribute && character.stats) {
            const isNumericStat = (effect.target_attribute as NumericStatKey) in character.stats;

            if (isNumericStat) {
                const statKey = effect.target_attribute as NumericStatKey;
                const modifier = effect.effect_type === "buff" ? +finalValue : -finalValue;
                character.stats[statKey] = (character.stats[statKey] || 0) + modifier;
                console.log(`${character.name}'s ${statKey} is adjusted by ${modifier}. New value: ${character.stats[statKey]}`);
            } else {
                const targetStat = character.stats[effect.target_attribute];
                if (typeof targetStat === "object" && targetStat !== null && "current" in targetStat && "max" in targetStat) {
                    const modifier = effect.effect_type === "buff" ? +finalValue : -finalValue;
                    targetStat.current = Math.min(targetStat.max, Math.max(0, targetStat.current + modifier));
                    console.log(`${character.name}'s ${effect.target_attribute}.current is adjusted by ${modifier}. New value: ${targetStat.current}`);
                } else {
                    console.warn(`Unsupported target_attribute: ${effect.target_attribute}`);
                }
            }
        } else {
            console.warn(`Effect type ${effect.effect_type} or target_attribute is not supported.`);
        }
    }

    // ** Execute Skill (Active Skills) **
    async executeSkill(character: Character, skillId: string, target: Character | null, skillsData: Skill[]) {
        if (!character.stats) return;
        const skill = skillsData.find(s => s.id === skillId);
        if (!skill || skill.type !== "active") {
            console.log("Skill not found or is not active.");
            return;
        }

        if (!character.skills?.includes(skillId)) {
            console.log(`${character.name} has not unlocked the skill ${skill.name}.`);
            return;
        }

        if (character.cooldowns?.[skillId] && character.cooldowns[skillId] > 0) {
            console.log(`${skill.name} is on cooldown for ${character.cooldowns[skillId]} more turns.`);
            return;
        }

        if (skill.resourceCost?.mana && (character?.stats?.mp?.current && character.stats.mp.current < skill.resourceCost.mana)) {
            console.log(`${character.name} does not have enough mana to use ${skill.name}.`);
            return;
        }

        character.stats.mp.current -= skill.resourceCost?.mana || 0;
        console.log(`${character.name} uses ${skill.name}, remaining MP: ${character.stats.mp.current}`);
        this.applyEffects(character, skill.effects || [], target, "immediate");
    }

    // ** Apply Multiple Effects **
    applyEffects(
        character: Character,
        effects: SkillEffect[],
        target: Character | null,
        phase: "immediate" | "turn_start" | "turn_end" | "event"
    ) {
        effects.forEach(effect => {
            if (effect.trigger_phase === phase) {
                this.applyEffect(character, effect, target);
            }
        });
    }

    // ** Check Skill Triggers (Passive Skills) **
    async checkSkillTriggers(character: Character, event: string, target: Character | null, skillsData: Skill[]) {
        this.engine = new Engine();

        character.skills?.forEach(skillId => {
            const skill = skillsData.find(s => s.id === skillId);
            skill?.triggerConditions?.forEach((conditionSet: ConditionSet) => {
                this.engine.addRule({
                    conditions: conditionSet.conditions,
                    event: {
                        type: "trigger_skill",
                        params: {
                            skillId: skill.id,
                            effects: conditionSet.effects,
                        },
                    },
                });
            });
        });

        const facts = { event, hp: character.stats?.hp.current };

        this.engine.on<TriggerSkillParams>("trigger_skill", async (params) => {
            if (params?.effects) {
                this.applyEffects(character, params.effects, target, "event");
            }
        });

        await this.engine.run(facts);
    }

    // ** Check Skill Unlocks **
    checkSkillUnlocks(character: Character, skillsData: Skill[], questsCompleted: string[]) {
        skillsData.forEach(skill => {
            if (character.skills?.includes(skill.id)) return;

            const unlockConditions = skill.unlockConditions || {};
            const meetsLevel = unlockConditions.level === undefined || character.level >= unlockConditions.level;
            const meetsQuests =
                unlockConditions.questsCompleted?.every(quest => questsCompleted.includes(quest)) ?? true;

            if (meetsLevel && meetsQuests) {
                character.skills?.push(skill.id);
                console.log(`${character.name} has unlocked the skill: ${skill.name}`);
            }
        });
    }

    // ** Process Turn-Based Effects **
    processTurnEffects(character: Character, phase: "turn_start" | "turn_end") {
        console.log(`${character.name}: Processing effects for phase: ${phase}`);
        this.triggerEffects(character, { phase }, null);
    }
}

export default SkillManager;

// import { Character, Skill, SkillEffect, Stats } from "component/kumu/service/model/CharacterModels";
// import { Engine, TopLevelCondition } from "json-rules-engine";
// import { skillEffectFunctions } from "./skillEffectFunctions";

// type NumericStatKey = {
//     [K in keyof Stats]: Stats[K] extends number ? K : never;
// }[keyof Stats];

// interface TriggerSkillParams {
//     skillId: string;
//     effects: SkillEffect[];
// }

// interface ConditionSet {
//     conditions: TopLevelCondition;
//     effects: SkillEffect[];
// }

// // ** Trigger Effects by Phase or Event **
// export const triggerEffects = (
//     character: Character,
//     options: { phase?: "immediate" | "turn_start" | "turn_end"; event?: string },
//     target: Character | null
// ) => {
//     const { phase, event } = options;

//     character.statusEffects = character.statusEffects?.filter(effect => {
//         if ((phase && effect.trigger_phase === phase) || (event && effect.trigger_event === event)) {
//             applyEffect(character, effect, target);
//         }

//         // Decrease remaining duration if applicable
//         if (effect.remaining_duration !== undefined) {
//             effect.remaining_duration -= 1;
//             if (effect.remaining_duration <= 0) {
//                 console.log(`${effect.name} has expired.`);
//                 return false; // Remove expired effect
//             }
//         }
//         return true; // Keep valid effect
//     });
// };

// // ** Apply a Single Effect **
// export const applyEffect = (character: Character, effect: SkillEffect, target: Character | null) => {
//     let effectValue: string | number = effect.value;

//     // 如果值是字符串，则通过技能效果计算函数动态计算值
//     if (typeof effectValue === "string" && effectValue in skillEffectFunctions) {
//         const effectFunction = skillEffectFunctions[effectValue as keyof typeof skillEffectFunctions];
//         effectValue = effectFunction(character, target);
//     }

//     const finalValue = Math.ceil(Number(effectValue));

//     // **处理直接效果：damage 和 heal**
//     if (effect.effect_type === "damage" && target?.stats?.hp?.current) {
//         target.stats.hp.current = Math.max(0, target.stats.hp.current - finalValue);
//         console.log(`${target.name} takes ${finalValue} damage.`);
//     } else if (effect.effect_type === "heal" && character.stats?.hp?.current) {
//         character.stats.hp.current = Math.min(character.stats.hp.max, character.stats.hp.current + finalValue);
//         console.log(`${character.name} heals ${finalValue} HP.`);
//     }

//     // **处理持续性效果：dot, hot, buff, debuff**
//     else if (["dot", "hot", "buff", "debuff"].includes(effect.effect_type)) {
//         target?.statusEffects?.push({ ...effect, value: finalValue });
//         console.log(`${target?.name} is affected by ${effect.name} (${effect.effect_type}) for ${effect.remaining_duration} turns.`);
//     }

//     // **处理对 `Stats` 的直接修改：buff 和 debuff**
//     else if (effect.target_attribute) {
//         // 判断 `target_attribute` 是否为简单数值类型
//         const isNumericStat = (effect.target_attribute as NumericStatKey) in character.stats;

//         if (isNumericStat) {
//             // 简单数值类型（如 attack, speed）
//             const statKey = effect.target_attribute as NumericStatKey;
//             const modifier = effect.effect_type === "buff" ? +finalValue : -finalValue;
//             character.stats[statKey] = (character.stats[statKey] || 0) + modifier;
//             console.log(`${character.name}'s ${statKey} is adjusted by ${modifier}. New value: ${character.stats[statKey]}`);
//         } else {
//             // 复合类型（如 hp, mp）
//             const targetStat = character.stats[effect.target_attribute];
//             if (typeof targetStat === "object" && targetStat !== null && "current" in targetStat && "max" in targetStat) {
//                 const modifier = effect.effect_type === "buff" ? +finalValue : -finalValue;
//                 targetStat.current = Math.min(targetStat.max, Math.max(0, targetStat.current + modifier));
//                 console.log(`${character.name}'s ${effect.target_attribute}.current is adjusted by ${modifier}. New value: ${targetStat.current}`);
//             } else {
//                 console.warn(`Unsupported target_attribute: ${effect.target_attribute}`);
//             }
//         }
//     } else {
//         console.warn(`Effect type ${effect.effect_type} or target_attribute is not supported.`);
//     }
// };


// // ** Execute Skill (Active Skills) **
// export const executeSkill = async (
//     character: Character,
//     skillId: string,
//     target: Character | null,
//     skillsData: Skill[]
// ) => {
//     const skill = skillsData.find(s => s.id === skillId);
//     if (!skill || skill.type !== "active") {
//         console.log("Skill not found or is not active.");
//         return;
//     }

//     if (!character.skills?.includes(skillId)) {
//         console.log(`${character.name} has not unlocked the skill ${skill.name}.`);
//         return;
//     }

//     if (character.cooldowns?.[skillId] && character.cooldowns[skillId] > 0) {
//         console.log(`${skill.name} is on cooldown for ${character.cooldowns[skillId]} more turns.`);
//         return;
//     }

//     if (skill.resourceCost?.mana && (character?.stats?.mp?.current && character.stats.mp.current < skill.resourceCost.mana)) {
//         console.log(`${character.name} does not have enough mana to use ${skill.name}.`);
//         return;
//     }

//     character.stats.mp.current -= skill.resourceCost?.mana || 0;
//     // character.cooldowns[skillId] = skill.cooldown || 0;
//     console.log(`${character.name} uses ${skill.name}, remaining MP: ${character.stats.mp.current}`);
//     applyEffects(character, skill.effects || [], target, "immediate");
// };

// // ** Apply Multiple Effects **
// export const applyEffects = (
//     character: Character,
//     effects: SkillEffect[],
//     target: Character | null,
//     phase: "immediate" | "turn_start" | "turn_end" | "event"
// ) => {
//     effects.forEach(effect => {
//         if (effect.trigger_phase === phase) {
//             applyEffect(character, effect, target);
//         }
//     });
// };

// // ** Check Skill Triggers (Passive Skills) **
// export const checkSkillTriggers = async (
//     character: Character,
//     event: string,
//     target: Character | null,
//     skillsData: Skill[]
// ) => {
//     const engine = new Engine();

//     character.skills?.forEach(skillId => {
//         const skill = skillsData.find(s => s.id === skillId);
//         skill?.triggerConditions?.forEach(conditionSet => {
//             engine.addRule({
//                 conditions: conditionSet.conditions,
//                 event: {
//                     type: "trigger_skill",
//                     params: {
//                         skillId: skill.id,
//                         effects: conditionSet.effects,
//                     },
//                 },
//             });
//         });
//     });

//     const facts = { event, hp: character.stats?.hp.current };

//     engine.on<TriggerSkillParams>("trigger_skill", async (params) => {
//         if (params?.effects) {
//             applyEffects(character, params.effects, target, "event");
//         }
//     });

//     await engine.run(facts);
// };

// // ** Check Skill Unlocks **
// export const checkSkillUnlocks = async (
//     character: Character,
//     skillsData: Skill[],
//     questsCompleted: string[]
// ) => {
//     skillsData.forEach(skill => {
//         if (character.skills?.includes(skill.id)) return;

//         const unlockConditions = skill.unlockConditions || {};
//         const meetsLevel = unlockConditions.level === undefined || character.level >= unlockConditions.level;
//         const meetsQuests =
//             unlockConditions.questsCompleted?.every(quest => questsCompleted.includes(quest)) ?? true;

//         if (meetsLevel && meetsQuests) {
//             character.skills?.push(skill.id);
//             console.log(`${character.name} has unlocked the skill: ${skill.name}`);
//         }
//     });
// };

// // ** Process Turn-Based Effects **
// export const processTurnEffects = (character: Character, phase: "turn_start" | "turn_end") => {
//     console.log(`${character.name}: Processing effects for phase: ${phase}`);
//     triggerEffects(character, { phase }, null);
// };


