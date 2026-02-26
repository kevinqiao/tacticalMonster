/**
 * 3D 阶段变化处理器 - 与 2D 逻辑一致，使用 3D 动画 Hook
 */

import { useModalManager } from "@/service/ModalManager";
import { useCallback } from "react";
import { flushSync } from "react-dom";
import { useCombatManager } from "../../service/CombatManager";

import type { CharacterIdentifier, GameRound, GameTurn } from "../../types/gameTypes";
import { applyStateChanges } from "../../utils/backendResponseUtils";
import { findTargetByIdentifier, getTargetsFromAction } from "../../utils/characterUtils";
import { usePlayPhase3D } from "../animation/usePlayPhase3D";
import { usePlaySkill3D } from "../animation/usePlaySkill3D";
import { usePlayWalk3D } from "../animation/usePlayWalk3D";
import { getCharacterKey } from "../utils/battle3DAdapter";
import type { BattleMapDimension } from "../utils/coordinate3DUtils";
import type { UseBattleGridStateReturn } from "./useBattleGridState";
import { useBossAIHandler } from "./useBossAIHandler";

interface UsePhaseChangesHandler3DOptions {
    gridState: UseBattleGridStateReturn | null;
    mapDimension: BattleMapDimension | null;
    playbackSpeed?: number;
}

type TurnActor = {
    uid?: string;
    monsterId?: string;
    bossId?: string;
    minionId?: string;
};

const isSameTurnActor = (turn: GameTurn, actor: TurnActor): boolean => {
    if (actor.bossId != null) return (turn as any).bossId === actor.bossId;
    if (actor.minionId != null) return (turn as any).minionId === actor.minionId;
    return turn.uid === actor.uid && turn.monsterId === actor.monsterId;
};

const findTurnIndexByPriority = (
    turns: GameTurn[],
    actor: TurnActor,
    statusPriority: number[]
): number => {
    for (const status of statusPriority) {
        const idx = turns.findIndex((t) => isSameTurnActor(t, actor) && (t.status ?? 0) === status);
        if (idx >= 0) return idx;
    }
    return turns.findIndex((t) => isSameTurnActor(t, actor) && (t.status ?? 0) !== 2);
};

/** 仅按 actor 匹配查找 turn，不限制 status。boss 完成 turn 后必须用此函数才能正确更新。 */
const findTurnIndexByActor = (turns: GameTurn[], actor: TurnActor): number =>
    turns.findIndex((t) => isSameTurnActor(t, actor));

export const usePhaseChangesHandler3D = (options: UsePhaseChangesHandler3DOptions) => {
    const { gridState, mapDimension, playbackSpeed = 1.0 } = options;
    const { game, characters, groundCells, setActiveCharacterKey, setTurnRound } = useCombatManager();
    const { openModal } = useModalManager();

    const { playSkill } = usePlaySkill3D({ mapDimension, playbackSpeed });
    const { playWalk } = usePlayWalk3D({ mapDimension, playbackSpeed });
    const { playTurnStart, playTurnOn, refreshWalkableFromPosition } = usePlayPhase3D(gridState);

    const findTargetByIdentifierWrapper = useCallback(
        (identifier: CharacterIdentifier, excludeBoss?: boolean) => {
            return findTargetByIdentifier(characters ?? [], identifier, excludeBoss);
        },
        [characters]
    );

    const getTargetsFromActionWrapper = useCallback(
        (action: any) => {
            return getTargetsFromAction(characters ?? [], action, findTargetByIdentifierWrapper);
        },
        [characters, findTargetByIdentifierWrapper]
    );

    const { handleBossAIAction } = useBossAIHandler(
        characters ?? undefined,
        game ?? undefined,
        groundCells ?? [],
        playWalk,
        playSkill,
        findTargetByIdentifierWrapper,
        getTargetsFromActionWrapper
    );

    const handlePhaseChanges = useCallback(
        async (phaseChanges: any) => {
            if (!phaseChanges || !game || !characters || !groundCells) return;
            console.log("phaseChanges", phaseChanges);
            if (phaseChanges.turnEnd) {
                const { uid, monsterId, bossId, minionId } = phaseChanges.turnEnd as any;
                const actor: TurnActor = { uid, monsterId, bossId, minionId };
                flushSync(() => {
                    // updateCurrentRound((prev) => {
                    //     const baseRound = prev ?? game.currentRound;
                    //     if (!baseRound) return prev;
                    //     const idx = findTurnIndexByPriority(baseRound.turns, actor, [1, 0]);
                    //     if (idx < 0) return baseRound;
                    //     const newTurns = baseRound.turns.map((t, i) =>
                    //         i === idx ? { ...t, status: 2 as const } : t
                    //     );
                    //     return { ...baseRound, turns: newTurns };
                    // });
                    setActiveCharacterKey(null);
                    gridState?.clearAll();
                    setTurnRound({ name: "turnEnd", data: phaseChanges.turnEnd });
                });
            }

            // ✅ 先处理 bossAIActions，完成当前 round 的 boss turn 更新；再处理 roundStart 避免覆盖
            if (phaseChanges.bossAIActions && phaseChanges.bossAIActions.length > 0) {
                for (const bossAIActionItem of phaseChanges.bossAIActions) {
                    const { turnStart, decision, executionResults, phaseTransition } = bossAIActionItem;
                    const actorSource = turnStart && "turn" in turnStart ? turnStart.turn : turnStart;
                    const { uid, monsterId, bossId, minionId } = actorSource;
                    const actor: TurnActor = { uid, monsterId, bossId, minionId };

                    const character =
                        (bossId != null && characters.find((c) => (c as any).character_id === bossId)) ||
                        (minionId != null && characters.find((c) => (c as any).character_id === minionId)) ||
                        characters.find((c) => c.uid === uid && c.monsterId === monsterId);

                    if (character && gridState && character.q != null && character.r != null) {
                        gridState.clearAll();
                        gridState.setSelected({ q: character.q, r: character.r });
                    }
                    let startedTurn: GameTurn | null = null;
                    flushSync(() => {
                        if (character) setActiveCharacterKey(getCharacterKey(character));
                        // updateCurrentRound((prev) => {
                        //     const baseRound = prev ?? game.currentRound;
                        //     if (!baseRound) return prev;
                        //     const idx = findTurnIndexByActor(baseRound.turns, actor);
                        //     if (idx < 0) return baseRound;
                        //     const newTurns = baseRound.turns.map((t, i) =>
                        //         i === idx ? { ...t, status: 1 as const } : t
                        //     );
                        //     startedTurn = newTurns[idx];
                        //     return { ...baseRound, turns: newTurns };
                        // });
                        setTurnRound({ name: "turnStart", data: turnStart });
                    });
                    startedTurn = "turn" in turnStart ? turnStart.turn : (game?.currentRound?.turns.find((t) => isSameTurnActor(t, actor)) ?? null);

                    if (character && decision) {
                        const statusEffectChanges = turnStart.statusEffectChanges;
                        if (statusEffectChanges?.characterState && character.stats) {
                            character.stats.hp.current = statusEffectChanges.characterState.hp;
                            if (statusEffectChanges.characterState.mp !== undefined && character.stats.mp) {
                                character.stats.mp.current = statusEffectChanges.characterState.mp;
                            }
                            if (statusEffectChanges.characterState.status) {
                                character.status = statusEffectChanges.characterState.status as "normal" | "stunned" | "dead";
                            }
                        }
                        if (startedTurn) {
                            const bossPhaseChanges = { ...phaseChanges, turnStart };
                            const turnStartTimeline = await playTurnStart(
                                character,
                                startedTurn,
                                bossPhaseChanges
                            );
                            if (turnStartTimeline && turnStartTimeline.duration() > 0) {
                                await new Promise<void>((resolve) => {
                                    if (
                                        !turnStartTimeline.isActive() &&
                                        turnStartTimeline.progress() >= 1
                                    ) {
                                        resolve();
                                        return;
                                    }
                                    turnStartTimeline.eventCallback("onComplete", () => {
                                        turnStartTimeline.eventCallback("onComplete", null);
                                        resolve();
                                    });
                                });
                            }
                        }
                        await handleBossAIAction({
                            turnStart: { uid, monsterId, bossId, minionId },
                            character,
                            decision,
                            executionResults,
                            phaseTransition,
                        });
                        if (executionResults) {
                            if (executionResults.boss?.stateChanges) {
                                applyStateChanges(
                                    executionResults.boss.stateChanges,
                                    characters
                                );
                            }
                            if (executionResults.minions && Array.isArray(executionResults.minions)) {
                                executionResults.minions.forEach((minionResult: any) => {
                                    if (minionResult.result?.stateChanges) {
                                        applyStateChanges(
                                            minionResult.result.stateChanges,
                                            characters
                                        );
                                    }
                                });
                            }
                        }
                        if (gridState && character.q != null && character.r != null) {
                            gridState.setSelected({ q: character.q, r: character.r });
                        }
                    }
                    if (startedTurn) {
                        flushSync(() => {
                            // updateCurrentRound((prev) => {
                            //     const baseRound = prev ?? game.currentRound;
                            //     if (!baseRound) return prev;
                            //     const idx = findTurnIndexByActor(baseRound.turns, actor);
                            //     if (idx < 0) return baseRound;
                            //     const newTurns = baseRound.turns.map((t, i) =>
                            //         i === idx ? { ...t, status: 2 as const } : t
                            //     );
                            //     return { ...baseRound, turns: newTurns };
                            // });
                            setTurnRound({ name: "turnEnd", data: turnStart });
                            setActiveCharacterKey(null);
                        })
                    }
                }
            }

            if (phaseChanges.roundStart) {
                const roundPayload = phaseChanges.roundStart.round;
                const roundNo = typeof roundPayload === "number" ? roundPayload : (roundPayload as GameRound)?.no ?? 1;
                const existingTurns = typeof roundPayload === "object" && roundPayload !== null && "turns" in roundPayload
                    ? (roundPayload as GameRound).turns
                    : null;
                const bossChars = characters.filter((c) => c.uid === "boss");
                const mainBossId =
                    (game as any)?.boss?.bossId ??
                    (bossChars.find((c) => !(game as any)?.boss?.minions?.some((m: any) => m.minionId === (c as any).character_id)) as any)?.character_id ??
                    (bossChars[0] as any)?.character_id;
                const syntheticTurns: GameTurn[] = existingTurns ?? [...characters]
                    .sort((a, b) => ((b as any).stats?.speed ?? 0) - ((a as any).stats?.speed ?? 0))
                    .map((c, i) => ({
                        uid: c.uid,
                        monsterId: c.monsterId ?? "",
                        ...(c.uid === "boss" && c.character_id === mainBossId ? { bossId: c.character_id } : {}),
                        ...(c.uid === "boss" && c.character_id !== mainBossId ? { minionId: c.character_id } : {}),
                        status: 0,
                        order: i + 1,
                    }));
                const round: GameRound = { no: roundNo, turns: syntheticTurns };
                flushSync(() => {
                    setTurnRound({ name: "roundStart", data: { ...phaseChanges.roundStart, round } });
                });
            }

            if (phaseChanges.turnStart) {
                const turnStartData = phaseChanges.turnStart;
                const actorSource = turnStartData && "turn" in turnStartData ? turnStartData.turn : turnStartData;
                const { uid, monsterId, bossId, minionId } = actorSource as TurnActor;
                const actor: TurnActor = { uid, monsterId, bossId, minionId };
                const character =
                    (bossId != null && characters.find((c) => (c as any).character_id === bossId)) ||
                    (minionId != null && characters.find((c) => (c as any).character_id === minionId)) ||
                    characters.find((c) => c.uid === uid && c.monsterId === monsterId);

                flushSync(() => {
                    if (character) setActiveCharacterKey(getCharacterKey(character));
                    // updateCurrentRound((prev) => {
                    //     const baseRound = prev ?? game.currentRound;
                    //     if (!baseRound) return prev;
                    //     const idx = findTurnIndexByPriority(baseRound.turns, actor, [0, 1]);
                    //     if (idx < 0) return baseRound;
                    //     const newTurns = baseRound.turns.map((t, i) =>
                    //         i === idx ? { ...t, status: 1 as const } : t
                    //     );
                    //     startedTurn = newTurns[idx];
                    //     return { ...baseRound, turns: newTurns };
                    // });
                    setTurnRound({ name: "turnStart", data: phaseChanges.turnStart });
                });
                if (character) {
                    const statusEffectChanges = phaseChanges.turnStart.statusEffectChanges;
                    if (statusEffectChanges?.characterState && character.stats) {
                        character.stats.hp.current = statusEffectChanges.characterState.hp;
                        if (statusEffectChanges.characterState.mp !== undefined && character.stats.mp) {
                            character.stats.mp.current = statusEffectChanges.characterState.mp;
                        }
                        if (statusEffectChanges.characterState.status) {
                            character.status = statusEffectChanges.characterState.status as "normal" | "stunned" | "dead";
                        }
                    }
                    const turnForAnim = "turn" in turnStartData ? turnStartData.turn : (phaseChanges.turnStart as unknown as GameTurn);
                    const turnStartTimeline = await playTurnStart(
                        character,
                        turnForAnim,
                        phaseChanges
                    );
                    if (turnStartTimeline && turnStartTimeline.duration() > 0) {
                        await new Promise<void>((resolve) => {
                            if (
                                !turnStartTimeline.isActive() &&
                                turnStartTimeline.progress() >= 1
                            ) {
                                resolve();
                                return;
                            }
                            turnStartTimeline.eventCallback("onComplete", () => {
                                turnStartTimeline.eventCallback("onComplete", null);
                                resolve();
                            });
                        });
                    }
                    playTurnOn(turnForAnim, () => { });
                }
            }

            if (phaseChanges.gameOver) {
                openModal("game_over", { gameId: game.gameId });
            }
        },
        [
            game,
            characters,
            groundCells,
            gridState,
            handleBossAIAction,
            openModal,
            playTurnStart,
            playTurnOn,
            setTurnRound,
            setActiveCharacterKey,
            findTargetByIdentifierWrapper,
        ]
    );

    return { handlePhaseChanges, refreshWalkableFromPosition };
};
