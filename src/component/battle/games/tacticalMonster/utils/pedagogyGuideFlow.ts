import type { PedagogyGuideEventType, PedagogyGuideStep } from "../types/stageRuleTypes";

export type PedagogyGuideNotifyEvent = {
    type: PedagogyGuideEventType;
    skillId?: string;
};

/**
 * 当前步骤是否匹配本次玩家操作（用于推进引导）
 */
export function matchGuideStep(step: PedagogyGuideStep | undefined, event: PedagogyGuideNotifyEvent): boolean {
    if (!step) return false;
    if (step.eventType !== event.type) return false;
    if (step.expectedSkillId) {
        if (!event.skillId || step.expectedSkillId !== event.skillId) return false;
    }
    return true;
}

/**
 * 推进到下一步；若已是最后一步则返回 completed=true
 */
export function advanceAfterMatch(
    steps: PedagogyGuideStep[],
    stepIndex: number
): { nextIndex: number | null; completed: boolean } {
    if (stepIndex < 0 || stepIndex >= steps.length) {
        return { nextIndex: null, completed: true };
    }
    if (stepIndex === steps.length - 1) {
        return { nextIndex: null, completed: true };
    }
    return { nextIndex: stepIndex + 1, completed: false };
}
