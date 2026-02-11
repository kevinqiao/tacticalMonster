/**
 * 3D 事件处理器 - 与 2D 事件路由一致，使用 3D 动画与 usePhaseChangesHandler3D
 */

import { useCallback, useEffect, useRef } from "react";
import { useCombatManager } from "../../battle/service/CombatManager";
import { usePassiveSkillAnimations } from "../../battle/service/handler/hooks/usePassiveSkillAnimations";
import { applyStateChanges } from "../../battle/service/handler/utils/backendResponseUtils";
import { findTargetByIdentifier } from "../../battle/service/handler/utils/characterUtils";
import type { FrontendCombatEvent } from "../../types/CombatTypes";
import type { CharacterIdentifier } from "../../types/gameTypes";
import { usePlaySkill3D } from "../animation/usePlaySkill3D";
import { usePlayWalk3D } from "../animation/usePlayWalk3D";
import type { BattleMapDimension } from "../utils/coordinate3DUtils";
import type { UseBattleGridStateReturn } from "./useBattleGridState";
import { usePhaseChangesHandler3D } from "./usePhaseChangesHandler3D";

interface UseEventHandler3DOptions {
    gridState: UseBattleGridStateReturn | null;
    mapDimension: BattleMapDimension | null;
    playbackSpeed?: number;
}

const useEventHandler3D = (options: UseEventHandler3DOptions) => {
    const { gridState, mapDimension, playbackSpeed = 1.0 } = options;
    const {
        eventQueue,
        characters,
        groundCells,
        mode = "play",
        game,
    } = useCombatManager();

    const isReplayMode = mode === "replay";
    const isWatchMode = mode === "watch";
    const { playWalk } = usePlayWalk3D({ mapDimension, playbackSpeed });
    const { playSkill } = usePlaySkill3D({ mapDimension, playbackSpeed });
    const { handlePhaseChanges } = usePhaseChangesHandler3D({
        gridState,
        mapDimension,
        playbackSpeed,
    });
    const { handlePassiveSkillAnimations } = usePassiveSkillAnimations(characters ?? [], playSkill);

    const isProcessingRef = useRef<boolean>(false);

    const handleWatchModeActionEvent = useCallback(
        (event: FrontendCombatEvent, onComplete: () => void) => {
            if (!characters || !groundCells) {
                onComplete();
                return;
            }
            const { name, data } = event;

            if (name === "walk" && data?.to) {
                const to = data.to;
                const characterId =
                    (data.identifier as { character_id?: string } | undefined)?.character_id ??
                    data.character_id;
                const character = characters.find((c) => c.character_id === characterId);
                if (!character) {
                    onComplete();
                    return;
                }
                const path = [
                    { q: character.q ?? 0, r: character.r ?? 0 },
                    { q: to.q, r: to.r },
                ];
                // ✅ 从事件顶层获取 phaseChanges 和 stateChanges（未来 walk 可能触发被动技能/陷阱等）
                const walkPhaseChanges = data?.phaseChanges;
                const walkStateChanges = data?.stateChanges;
                playWalk(character, path, async () => {
                    // ✅ 更新角色逻辑坐标（与 play 模式 useWalkAction3D 保持一致）
                    character.q = to.q;
                    character.r = to.r;
                    // ✅ 应用后端确认的状态变化（如踩陷阱等）
                    if (walkStateChanges) {
                        applyStateChanges(walkStateChanges, characters);
                    }
                    // ✅ 处理阶段变化（如 walk 触发被动技能导致的回合推进等）
                    if (walkPhaseChanges) {
                        await handlePhaseChanges(walkPhaseChanges);
                    }
                    onComplete();
                });
            } else if (name === "attack" || name === "use_skill") {
                const identifier = data?.identifier || data?.attacker;
                const skillId = data?.skillSelect ?? data?.skillId ?? "basic_attack";
                const result = data?.result;
                const targets = data?.targets || [];
                // ✅ 从事件顶层获取完整的 phaseChanges 和 stateChanges（后端已完整写入）
                const eventPhaseChanges = data?.phaseChanges;
                const eventStateChanges = data?.stateChanges;
                const attacker = identifier
                    ? findTargetByIdentifier(characters, identifier as CharacterIdentifier)
                    : null;
                if (!attacker) {
                    onComplete();
                    return;
                }
                const targetSprites: any[] = [];
                if (result?.effects) {
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
                                if (
                                    target &&
                                    !targetSprites.find((t) => t.character_id === target.character_id)
                                ) {
                                    targetSprites.push(target);
                                }
                            }
                        }
                    });
                } else if (targets.length > 0) {
                    targets.forEach((targetIdentifier: any) => {
                        const target = findTargetByIdentifier(
                            characters,
                            targetIdentifier as CharacterIdentifier
                        );
                        if (target) targetSprites.push(target);
                    });
                }
                if (targetSprites.length === 0) {
                    onComplete();
                    return;
                }
                let activeSkillTimeline: gsap.core.Timeline | null = null;
                activeSkillTimeline = playSkill(attacker, skillId, targetSprites, async () => {
                    // ✅ 应用状态变化：优先使用事件顶层 stateChanges，回退到 phaseChanges.stateChanges
                    const resolvedStateChanges = eventStateChanges ?? eventPhaseChanges?.stateChanges;
                    if (resolvedStateChanges) {
                        applyStateChanges(resolvedStateChanges, characters);
                    }

                    // ✅ 处理被动技能动画：优先使用 phaseChanges.effects
                    const resolvedEffects = eventPhaseChanges?.effects || result?.effects;
                    if (resolvedEffects && activeSkillTimeline) {
                        handlePassiveSkillAnimations(
                            { phaseChanges: eventPhaseChanges, effects: resolvedEffects },
                            activeSkillTimeline,
                            attacker,
                            targetSprites[0]
                        );
                    }

                    // ✅ 处理完整的阶段变化（turnEnd → bossAIActions → turnStart → gameOver）
                    if (eventPhaseChanges) {
                        await handlePhaseChanges(eventPhaseChanges);
                    }
                    onComplete();
                });
            } else {
                onComplete();
            }
        },
        [
            characters,
            groundCells,
            playWalk,
            playSkill,
            handlePassiveSkillAnimations,
            handlePhaseChanges,
        ]
    );

    const processEvent = useCallback(() => {
        if (isProcessingRef.current) return;
        const event: FrontendCombatEvent | null =
            eventQueue.length > 0 ? eventQueue[0] : null;
        if (!event) return;
        if (event.status === 1) {
            eventQueue.shift();
            return;
        }
        event.initTime = event.initTime || Date.now();
        if (Date.now() - event.initTime > 5000) {
            eventQueue.shift();
            return;
        }
        isProcessingRef.current = true;
        event.status = 1;
        const onComplete = () => {
            eventQueue.shift();
            isProcessingRef.current = false;
        };
        const eventName = event.name;
        const payload = event.data;
        try {
            switch (eventName) {
                case "gameInit":
                    if (!characters) {
                        onComplete();
                        return;
                    }
                    onComplete();
                    break;
                case "roundStart":
                case "new_round":
                    if (isWatchMode || isReplayMode) {
                        const roundPhaseChanges = {
                            roundStart: {
                                round: payload?.round ?? 1,
                                triggeredPassiveSkills: payload?.triggeredPassiveSkills ?? [],
                            },
                        };
                        handlePhaseChanges(roundPhaseChanges)
                            .catch(() => { })
                            .finally(onComplete);
                    } else {
                        onComplete();
                    }
                    break;
                case "roundEnd":
                case "end_round":
                    onComplete();
                    break;
                case "firstTurn":
                    if (isWatchMode || isReplayMode) {
                        const firstTurnPhaseChanges = payload?.phaseChanges || {};
                        handlePhaseChanges(firstTurnPhaseChanges)
                            .catch(() => { })
                            .finally(onComplete);
                    } else {
                        onComplete();
                    }
                    break;
                case "turnStart":
                    if (isWatchMode || isReplayMode) {
                        const turnPhaseChanges: Record<string, any> = {
                            turnStart: {
                                uid: payload?.uid ?? "",
                                ...(payload?.monsterId != null ? { monsterId: payload.monsterId } : {}),
                                ...(payload?.bossId != null ? { bossId: payload.bossId } : {}),
                                ...(payload?.minionId != null ? { minionId: payload.minionId } : {}),
                                round: payload?.round ?? 1,
                                triggeredPassiveSkills: payload?.triggeredPassiveSkills ?? [],
                            },
                        };
                        const bossAIAction = payload?.bossAIAction;
                        if (bossAIAction) {
                            turnPhaseChanges.bossAIActions = [
                                {
                                    turnStart: turnPhaseChanges.turnStart,
                                    decision: bossAIAction.decision,
                                    executionResults: bossAIAction.executionResults,
                                    phaseTransition: bossAIAction.phaseTransition,
                                },
                            ];
                        }
                        handlePhaseChanges(turnPhaseChanges)
                            .catch(() => { })
                            .finally(onComplete);
                    } else {
                        onComplete();
                    }
                    break;
                case "turnEnd":
                case "turnSecond":
                    onComplete();
                    break;
                case "attack":
                case "walk":
                case "skillSelect":
                case "use_skill":
                    if (isReplayMode || isWatchMode) {
                        handleWatchModeActionEvent(event, onComplete);
                    } else {
                        if (event.optimistic) onComplete();
                        else onComplete();
                    }
                    break;
                default:
                    onComplete();
                    break;
            }
        } catch {
            isProcessingRef.current = false;
            eventQueue.shift();
        }
    }, [
        eventQueue,
        handlePhaseChanges,
        characters,
        isReplayMode,
        isWatchMode,
        handleWatchModeActionEvent,
    ]);

    useEffect(() => {
        if (!characters || !groundCells || !mapDimension) return;
        const intervalId = setInterval(processEvent, 100);
        return () => clearInterval(intervalId);
    }, [characters, groundCells, mapDimension, processEvent, mode]);
};

export default useEventHandler3D;
