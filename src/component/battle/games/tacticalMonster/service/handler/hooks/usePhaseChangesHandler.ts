/**
 * 统一的阶段变化处理器
 * 所有模式（play/watch/replay）都使用此处理器
 */

import { useModalManager } from "@/service/ModalManager";
import { useCallback } from "react";
import usePlayPhase from "../../../battle/animation/usePlayPhase";
import usePlaySkill from "../../../battle/animation/usePlaySkill";
import usePlayWalk from "../../../battle/animation/usePlayWalk";
import type { CharacterIdentifier } from "../../../utils/typeAdapter";
import { useCombatManager } from "../../CombatManager";
import { applyStateChanges } from "../utils/backendResponseUtils";
import { findTargetByIdentifier, getTargetsFromAction } from "../utils/characterUtils";
import { useBossAIHandler } from "./useBossAIHandler";

export const usePhaseChangesHandler = () => {
    const {
        game,
        characters,
        groundCells
        // ✅ 移除 updateGameState，改用 GSAP 直接更新 DOM（避免 React 重新渲染）
    } = useCombatManager();
    const { openModal } = useModalManager();
    const { playSkill } = usePlaySkill();
    const { playWalk } = usePlayWalk();
    const { playTurnStart, playTurnOn } = usePlayPhase();

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
        groundCells || [],
        playWalk,
        playSkill,
        findTargetByIdentifierWrapper,
        getTargetsFromActionWrapper
        // ✅ 移除 mode 参数，不再需要手动更新状态（所有状态更新都通过 GSAP）
    );

    // ✅ 统一的阶段变化处理函数
    const handlePhaseChanges = useCallback(async (phaseChanges: any) => {
        if (!phaseChanges || !game || !characters || !groundCells) return;

        // 1. 处理回合结束
        if (phaseChanges.turnEnd) {
            const { uid, monsterId, round } = phaseChanges.turnEnd;
            if (game.currentRound) {
                const currentTurn = game.currentRound.turns.find(
                    (t) => t.uid === uid && t.monsterId === monsterId
                );
                if (currentTurn) {
                    currentTurn.status = 2;
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

        // 4. 处理多个连续的 Boss turn（优先处理）
        if (phaseChanges.bossAIActions && phaseChanges.bossAIActions.length > 0) {
            // 循环处理每个 Boss turn
            for (const bossAIActionItem of phaseChanges.bossAIActions) {
                const { turnStart, decision, executionResults, phaseTransition } = bossAIActionItem;
                const { uid, monsterId, round } = turnStart;

                if (game.currentRound) {
                    const currentTurn = game.currentRound.turns.find(
                        (t) => t.uid === uid && t.monsterId === monsterId
                    );
                    if (currentTurn) {
                        // 更新 turn 状态为完成（Boss AI 执行完成后自动完成）
                        currentTurn.status = 2;

                        const character = characters.find(c => c.uid === uid && c.monsterId === monsterId);
                        if (character && currentTurn) {
                            // ✅ 1. 先处理回合开始逻辑（被动技能触发和动画播放）
                            // 使用 bossAIActionItem.turnStart 中的被动技能信息（包含 triggeredPassiveSkills）
                            const bossPhaseChanges = {
                                ...phaseChanges,
                                turnStart: turnStart, // ✅ 包含 triggeredPassiveSkills
                            };
                            const turnStartTimeline = await playTurnStart(character, currentTurn, bossPhaseChanges);

                            // 等待回合开始动画完成
                            if (turnStartTimeline && turnStartTimeline.duration() > 0) {
                                await new Promise<void>((resolve) => {
                                    // 如果 timeline 已经完成，立即 resolve
                                    if (!turnStartTimeline.isActive() && turnStartTimeline.progress() >= 1) {
                                        resolve();
                                        return;
                                    }

                                    // 否则等待完成
                                    const onComplete = () => {
                                        turnStartTimeline.eventCallback("onComplete", null);
                                        resolve();
                                    };
                                    turnStartTimeline.eventCallback("onComplete", onComplete);
                                });
                            }

                            // ✅ 2. 处理Boss AI动作动画
                            await handleBossAIAction({
                                decision,
                                executionResults,
                                phaseTransition,
                            });

                            // ✅ 统一使用 applyStateChanges 应用状态变化（适用于所有模式：play/watch/replay）
                            if (executionResults) {
                                // 处理 Boss 的状态变化
                                if (executionResults.boss?.stateChanges) {
                                    // ✅ 使用统一的 applyStateChanges 函数（自动通过 identifier 查找角色）
                                    applyStateChanges(executionResults.boss.stateChanges, characters);
                                }

                                // 处理小怪的状态变化
                                if (executionResults.minions && Array.isArray(executionResults.minions)) {
                                    executionResults.minions.forEach((minionResult: any) => {
                                        if (minionResult.result?.stateChanges) {
                                            // ✅ 使用统一的 applyStateChanges 函数（自动通过 identifier 查找角色）
                                            applyStateChanges(minionResult.result.stateChanges, characters);
                                        }
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }

        // 5. 处理玩家回合开始
        // 注意：Boss turn 通过 bossAIActions 数组处理，不会进入此分支
        if (phaseChanges.turnStart) {
            const { uid, monsterId, round } = phaseChanges.turnStart;

            // ✅ 只处理玩家 turn（Boss turn 通过 bossAIActions 处理）
            if (uid !== "boss" && game.currentRound) {
                const currentTurn = game.currentRound.turns.find(
                    (t) => t.uid === uid && t.monsterId === monsterId
                );
                if (currentTurn) {
                    currentTurn.status = 1;

                    const character = characters.find(c => c.uid === uid && c.monsterId === monsterId);
                    if (character && currentTurn) {
                        // ✅ 1. 先处理回合开始逻辑（被动技能触发和动画播放）
                        const turnStartTimeline = await playTurnStart(character, currentTurn, phaseChanges);

                        // 等待回合开始动画完成
                        if (turnStartTimeline && turnStartTimeline.duration() > 0) {
                            await new Promise<void>((resolve) => {
                                // 如果 timeline 已经完成，立即 resolve
                                if (!turnStartTimeline.isActive() && turnStartTimeline.progress() >= 1) {
                                    resolve();
                                    return;
                                }

                                // 否则等待完成
                                const onComplete = () => {
                                    turnStartTimeline.eventCallback("onComplete", null);
                                    resolve();
                                };
                                turnStartTimeline.eventCallback("onComplete", onComplete);
                            });
                        }

                        // ✅ 2. 再显示UI状态（可移动范围、可攻击目标）
                        // 注意：playTurnOn 不阻塞，允许玩家操作
                        playTurnOn(currentTurn, () => {
                            console.log("Turn UI displayed, waiting for player action");
                        });
                    }
                }
            } else if (uid === "boss") {
                // Boss turn 应该通过 bossAIActions 处理，不应该进入此分支
                console.warn("Boss turn should be handled via bossAIActions, not turnStart");
            }
        }

        // 5. 处理游戏结束
        if (phaseChanges.gameOver) {
            const { result, reason } = phaseChanges.gameOver;
            console.log("Game Over:", result, reason);
            // 打开游戏结束弹窗
            openModal("game_over", { gameId: game.gameId });
        }
    }, [game, characters, groundCells, handleBossAIAction, openModal, playTurnStart, playTurnOn, findTargetByIdentifierWrapper]);

    return { handlePhaseChanges };
};

