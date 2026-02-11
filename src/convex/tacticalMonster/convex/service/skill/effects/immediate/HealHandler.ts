/**
 * 第一类：即时效果 - 直接治疗
 * 不写入 statusEffects
 */

import type { GameMonster } from "../../../../types/monsterTypes";
import type { SkillEffect } from "../../../../types/skillTypes";
import { SkillEffectType } from "../../../../types/skillTypes";
import type { EffectApplyResult } from "../EffectHandler";

export class HealHandler {
    static readonly type = SkillEffectType.HEAL;
    static readonly category = "immediate" as const;

    readonly type = SkillEffectType.HEAL;
    readonly category = "immediate" as const;

    apply(effect: SkillEffect, target: GameMonster, _caster: GameMonster): EffectApplyResult {
        if (!target.stats?.hp || effect.value === undefined || effect.target_attribute !== "hp") {
            return { applied: false };
        }

        const currentHp = target.stats.hp.current ?? 0;
        const maxHp = target.stats.hp.max ?? 0;
        target.stats.hp.current = Math.min(maxHp, currentHp + effect.value);

        return {
            applied: true,
            stateChange: { attribute: "hp", before: currentHp, after: target.stats.hp.current },
        };
    }
}
