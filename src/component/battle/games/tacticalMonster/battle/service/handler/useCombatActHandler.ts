/**
 * Tactical Monster 战斗操作处理器
 * PVE模式：玩家 vs Boss（Boss本体 + 小怪，uid="boss"）
 * 参考 solitaireSolo 的 useActHandler 模式
 * 
 * 本文件整合了所有拆分后的模块，提供统一的战斗操作接口
 */

import { useModalManager } from "@/service/ModalManager";
import { useConvex } from "convex/react";
import { useMemo } from "react";
import { useUserManager } from "service/UserManager";

import usePlaySkill from "../../animation/usePlaySkill";
import usePlaySkillSelect from "../../animation/usePlaySkillSelect";
import usePlayWalk from "../../animation/usePlayWalk";
import { useScoreCalculation } from "../../hooks/useScoreCalculation";
import { useCombatManager } from "../CombatManager";
import { OperationQueue } from "../optimistic/OperationQueue";
import { OptimisticSkillExecutor } from "../optimistic/OptimisticSkillExecutor";

// 导入拆分后的模块
import { useOtherActions } from "./actions/useOtherActions";
import { useSkillAction } from "./actions/useSkillAction";
import { useWalkAction } from "./actions/useWalkAction";
import { usePassiveSkillAnimations } from "./hooks/usePassiveSkillAnimations";
import { usePhaseChangesHandler } from "./hooks/usePhaseChangesHandler";
import { useSkillSync } from "./hooks/useSkillSync";

const useCombatActHandler = () => {
    // 基础 Hooks
    const { playSkillSelect } = usePlaySkillSelect();
    const { playSkill } = usePlaySkill();
    const { playWalk } = usePlayWalk();
    const { user } = useUserManager();
    const {
        game,
        characters,
        gridCells,
        mode = 'play'
    } = useCombatManager();
    const convex = useConvex();
    const { openModal } = useModalManager();

    // 计分服务
    const { calculateActionScore } = useScoreCalculation(
        game,
        [],
        mode
    );

    // 乐观执行相关实例
    const operationQueue = useMemo(() => new OperationQueue(), []);
    const optimisticExecutor = useMemo(() => {
        if (!game) return null;
        return new OptimisticSkillExecutor(game, operationQueue);
    }, [game, operationQueue]);


    // ✅ 使用共享的阶段变化处理器
    const { handlePhaseChanges } = usePhaseChangesHandler();

    // 被动技能动画处理
    const { handlePassiveSkillAnimations } = usePassiveSkillAnimations(characters, playSkill);

    // 技能同步状态管理
    // 注意：skillSyncState 在 useSkillSync 内部使用，这里只需要 setSkillSyncState
    const { setSkillSyncState } = useSkillSync(
        operationQueue,
        handlePhaseChanges,
        handlePassiveSkillAnimations
    );

    // 移动操作
    const { walk } = useWalkAction(
        game,
        characters || [],
        gridCells || [],
        mode,
        convex,
        playWalk,
        operationQueue,
        handlePhaseChanges
    );

    // 技能使用操作
    const { useSkill } = useSkillAction(
        game,
        characters || [],
        mode,
        convex,
        optimisticExecutor,
        operationQueue,
        playSkill,
        handlePhaseChanges,
        setSkillSyncState,
        calculateActionScore
    );

    // 其他操作（选择技能、攻击、防御、待机、投降）
    const { selectSkill, standBy, defend, surrender, attack } = useOtherActions(
        game,
        characters || [],
        mode,
        convex,
        user,
        playSkillSelect,
        openModal,
        useSkill
    );

    return {
        walk,
        attack,
        defend,
        standBy,
        selectSkill,
        useSkill,
        surrender
    };
};

export default useCombatActHandler;
