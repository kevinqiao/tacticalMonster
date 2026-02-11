/**
 * 第一类：即时效果 - 法力恢复
 */

import type { GameMonster } from "../../../../types/monsterTypes";
import type { SkillEffect } from "../../../../types/skillTypes";
import { SkillEffectType } from "../../../../types/skillTypes";
import type { EffectApplyResult } from "../EffectHandler";

export class MpRestoreHandler {
    static readonly type = SkillEffectType.MP_RESTORE;
    static readonly category = "immediate" as const;

    readonly type = SkillEffectType.MP_RESTORE;
    readonly category = "immediate" as const;

    apply(effect: SkillEffect, target: GameMonster, _caster: GameMonster): EffectApplyResult {
        if (!target.stats?.mp || effect.value === undefined) {
            return { applied: false };
        }

        const before = target.stats.mp.current ?? 0;
        const maxMp = target.stats.mp.max ?? 0;
        target.stats.mp.current = Math.min(maxMp, before + effect.value);

        return {
            applied: true,
            stateChange: { attribute: "mp", before, after: target.stats.mp.current },
        };
    }
}
