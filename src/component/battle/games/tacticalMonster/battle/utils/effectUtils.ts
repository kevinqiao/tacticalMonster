/**
 * Tactical Monster 效果系统工具函数
 * 处理技能效果的应用、计算、移除和更新
 */

import { Effect, EffectType, Stats } from "../types/CharacterTypes";
import { GameCharacter } from "../types/CombatTypes";

// 处理直接效果（生命值、魔法值的变化）
const handleDirectEffect = (target: GameCharacter, effect: Effect) => {
    if (!target.stats) return;

    switch (effect.type) {
        case EffectType.HOT:
            if (target.stats.hp) {
                target.stats.hp.current = Math.min(
                    target.stats.hp.current + (effect.value || 0),
                    target.stats.hp.max
                );
            }
            break;
        case EffectType.MP_RESTORE:
            if (target.stats.mp) {
                target.stats.mp.current = Math.min(
                    target.stats.mp.current + (effect.value || 0),
                    target.stats.mp.max
                );
            }
            break;
        case EffectType.MP_DRAIN:
            if (target.stats.mp) {
                target.stats.mp.current = Math.max(
                    0,
                    target.stats.mp.current - (effect.value || 0)
                );
            }
            break;
    }
};

// 处理状态效果
const handleStatusEffect = (target: GameCharacter, effect: Effect) => {
    switch (effect.type) {
        case EffectType.STUN:
            target.status = 'stunned';
            break;
        case EffectType.SHIELD:
            if (!target.stats) {
                target.stats = {};
            }
            if (!target.stats.shield) {
                target.stats.shield = { current: 0, max: 0 };
            }
            target.stats.shield.current += effect.value || 0;
            target.stats.shield.max = Math.max(
                target.stats.shield.max,
                target.stats.shield.current
            );
            break;
    }
};

// 处理属性修改
const handleStatModifiers = (target: GameCharacter, effect: Effect) => {
    if (!effect.modifiers || !target.stats) return;
    const stats = target.stats;

    Object.entries(effect.modifiers).forEach(([stat, value]) => {
        const statKey = stat as keyof Stats;
        const statValue = stats[statKey];

        if (effect.modifier_type === 'multiply') {
            // 乘法修改器
            if (statValue) {
                if (typeof statValue === 'number') {
                    (stats[statKey] as number) = statValue * (effect.type === EffectType.DEBUFF ? (1 - value) : (1 + value));
                } else if ('current' in statValue && 'max' in statValue) {
                    const multiplier = effect.type === EffectType.DEBUFF ? (1 - value) : (1 + value);
                    statValue.current = Math.round(statValue.current * multiplier);
                    statValue.max = Math.round(statValue.max * multiplier);
                }
            }
        } else {
            // 加法修改器
            if (statValue) {
                if (typeof statValue === 'number') {
                    (stats[statKey] as number) = statValue + (effect.type === EffectType.DEBUFF ? -value : value);
                } else if ('current' in statValue && 'max' in statValue) {
                    const addValue = effect.type === EffectType.DEBUFF ? -value : value;
                    statValue.current = Math.max(0, statValue.current + addValue);
                    statValue.max = Math.max(statValue.max, statValue.max + addValue);
                }
            }
        }
    });
};

/**
 * 应用效果到目标角色
 */
export const applyEffect = (target: GameCharacter, effect: Effect): void => {
    if (!target.activeEffects) {
        target.activeEffects = [];
    }

    // 检查并更新已存在的效果（相同ID的效果）
    const existingEffect = target.activeEffects.find(e => e.id === effect.id);
    if (existingEffect) {
        existingEffect.remaining_duration = effect.duration;
        // 更新效果值（如果是可叠加的效果）
        if (effect.value !== undefined) {
            existingEffect.value = effect.value;
        }
        return;
    }

    // 添加新效果
    const newEffect = { ...effect, remaining_duration: effect.duration || effect.remaining_duration || 0 };
    target.activeEffects.push(newEffect);

    // 应用效果
    switch (effect.type) {
        case EffectType.BUFF:
        case EffectType.DEBUFF:
            handleStatModifiers(target, newEffect);
            break;
        case EffectType.DOT:
        case EffectType.HOT:
            handleDirectEffect(target, newEffect);
            break;
        case EffectType.STUN:
        case EffectType.SHIELD:
            handleStatusEffect(target, newEffect);
            break;
        case EffectType.MP_RESTORE:
        case EffectType.MP_DRAIN:
            handleDirectEffect(target, newEffect);
            break;
    }
};

/**
 * 更新角色的持续效果（每回合结束时调用）
 */
export const updateEffects = (character: GameCharacter): void => {
    if (!character.activeEffects) return;

    character.activeEffects = character.activeEffects.filter(effect => {
        if (!effect.remaining_duration || effect.remaining_duration <= 0) {
            removeEffect(character, effect);
            return false;
        }

        // 处理持续伤害/治疗（DOT/HOT）
        if (effect.type === EffectType.DOT) {
            // 每回合造成伤害
            if (character.stats?.hp && effect.value) {
                const damage = Math.round(effect.value);
                character.stats.hp.current = Math.max(0, character.stats.hp.current - damage);
            }
        } else if (effect.type === EffectType.HOT) {
            // 每回合恢复生命
            if (character.stats?.hp && effect.value) {
                const heal = Math.round(effect.value);
                character.stats.hp.current = Math.min(
                    character.stats.hp.max,
                    character.stats.hp.current + heal
                );
            }
        }

        // 护盾效果特殊处理
        if (effect.type === EffectType.SHIELD && character.stats?.shield?.current === 0) {
            removeEffect(character, effect);
            return false;
        }

        // 减少持续时间
        effect.remaining_duration--;
        if (effect.remaining_duration <= 0) {
            removeEffect(character, effect);
            return false;
        }
        return true;
    });
};

/**
 * 移除效果
 */
export const removeEffect = (target: GameCharacter, effect: Effect): void => {
    if (!target.activeEffects) return;

    // 移除效果
    target.activeEffects = target.activeEffects.filter(e => e.id !== effect.id);

    // 清除效果影响（恢复属性）
    switch (effect.type) {
        case EffectType.BUFF:
        case EffectType.DEBUFF:
            // 恢复属性修改
            if (effect.modifiers) {
                const reverseModifiers = Object.fromEntries(
                    Object.entries(effect.modifiers).map(([k, v]) => [k, effect.modifier_type === 'multiply' ? 1 / v : -v])
                );
                handleStatModifiers(target, {
                    ...effect,
                    modifiers: reverseModifiers,
                    modifier_type: effect.modifier_type
                });
            }
            break;
        case EffectType.SHIELD:
            if (target.stats?.shield) {
                // 护盾移除时不清零，只移除效果标记
                // 护盾值会在被攻击时自然消耗
            }
            break;
        case EffectType.STUN:
            target.status = 'normal';
            break;
    }
};

/**
 * 计算属性加成
 */
export const calculateAttributeBonus = (attribute: number | undefined, type: 'intelligence' | 'defense' | 'attack'): number => {
    if (!attribute) return 1;

    switch (type) {
        case 'intelligence':
            return 1 + (attribute * 0.005) + (Math.floor(attribute / 10) * 0.01);
        case 'defense':
            return 1 + (attribute * 0.003) + (Math.floor(attribute / 15) * 0.005);
        case 'attack':
            return 1 + (attribute * 0.008) + (Math.floor(attribute / 8) * 0.012);
        default:
            return 1;
    }
};

/**
 * 计算伤害
 */
export const calculateDamage = (attacker: GameCharacter, target: GameCharacter, effect: Effect): number => {
    let damage = effect.value || 0;

    // DOT伤害直接使用效果值
    if (effect.type === EffectType.DOT) {
        return damage;
    }

    // 根据攻击者属性计算伤害
    if (attacker.stats?.attack && effect.damage_type !== 'magical') {
        damage += attacker.stats.attack * 0.5; // 物理伤害加成
    }
    if (attacker.stats?.intelligence && effect.damage_type === 'magical') {
        damage += attacker.stats.intelligence * 0.8; // 魔法伤害加成
    }

    // 防御减免
    if (target.stats?.defense) {
        const defenseReduction = target.stats.defense / (target.stats.defense + 100);
        damage *= (1 - defenseReduction);
    }

    // 暴击计算
    if (attacker.stats?.crit_rate) {
        const critChance = Math.min(attacker.stats.crit_rate, 1);
        if (Math.random() < critChance) {
            damage *= 1.5;
        }
    }

    // 护盾吸收
    if (target.stats?.shield?.current) {
        const shieldDamage = Math.min(target.stats.shield.current, damage);
        target.stats.shield.current -= shieldDamage;
        damage -= shieldDamage;
    }

    // 应用伤害
    const finalDamage = Math.max(0, Math.round(damage));
    if (target.stats?.hp) {
        target.stats.hp.current = Math.max(0, target.stats.hp.current - finalDamage);
    }

    return finalDamage;
};

/**
 * 计算效果值（考虑距离衰减、属性加成等）
 */
export const calculateEffectValue = (
    caster: GameCharacter,
    target: GameCharacter,
    effect: Effect,
    distance?: number
): Effect => {
    let finalEffect = { ...effect };

    // 处理距离衰减
    if (effect.value && effect.damage_falloff && distance !== undefined) {
        if (distance > effect.damage_falloff.full_damage_range) {
            const falloffPercent = effect.damage_falloff.min_damage_percent / 100;
            finalEffect.value = Math.round((effect.value || 0) * falloffPercent);
        }
    }

    // 根据效果类型计算最终值
    switch (effect.type) {
        case EffectType.DOT:
        case EffectType.DEBUFF:
            if (effect.damage_type) {
                // 伤害类效果，使用calculateDamage计算
                const damage = calculateDamage(caster, target, finalEffect);
                finalEffect.value = damage;
            }
            break;

        case EffectType.HOT:
        case EffectType.MP_RESTORE:
            if (caster.stats?.intelligence) {
                const intBonus = calculateAttributeBonus(caster.stats.intelligence, 'intelligence');
                finalEffect.value = Math.round((finalEffect.value || 0) * intBonus);
            }
            break;

        case EffectType.SHIELD:
            const intBonus = calculateAttributeBonus(caster.stats?.intelligence, 'intelligence');
            const defBonus = calculateAttributeBonus(caster.stats?.defense, 'defense');
            finalEffect.value = Math.round((finalEffect.value || 0) * intBonus * defBonus);
            break;

        case EffectType.BUFF:
            if (finalEffect.modifiers && caster.stats?.intelligence) {
                const intelligenceBonus = calculateAttributeBonus(caster.stats.intelligence, 'intelligence');
                finalEffect.modifiers = Object.fromEntries(
                    Object.entries(finalEffect.modifiers).map(([k, v]) => [k, v * intelligenceBonus])
                );
            }
            break;
    }

    // 处理效果持续时间修正
    if (effect.type === EffectType.BUFF || effect.type === EffectType.HOT) {
        if (caster.stats?.intelligence) {
            const durationBonus = 1 + caster.stats.intelligence * 0.005;
            finalEffect.duration = Math.round((finalEffect.duration || 0) * durationBonus);
        }
    } else if (effect.type === EffectType.DEBUFF || effect.type === EffectType.DOT) {
        if (target.stats?.status_resistance) {
            const resistanceReduction = 1 - target.stats.status_resistance * 0.01;
            finalEffect.duration = Math.round((finalEffect.duration || 0) * resistanceReduction);
        }
    }

    return finalEffect;
};

