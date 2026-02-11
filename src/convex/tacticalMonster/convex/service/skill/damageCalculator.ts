/**
 * 伤害计算与属性工具
 * 供 DamageHandler 和 SkillManager 使用，避免循环依赖。
 * getEffectiveStat 汇总 BUFF/DEBUFF 修正，calculateDamage 使用其参与公式计算。
 */

import type { GameMonster } from "../../types/monsterTypes";
import type { SkillEffect } from "../../types/skillTypes";

/**
 * 获取考虑 BUFF/DEBUFF 后的有效属性值（方案 B：不修改基础属性，动态计算）
 */
export function getEffectiveStat(monster: GameMonster, statName: string): number {
    const baseStat = (monster.stats as Record<string, unknown>)[statName];
    if (typeof baseStat !== "number") {
        return 0;
    }
    if (!monster.statusEffects || monster.statusEffects.length === 0) {
        return baseStat;
    }

    let additive = 0;
    let multiplicative = 1;

    for (const se of monster.statusEffects) {
        const mod = se.modifiers?.[statName];
        if (mod == null) continue;
        if (se.type === "buff" || se.type === "debuff") {
            if (se.modifier_type === "multiply") {
                multiplicative += mod;
            } else {
                additive += mod;
            }
        }
    }

    return Math.floor(baseStat * multiplicative + additive);
}

/**
 * 计算实际伤害值（考虑攻击/防御、伤害类型，使用 getEffectiveStat 应用 BUFF/DEBUFF）
 */
export function calculateDamage(
    baseValue: number,
    caster: GameMonster,
    target: GameMonster,
    effect: SkillEffect
): number {
    let damage = baseValue;

    if (effect.damage_type === "physical") {
        const attack = getEffectiveStat(caster, "attack");
        damage = baseValue + attack * 0.5;
        const defense = getEffectiveStat(target, "defense");
        damage = Math.max(1, damage - defense * 0.3);
    } else if (effect.damage_type === "magical") {
        const intelligence = getEffectiveStat(caster, "intelligence") || getEffectiveStat(caster, "attack");
        damage = baseValue + intelligence * 0.5;
        const magicDefense = getEffectiveStat(target, "status_resistance") || getEffectiveStat(target, "defense");
        damage = Math.max(1, damage - magicDefense * 0.2);
    }

    return Math.floor(damage);
}
