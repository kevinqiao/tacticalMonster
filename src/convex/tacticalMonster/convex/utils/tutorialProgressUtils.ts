/** 教学关 tutorialProgress（与前端 pedagogyGuideFlow 一致） */
import type { TutorialProgressState } from "../types/gameTypes";
import type { PedagogyGuideEventType, PedagogyGuideStep, StagePedagogy } from "../types/stageRuleTypes";

export type TutorialGuideNotifyEvent = {
    type: PedagogyGuideEventType;
    skillId?: string;
};

function matchGuideStep(step: PedagogyGuideStep | undefined, event: TutorialGuideNotifyEvent): boolean {
    if (!step) return false;
    if (step.eventType !== event.type) return false;
    if (step.expectedSkillId) {
        if (!event.skillId || step.expectedSkillId !== event.skillId) return false;
    }
    return true;
}

function defaultCompletionSkillId(pedagogy: StagePedagogy | undefined): string {
    return pedagogy?.dynamicGuideCompletionSkillId ?? "basic_attack";
}

export function mergeTutorialProgress(
    pedagogy: StagePedagogy | undefined,
    prev: TutorialProgressState | undefined,
    event: TutorialGuideNotifyEvent
): TutorialProgressState {
    const base: TutorialProgressState = {
        nextGuideStepIndex: prev?.nextGuideStepIndex ?? 0,
        dynamicGuideSatisfied: prev?.dynamicGuideSatisfied ?? false,
    };
    if (!pedagogy) return base;
    const guideFlow = pedagogy.guideFlow;
    const hasLinear = (guideFlow?.length ?? 0) > 0;
    if (pedagogy.dynamicGuide && !hasLinear) {
        if (event.type === "cast" && event.skillId === defaultCompletionSkillId(pedagogy)) {
            return { ...base, dynamicGuideSatisfied: true };
        }
        return base;
    }
    // 无线性步骤且非 dynamic：不推进（避免无 guide 时误匹配）
    if (!hasLinear) return base;
    const steps = guideFlow!;
    let idx = base.nextGuideStepIndex ?? 0;
    if (idx >= steps.length) return { ...base, nextGuideStepIndex: steps.length };
    const step = steps[idx];
    if (matchGuideStep(step, event)) return { ...base, nextGuideStepIndex: idx + 1 };
    return base;
}

export function eventFromUseSkill(
    pedagogy: StagePedagogy | undefined,
    progress: TutorialProgressState | undefined,
    skillId: string,
    hasTargets: boolean
): TutorialGuideNotifyEvent {
    const guideFlow = pedagogy?.guideFlow;
    const idx = progress?.nextGuideStepIndex ?? 0;
    if (guideFlow?.length && idx < guideFlow.length) {
        const step = guideFlow[idx];
        if (step.eventType === "targetSelect" && hasTargets) return { type: "targetSelect", skillId };
    }
    return { type: "cast", skillId };
}

export function isTutorialGuideComplete(
    pedagogy: StagePedagogy | undefined,
    progress: TutorialProgressState | undefined
): boolean {
    if (!pedagogy) return true;
    const hasLinear = (pedagogy.guideFlow?.length ?? 0) > 0;
    if (pedagogy.dynamicGuide && !hasLinear) return progress?.dynamicGuideSatisfied === true;
    // 未配置 guideFlow / dynamicGuide 时不视为「引导已完成」，否则 guide_only 会在首次胜负检查即判胜
    if (!hasLinear) return false;
    const n = pedagogy.guideFlow!.length;
    const idx = progress?.nextGuideStepIndex ?? 0;
    return idx >= n;
}
