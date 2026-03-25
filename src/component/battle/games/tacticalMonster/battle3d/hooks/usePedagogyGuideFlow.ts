import { useCallback, useEffect, useState } from "react";
import type { PedagogyGuideStep } from "../../types/stageRuleTypes";
import { advanceAfterMatch, matchGuideStep, type PedagogyGuideNotifyEvent } from "../../utils/pedagogyGuideFlow";
import { isGuideDone, markGuideDone } from "../../utils/pedagogyGuideStorage";

export function usePedagogyGuideFlow(opts: {
    mode: string | undefined;
    uid: string | undefined;
    ruleId: string | undefined;
    gameId: string | undefined;
    steps: PedagogyGuideStep[] | undefined;
    /** 动态提示模式：不读 guideFlow 步进，仅用于完成态与 cast 结算 */
    dynamicGuide?: boolean;
    /** 动态模式下 cast 完成引导的技能 id（默认 basic_attack） */
    completionSkillId?: string;
}): {
    bannerActive: boolean;
    stepIndex: number | null;
    currentStep: PedagogyGuideStep | undefined;
    notify: (event: PedagogyGuideNotifyEvent) => void;
    skip: () => void;
    totalSteps: number;
    isDynamicGuide: boolean;
} {
    const { mode, uid, ruleId, gameId, steps, dynamicGuide, completionSkillId } = opts;
    const [stepIndex, setStepIndex] = useState<number | null>(null);
    /** 动态引导 stepIndex 恒为 null，仅靠 localStorage 不会触发重绘；跳过/完成时需 bump 以立即收起横幅 */
    const [localGuideClosed, setLocalGuideClosed] = useState(false);

    const hasLinearSteps = (steps?.length ?? 0) > 0;
    const enabled =
        mode === "play" && !!ruleId && (hasLinearSteps || !!dynamicGuide);

    useEffect(() => {
        setLocalGuideClosed(false);
    }, [gameId]);

    useEffect(() => {
        if (!enabled || !ruleId || !gameId) {
            setStepIndex(null);
            return;
        }
        if (isGuideDone(uid, ruleId)) {
            setStepIndex(null);
            return;
        }
        if (dynamicGuide) {
            setStepIndex(null);
            return;
        }
        if (!hasLinearSteps) {
            setStepIndex(null);
            return;
        }
        setStepIndex(0);
    }, [enabled, ruleId, gameId, uid, steps, dynamicGuide, hasLinearSteps]);

    const notify = useCallback(
        (event: PedagogyGuideNotifyEvent) => {
            if (!ruleId) return;

            if (dynamicGuide) {
                const want = completionSkillId ?? "basic_attack";
                if (event.type === "cast" && event.skillId === want) {
                    markGuideDone(uid, ruleId);
                    setLocalGuideClosed(true);
                }
                return;
            }

            if (stepIndex === null || stepIndex < 0 || !steps?.length) return;
            const current = steps[stepIndex];
            if (!matchGuideStep(current, event)) return;
            const { nextIndex, completed } = advanceAfterMatch(steps, stepIndex);
            if (completed) {
                markGuideDone(uid, ruleId);
                setStepIndex(null);
            } else if (nextIndex !== null) {
                setStepIndex(nextIndex);
            }
        },
        [stepIndex, steps, uid, ruleId, dynamicGuide, completionSkillId]
    );

    const skip = useCallback(() => {
        markGuideDone(uid, ruleId);
        setStepIndex(null);
        setLocalGuideClosed(true);
    }, [uid, ruleId]);

    const incomplete =
        !!ruleId && !!gameId && !isGuideDone(uid, ruleId) && !localGuideClosed;
    const linearBanner = incomplete && hasLinearSteps && !dynamicGuide && stepIndex !== null && stepIndex >= 0;
    const dynamicBanner = incomplete && !!dynamicGuide && enabled;
    const bannerActive = (linearBanner || dynamicBanner) && mode === "play";

    const currentStep =
        linearBanner && stepIndex !== null && steps?.length ? steps[stepIndex] : undefined;

    return {
        bannerActive,
        stepIndex,
        currentStep,
        notify,
        skip,
        totalSteps: steps?.length ?? 0,
        isDynamicGuide: !!dynamicGuide,
    };
}
