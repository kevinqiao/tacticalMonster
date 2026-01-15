/**
 * 统一的阶段变化处理器
 * 所有模式（play/watch/replay）都使用此处理器
 */

import { useCallback } from "react";
import { useModalManager } from "@/service/ModalManager";
import { useCombatManager } from "../../CombatManager";
import { useBossAIHandler } from "./useBossAIHandler";
import { findTargetByIdentifier, getTargetsFromAction } from "../utils/characterUtils";
import type { CharacterIdentifier } from "../../../utils/typeAdapter";
import usePlaySkill from "../../../animation/usePlaySkill";
import usePlayWalk from "../../../animation/usePlayWalk";
import usePlayPhase from "../../../animation/usePlayPhase";

export const usePhaseChangesHandler = () => {
    const {
        game,
        characters,
        gridCells
    } = useCombatManager();
    const { openModal } = useModalManager();
    const { playSkill } = usePlaySkill();
    const { playWalk } = usePlayWalk();
    const { playTurnOn } = usePlayPhase();

    // 创建辅助函数的包装器
    const findTargetByIdentifierWrapper = useCallback((identifier: CharacterIdentifier, excludeBoss?: boolean) => {
        return findTargetByIdentifier(characters, identifier, excludeBoss);
    }, [characters]);

    const getTargetsFromActionWrapper = useCallback((action: any) => {
        return getTargetsFromAction(characters, action, findTargetByIdentifierWrapper);
    }, [characters, findTargetByIdentifierWrapper]);

    // Boss AI 处理
    const { handleBossAIAction } = useBossAIHandler(
        characters,
        game,
        gridCells || [],
        playWalk,
        playSkill,
        findTargetByIdentifierWrapper,
        getTargetsFromActionWrapper
    );

    // ✅ 统一的阶段变化处理函数
    const handlePhaseChanges = useCallback(async (phaseChanges: any) => {
        if (!phaseChanges || !game || !characters || !gridCells) return;

        // 1. 处理回合结束
        if (phaseChanges.turnEnd) {
            const { uid, monsterId, round } = phaseChanges.turnEnd;
            if (game.currentRound) {
                const currentTurn = (game.currentRound.turns as any[]).find(
                    (t: any) => t.uid === uid && t.monsterId === monsterId
                );
                if (currentTurn) {
                    (currentTurn as any).status = 3;
                }
            }
        }

        // 2. 处理回合结束
        if (phaseChanges.roundEnd) {
            // 回合结束状态更新由后端处理，前端只需同步
            // currentRound 的状态更新会在下次查询时自动同步
        }

        // 3. 处理回合开始
        if (phaseChanges.roundStart) {
            // 回合开始状态更新由后端处理，前端只需同步
            // currentRound 的状态更新会在下次查询时自动同步
        }

        // 4. 处理回合开始
        if (phaseChanges.turnStart) {
            const { uid, monsterId, round } = phaseChanges.turnStart;
            if (game.currentRound) {
                const currentTurn = (game.currentRound.turns as any[]).find(
                    (t: any) => t.uid === uid && t.monsterId === monsterId
                );
                if (currentTurn) {
                    (currentTurn as any).status = 1;
                    
                    // ✅ 播放回合开始动画
                    // 注意：playTurnOn 需要 CombatTurn 类型，currentTurn 应该已经符合
                    const character = characters.find(c => c.uid === uid && c.monsterId === monsterId);
                    if (character && currentTurn) {
                        // 使用 playTurnOn 播放回合开始动画（显示可移动/可攻击区域）
                        await new Promise<void>((resolve) => {
                            playTurnOn(currentTurn as any, resolve);
                        });
                    }
                }
            }

            // 如果是Boss回合，处理Boss AI动作
            if (uid === "boss" && phaseChanges.bossAIAction) {
                await handleBossAIAction(phaseChanges.bossAIAction);
            }
        }

        // 5. 处理游戏结束
        if (phaseChanges.gameOver) {
            const { result, reason } = phaseChanges.gameOver;
            console.log("Game Over:", result, reason);
            // 打开游戏结束弹窗
            openModal("game_over", { gameId: game.gameId });
        }
    }, [game, characters, gridCells, handleBossAIAction, openModal, playTurnOn]);

    return { handlePhaseChanges };
};

