/**
 * 效果处理器接口与结果类型
 * 策略模式：每个 SkillEffectType 对应一个 EffectHandler 实现
 */

import type { GameMonster, StatusEffect } from "../../../types/monsterTypes";
import type { SkillEffect, SkillEffectType } from "../../../types/skillTypes";

/** 施放效果后的返回值（apply 使用） */
export interface EffectApplyResult {
    applied: boolean;
    /** 仅第二类（持续效果）使用，需加入 target.statusEffects */
    statusEffect?: StatusEffect;
    /** 可选的状态变化，用于前端/日志 */
    stateChange?: { attribute: string; before: number; after: number };
}

/** 每回合 tick 后的返回值（tick 使用） */
export interface EffectTickResult {
    expired: boolean;
    /** 本回合产生的状态变化（如 DOT 伤害、HOT 治疗） */
    stateChange?: { attribute: string; before: number; after: number };
    /** 用于 statusEffectChanges.ticked 的数值（伤害或治疗量） */
    value?: number;
}

/**
 * 效果处理器接口
 * - 第一类（immediate）：仅实现 apply，不返回 statusEffect
 * - 第二类（duration）：实现 apply、tick、remove，apply 返回 statusEffect
 */
export interface EffectHandler {
    readonly type: SkillEffectType;
    readonly category: "immediate" | "duration";

    /** 施放效果（技能使用时调用一次） */
    apply(effect: SkillEffect, target: GameMonster, caster: GameMonster): EffectApplyResult;

    /** 每回合 tick（仅持续效果实现） */
    tick?(statusEffect: StatusEffect, target: GameMonster): EffectTickResult;

    /** 清理/移除（仅持续效果实现，到期时调用） */
    remove?(statusEffect: StatusEffect, target: GameMonster): void;
}
