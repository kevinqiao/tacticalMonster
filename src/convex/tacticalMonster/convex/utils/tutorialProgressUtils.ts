/** 教学关 tutorialProgress（与前端 pedagogyGuideFlow 一致） */
import type { TutorialProgressState } from "../types/gameTypes";
import type {
    DynamicGuideAtom,
    DynamicGuideCompletionRule,
    PedagogyGuideEventType,
    PedagogyGuideStep,
    StagePedagogy,
} from "../types/stageRuleTypes";

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

/** 单条原子条件是否被本次事件满足 */
export function matchesDynamicAtom(atom: DynamicGuideAtom, event: TutorialGuideNotifyEvent): boolean {
    switch (atom.kind) {
        case "cast_skill":
            return event.type === "cast" && event.skillId === atom.skillId;
        case "any_cast":
            return event.type === "cast" && !!event.skillId;
        case "move":
            return event.type === "move";
        case "turn_end":
            return event.type === "turnEnd";
        default:
            return false;
    }
}

function mergeDynamicAll(
    rules: DynamicGuideAtom[],
    prev: TutorialProgressState | undefined,
    event: TutorialGuideNotifyEvent
): Pick<TutorialProgressState, "dynamicAllProgress" | "dynamicGuideSatisfied"> {
    const n = rules.length;
    if (n === 0) {
        return { dynamicGuideSatisfied: false };
    }
    let progress = prev?.dynamicAllProgress;
    if (!progress || progress.length !== n) {
        progress = Array(n).fill(false);
    } else {
        progress = [...progress];
    }
    for (let i = 0; i < n; i++) {
        if (!progress[i] && matchesDynamicAtom(rules[i], event)) {
            progress[i] = true;
        }
    }
    const allDone = progress.every(Boolean);
    return {
        dynamicAllProgress: progress,
        dynamicGuideSatisfied: allDone,
    };
}

export function mergeTutorialProgress(
    pedagogy: StagePedagogy | undefined,
    prev: TutorialProgressState | undefined,
    event: TutorialGuideNotifyEvent
): TutorialProgressState {
    const base: TutorialProgressState = {
        nextGuideStepIndex: prev?.nextGuideStepIndex ?? 0,
        dynamicGuideSatisfied: prev?.dynamicGuideSatisfied ?? false,
        dynamicAllProgress: prev?.dynamicAllProgress,
    };
    if (!pedagogy) return base;
    const guideFlow = pedagogy.guideFlow;
    const hasLinear = (guideFlow?.length ?? 0) > 0;

    if (pedagogy.dynamicGuide && !hasLinear) {
        const rule = pedagogy.dynamicGuideRule;
        if (!rule) {
            return { ...base, dynamicAllProgress: undefined };
        }
        if (prev?.dynamicGuideSatisfied) {
            return base;
        }

        if (rule.kind === "all") {
            const merged = mergeDynamicAll(rule.rules, prev, event);
            return {
                ...base,
                dynamicAllProgress: merged.dynamicAllProgress,
                dynamicGuideSatisfied: merged.dynamicGuideSatisfied,
            };
        }

        if (matchesDynamicAtom(rule, event)) {
            return {
                ...base,
                dynamicGuideSatisfied: true,
                dynamicAllProgress: undefined,
            };
        }
        return { ...base, dynamicAllProgress: undefined };
    }

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
    if (!hasLinear) return false;
    const n = pedagogy.guideFlow!.length;
    const idx = progress?.nextGuideStepIndex ?? 0;
    return idx >= n;
}
