/**
 * Tactical Monster 事件处理器
 * 重构为单人 PVE 模式：只处理阶段事件（gameInit, roundStart 等），不再处理玩家操作事件
 */

import { useCallback, useEffect, useRef } from "react";
import usePlaySkill from "../../animation/usePlaySkill";
import usePlayWalk from "../../animation/usePlayWalk";
import { CombatEvent } from "../../types/CombatTypes";
import { useCombatManager } from "../CombatManager";
import usePhaseProcessor from "../processor/usePhaseProcessor";

const useEventHandler = () => {
    const {
        eventQueue,
        characters,
        gridCells,
        hexCell,
        resourceLoad,
        updateGame,
        mode = 'play'
    } = useCombatManager();

    const isReplayMode = mode === 'replay';
    const isWatchMode = mode === 'watch';
    const { playWalk } = usePlayWalk();
    const { playSkill } = usePlaySkill();

    const {
        processGameInit,
        processRoundStart,
        processTurnStart,
        processTurnEnd,
        processRoundEnd,
        processTurnSecond
    } = usePhaseProcessor();

    // 处理锁：确保同时只处理一个事件
    const isProcessingRef = useRef<boolean>(false);

    /**
     * 观看模式下处理操作事件（统一在动画完成后更新）
     */
    const handleWatchModeActionEvent = useCallback((event: CombatEvent, onComplete: () => void) => {
        if (!characters || !gridCells) {
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

            // 准备更新数据（不立即应用）
            const pendingUpdate = {
                q: data.to.q,
                r: data.to.r
            };

            // 创建路径（简化处理，实际应该从事件数据获取）
            const path = [{ x: character.q ?? 0, y: character.r ?? 0 }, { x: data.to.q, y: data.to.r }];

            // 播放动画
            playWalk(character, path, () => {
                // 动画完成后统一更新
                character.q = pendingUpdate.q;
                character.r = pendingUpdate.r;
                updateGame(() => { });
                onComplete();
            });
        } else if (name === "attack" || name === "use_skill") {
            // 攻击/技能事件
            const attackerId = data?.attacker?.character_id || data?.caster?.character_id;
            const targetId = data?.targets?.[0]?.character_id || data?.target?.character_id;

            const attacker = characters.find(c => c.character_id === attackerId);
            const target = characters.find(c => c.character_id === targetId);

            if (!attacker || !target) {
                onComplete();
                return;
            }

            // 准备更新数据（从事件数据获取）
            const pendingUpdate = {
                targetId: target.character_id,
                newHp: data?.targets?.[0]?.hp?.current ?? target.stats?.hp?.current,
                newMp: data?.targets?.[0]?.mp?.current ?? target.stats?.mp?.current,
                effects: data?.targets?.[0]?.effects ?? []
            };

            // 播放技能动画
            const skillId = data?.skillSelect || data?.skillId || attacker.skills?.[0]?.id || "";
            if (skillId) {
                playSkill(
                    attacker,
                    skillId,
                    [target],
                    () => {
                        // 动画完成后统一更新
                        if (target.stats) {
                            if (target.stats.hp) {
                                target.stats.hp.current = pendingUpdate.newHp;
                            }
                            if (target.stats.mp && pendingUpdate.newMp !== undefined) {
                                target.stats.mp.current = pendingUpdate.newMp;
                            }
                            if (pendingUpdate.effects) {
                                target.statusEffects = pendingUpdate.effects;
                            }
                        }
                        updateGame(() => { });
                        onComplete();
                    }
                );
            } else {
                // 如果没有技能ID，直接完成
                onComplete();
            }
        } else {
            // 其他操作事件直接完成
            onComplete();
        }
    }, [characters, gridCells, playWalk, playSkill, updateGame]);

    const processEvent = useCallback(() => {
        // 如果正在处理，跳过（严格的队列机制）
        if (isProcessingRef.current) return;

        const event: CombatEvent | null = eventQueue.length > 0 ? eventQueue[0] : null;
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
                // 只处理阶段事件，玩家操作事件已在 useCombatActHandler 中直接处理
                case "gameInit":
                    processGameInit({ data, onComplete });
                    break;
                case "roundStart":
                case "new_round":
                    processRoundStart({ data, onComplete });
                    break;
                case "turnStart":
                    processTurnStart({ data, onComplete });
                    break;
                case "turnSecond":
                    processTurnSecond({ data, onComplete });
                    break;
                case "turnEnd":
                    processTurnEnd({ data, onComplete });
                    break;
                case "roundEnd":
                case "end_round":
                    processRoundEnd({ data, onComplete });
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
    }, [eventQueue, processRoundStart, processTurnStart, processTurnSecond, resourceLoad, processGameInit, processRoundEnd, processTurnEnd, isReplayMode, isWatchMode, handleWatchModeActionEvent]);

    useEffect(() => {
        // 所有模式都需要轮询处理事件队列
        // replay 模式下，事件由重播管理器通过回调注入到队列，但仍需要轮询来处理
        if (!characters || !gridCells || !hexCell || Object.values(resourceLoad).some(v => v === 0)) return;

        const intervalId = setInterval(() => {
            processEvent();
        }, 100);

        return () => clearInterval(intervalId);
    }, [characters, gridCells, hexCell, resourceLoad, processEvent, mode]);
};

export default useEventHandler;

