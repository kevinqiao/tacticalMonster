/**
 * 后端响应类型定义
 * 用于定义前端调用后端 mutation 的返回类型
 */

import { PhaseChanges } from "../../../../../../convex/tacticalMonster/convex/types/gameTypes";

/**
 * 技能使用结果（与 BackendValidator.SkillUseResult 保持一致）
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
 * useSkill mutation 的返回类型
 * 
 * 成功时：{ ok: true, data: SkillUseResult & { phaseChanges?: PhaseChanges } }
 * 失败时：{ ok: false, error: string }
 */
export type UseSkillResponse =
    | {
        ok: true;
        data: SkillUseResult & {
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

