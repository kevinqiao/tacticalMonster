/**
 * 第一类：即时效果 - 直接伤害
 * 优先扣除护盾，再扣 HP；不写入 statusEffects
 * 支持 damage_falloff：超出 full_damage_range 时按 min_damage_percent 衰减
 */

import type { GameMonster } from "../../../../types/monsterTypes";
import type { SkillEffect } from "../../../../types/skillTypes";
import { SkillEffectType } from "../../../../types/skillTypes";
import { offsetHexDistance } from "../../../../utils/hexUtils";
import { calculateDamage } from "../../damageCalculator";
import type { EffectApplyResult } from "../EffectHandler";

export class DamageHandler {
    static readonly type = SkillEffectType.DAMAGE;
    static readonly category = "immediate" as const;

    readonly type = SkillEffectType.DAMAGE;
    readonly category = "immediate" as const;

    apply(effect: SkillEffect, target: GameMonster, caster: GameMonster): EffectApplyResult {
        if (!target.stats || effect.value === undefined || effect.target_attribute !== "hp") {
            return { applied: false };
        }

        let baseValue = effect.value;
        if (effect.damage_falloff) {
            const distance = offsetHexDistance(
                { q: caster.q ?? 0, r: caster.r ?? 0 },
                { q: target.q ?? 0, r: target.r ?? 0 }
            );
            if (distance > effect.damage_falloff.full_damage_range) {
                const pct = effect.damage_falloff.min_damage_percent;
                const factor = pct > 1 ? pct / 100 : pct;
                baseValue = Math.round(baseValue * factor);
            }
        }

        const damage = calculateDamage(baseValue, caster, target, effect);
        let remaining = damage;
        const currentHp = target.stats.hp?.current ?? 0;

        // 优先扣除护盾
        if (target.stats.shield && target.stats.shield.current > 0) {
            const shieldAbsorb = Math.min(target.stats.shield.current, remaining);
            target.stats.shield.current -= shieldAbsorb;
            target.stats.shield.max = Math.max(0, target.stats.shield.max);
            remaining -= shieldAbsorb;
        }

        // 再扣 HP
        const hpLost = Math.min(remaining, currentHp);
        target.stats.hp.current = Math.max(0, currentHp - remaining);

        return {
            applied: true,
            stateChange: { attribute: "hp", before: currentHp, after: target.stats.hp.current },
        };
    }
}
