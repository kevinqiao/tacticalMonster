/**
 * 3D 战斗操作处理器 - 使用 3D 动画与阶段处理器，复用 useOtherActions
 */

import { useModalManager } from "@/service/ModalManager";
import { useConvex } from "convex/react";
import { useCallback } from "react";
import { useUserManager } from "service/UserManager";
import { useScoreCalculation } from "../../battle/hooks/useScoreCalculation";
import { useCombatManager } from "../../service/CombatManager";
import { getReplayPlaybackSpeed } from "../../utils/replayPlaybackSpeed";
import { usePlaySkill3D } from "../animation/usePlaySkill3D";
import { usePlaySkillSelect3D } from "../animation/usePlaySkillSelect3D";
import { usePlayWalk3D } from "../animation/usePlayWalk3D";
import type { BattleMapDimension } from "../utils/coordinate3DUtils";
import { useOtherAction3D } from "./actions/useOtherAction3D";
import { useSkillAction3D } from "./actions/useSkillAction3D";
import { useWalkAction3D } from "./actions/useWalkAction3D";
import { useWalkAndAttack3D } from "./actions/useWalkAndAttack3D";
import type { UseBattleGridStateReturn } from "./useBattleGridState";
import { usePassiveSkillAnimations } from "./usePassiveSkillAnimations";
import { usePhaseChangesHandler3D } from "./usePhaseChangesHandler3D";
import { useSkillSync } from "./useSkillSync";
import type { PedagogyGuideNotifyEvent } from "../../utils/pedagogyGuideFlow";

interface UseCombatActHandler3DOptions {
    gridState: UseBattleGridStateReturn | null;
    mapDimension: BattleMapDimension | null;
    /** 技能失败时额外回调（用于显示 toast 等用户可见提示） */
    onSkillError?: (message: string) => void;
    /** 教学 guideFlow 与技能栏 / 自动选技 同步 */
    onPedagogyNotify?: (event: PedagogyGuideNotifyEvent) => void;
}

const useCombatActHandler3D = (options: UseCombatActHandler3DOptions) => {
    const { gridState, mapDimension, onSkillError, onPedagogyNotify } = options;
    const { game, characters, groundCells, mode = "play", replay } = useCombatManager();
    const playbackSpeed = getReplayPlaybackSpeed(replay);
    const { playSkillSelect } = usePlaySkillSelect3D();
    const { playSkill } = usePlaySkill3D({ mapDimension, playbackSpeed });
    const { playWalk } = usePlayWalk3D({ mapDimension, playbackSpeed });
    const { user } = useUserManager();
    const convex = useConvex();
    const { openModal } = useModalManager();

    const { calculateActionScore } = useScoreCalculation(game ?? null, [], mode);
    const { handlePhaseChanges, refreshWalkableFromPosition } = usePhaseChangesHandler3D({
        gridState,
        mapDimension,
    });
    const { handlePassiveSkillAnimations } = usePassiveSkillAnimations(characters ?? [], playSkill);

    const handleSkillError = useCallback(
        (message: string, context?: { character?: any }) => {
            console.error("技能使用失败:", message);
            onSkillError?.(message);
            if (context?.character && refreshWalkableFromPosition) {
                const moveRange = (context.character as any).move_range ?? 3;
                refreshWalkableFromPosition(context.character, moveRange, false);
            }
        },
        [refreshWalkableFromPosition, onSkillError]
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
        onPedagogyNotify
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
        handlePhaseChanges
    );

    return {
        walk,
        attack,
        defend,
        standBy,
        selectSkill,
        useSkill,
        surrender,
        positionSelectionUI,
    };
};

export default useCombatActHandler3D;
