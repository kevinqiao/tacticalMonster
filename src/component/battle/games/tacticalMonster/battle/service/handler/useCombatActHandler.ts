/**
 * Tactical Monster 战斗操作处理器
 * PVE模式：玩家 vs Boss（Boss本体 + 小怪，uid="boss"）
 * 参考 solitaireSolo 的 useActHandler 模式
 * 
 * 本文件整合了所有拆分后的模块，提供统一的战斗操作接口
 */

import { useModalManager } from "@/service/ModalManager";
import { useConvex } from "convex/react";
import { useUserManager } from "service/UserManager";

import usePlaySkill from "../../animation/usePlaySkill";
import usePlaySkillSelect from "../../animation/usePlaySkillSelect";
import usePlayWalk from "../../animation/usePlayWalk";
import { useScoreCalculation } from "../../hooks/useScoreCalculation";
import { useCombatManager } from "../CombatManager";

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
        groundCells,
        hexDimension,  // ✅ 使用 hexDimension 作为 hexCell（格式相同：{ width, height }）
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

    // ✅ 使用共享的阶段变化处理器
    const { handlePhaseChanges } = usePhaseChangesHandler();

    // 被动技能动画处理
    const { handlePassiveSkillAnimations } = usePassiveSkillAnimations(characters, playSkill);

    // ✅ 方案1：技能同步状态管理（移除 OperationQueue 和乐观执行相关参数）
    // ✅ 错误处理：后端失败时显示错误提示
    const handleSkillError = (message: string) => {
        // 可以显示错误提示（如果项目中有 toast 组件）
        console.error("技能使用失败:", message);
        // 可选：显示 toast 或 modal
        // openModal("error", { message });
    };

    const { setSkillSyncState } = useSkillSync(
        handlePhaseChanges,
        handlePassiveSkillAnimations,
        characters || [],
        calculateActionScore,
        handleSkillError  // ✅ 错误提示回调
    );

    // ✅ 方案1：移动操作（移除 OperationQueue）
    const { walk } = useWalkAction(
        game,
        characters || [],
        groundCells || [],
        mode,
        convex,
        playWalk,
        handlePhaseChanges,
        hexDimension  // ✅ 传递 hexDimension 作为 hexCell 用于位置回滚
    );

    // ✅ 方案1：技能使用操作（移除 OptimisticSkillExecutor 和 OperationQueue）
    const { useSkill } = useSkillAction(
        game,
        characters || [],
        mode,
        convex,
        playSkill,
        handlePhaseChanges,
        setSkillSyncState,
        calculateActionScore
    );

    // 其他操作（选择技能、攻击、防御、待机、投降）
    const { selectSkill, standBy, defend, surrender, attack, positionSelectionUI } = useOtherActions(
        game,
        characters || [],
        mode,
        convex,
        user,
        playSkillSelect,
        openModal,
        useSkill,
        walk,
        groundCells || []
    );

    return {
        walk,
        attack,
        defend,
        standBy,
        selectSkill,
        useSkill,
        surrender,
        positionSelectionUI  // ✅ 位置选择UI（手动移动模式）
    };
};

export default useCombatActHandler;
