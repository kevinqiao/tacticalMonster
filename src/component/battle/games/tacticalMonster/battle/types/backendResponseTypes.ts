/**
 * 后端响应类型定义
 * 用于定义前端调用后端 mutation 的返回类型
 */


import { PhaseChanges } from "./gameTypes";

import { CharacterIdentifier } from "./gameTypes";
import { StatusEffect } from "./monsterTypes";

/**
 * 状态变化信息（扩展版，包含所有可能变化的状态）
 */
export interface StateChanges {
    actor?: {
        identifier: CharacterIdentifier;
        before: {
            q: number;
            r: number;
            hp: number;
            mp: number;
            shield?: number;
            status?: 'normal' | 'stunned' | 'dead';
        };
        after: {
            q: number;
            r: number;
            hp: number;
            mp: number;
            shield?: number;
            status?: 'normal' | 'stunned' | 'dead';
        };
        positionChanged: boolean;
        hpChanged: boolean;
        mpChanged: boolean;
        shieldChanged?: boolean;
        statusChanged?: boolean;
    };
    targets?: Array<{
        identifier: CharacterIdentifier;
        before: {
            hp: number;
            mp: number;
            shield?: number;
            status?: 'normal' | 'stunned' | 'dead';
        };
        after: {
            hp: number;
            mp: number;
            shield?: number;
            status?: 'normal' | 'stunned' | 'dead';
        };
        hpChanged: boolean;
        mpChanged: boolean;
        shieldChanged?: boolean;
        statusChanged?: boolean;
    }>;
    // ✅ 新增：状态效果列表（完整的 statusEffects 数组）
    statusEffects?: Array<{
        characterIdentifier: CharacterIdentifier;
        statusEffects: StatusEffect[];
    }>;
    // ✅ 新增：技能冷却（完整的 skillCooldowns 对象）
    skillCooldowns?: Array<{
        characterIdentifier: CharacterIdentifier;
        cooldowns: Record<string, number>;
    }>;
}

/**
 * useSkill mutation 的返回类型
 * 
 * 成功时：{ ok: true, data: { success: true, message?: string, phaseChanges?: PhaseChanges } }
 * 失败时：{ ok: false, error: string }
 * 
 * 注意：
 * - success: 操作是否成功
 * - message: 错误消息（可选）
 * - effects 在 phaseChanges.playerAction.executionResults.effects 中
 * - stateChanges 在 phaseChanges.playerAction.executionResults.stateChanges 中
 */
export type UseSkillResponse =
    | {
        ok: true;
        data: {
            success: boolean;
            message?: string;
            phaseChanges?: PhaseChanges;
        };
    }
    | {
        ok: false;
        error: string;
    };

/**
 * walk mutation 的返回类型
 */
export type WalkResponse =
    | {
        ok: true;
        success: boolean;
        phaseChanges?: PhaseChanges;
    }
    | {
        ok: false;
        error: string;
    };

