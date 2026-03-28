/**
 * 第一类：即时效果 - 净化
 * 移除目标负面持续效果（debuff / dot / stun）
 */

import type { GameMonster } from "../../../../types/monsterTypes";
import { SkillEffectType } from "../../../../types/skillTypes";
import type { SkillEffect } from "../../../../types/skillTypes";
import type { EffectApplyResult } from "../EffectHandler";

const NEGATIVE_EFFECT_TYPES = new Set<SkillEffectType>([
    SkillEffectType.DEBUFF,
    SkillEffectType.DOT,
    SkillEffectType.STUN,
]);

export class CleanseHandler {
    static readonly type = SkillEffectType.CLEANSE;
    static readonly category = "immediate" as const;

    readonly type = SkillEffectType.CLEANSE;
    readonly category = "immediate" as const;

    apply(effect: SkillEffect, target: GameMonster, _caster: GameMonster): EffectApplyResult {
        if (!target.statusEffects || target.statusEffects.length === 0) {
            return { applied: false };
        }
        const maxRemove = Math.max(1, effect.value ?? 99);
        let removed = 0;
        target.statusEffects = target.statusEffects.filter((statusEffect) => {
            if (removed >= maxRemove) return true;
            if (NEGATIVE_EFFECT_TYPES.has(statusEffect.type)) {
                removed += 1;
                return false;
            }
            return true;
        });
        return { applied: removed > 0 };
    }
}
