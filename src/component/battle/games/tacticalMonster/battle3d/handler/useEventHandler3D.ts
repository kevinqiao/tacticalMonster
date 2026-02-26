/**
 * 3D 事件处理器 - 与 2D 事件路由一致，使用 3D 动画与 usePhaseChangesHandler3D
 */

import { useCallback, useEffect, useRef } from "react";
import { useCombatManager } from "../../service/CombatManager";
import type { FrontendCombatEvent } from "../../types/CombatTypes";
import type { CharacterIdentifier } from "../../types/gameTypes";
import { applyStateChanges } from "../../utils/backendResponseUtils";
import { findTargetByIdentifier } from "../../utils/characterUtils";
import { usePlaySkill3D } from "../animation/usePlaySkill3D";
import { usePlayWalk3D } from "../animation/usePlayWalk3D";
import type { BattleMapDimension } from "../utils/coordinate3DUtils";
import type { UseBattleGridStateReturn } from "./useBattleGridState";
import { usePassiveSkillAnimations } from "./usePassiveSkillAnimations";
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
                // ✅ 从事件顶层获取 phaseChanges 和 stateChanges；Braveland 式：endTurn false 时无 phaseChanges，不推进回合
                const walkPhaseChanges = data?.phaseChanges;
                const walkStateChanges = data?.stateChanges;
                const walkEndTurn = data?.endTurn !== false;
                playWalk(character, path, async () => {
                    character.q = to.q;
                    character.r = to.r;
                    if (walkStateChanges) {
                        applyStateChanges(walkStateChanges, characters);
                    }
                    if (walkEndTurn && walkPhaseChanges) {
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
                case "new_round": {
                    const roundPhaseChanges = {
                        roundStart: {
                            round: payload?.round ?? 1,
                            triggeredPassiveSkills: payload?.triggeredPassiveSkills ?? [],
                        },
                    };
                    handlePhaseChanges(roundPhaseChanges)
                        .catch(() => { })
                        .finally(onComplete);
                    break;
                }
                case "roundEnd":
                case "end_round":
                    onComplete();
                    break;
                case "firstTurn": {
                    const firstTurnPhaseChanges = payload?.phaseChanges || {};
                    handlePhaseChanges(firstTurnPhaseChanges)
                        .catch(() => { })
                        .finally(onComplete);
                    break;
                }
                case "turnStart": {
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
                    break;
                }
                case "turnEnd":
                case "turnSecond": {
                    const turnEndPayload = payload && (payload.uid != null || payload.bossId != null || payload.minionId != null);
                    if (turnEndPayload) {
                        const turnEndPhaseChanges = { turnEnd: payload };
                        handlePhaseChanges(turnEndPhaseChanges)
                            .catch(() => { })
                            .finally(onComplete);
                    } else {
                        onComplete();
                    }
                    break;
                }
                case "attack":
                case "walk":
                case "skillSelect":
                case "use_skill":
                    if (isReplayMode || isWatchMode) {
                        handleWatchModeActionEvent(event, onComplete);
                    } else {
                        // play 模式：乐观更新由 mutation 响应处理；非乐观事件（如 Boss 行动）需动画并处理 phaseChanges
                        if (event.optimistic) {
                            onComplete();
                        } else {
                            handleWatchModeActionEvent(event, onComplete);
                        }
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
