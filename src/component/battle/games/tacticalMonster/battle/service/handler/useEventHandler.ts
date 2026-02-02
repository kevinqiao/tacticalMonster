/**
 * Tactical Monster 事件处理器
 * 重构为单人 PVE 模式：只处理阶段事件（gameInit, roundStart 等），不再处理玩家操作事件
 */

import { useCallback, useEffect, useRef } from "react";
import usePlaySkill from "../../animation/usePlaySkill";
import usePlayWalk from "../../animation/usePlayWalk";
import type { CharacterIdentifier } from "../../utils/typeAdapter";
import { useCombatManager } from "../CombatManager";
import { usePassiveSkillAnimations } from "./hooks/usePassiveSkillAnimations";
import { usePhaseChangesHandler } from "./hooks/usePhaseChangesHandler";
import { findTargetByIdentifier } from "./utils/characterUtils";

const useEventHandler = () => {
    const {
        eventQueue,
        characters,
        groundCells,
        hexCell,
        mode = 'play',
        game
    } = useCombatManager();

    const isReplayMode = mode === 'replay';
    const isWatchMode = mode === 'watch';
    const { playWalk } = usePlayWalk();
    const { playSkill } = usePlaySkill();

    // ✅ 使用统一的阶段变化处理器
    const { handlePhaseChanges } = usePhaseChangesHandler();

    // ✅ 被动技能动画处理（用于 watch/replay 模式）
    const { handlePassiveSkillAnimations } = usePassiveSkillAnimations(characters, playSkill);

    // 处理锁：确保同时只处理一个事件
    const isProcessingRef = useRef<boolean>(false);

    /**
     * 观看模式下处理操作事件（统一在动画完成后更新）
     * ⚠️ 注意：在 watch 模式下，不手动更新状态，依赖 useQuery 自动同步
     */
    const handleWatchModeActionEvent = useCallback((event: FrontendCombatEvent, onComplete: () => void) => {
        if (!characters || !groundCells) {
            onComplete();
            return;
        }

        const { name, data } = event;

        if (name === "walk" && data?.to) {
            // 移动事件
            const characterId = data.identifier?.character_id || data.character_id;
            const character = characters.find(c => c.character_id === characterId);

            if (!character) {
                onComplete();
                return;
            }

            // 创建路径（简化处理，实际应该从事件数据获取）
            const path = [{ q: character.q ?? 0, r: character.r ?? 0 }, { q: data.to.q, r: data.to.r }];

            // ✅ 播放动画（不手动更新状态，依赖 useQuery 自动同步）
            playWalk(character, path, () => {
                // ✅ Watch 模式下，状态由 useQuery(gameState) 自动更新
                // 不手动修改 character.q 和 character.r，避免与 gameState 查询冲突
                onComplete();
            });
        } else if (name === "attack" || name === "use_skill") {
            // ✅ 攻击/技能事件（改进版：支持多目标、被动技能、阶段变化）
            // 从事件数据中提取信息
            const identifier = data?.identifier || data?.attacker || data?.caster;
            const skillId = data?.skillSelect || data?.skillId || "basic_attack";
            const result = data?.result; // 后端返回的完整结果
            const targets = data?.targets || []; // 目标列表（支持多目标）

            // 查找攻击者
            const attacker = identifier ? findTargetByIdentifier(
                characters,
                identifier as CharacterIdentifier
            ) : null;

            if (!attacker) {
                console.warn("Cannot find attacker for skill event", identifier);
                onComplete();
                return;
            }

            // 查找所有目标
            const targetSprites: any[] = [];
            const targetUpdates: Map<string, { newHp?: number; newMp?: number; effects?: any[] }> = new Map();

            if (result?.effects) {
                // 从 result.effects 中提取目标信息
                result.effects.forEach((effectData: any) => {
                    if (effectData.targetId) {
                        const targetIdentifier = targets.find((t: any) => {
                            const tId = t.monsterId || t.bossId || t.minionId;
                            return tId === effectData.targetId;
                        });
                        if (targetIdentifier) {
                            const target = findTargetByIdentifier(
                                characters,
                                targetIdentifier as CharacterIdentifier
                            );
                            if (target && !targetSprites.find(t => t.character_id === target.character_id)) {
                                targetSprites.push(target);
                                // 从 effectData 中提取状态更新信息
                                // 注意：实际的状态更新应该从后端查询获取，这里只是示例
                                targetUpdates.set(target.character_id, {
                                    effects: effectData.effect ? [effectData.effect] : []
                                });
                            }
                        }
                    }
                });
            } else if (targets.length > 0) {
                // 如果没有 effects，直接从 targets 列表查找
                targets.forEach((targetIdentifier: any) => {
                    const target = findTargetByIdentifier(
                        characters,
                        targetIdentifier as CharacterIdentifier
                    );
                    if (target) {
                        targetSprites.push(target);
                    }
                });
            }

            if (targetSprites.length === 0) {
                console.warn("No valid targets found for skill event");
                onComplete();
                return;
            }

            // 播放主动技能动画
            let activeSkillTimeline: gsap.core.Timeline | null = null;
            activeSkillTimeline = playSkill(
                attacker,
                skillId,
                targetSprites,
                async () => {
                    // ✅ Watch 模式下，不手动更新状态，依赖 useQuery(gameState) 自动同步
                    // 状态更新流程：
                    // 1. 后端执行动作 → 更新数据库
                    // 2. useQuery(gameState) 检测到数据库变化 → 自动更新
                    // 3. effectiveGame 更新 → characters 重新计算 → UI 更新
                    // 
                    // 注意：targetUpdates 中的信息仅用于参考，不用于实际更新
                    // 实际状态应该从 gameState 查询获取

                    // ✅ 处理被动技能动画（如果有）
                    if (result && activeSkillTimeline) {
                        handlePassiveSkillAnimations(
                            result,
                            activeSkillTimeline,
                            attacker,
                            targetSprites[0] // 被动技能通常只作用于第一个目标
                        );
                    }

                    // ✅ 处理阶段变化（如果有）
                    if (result?.phaseChanges) {
                        await handlePhaseChanges(result.phaseChanges);
                    }

                    onComplete();
                }
            );
        } else {
            // 其他操作事件直接完成
            onComplete();
        }
    }, [characters, groundCells, playWalk, playSkill, handlePassiveSkillAnimations, handlePhaseChanges]);

    const processEvent = useCallback(() => {
        // 如果正在处理，跳过（严格的队列机制）
        if (isProcessingRef.current) return;

        const event: FrontendCombatEvent | null = eventQueue.length > 0 ? eventQueue[0] : null;
        if (!event) return;

        // 已处理的事件直接移除
        if (event.status === 1) {
            eventQueue.shift();
            return;
        }

        // 事件超时检查
        event.initTime = event.initTime || Date.now();
        if (Date.now() - event.initTime > 5000) {
            console.warn(`Event ${event.name} timeout, removing from queue`);
            eventQueue.shift();
            return;
        }

        // 标记为正在处理
        isProcessingRef.current = true;
        event.status = 1;

        const onComplete = () => {
            eventQueue.shift();
            isProcessingRef.current = false; // 释放锁
        };

        const { name, data } = event;

        try {
            switch (name) {
                // ✅ 阶段事件处理
                // 所有模式统一使用 handlePhaseChanges 处理阶段变化
                case "gameInit":
                    // gameInit 只在游戏初始化时触发一次
                    // ✅ Replay 模式：从 gameInit 事件提取初始状态
                    if (isReplayMode && data) {
                        // 在 replay 模式下，gameInit 事件包含完整的初始游戏状态
                        // 这里可以提取并更新 replayGameState（如果需要）
                        // 注意：实际的状态更新应该通过 CombatManager 的状态管理来处理
                        console.log("Replay mode: gameInit event processed", data);
                    }
                    // 所有模式都需要处理 gameInit
                    if (!characters) {
                        onComplete();
                        return;
                    }
                    onComplete();
                    break;

                case "roundStart":
                case "new_round":
                    // ✅ watch/replay 模式：处理独立的回合开始事件，转换为 phaseChanges 格式
                    if (isWatchMode || isReplayMode) {
                        const phaseChanges: any = {
                            roundStart: {
                                round: data?.round || 1,
                                triggeredPassiveSkills: data?.triggeredPassiveSkills || [], // ✅ 从事件 data 中获取被动技能信息
                            },
                        };
                        handlePhaseChanges(phaseChanges).catch((error) => {
                            console.error(`Error handling ${name} event:`, error);
                        }).finally(() => {
                            onComplete();
                        });
                    } else {
                        // play 模式：不应该出现独立的阶段事件（所有阶段变化都在操作事件的 phaseChanges 中）
                        onComplete();
                    }
                    break;

                case "roundEnd":
                case "end_round":
                    // 回合结束事件：状态更新由后端处理，前端只需同步
                    onComplete();
                    break;

                case "firstTurn":
                    // ✅ watch/replay 模式：处理第一个回合的初始事件，包含所有连续 Boss turn 的数据
                    if (isWatchMode || isReplayMode) {
                        const phaseChanges = data?.phaseChanges || {};
                        handlePhaseChanges(phaseChanges).catch((error) => {
                            console.error(`Error handling ${name} event:`, error);
                        }).finally(() => {
                            onComplete();
                        });
                    } else {
                        // play 模式：不应该出现独立的阶段事件（所有阶段变化都在操作事件的 phaseChanges 中）
                        onComplete();
                    }
                    break;

                case "turnStart":
                    // ✅ watch/replay 模式：处理独立的回合开始事件，转换为 phaseChanges 格式
                    if (isWatchMode || isReplayMode) {
                        const phaseChanges: any = {
                            turnStart: {
                                uid: data?.uid || "",
                                // ✅ 支持 CharacterIdentifier 格式（monsterId/bossId/minionId）
                                ...(data?.monsterId ? { monsterId: data.monsterId } : {}),
                                ...(data?.bossId ? { bossId: data.bossId } : {}),
                                ...(data?.minionId ? { minionId: data.minionId } : {}),
                                round: data?.round || 1,
                                triggeredPassiveSkills: data?.triggeredPassiveSkills || [], // ✅ 从事件 data 中获取被动技能信息
                            },
                        };

                        // ✅ 如果事件包含 Boss AI 动作信息，添加到 phaseChanges
                        if (data?.bossAIAction) {
                            phaseChanges.bossAIActions = [{
                                turnStart: phaseChanges.turnStart,
                                decision: data.bossAIAction.decision,
                                executionResults: data.bossAIAction.executionResults,
                                phaseTransition: data.bossAIAction.phaseTransition,
                            }];
                        }

                        handlePhaseChanges(phaseChanges).catch((error) => {
                            console.error(`Error handling ${name} event:`, error);
                        }).finally(() => {
                            onComplete();
                        });
                    } else {
                        // play 模式：不应该出现独立的阶段事件（所有阶段变化都在操作事件的 phaseChanges 中）
                        onComplete();
                    }
                    break;

                case "turnEnd":
                    // 回合结束事件：状态更新由后端处理，前端只需同步
                    onComplete();
                    break;

                case "turnSecond":
                    // turnSecond 是中间状态，可以忽略或特殊处理
                    onComplete();
                    break;
                // 玩家操作事件（attack, walk, skillSelect）
                case "attack":
                case "walk":
                case "skillSelect":
                case "use_skill":
                    if (isReplayMode || isWatchMode) {
                        // 重播/观看模式：处理历史事件，统一在动画完成后更新
                        handleWatchModeActionEvent(event, onComplete);
                    } else {
                        // 游玩模式：乐观事件跳过（由 useCombatActHandler 处理验证）
                        if (event.optimistic) {
                            onComplete();
                        } else {
                            // 后端事件：可能是其他客户端或自动生成的事件
                            // 需要同步状态（但当前是单人PVE，所以直接跳过）
                            onComplete();
                        }
                    }
                    break;
                default:
                    console.log("unknown event", event);
                    onComplete();
                    break;
            }
        } catch (error) {
            console.error(`Error processing event ${event.name}:`, error);
            // 错误时也要释放锁
            isProcessingRef.current = false;
            eventQueue.shift();
        }
    }, [eventQueue, handlePhaseChanges, game, characters, isReplayMode, isWatchMode, mode, handleWatchModeActionEvent]);

    useEffect(() => {
        // 所有模式都需要轮询处理事件队列
        // replay 模式下，事件由重播管理器通过回调注入到队列，但仍需要轮询来处理
        if (!characters || !groundCells || !hexCell) return;

        const intervalId = setInterval(() => {
            processEvent();
        }, 100);

        return () => clearInterval(intervalId);
    }, [characters, groundCells, hexCell, processEvent, mode]);
};

export default useEventHandler;

