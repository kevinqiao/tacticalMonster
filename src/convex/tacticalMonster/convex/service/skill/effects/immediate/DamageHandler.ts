/**
 * 第一类：即时效果 - 直接伤害
 * 优先扣除护盾，再扣 HP；不写入 statusEffects
 */

import type { GameMonster } from "../../../../types/monsterTypes";
import type { SkillEffect } from "../../../../types/skillTypes";
import { SkillEffectType } from "../../../../types/skillTypes";
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

        const damage = calculateDamage(effect.value, caster, target, effect);
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
