/**
 * 第一类：即时效果 - 瞬间传送
 * 将目标坐标设为 effect.modifiers 的 q、r；合法性由调用方保证
 */

import type { GameMonster } from "../../../../types/monsterTypes";
import type { SkillEffect } from "../../../../types/skillTypes";
import { SkillEffectType } from "../../../../types/skillTypes";
import type { EffectApplyResult } from "../EffectHandler";

export class TeleportHandler {
    static readonly type = SkillEffectType.TELEPORT;
    static readonly category = "immediate" as const;

    readonly type = SkillEffectType.TELEPORT;
    readonly category = "immediate" as const;

    apply(effect: SkillEffect, target: GameMonster, _caster: GameMonster): EffectApplyResult {
        const q = effect.modifiers?.q;
        const r = effect.modifiers?.r;
        if (typeof q !== "number" || typeof r !== "number") {
            return { applied: false };
        }

        const beforeQ = target.q ?? 0;
        target.q = q;
        target.r = r;

        return {
            applied: true,
            stateChange: { attribute: "q", before: beforeQ, after: q },
        };
    }
}
