/**
 * 第二类：持续效果 - 眩晕（STUN）
 */

import type { GameMonster, StatusEffect } from "../../../../types/monsterTypes";
import type { SkillEffect } from "../../../../types/skillTypes";
import { SkillEffectType } from "../../../../types/skillTypes";
import type { EffectApplyResult, EffectTickResult } from "../EffectHandler";

export class StunHandler {
    static readonly type = SkillEffectType.STUN;
    static readonly category = "duration" as const;

    readonly type = SkillEffectType.STUN;
    readonly category = "duration" as const;

    apply(effect: SkillEffect, target: GameMonster, _caster: GameMonster): EffectApplyResult {
        if (effect.duration === undefined || effect.duration <= 0) {
            return { applied: false };
        }

        target.status = "stunned";
        const statusEffect: StatusEffect = {
            ...effect,
            remaining_duration: effect.duration,
        };

        return {
            applied: true,
            statusEffect,
        };
    }

    tick(statusEffect: StatusEffect, _target: GameMonster): EffectTickResult {
        const remaining = (statusEffect.remaining_duration ?? 1) - 1;
        (statusEffect as StatusEffect).remaining_duration = remaining;
        return { expired: remaining <= 0 };
    }

    remove(_statusEffect: StatusEffect, target: GameMonster): void {
        target.status = "normal";
    }
}
