/**
 * 观战 / 重播：消费 useWatchEventIngest 持有的队列、播放 3D 动画与阶段变化。
 * 重播事件由 replay.setOnEventProcessed 推入同一队列。
 */

import type { MutableRefObject } from "react";
import { useCallback, useEffect, useRef } from "react";
import { useWatchEventIngest } from "../../battle/hooks/useWatchEventIngest";
import { useCombatManager } from "../../service/CombatManager";
import { useReplay } from "../../battle/view/replayContext";
import type { FrontendCombatEvent } from "../../types/CombatTypes";
import type { CharacterIdentifier } from "../../types/gameTypes";
import { applyStateChanges } from "../../utils/backendResponseUtils";
import { getReplayPlaybackSpeed } from "../../utils/replayPlaybackSpeed";
import { findTargetByIdentifier } from "../../utils/characterUtils";
import { usePlaySkill3D } from "../animation/usePlaySkill3D";
import { usePlayWalk3D } from "../animation/usePlayWalk3D";
import type { UseBattleGridStateReturn } from "./useBattleGridState";
import { usePassiveSkillAnimations } from "./usePassiveSkillAnimations";
import { usePhaseChangesHandler3D } from "./usePhaseChangesHandler3D";

export interface UseWatchOrReplayOptions {
    gridState: UseBattleGridStateReturn | null;
}

export interface UseWatchOrReplayResult {
    eventQueueRef: MutableRefObject<FrontendCombatEvent[]>;
}

const useWatchOrReplay = (options: UseWatchOrReplayOptions): UseWatchOrReplayResult => {
    const { gridState } = options;
    const {
        characters,
        groundCells,
        mode = "play",
        game,
        mapDimension,
    } = useCombatManager();
    const replay = useReplay();

    const playbackSpeed = getReplayPlaybackSpeed(replay);

    const eventQueueRef = useWatchEventIngest({
        gameId: game?.gameId,
        mode,
    });

    useEffect(() => {
        if (mode === "replay" && replay?.setOnEventProcessed) {
            replay.setOnEventProcessed((event: FrontendCombatEvent) => {
                eventQueueRef.current.push(event);
            });
        }
    }, [mode, replay, eventQueueRef]);

    const isReplayMode = mode === "replay";
    const isWatchMode = mode === "watch";
    const { playWalk } = usePlayWalk3D({ mapDimension, playbackSpeed });
    const { playSkill } = usePlaySkill3D({ mapDimension, playbackSpeed });
    const { handlePhaseChanges } = usePhaseChangesHandler3D(gridState);
    const { handlePassiveSkillAnimations } = usePassiveSkillAnimations(characters ?? [], playSkill);

    const isProcessingRef = useRef<boolean>(false);

    const handleWatchModeActionEvent = useCallback(
        async (event: FrontendCombatEvent, onComplete: () => void) => {
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
                                const tId = t.character_id;
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
                    const resolvedStateChanges = eventStateChanges ?? eventPhaseChanges?.stateChanges;
                    if (resolvedStateChanges) {
                        applyStateChanges(resolvedStateChanges, characters);
                    }

                    const resolvedEffects = eventPhaseChanges?.effects || result?.effects;
                    if (resolvedEffects && activeSkillTimeline) {
                        handlePassiveSkillAnimations(
                            { phaseChanges: eventPhaseChanges, effects: resolvedEffects },
                            activeSkillTimeline,
                            attacker,
                            targetSprites[0]
                        );
                    }

                    if (eventPhaseChanges) {
                        await handlePhaseChanges(eventPhaseChanges);
                    }
                    onComplete();
                });
            } else if (name === "defend" || name === "standby") {
                const phaseChanges = data?.phaseChanges;
                const stateChanges = phaseChanges?.stateChanges;
                if (stateChanges && characters) {
                    applyStateChanges(stateChanges, characters);
                }
                if (phaseChanges) {
                    await handlePhaseChanges(phaseChanges);
                }
                onComplete();
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
        const eventQueue = eventQueueRef.current;
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
                    if (!isReplayMode && !isWatchMode) {
                        onComplete();
                        break;
                    }
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
                    if (!isReplayMode && !isWatchMode) {
                        onComplete();
                        break;
                    }
                    const firstTurnPhaseChanges = payload?.phaseChanges || {};
                    handlePhaseChanges(firstTurnPhaseChanges)
                        .catch(() => { })
                        .finally(onComplete);
                    break;
                }
                case "turnStart": {
                    if (!isReplayMode && !isWatchMode) {
                        onComplete();
                        break;
                    }
                    const turnPhaseChanges: Record<string, any> = {
                        turnStart: {
                            uid: payload?.uid ?? "",
                            character_id: payload?.character_id ?? "",
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
                    if (!isReplayMode && !isWatchMode) {
                        onComplete();
                        break;
                    }
                    const turnEndPayload = payload && (payload.uid != null || payload.character_id != null);
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
                case "defend":
                case "standby":
                case "skillSelect":
                case "use_skill":
                    if (isReplayMode || isWatchMode) {
                        handleWatchModeActionEvent(event, onComplete);
                    } else {
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
            eventQueueRef.current.shift();
        }
    }, [
        eventQueueRef,
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

    return { eventQueueRef };
};

export default useWatchOrReplay;
