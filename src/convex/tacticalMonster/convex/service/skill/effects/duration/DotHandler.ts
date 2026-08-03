/**
 * 第二类：持续效果 - 每回合伤害（DOT）
 */

import type { GameMonster, StatusEffect } from "../../../../types/monsterTypes";
import type { SkillEffect } from "../../../../types/skillTypes";
import { SkillEffectType } from "../../../../types/skillTypes";
import type { EffectApplyResult, EffectTickResult } from "../EffectHandler";

export class DotHandler {
    static readonly type = SkillEffectType.DOT;
    static readonly category = "duration" as const;

    readonly type = SkillEffectType.DOT;
    readonly category = "duration" as const;

    apply(effect: SkillEffect, target: GameMonster, _caster: GameMonster): EffectApplyResult {
        if (
            effect.value === undefined ||
            effect.duration === undefined ||
            effect.duration <= 0
        ) {
            return { applied: false };
        }

        const statusEffect: StatusEffect = {
            ...effect,
            remaining_duration: effect.duration,
        };

        return {
            applied: true,
            statusEffect,
        };
    }

    tick(statusEffect: StatusEffect, target: GameMonster): EffectTickResult {
        const value = statusEffect.value ?? 0;
        const remaining = (statusEffect.remaining_duration ?? 1) - 1;
        (statusEffect as StatusEffect).remaining_duration = remaining;

        if (!target.stats?.hp) {
            return { expired: remaining <= 0 };
        }

        let damage = Math.floor(value);
        const currentHp = target.stats.hp.current ?? 0;

        if (target.stats.shield && target.stats.shield.current > 0) {
            const shieldAbsorb = Math.min(target.stats.shield.current, damage);
            target.stats.shield.current -= shieldAbsorb;
            damage -= shieldAbsorb;
        }

        target.stats.hp.current = Math.max(0, currentHp - damage);
        const actualDamage = currentHp - target.stats.hp.current;

        return {
            expired: remaining <= 0,
            stateChange: { attribute: "hp", before: currentHp, after: target.stats.hp.current },
            value: actualDamage,
        };
    }

    remove(_statusEffect: StatusEffect, _target: GameMonster): void {
        // 仅从 statusEffects 中移除即可
    }
}
