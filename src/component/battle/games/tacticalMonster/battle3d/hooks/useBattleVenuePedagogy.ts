import { api as tacticalMonsterApi } from "@/convex/tacticalMonster/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useUserManager } from "service/UserManager";
import { getStageRuleConfig } from "../../config/stageRuleConfigs";
import { useCombatManager } from "../../service/CombatManager";
import { getDynamicPedagogyGuideText } from "../../utils/pedagogyDynamicGuide";
import { markGuideDone } from "../../utils/pedagogyGuideStorage";
import type { UseBattleGridStateReturn, BattleCellState } from "../handler/useBattleGridState";
import { usePedagogyGuideFlow } from "./usePedagogyGuideFlow";

export function useBattleVenuePedagogy({ gridState }: { gridState: UseBattleGridStateReturn }) {
    const { user } = useUserManager();
    const { game, mode, characters } = useCombatManager();
    const ruleKeyForPedagogy = (game as { ruleId?: string; stageId?: string })?.ruleId ?? game?.stageId;

    const pedagogyHint = useMemo(() => {
        const rid = game?.ruleId ?? game?.stageId;
        if (!rid || mode !== "play") return null;
        return getStageRuleConfig(rid)?.pedagogy;
    }, [game?.ruleId, game?.stageId, game?.gameId, mode]);

    const tutorialWinMode = pedagogyHint?.tutorialWinMode ?? "boss_only";
    const guideDismissedServer = useQuery(
        tacticalMonsterApi.service.game.pedagogyGuideUiService.isGuideUiDismissed,
        user?.uid && ruleKeyForPedagogy ? { uid: user.uid, ruleId: ruleKeyForPedagogy } : "skip"
    );
    const dismissGuideUiMutation = useMutation(
        tacticalMonsterApi.service.game.pedagogyGuideUiService.dismissGuideUi
    );
    const guideUiReady = !user?.uid || guideDismissedServer !== undefined;
    const guideUiDismissedLoggedIn = guideDismissedServer === true;
    const persistGuideUiDismissed = useCallback(async () => {
        if (!ruleKeyForPedagogy) return;
        if (user?.uid) {
            await dismissGuideUiMutation({ uid: user.uid, ruleId: ruleKeyForPedagogy });
        } else {
            markGuideDone(undefined, ruleKeyForPedagogy);
        }
    }, [ruleKeyForPedagogy, user?.uid, dismissGuideUiMutation]);

    const {
        bannerActive: guideBannerActive,
        currentStep: guideCurrentStep,
        notify: notifyPedagogyGuide,
        skip: skipPedagogyGuide,
        stepIndex: guideStepIndex,
        totalSteps: guideTotalSteps,
        isDynamicGuide,
        showSkipGuideButton,
    } = usePedagogyGuideFlow({
        mode,
        uid: user?.uid,
        ruleId: ruleKeyForPedagogy,
        gameId: game?.gameId,
        steps: pedagogyHint?.guideFlow,
        dynamicGuide: pedagogyHint?.dynamicGuide,
        tutorialWinMode,
        guideUiDismissed: guideUiDismissedLoggedIn,
        guideUiReady,
        persistGuideUiDismissed,
        tutorialProgress: game?.tutorialProgress,
    });

    const dynamicGuidePayload = useMemo(() => {
        if (!pedagogyHint?.dynamicGuide || !ruleKeyForPedagogy) return null;
        return getDynamicPedagogyGuideText(ruleKeyForPedagogy, game, characters, gridState.cellStates);
    }, [pedagogyHint?.dynamicGuide, ruleKeyForPedagogy, game, characters, gridState.cellStates]);

    const showPedagogyGuidePanel =
        guideBannerActive && (isDynamicGuide ? !!dynamicGuidePayload : !!guideCurrentStep);

    const isBronzeBoss1GuideSession =
        ruleKeyForPedagogy === "monster_rumble_challenge_bronze_boss_1" &&
        !isDynamicGuide &&
        guideBannerActive &&
        guideStepIndex !== null;
    const isBronzeBoss2GuideSession =
        ruleKeyForPedagogy === "monster_rumble_challenge_bronze_boss_2" &&
        !isDynamicGuide &&
        guideBannerActive &&
        guideStepIndex !== null;

    const disableDefendDuringGuideFlowActive =
        pedagogyHint?.disableDefendDuringGuideFlow === true &&
        !isDynamicGuide &&
        guideBannerActive &&
        guideStepIndex !== null;
    const disableDefend =
        pedagogyHint?.disableDefendAlways === true || disableDefendDuringGuideFlowActive;

    const hideDefendButton = pedagogyHint?.hideDefendButton === true;

    const enforceMoveStep = isBronzeBoss1GuideSession && guideStepIndex === 0;
    const enforceCastStep = isBronzeBoss1GuideSession && guideStepIndex === 1;
    const enforceSkillSelectStepBoss2 = isBronzeBoss2GuideSession && guideStepIndex === 1;
    const emphasizeCastStepBoss2 = isBronzeBoss2GuideSession && guideStepIndex === 2;
    const tutorialHighlightSkillId = enforceCastStep ? "basic_attack" : null;
    const tutorialHighlightSkillIdBoss2 = enforceSkillSelectStepBoss2
        ? (pedagogyHint?.allowedSkillIds ?? []).find((s) => s !== "basic_attack") ?? "basic_attack"
        : null;
    const tutorialHintText = enforceMoveStep
        ? "步骤提示：先移动到蓝色格子"
        : enforceCastStep
            ? "步骤提示：点击高亮的「普攻」并攻击红色目标格"
            : enforceSkillSelectStepBoss2
                ? "步骤提示：先在技能栏选择技能（推荐高亮技能）"
                : emphasizeCastStepBoss2
                    ? "步骤提示：对红色目标格施放已选技能"
                    : undefined;
    const tutorialSkillHighlight = tutorialHighlightSkillId ?? tutorialHighlightSkillIdBoss2;

    const [boss2CastTargetPulseBoost, setBoss2CastTargetPulseBoost] = useState(false);
    useEffect(() => {
        if (!emphasizeCastStepBoss2) {
            setBoss2CastTargetPulseBoost(false);
            return;
        }
        setBoss2CastTargetPulseBoost(true);
        const t = window.setTimeout(() => setBoss2CastTargetPulseBoost(false), 1000);
        return () => window.clearTimeout(t);
    }, [emphasizeCastStepBoss2]);

    const getPedagogyCellState = useCallback(
        (q: number, r: number): BattleCellState => {
            const base = gridState.getCellState(q, r);
            if (!isBronzeBoss1GuideSession && !isBronzeBoss2GuideSession) return base;
            if (enforceMoveStep) {
                if (base === "attackable") return "attackable_dim";
                return base;
            }
            if (enforceCastStep) {
                if (base === "walkable") return "walkable_dim";
                if (base === "attackable") return "attackable_focus";
                return base;
            }
            if (enforceSkillSelectStepBoss2) {
                if (base === "attackable") return "attackable_dim";
                return base;
            }
            if (emphasizeCastStepBoss2) {
                if (base === "walkable") return "walkable_dim";
                if (base === "attackable") return "attackable_focus";
                return base;
            }
            return base;
        },
        [
            gridState,
            isBronzeBoss1GuideSession,
            isBronzeBoss2GuideSession,
            enforceMoveStep,
            enforceCastStep,
            enforceSkillSelectStepBoss2,
            emphasizeCastStepBoss2,
        ]
    );

    const showPedagogyTutorialNotesStrip =
        !!pedagogyHint &&
        !showPedagogyGuidePanel &&
        !(pedagogyHint.dynamicGuide && guideBannerActive);

    return {
        ruleKeyForPedagogy,
        pedagogyHint,
        guideBannerActive,
        guideCurrentStep,
        notifyPedagogyGuide,
        skipPedagogyGuide,
        guideStepIndex,
        guideTotalSteps,
        isDynamicGuide,
        showSkipGuideButton,
        dynamicGuidePayload,
        showPedagogyGuidePanel,
        isBronzeBoss1GuideSession,
        isBronzeBoss2GuideSession,
        disableDefend,
        hideDefendButton,
        enforceMoveStep,
        enforceCastStep,
        enforceSkillSelectStepBoss2,
        emphasizeCastStepBoss2,
        tutorialHintText,
        tutorialSkillHighlight,
        boss2CastTargetPulseBoost,
        getPedagogyCellState,
        showPedagogyTutorialNotesStrip,
    };
}

export type BattleVenuePedagogySnapshot = ReturnType<typeof useBattleVenuePedagogy>;
