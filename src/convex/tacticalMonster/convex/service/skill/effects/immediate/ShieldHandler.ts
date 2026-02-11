/**
 * 第一类（兼持续）：护盾 - 立即增加护盾值，并记录 duration 用于到期从 statusEffects 移除
 */

import type { GameMonster, StatusEffect } from "../../../../types/monsterTypes";
import type { SkillEffect } from "../../../../types/skillTypes";
import { SkillEffectType } from "../../../../types/skillTypes";
import type { EffectApplyResult, EffectTickResult } from "../EffectHandler";

export class ShieldHandler {
    static readonly type = SkillEffectType.SHIELD;
    static readonly category = "immediate" as const;

    readonly type = SkillEffectType.SHIELD;
    readonly category = "immediate" as const;

    apply(effect: SkillEffect, target: GameMonster, _caster: GameMonster): EffectApplyResult {
        if (!target.stats || effect.value === undefined) {
            return { applied: false };
        }

        if (!target.stats.shield) {
            target.stats.shield = { current: 0, max: 0 };
        }

        const before = target.stats.shield.current;
        target.stats.shield.current += effect.value;
        target.stats.shield.max = Math.max(
            target.stats.shield.max ?? 0,
            target.stats.shield.current
        );

        const duration = effect.duration ?? 0;
        const statusEffect: StatusEffect = {
            ...effect,
            remaining_duration: duration,
        };

        return {
            applied: true,
            statusEffect: duration > 0 ? statusEffect : undefined,
            stateChange: { attribute: "shield", before, after: target.stats.shield.current },
        };
    }

    tick(statusEffect: StatusEffect, _target: GameMonster): EffectTickResult {
        const remaining = (statusEffect.remaining_duration ?? 1) - 1;
        (statusEffect as StatusEffect).remaining_duration = remaining;
        return { expired: remaining <= 0 };
    }

    remove(_statusEffect: StatusEffect, _target: GameMonster): void {
        // 护盾数值保留，仅从 statusEffects 移除记录
    }
}
