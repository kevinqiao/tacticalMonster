/**
 * 3D 战斗操作处理器 - 使用 3D 动画与阶段处理器，复用 useOtherActions
 */

import { useModalManager } from "@/service/ModalManager";
import { useConvex } from "convex/react";
import { useCallback } from "react";
import { useUserManager } from "service/UserManager";
import { useScoreCalculation } from "../../battle/hooks/useScoreCalculation";
import { useCombatManager } from "../../service/CombatManager";
import { useReplay } from "../../battle/view/replayContext";
import { getReplayPlaybackSpeed } from "../../utils/replayPlaybackSpeed";
import { usePlaySkill3D } from "../animation/usePlaySkill3D";
import { usePlaySkillSelect3D } from "../animation/usePlaySkillSelect3D";
import { usePlayWalk3D } from "../animation/usePlayWalk3D";
import { useOtherAction3D } from "./actions/useOtherAction3D";
import { useSkillAction3D } from "./actions/useSkillAction3D";
import { useWalkAction3D } from "./actions/useWalkAction3D";
import { useWalkAndAttack3D } from "./actions/useWalkAndAttack3D";
import type { UseBattleGridStateReturn } from "./useBattleGridState";
import { usePassiveSkillAnimations } from "./usePassiveSkillAnimations";
import { usePhaseChangesHandler3D } from "./usePhaseChangesHandler3D";
import { useSkillSync } from "./useSkillSync";
import type { PedagogyGuideNotifyEvent } from "../../utils/pedagogyGuideFlow";
import { useBattleVenueCellClick } from "../hooks/useBattleVenueCellClick";

interface UseCombatActHandler3DOptions {
    gridState: UseBattleGridStateReturn | null;
    /** 技能失败时额外回调（用于显示 toast 等用户可见提示） */
    onSkillError?: (message: string) => void;
    /** 教学 guideFlow 与技能栏 / 自动选技 同步 */
    onPedagogyNotify?: (event: PedagogyGuideNotifyEvent) => void;
    /** 3D 战场格子点击的教学约束（与 onPedagogyNotify 一致时传入） */
    cellClickPedagogy?: {
        enforceMoveStep: boolean;
        enforceCastStep: boolean;
        enforceSkillSelectStepBoss2: boolean;
    };
}

const useCombatActHandler3D = (options: UseCombatActHandler3DOptions) => {
    const { gridState, onSkillError, onPedagogyNotify, cellClickPedagogy } = options;
    const { game, characters, groundCells, mode = "play", mapDimension } = useCombatManager();
    const replay = useReplay();
    const playbackSpeed = getReplayPlaybackSpeed(replay);
    const { playSkillSelect } = usePlaySkillSelect3D(gridState);
    const { playSkill } = usePlaySkill3D({ mapDimension, playbackSpeed });
    const { playWalk } = usePlayWalk3D({ mapDimension, playbackSpeed });
    const { user } = useUserManager();
    const convex = useConvex();
    const { openModal } = useModalManager();

    const { calculateActionScore } = useScoreCalculation(game ?? null, [], mode);
    const { handlePhaseChanges, refreshWalkableFromPosition } = usePhaseChangesHandler3D(gridState);
    const { handlePassiveSkillAnimations } = usePassiveSkillAnimations(characters ?? [], playSkill);

    const handleSkillError = useCallback(
        (message: string, context?: { character?: any }) => {
            console.error("技能使用失败:", message);
            onSkillError?.(message);
            if (context?.character && refreshWalkableFromPosition) {
                const moveRange = (context.character as any).move_range ?? 3;
                const turn = game?.currentRound?.turns?.find((t: { status?: number }) => t.status === 1);
                const stepsUsed = (turn?.stepsUsed ?? 0) as number;
                const remaining = Math.max(0, moveRange - stepsUsed);
                refreshWalkableFromPosition(context.character, remaining, false, {
                    skipWalkHighlight: stepsUsed > 0,
                });
            }
        },
        [refreshWalkableFromPosition, onSkillError, game]
    );

    const { setSkillSyncState } = useSkillSync(
        handlePhaseChanges,
        handlePassiveSkillAnimations,
        characters ?? [],
        calculateActionScore,
        handleSkillError
    );

    const { walk } = useWalkAction3D(
        game ?? null,
        characters ?? [],
        groundCells ?? [],
        mode,
        convex,
        playWalk,
        handlePhaseChanges,
        mapDimension,
        refreshWalkableFromPosition ?? undefined
    );

    const { walkAndAttack } = useWalkAndAttack3D(
        game ?? null,
        characters ?? [],
        groundCells ?? [],
        mode,
        convex,
        playWalk,
        playSkill,
        setSkillSyncState,
        handlePhaseChanges,
        mapDimension,
        refreshWalkableFromPosition ?? undefined
    );

    const { useSkill } = useSkillAction3D(
        game ?? null,
        characters ?? [],
        mode,
        convex,
        playSkill,
        handlePhaseChanges,
        setSkillSyncState,
        calculateActionScore,
        onPedagogyNotify,
        onSkillError
    );

    const { selectSkill, standBy, defend, surrender, attack, positionSelectionUI } = useOtherAction3D(
        game ?? null,
        characters ?? [],
        mode,
        convex,
        user,
        playSkillSelect,
        openModal,
        useSkill,
        walkAndAttack,
        groundCells ?? [],
        handlePhaseChanges,
        onSkillError
    );

    const noopPedagogyNotify = useCallback((_e: PedagogyGuideNotifyEvent) => {}, []);
    const noopSkillToast = useCallback((_message: string) => {}, []);
    const { handleCellClick } = useBattleVenueCellClick({
        gridState,
        walk,
        attack,
        notifyPedagogyGuide: onPedagogyNotify ?? noopPedagogyNotify,
        enforceMoveStep: cellClickPedagogy?.enforceMoveStep ?? false,
        enforceCastStep: cellClickPedagogy?.enforceCastStep ?? false,
        enforceSkillSelectStepBoss2: cellClickPedagogy?.enforceSkillSelectStepBoss2 ?? false,
        handleSkillErrorToast: onSkillError ?? noopSkillToast,
    });

    return {
        walk,
        attack,
        defend,
        standBy,
        selectSkill,
        useSkill,
        surrender,
        positionSelectionUI,
        handleCellClick,
    };
};

export default useCombatActHandler3D;
