import { useCallback, useEffect, useState } from "react";
import type { PedagogyGuideStep, TutorialWinMode } from "../../types/stageRuleTypes";
import { advanceAfterMatch, matchGuideStep, type PedagogyGuideNotifyEvent } from "../../utils/pedagogyGuideFlow";
import { isGuideDone } from "../../utils/pedagogyGuideStorage";

/**
 * 是否显示「跳过引导」（仅关横幅 + 持久化偏好，不改变 mr_games.tutorialProgress / 胜负条件）。
 *
 * | tutorialWinMode   | 通关条件（服务端）     | 是否显示跳过 |
 * |------------------|------------------------|-------------|
 * | boss_only        | 击败 Boss 即可        | 是 — 引导纯辅助，与胜负解耦 |
 * | guide_only       | 以引导完成等规则为准   | 是 — 跳过不关进度，玩家仍须按局内步骤满足结算 |
 * | boss_and_guide   | Boss + 引导都满足      | 是 — 同上，仅少看提示 |
 *
 * 口语里的 guide_and_boss 即本仓库的 `boss_and_guide`。
 */
function shouldShowSkipGuideButton(mode: TutorialWinMode | undefined): boolean {
    return (
        mode === undefined ||
        mode === "boss_only" ||
        mode === "guide_only" ||
        mode === "boss_and_guide"
    );
}

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
    /** 与 pedagogy.tutorialWinMode 一致（boss_only / guide_only / boss_and_guide）；默认 boss_only */
    tutorialWinMode?: TutorialWinMode;
    /**
     * 已解析的「引导横幅不再显示」：登录用户来自服务端；未登录可用 localStorage。
     * 服务端加载中请传 false 且将 guideUiReady 置为 false，避免误判。
     */
    guideUiDismissed: boolean;
    /** 服务端查询已返回（未登录时恒为 true） */
    guideUiReady: boolean;
    /** 持久化「不再显示横幅」（服务端 mutation 或 guest 的 localStorage） */
    persistGuideUiDismissed: () => void | Promise<void>;
}): {
    bannerActive: boolean;
    stepIndex: number | null;
    currentStep: PedagogyGuideStep | undefined;
    notify: (event: PedagogyGuideNotifyEvent) => void;
    skip: () => void;
    totalSteps: number;
    isDynamicGuide: boolean;
    /** 三种 tutorialWinMode 均可能展示，见 shouldShowSkipGuideButton 注释 */
    showSkipGuideButton: boolean;
} {
    const {
        mode,
        uid,
        ruleId,
        gameId,
        steps,
        dynamicGuide,
        completionSkillId,
        tutorialWinMode = "boss_only",
        guideUiDismissed,
        guideUiReady,
        persistGuideUiDismissed,
    } = opts;
    const [stepIndex, setStepIndex] = useState<number | null>(null);
    /** 动态引导 stepIndex 恒为 null；跳过/完成时需 bump 以立即收起横幅 */
    const [localGuideClosed, setLocalGuideClosed] = useState(false);

    const hasLinearSteps = (steps?.length ?? 0) > 0;
    const enabled =
        mode === "play" && !!ruleId && (hasLinearSteps || !!dynamicGuide);

    /** 未登录：沿用 localStorage，与 persist 中 markGuideDone 一致 */
    const guestDismissed = !uid && typeof ruleId === "string" && isGuideDone(uid, ruleId);
    const effectiveDismissed = guideUiDismissed || guestDismissed;

    useEffect(() => {
        setLocalGuideClosed(false);
    }, [gameId]);

    useEffect(() => {
        if (!enabled || !ruleId || !gameId) {
            setStepIndex(null);
            return;
        }
        if (!guideUiReady) {
            setStepIndex(null);
            return;
        }
        if (effectiveDismissed) {
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
    }, [
        enabled,
        ruleId,
        gameId,
        steps,
        dynamicGuide,
        hasLinearSteps,
        guideUiReady,
        effectiveDismissed,
    ]);

    const persistDismiss = useCallback(async () => {
        await Promise.resolve(persistGuideUiDismissed());
    }, [persistGuideUiDismissed]);

    const notify = useCallback(
        (event: PedagogyGuideNotifyEvent) => {
            if (!ruleId) return;

            if (dynamicGuide) {
                const want = completionSkillId ?? "basic_attack";
                if (event.type === "cast" && event.skillId === want) {
                    void persistDismiss();
                    setLocalGuideClosed(true);
                }
                return;
            }

            if (stepIndex === null || stepIndex < 0 || !steps?.length) return;
            const current = steps[stepIndex];
            if (!matchGuideStep(current, event)) return;
            const { nextIndex, completed } = advanceAfterMatch(steps, stepIndex);
            if (completed) {
                void persistDismiss();
                setStepIndex(null);
            } else if (nextIndex !== null) {
                setStepIndex(nextIndex);
            }
        },
        [stepIndex, steps, ruleId, dynamicGuide, completionSkillId, persistDismiss]
    );

    const skip = useCallback(() => {
        void persistDismiss();
        setStepIndex(null);
        setLocalGuideClosed(true);
    }, [persistDismiss]);

    const incomplete =
        !!ruleId &&
        !!gameId &&
        guideUiReady &&
        !effectiveDismissed &&
        !localGuideClosed;
    const linearBanner = incomplete && hasLinearSteps && !dynamicGuide && stepIndex !== null && stepIndex >= 0;
    const dynamicBanner = incomplete && !!dynamicGuide && enabled;
    const bannerActive = (linearBanner || dynamicBanner) && mode === "play";

    /**
     * guideFlow（线性）与 dynamicGuide（动态）只决定横幅从哪条路亮起（linearBanner vs dynamicBanner），
     * 二者不单独改「跳过」策略：只要横幅在，`tutorialWinMode` 允许则显示跳过（当前三种 mode 均允许）。
     * 若 pedagogy 同时配了 guideFlow 与 dynamicGuide，实现上以 dynamic 为准（不走步进 stepIndex）。
     */
    const showSkipGuideButton =
        bannerActive && shouldShowSkipGuideButton(tutorialWinMode);

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
        showSkipGuideButton,
    };
}
