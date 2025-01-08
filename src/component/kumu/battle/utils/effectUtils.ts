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

        const isDebuff = effect.type === EffectType.DEBUFF;
        const multiplier = effect.modifier_type === 'multiply' 
            ? (isDebuff ? (1 - value) : (1 + value))
            : (isDebuff ? -value : value);

        if (statValue) {
            if (typeof statValue === 'number') {
                (stats[statKey] as number) = statValue * multiplier;
            } else if ('current' in statValue) {
                statValue.current = Math.round(statValue.current * multiplier);
            }
        }
    });
};

export const applyEffect = (target: GameCharacter, effect: Effect): void => {
    if (!target.activeEffects) {
        target.activeEffects = [];
    }

    // 检查并更新已存在的效果
    const existingEffect = target.activeEffects.find(e => e.id === effect.id);
    if (existingEffect) {
        existingEffect.remaining_duration = effect.duration;
        return;
    }

    // 添加新效果
    const newEffect = { ...effect, remaining_duration: effect.duration };
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
    }
};

export const updateEffects = (character: GameCharacter): void => {
    if (!character.activeEffects) return;

    character.activeEffects = character.activeEffects.filter(effect => {
        if (!effect.remaining_duration) return false;

        // 护盾效果特殊处理
        if (effect.type === EffectType.SHIELD && character.stats?.shield?.current === 0) {
            removeEffect(character, effect);
            return false;
        }

        effect.remaining_duration--;
        if (effect.remaining_duration <= 0) {
            removeEffect(character, effect);
            return false;
        }
        return true;
    });
};

export const removeEffect = (target: GameCharacter, effect: Effect): void => {
    if (!target.activeEffects) return;

    // 移除效果
    target.activeEffects = target.activeEffects.filter(e => e.id !== effect.id);

    // 清除效果影响
    switch (effect.type) {
        case EffectType.BUFF:
        case EffectType.DEBUFF:
            handleStatModifiers(target, {
                ...effect,
                modifiers: Object.fromEntries(
                    Object.entries(effect.modifiers || {}).map(([k, v]) => [k, -v])
                )
            });
            break;
        case EffectType.SHIELD:
            if (target.stats?.shield) {
                target.stats.shield.current = 0;
                target.stats.shield.max = 0;
            }
            break;
        case EffectType.STUN:
            target.status = 'normal';
            break;
    }
};

// 添加属性加成计算
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

// 计算伤害
export const calculateDamage = (attacker: GameCharacter, target: GameCharacter, effect: Effect): number => {
    let damage = effect.value || 0;
    
    if (effect.type === EffectType.DOT) {
        damage = effect.value || 0;
    } else {
        if (attacker.stats?.attack) {
            damage *= (1 + attacker.stats.attack * 0.01);
        }
        if (attacker.stats?.intelligence && effect.damage_type === 'magical') {
            damage *= (1 + attacker.stats.intelligence * 0.01);
        }
    }

    if (target.stats?.defense) {
        const defenseReduction = target.stats.defense / (target.stats.defense + 100);
        damage *= (1 - defenseReduction);
    }

    if (attacker.stats?.crit_rate) {
        const critChance = Math.min(attacker.stats.crit_rate, 100) / 100;
        if (Math.random() < critChance) {
            damage *= 1.5;
            console.log('暴击！');
        }
    }

    if (target.stats?.shield?.current) {
        const shieldDamage = Math.min(target.stats.shield.current, damage);
        target.stats.shield.current -= shieldDamage;
        console.log(`护盾抵消了 ${shieldDamage} 点伤害，剩余护盾值：${target.stats.shield.current}`);
        damage -= shieldDamage;
    }

    if (target.stats?.hp) {
        target.stats.hp.current -= Math.max(0, Math.round(damage));
    }

    return damage;
};

// 计算效果值
export const calculateEffectValue = (caster: GameCharacter, target: GameCharacter, effect: Effect, distance?: number): Effect => {
    let finalEffect = { ...effect };

    // 处理距离衰减
    if (effect.value && effect.damage_falloff && distance !== undefined) {
        if (distance > effect.damage_falloff.full_damage_range) {
            finalEffect.value = effect.value * effect.damage_falloff.min_damage_percent;
        }
    }

    // 根据效果类型计算最终值
    switch (effect.type) {
        case EffectType.DOT:
        case EffectType.DEBUFF:
            if (effect.damage_type) {
                finalEffect.value = calculateDamage(caster, target, finalEffect);
            }
            break;

        case EffectType.HOT:
        case EffectType.MP_RESTORE:
            if (caster.stats?.intelligence) {
                const intBonus = calculateAttributeBonus(caster.stats.intelligence, 'intelligence');
                finalEffect.value = (finalEffect.value || 0) * intBonus;
            }
            break;

        case EffectType.SHIELD:
            const intBonus = calculateAttributeBonus(caster.stats?.intelligence, 'intelligence');
            const defBonus = calculateAttributeBonus(caster.stats?.defense, 'defense');
            finalEffect.value = (finalEffect.value || 0) * intBonus * defBonus;
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
            finalEffect.duration = Math.round(finalEffect.duration * durationBonus);
        }
    } else if (effect.type === EffectType.DEBUFF || effect.type === EffectType.DOT) {
        if (target.stats?.status_resistance) {
            const resistanceReduction = 1 - target.stats.status_resistance * 0.01;
            finalEffect.duration = Math.round(finalEffect.duration * resistanceReduction);
        }
    }

    return finalEffect;
}; 