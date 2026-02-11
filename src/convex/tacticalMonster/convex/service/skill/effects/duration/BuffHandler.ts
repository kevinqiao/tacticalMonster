/**
 * 第二类：持续效果 - 属性增益（BUFF）
 * 不修改基础属性，由 getEffectiveStat 在计算时汇总 modifiers
 */

import type { GameMonster, StatusEffect } from "../../../../types/monsterTypes";
import type { SkillEffect } from "../../../../types/skillTypes";
import { SkillEffectType } from "../../../../types/skillTypes";
import type { EffectApplyResult, EffectTickResult } from "../EffectHandler";

export class BuffHandler {
    static readonly type = SkillEffectType.BUFF;
    static readonly category = "duration" as const;

    readonly type = SkillEffectType.BUFF;
    readonly category = "duration" as const;

    apply(effect: SkillEffect, target: GameMonster, _caster: GameMonster): EffectApplyResult {
        if (!effect.modifiers || Object.keys(effect.modifiers).length === 0) {
            return { applied: false };
        }

        const duration = effect.duration ?? 0;
        const statusEffect: StatusEffect = {
            ...effect,
            remaining_duration: duration,
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

    remove(_statusEffect: StatusEffect, _target: GameMonster): void {
        // 方案 B：不修改基础属性，无需还原
    }
}
