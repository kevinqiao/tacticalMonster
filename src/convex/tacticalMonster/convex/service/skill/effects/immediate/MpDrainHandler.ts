/**
 * 第一类：即时效果 - 法力吸取
 */

import type { GameMonster } from "../../../../types/monsterTypes";
import type { SkillEffect } from "../../../../types/skillTypes";
import { SkillEffectType } from "../../../../types/skillTypes";
import type { EffectApplyResult } from "../EffectHandler";

export class MpDrainHandler {
    static readonly type = SkillEffectType.MP_DRAIN;
    static readonly category = "immediate" as const;

    readonly type = SkillEffectType.MP_DRAIN;
    readonly category = "immediate" as const;

    apply(effect: SkillEffect, target: GameMonster, _caster: GameMonster): EffectApplyResult {
        if (!target.stats?.mp || effect.value === undefined) {
            return { applied: false };
        }

        const before = target.stats.mp.current ?? 0;
        target.stats.mp.current = Math.max(0, before - effect.value);

        return {
            applied: true,
            stateChange: { attribute: "mp", before, after: target.stats.mp.current },
        };
    }
}
