/**
 * 第二类：持续效果 - 每回合治疗（HOT）
 */

import type { GameMonster, StatusEffect } from "../../../../types/monsterTypes";
import type { SkillEffect } from "../../../../types/skillTypes";
import { SkillEffectType } from "../../../../types/skillTypes";
import type { EffectApplyResult, EffectTickResult } from "../EffectHandler";

export class HotHandler {
    static readonly type = SkillEffectType.HOT;
    static readonly category = "duration" as const;

    readonly type = SkillEffectType.HOT;
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

        const heal = Math.floor(value);
        const currentHp = target.stats.hp.current ?? 0;
        const maxHp = target.stats.hp.max ?? 0;
        target.stats.hp.current = Math.min(maxHp, currentHp + heal);
        const actualHeal = target.stats.hp.current - currentHp;

        return {
            expired: remaining <= 0,
            stateChange: { attribute: "hp", before: currentHp, after: target.stats.hp.current },
            value: actualHeal,
        };
    }

    remove(_statusEffect: StatusEffect, _target: GameMonster): void {
        // 仅从 statusEffects 中移除即可
    }
}
