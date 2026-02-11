/**
 * 第一类：即时效果 - 强制位移
 * 按 effect.modifiers 的 dq、dr 偏移目标坐标；具体合法性由调用方在构造 effect 时保证
 */

import type { GameMonster } from "../../../../types/monsterTypes";
import type { SkillEffect } from "../../../../types/skillTypes";
import { SkillEffectType } from "../../../../types/skillTypes";
import type { EffectApplyResult } from "../EffectHandler";

export class MovementHandler {
    static readonly type = SkillEffectType.MOVEMENT;
    static readonly category = "immediate" as const;

    readonly type = SkillEffectType.MOVEMENT;
    readonly category = "immediate" as const;

    apply(effect: SkillEffect, target: GameMonster, _caster: GameMonster): EffectApplyResult {
        const dq = effect.modifiers?.dq ?? effect.modifiers?.q;
        const dr = effect.modifiers?.dr ?? effect.modifiers?.r;
        if (typeof dq !== "number" || typeof dr !== "number") {
            return { applied: false };
        }

        const beforeQ = target.q ?? 0;
        const beforeR = target.r ?? 0;
        target.q = beforeQ + dq;
        target.r = beforeR + dr;

        return {
            applied: true,
            stateChange: { attribute: "q", before: beforeQ, after: target.q },
        };
    }
}
