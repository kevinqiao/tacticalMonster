import { Character, Skill, SkillEffect } from "component/kumu/service/model/characters/CharacterAttributes";
import { Engine, TopLevelCondition } from 'json-rules-engine';
import { skillEffectFunctions } from "./skillEffectFunctions";

interface TriggerSkillParams {
    skillId: string;
    effects: SkillEffect[];
}

interface ConditionSet {
    conditions: TopLevelCondition; // Use the correct type from json-rules-engine
    effects: SkillEffect[];
}
// ** Check Skill Unlocks **
const checkSkillUnlocks = async (character: Character, skillsData: Skill[]) => {
    skillsData.forEach(skill => {
        // Skip if the skill is already unlocked
        if (character.skills.includes(skill.id)) return;

        const unlockConditions = skill.unlockConditions || {};

        // Check level requirement
        const meetsLevel = unlockConditions.level === undefined || character.level >= unlockConditions.level;

        // Check quest completion requirement
        const meetsQuests =
            unlockConditions.questsCompleted === undefined ||
            unlockConditions.questsCompleted.every((quest: string) => character.questsCompleted.includes(quest));

        // Unlock the skill if all conditions are met
        if (meetsLevel && meetsQuests) {
            character.skills.push(skill.id);
            console.log(`${character.name} has unlocked the skill: ${skill.name}`);
        }
    });
};


// ** Check Passive Skill Triggers **
const checkPassiveSkillTriggers = async (
    character: Character,
    triggerEvent: string,
    target: Character | null,
    skillsData: any[]
) => {
    const engine = new Engine();

    character.skills.forEach(skillId => {
        const skill = skillsData.find(s => s.id === skillId);
        if (skill && skill.type === 'passive' && skill.triggerConditions) {
            skill.triggerConditions.forEach((conditionSet: ConditionSet) => {
                engine.addRule({
                    conditions: conditionSet.conditions,
                    event: {
                        type: 'trigger_skill',
                        params: {
                            skillId: skill.id,
                            effects: conditionSet.effects,
                        }
                    }
                });
            });
        }
    });

    const facts = {
        event: triggerEvent,
        chance: character.stats.crit_rate,
        health: character.stats.hp.current,
    };

    engine.on<TriggerSkillParams>('trigger_skill', async (params) => {
        if (params.effects && Array.isArray(params.effects)) {
            applyEffects(character, params.effects, target);
        } else {
            console.error("Invalid params passed to trigger_skill event:", params);
        }
    });

    await engine.run(facts);
};

// ** Execute Skill **
const executeSkill = async (character: Character, skillId: string, target: Character | null, skillsData: any[]) => {
    const skill = skillsData.find(s => s.id === skillId);
    if (!skill || skill.type !== "active") {
        console.log("Skill not found or is not active.");
        return;
    }

    if (!character.skills.includes(skillId)) {
        console.log(`${character.name} has not unlocked the skill ${skill.name}.`);
        return;
    }

    if (character.cooldowns[skillId] && character.cooldowns[skillId] > 0) {
        console.log(`${skill.name} is on cooldown for ${character.cooldowns[skillId]} more turns.`);
        return;
    }

    if (skill.resourceCost && character.stats.mp.current < skill.resourceCost.mana) {
        console.log(`${character.name} does not have enough mana to use ${skill.name}.`);
        return;
    }

    character.stats.mp.current -= skill.resourceCost.mana;
    character.cooldowns[skillId] = skill.cooldown;
    console.log(`${character.name} uses ${skill.name}, remaining MP: ${character.stats.mp.current}`);

    applyEffects(character, skill.effects, target);
};

// ** Apply Effects **
const applyEffects = (character: Character, effects: SkillEffect[], target: Character | null) => {
    effects.forEach(effect => {
        let effectValue: string | number = effect.value;
        if (typeof effectValue === 'string' && effectValue in skillEffectFunctions) {
            const effectFunction = skillEffectFunctions[effectValue as keyof typeof skillEffectFunctions];
            effectValue = effectFunction(character, target);
        }

        const finalValue = Math.ceil(Number(effectValue));

        if (effect.effect_type === "damage" && target) {
            target.stats.hp.current = Math.max(0, target.stats.hp.current - finalValue);
            console.log(`${target.name} takes ${finalValue} damage.`);
        } else if (effect.effect_type === "heal" && target) {
            target.stats.hp.current = Math.min(target.stats.hp.max, target.stats.hp.current + finalValue);
            console.log(`${target.name} heals ${finalValue} HP.`);
        } else if (["dot", "buff", "debuff"].includes(effect.effect_type)) {
            if (target) {
                // Check if a similar effect already exists
                const existingEffect = target.statusEffects.find(
                    e =>
                        e.name === effect.name &&
                        e.effect_type === effect.effect_type &&
                        e.target_attribute === effect.target_attribute
                );

                if (existingEffect) {
                    // Update the existing effect's duration or value if needed
                    existingEffect.remaining_duration = Math.max(
                        existingEffect.remaining_duration ?? 0,
                        effect.remaining_duration ?? 0
                    );
                    existingEffect.value = Math.max(+existingEffect.value, finalValue);
                    console.log(`${target.name}'s existing effect ${effect.name} (${effect.effect_type}) is updated.`);
                } else {
                    // Add new effect if not already present
                    target.statusEffects.push({
                        name: effect.name,
                        effect_type: effect.effect_type,
                        target_attribute: effect.target_attribute,
                        value: finalValue,
                        remaining_duration: effect.remaining_duration,
                    });
                    console.log(`${target.name} is affected by ${effect.name} (${effect.effect_type}) for ${effect.remaining_duration} turns.`);
                }
            }
        }
    });
};

// ** Reduce Cooldowns **
const reduceCooldowns = (character: Character) => {
    for (const skillId in character.cooldowns) {
        if (character.cooldowns[skillId] > 0) {
            character.cooldowns[skillId] -= 1;
            if (character.cooldowns[skillId] === 0) {
                console.log(`${skillId} is now ready to use.`);
            }
        }
    }
};

// ** Process Status Effects **
const processStatusEffects = (character: Character) => {
    character.statusEffects.forEach((effect, index) => {
        if (effect.remaining_duration && effect.remaining_duration > 0) {
            effect.remaining_duration -= 1;

            if (effect.effect_type === "dot" && typeof effect.value === "number") {
                character.stats.hp.current = Math.max(0, character.stats.hp.current - effect.value);
                console.log(`${character.name} takes ${effect.value} DOT damage. Remaining HP: ${character.stats.hp.current}`);
            }
        }

        if (!effect.remaining_duration || effect.remaining_duration <= 0) {
            console.log(`${effect.name} effect has expired.`);
            character.statusEffects.splice(index, 1);
        }
    });
};

export { checkPassiveSkillTriggers, checkSkillUnlocks, executeSkill, processStatusEffects, reduceCooldowns };

