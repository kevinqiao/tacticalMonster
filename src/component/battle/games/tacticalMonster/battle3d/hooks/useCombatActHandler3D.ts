/**
 * 3D 战斗操作处理器 - 使用 3D 动画与阶段处理器，复用 useOtherActions
 */

import { useModalManager } from "@/service/ModalManager";
import { useConvex } from "convex/react";
import { useUserManager } from "service/UserManager";
import { usePlaySkillSelect3D } from "../animation/usePlaySkillSelect3D";
import { useScoreCalculation } from "../../battle/hooks/useScoreCalculation";
import { useCombatManager } from "../../service/CombatManager";
import { useOtherActions } from "../../service/handler/actions/useOtherActions";
import { usePassiveSkillAnimations } from "../../service/handler/hooks/usePassiveSkillAnimations";
import { useSkillSync } from "../../service/handler/hooks/useSkillSync";
import { usePlaySkill3D } from "../animation/usePlaySkill3D";
import { usePlayWalk3D } from "../animation/usePlayWalk3D";
import type { BattleMapDimension } from "../utils/coordinate3DUtils";
import { useSkillAction3D } from "./actions/useSkillAction3D";
import { useWalkAction3D } from "./actions/useWalkAction3D";
import type { UseBattleGridStateReturn } from "./useBattleGridState";
import { usePhaseChangesHandler3D } from "./usePhaseChangesHandler3D";

interface UseCombatActHandler3DOptions {
    gridState: UseBattleGridStateReturn | null;
    mapDimension: BattleMapDimension | null;
    playbackSpeed?: number;
}

const useCombatActHandler3D = (options: UseCombatActHandler3DOptions) => {
    const { gridState, mapDimension, playbackSpeed = 1.0 } = options;
    const { playSkillSelect } = usePlaySkillSelect3D();
    const { playSkill } = usePlaySkill3D({ mapDimension, playbackSpeed });
    const { playWalk } = usePlayWalk3D({ mapDimension, playbackSpeed });
    const { user } = useUserManager();
    const { game, characters, groundCells, mode = "play" } = useCombatManager();
    const convex = useConvex();
    const { openModal } = useModalManager();

    const { calculateActionScore } = useScoreCalculation(game ?? null, [], mode);
    const { handlePhaseChanges, refreshWalkableFromPosition } = usePhaseChangesHandler3D({
        gridState,
        mapDimension,
        playbackSpeed,
    });
    const { handlePassiveSkillAnimations } = usePassiveSkillAnimations(characters ?? [], playSkill);

    const handleSkillError = (message: string) => {
        console.error("技能使用失败:", message);
    };

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

    const { useSkill } = useSkillAction3D(
        game ?? null,
        characters ?? [],
        mode,
        convex,
        playSkill,
        handlePhaseChanges,
        setSkillSyncState,
        calculateActionScore
    );

    const { selectSkill, standBy, defend, surrender, attack, positionSelectionUI } = useOtherActions(
        game ?? null,
        characters ?? [],
        mode,
        convex,
        user,
        playSkillSelect,
        openModal,
        useSkill,
        walk,
        groundCells ?? []
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
