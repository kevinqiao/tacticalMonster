/**
 * 后端响应类型定义
 * 用于定义前端调用后端 mutation 的返回类型
 */


import { PhaseChanges } from "./gameTypes";

/**
 * 技能使用结果
 * 方案1：乐观UI + 悲观状态，已移除 BackendValidator 依赖
 */
export interface SkillUseResult {
    success: boolean;
    message?: string;
    cooldownSet?: number;
    resourcesConsumed?: {
        mp?: number;
        hp?: number;
        stamina?: number;
    };
    effects?: Array<{
        effect: any;
        targetId?: string;
        applied: boolean;
        isPassive?: boolean;  // ✅ 标记是否为被动技能效果
        passiveSkillId?: string;  // ✅ 被动技能ID
        triggerType?: string;  // ✅ 触发类型
    }>;
}

/**
 * 状态变化信息（与后端 executeBossAction 返回的 stateChanges 结构一致）
 */
export interface StateChanges {
    actor?: {
        identifier: any;
        before: { q: number; r: number; hp: number; mp: number };
        after: { q: number; r: number; hp: number; mp: number };
        positionChanged: boolean;
        hpChanged: boolean;
        mpChanged: boolean;
    };
    targets?: Array<{
        identifier: any;
        before: { hp: number; mp: number };
        after: { hp: number; mp: number };
        hpChanged: boolean;
        mpChanged: boolean;
    }>;
}

/**
 * useSkill mutation 的返回类型
 * 
 * 成功时：{ ok: true, data: SkillUseResult & { phaseChanges?: PhaseChanges; stateChanges?: StateChanges } }
 * 失败时：{ ok: false, error: string }
 * 
 * 注意：stateChanges 目前是可选字段，后端需要补充实现
 */
export type UseSkillResponse =
    | {
        ok: true;
        data: SkillUseResult & {
            phaseChanges?: PhaseChanges;
            stateChanges?: StateChanges;  // ✅ 方案1：状态变化信息（用于悲观状态更新）
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

