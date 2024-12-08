
import { Character, Skill, SkillEffect, Stats } from "component/kumu/battle/model/CharacterModels";
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
    async triggerEffects(
        character: Character,
        options: { phase?: "round_start" | "round_end" | "turn_start" | "turn_end"; event?: string },
        target: Character | null
    ): Promise<void> {
        const { phase, event } = options;

        // 创建一个数组，用于收集所有 applyEffect 的异步调用
        const effectPromises: Promise<void>[] = [];

        character.statusEffects = character.statusEffects?.filter((effect) => {
            if ((phase && effect.trigger_phase === phase) || (event && effect.trigger_event === event)) {
                // 包装 applyEffect 为一个 Promise
                const effectPromise = new Promise<void>((resolve) => {
                    this.applyEffect(character, effect, target);
                    resolve(); // 因为 applyEffect 是同步的，调用后直接 resolve
                });
                effectPromises.push(effectPromise);
            }

            // 处理持续时间减少逻辑
            if (phase === "turn_end" && effect.remaining_duration !== undefined) {
                effect.remaining_duration -= 1;
                if (effect.remaining_duration <= 0) {
                    console.log(`${effect.name} has expired.`);
                    return false; // 移除过期效果
                }
            }

            return true; // 保留未过期效果
        }) || [];

        // 等待所有包装的 Promise 完成
        await Promise.all(effectPromises);
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

        // ** 设置冷却时间 **
        character.cooldowns = character.cooldowns || {};
        character.cooldowns[skillId] = skill.cooldown || 0;

        console.log(`${character.name} uses ${skill.name}, remaining MP: ${character.stats.mp.current}`);
        // const effects = skill.effects?.filter((eff) => eff.trigger_phase === "immediate" || (!eff.trigger_phase && !eff.trigger_event))
        skill.effects?.forEach((effect) => {
            this.applyEffect(character, effect, target);
        })
    }

    // ** Check Skill Triggers (Passive Skills) **
    async triggerSkills(character: Character, options: { phase?: "round_start" | "round_end" | "turn_start" | "turn_end"; event?: string }, target: Character | null, skillsData: Skill[]) {
        this.engine = new Engine();

        // 收集所有触发的事件和效果处理的 Promise
        const eventPromises: Promise<void>[] = [];

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

        const { phase, event } = options;
        const facts = { event, phase, hp: character.stats?.hp.current };

        this.engine.on<TriggerSkillParams>("trigger_skill", async (params) => {
            const eventPromise = (async () => {
                if (params?.effects) {
                    const targets: (Character | null)[] = [];
                    const skillId = params.skillId;
                    const skill = skillsData.find(s => s.id === skillId);

                    if (target === null) {
                        if (skill?.range?.area_type === "aoe") {
                            targets.push(null);
                        }
                    } else {
                        targets.push(target);
                    }

                    // 收集所有 applyEffect 的 Promise
                    const effectPromises = params.effects.map((effect) =>
                        Promise.all(
                            targets.map((t) => this.applyEffect(character, effect, t))
                        )
                    );

                    // 等待所有效果应用完成
                    await Promise.all(effectPromises);
                }
            })();

            // 将事件 Promise 添加到数组中
            eventPromises.push(eventPromise);
        });

        await this.engine.run(facts);

        // 等待所有事件和效果处理完成
        await Promise.all(eventPromises);
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
    // ** Process Passive Skills **
    processTurnSkills(character: Character, phase: "turn_start" | "turn_end", skillData: Skill[]) {
        console.log(`${character.name}: Processing skills for phase: ${phase}`);
        this.triggerSkills(character, { phase }, null, skillData);
    }
    processRoundSkills(character: Character, phase: "round_start" | "round_end", skillData: Skill[]) {
        console.log(`${character.name}: Processing skills for phase: ${phase}`);
        this.triggerSkills(character, { phase }, null, skillData);
    }
    processEventSkills(character: Character, event: string, skillData: Skill[]) {
        console.log(`${character.name}: Processing skills for event: ${event}`);
        this.triggerSkills(character, { event }, null, skillData);
    }
    // ** Process Status Effects **
    processTurnEffects(character: Character, phase: "turn_start" | "turn_end") {
        console.log(`${character.name}: Processing effects for phase: ${phase}`);
        this.triggerEffects(character, { phase }, null);
    }
    processRoundEffects(character: Character, phase: "round_start" | "round_end") {
        console.log(`${character.name}: Processing effects for phase: ${phase}`);
        this.triggerEffects(character, { phase }, null);
    }
    processEventEffects(character: Character, event: string) {
        console.log(`${character.name}: Processing effects for event: ${event}`);
        this.triggerEffects(character, { event }, null);
    }
    // ** Reduce Cooldowns **
    reduceCooldowns(character: Character) {
        for (const skillId in character.cooldowns) {
            if (character.cooldowns[skillId] > 0) {
                character.cooldowns[skillId] -= 1;
                if (character.cooldowns[skillId] === 0) {
                    console.log(`${skillId} is now ready to use.`);
                }
            }
        }
    }
}

export default SkillManager;

