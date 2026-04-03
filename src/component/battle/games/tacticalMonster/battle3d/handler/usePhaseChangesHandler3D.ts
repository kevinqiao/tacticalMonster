/**
 * 3D 阶段变化处理器 - 与 2D 逻辑一致，使用 3D 动画 Hook
 */

import { useModalManager } from "@/service/ModalManager";
import { useCallback } from "react";
import { flushSync } from "react-dom";
import { useCombatManager } from "../../service/CombatManager";
import { getReplayPlaybackSpeed } from "../../utils/replayPlaybackSpeed";

import type { CharacterIdentifier, GameRound, GameTurn } from "../../types/gameTypes";
import { applyPhaseChangesToGame } from "../../utils/applyPhaseChangesToGame";
import { applyStateChanges } from "../../utils/backendResponseUtils";
import { findTargetByIdentifier, getTargetsFromAction } from "../../utils/characterUtils";
import { syncCharacterPositionsToGame } from "../../utils/syncCharacterPositionsToGame";
import { getCharactersFromGameModel } from "../../utils/typeAdapter";
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
}

type TurnActor = { uid?: string; character_id?: string };

const isSameTurnActor = (turn: GameTurn, actor: TurnActor): boolean =>
    turn.character_id === actor.character_id;

const getCurrentRoundActiveId = (round?: GameRound | null): string | null =>
    round?.turns?.find((t) => (t.status ?? 0) === 1)?.character_id ?? null;

const getTurnActorId = (actor: any, currentRound?: GameRound | null): string | null =>
    actor?.character_id ??
    getCurrentRoundActiveId(currentRound) ??
    actor?.monsterId ??
    actor?.bossId ??
    actor?.minionId ??
    null;


export const usePhaseChangesHandler3D = (options: UsePhaseChangesHandler3DOptions) => {
    const { gridState, mapDimension } = options;
    const { game, characters, groundCells, setActiveCharacterKey, addPhaseChangeEvent, updateRuntimeGame, replay } =
        useCombatManager();
    const playbackSpeed = getReplayPlaybackSpeed(replay);
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
            console.log("phaseChanges:", phaseChanges);
            const runtimeChars = characters ?? [];
            // ✅ 先处理召唤，确保 turnStart 时 characters 已包含召唤单位（用于高亮与 walk 校验）
            const hasSummoned = (phaseChanges.summonedCharacters?.length ?? 0) > 0;
            const gameWithLivePositions = hasSummoned
                ? syncCharacterPositionsToGame(game, runtimeChars)
                : game;
            if (hasSummoned && updateRuntimeGame) {
                // 必须以“当前 runtimeGame + 实时坐标”为基准合并召唤，避免把角色位置回退到旧快照。
                updateRuntimeGame((prev) =>
                    applyPhaseChangesToGame(
                        syncCharacterPositionsToGame(prev ?? gameWithLivePositions, runtimeChars),
                        phaseChanges
                    )
                );
            }
            const mergedGame = hasSummoned
                ? applyPhaseChangesToGame(gameWithLivePositions, phaseChanges)
                : game;
            const liveCharsFromGame = getCharactersFromGameModel(
                mergedGame.team ?? [],
                mergedGame.boss
            );
            const charsForTurnStart = (() => {
                // 默认优先使用运行时 characters（位置最实时，避免 roundStart 后按旧坐标高亮）
                if (!hasSummoned) return runtimeChars;
                // 召唤场景：在实时 characters 基础上只补充新增召唤单位，避免把已有单位位置回退到 game 快照
                const mergedSprites = getCharactersFromGameModel(mergedGame.team, mergedGame.boss);
                const runtimeIds = new Set(runtimeChars.map((c: any) => c.character_id));
                const onlyNewSummons = mergedSprites.filter((c: any) => !runtimeIds.has(c.character_id));
                return [...runtimeChars, ...onlyNewSummons];
            })();
            const findCharacterById = (id: string | null | undefined) => {
                if (!id) return null;
                return (
                    charsForTurnStart.find((c) => (c as any).character_id === id) ??
                    runtimeChars.find((c) => (c as any).character_id === id) ??
                    liveCharsFromGame.find((c) => (c as any).character_id === id) ??
                    null
                );
            };
            const hasBossAIActions = !!(phaseChanges.bossAIActions?.length);
            const hasTurnStart = !!phaseChanges.turnStart;
            const hasTurnEnd = !!phaseChanges.turnEnd;
            // ✅ 同一 phaseChanges 内同时有 turnEnd + turnStart（玩家→玩家）时，一次 flushSync 内先 turnEnd 再 turnStart，避免中间帧「无当前回合」导致 validation.can 为 false 与 TurnBar 错帧
            const hasTurnEndAndStart = hasTurnEnd && hasTurnStart && !hasBossAIActions;
            // ✅ 仅有 summon + turnStart（无 turnEnd / bossAI）时，同步提交 turnStart，确保 merged game 与 phaseChangeEvent 同帧可见
            const hasSummonedTurnStartOnly = hasSummoned && hasTurnStart && !hasTurnEnd && !hasBossAIActions;
            const hasNonEmptyTurns = (turns: GameTurn[] | null | undefined): turns is GameTurn[] =>
                Array.isArray(turns) && turns.length > 0;
            const roundFromRoundStart = (() => {
                if (!phaseChanges.roundStart) return null;
                const roundPayload = phaseChanges.roundStart.round;
                const roundNo = typeof roundPayload === "number" ? roundPayload : (roundPayload as GameRound)?.no ?? 1;
                const payloadTurns = typeof roundPayload === "object" && roundPayload !== null && "turns" in roundPayload
                    ? (roundPayload as GameRound).turns
                    : null;
                const currentRoundTurns = (phaseChanges.currentRound as GameRound | undefined)?.turns;
                const gameCurrentTurns = game?.currentRound?.turns;
                const resolvedTurns =
                    (hasNonEmptyTurns(payloadTurns) && payloadTurns) ||
                    (hasNonEmptyTurns(currentRoundTurns) && currentRoundTurns) ||
                    (hasNonEmptyTurns(gameCurrentTurns) && gameCurrentTurns) ||
                    null;
                const syntheticTurns: GameTurn[] = resolvedTurns ?? [...characters]
                    .sort((a, b) => ((b as any).stats?.speed ?? 0) - ((a as any).stats?.speed ?? 0))
                    .map((c, i) => ({
                        uid: c.uid,
                        character_id: c.character_id,
                        status: 0,
                        order: i + 1,
                    }));
                return { no: roundNo, turns: syntheticTurns } as GameRound;
            })();
            const turnbarCurrentRound = (() => {
                const currentRound = phaseChanges.currentRound as GameRound | undefined;
                // 同一批 phase 同时有 roundStart + turnStart 时，优先用 roundStart 推导的回合，避免 currentRound 旧快照导致 turnbar 分界线回跳。
                if (roundFromRoundStart) return roundFromRoundStart;
                return currentRound;
            })();

            let turnStartAppliedSync = false;
            if (hasTurnEndAndStart || hasSummonedTurnStartOnly) {
                const turnStartData = phaseChanges.turnStart;
                const actorSource = turnStartData && "turn" in turnStartData ? turnStartData.turn : turnStartData;
                const character_id = getTurnActorId(actorSource, phaseChanges.currentRound);
                const characterForSync = findCharacterById(character_id);
                flushSync(() => {
                    if (hasTurnEndAndStart) {
                        setActiveCharacterKey(null);
                        gridState?.clearAll();
                        addPhaseChangeEvent({ name: "turnEnd", data: phaseChanges.turnEnd });
                    }
                    addPhaseChangeEvent({
                        name: "turnStart",
                        data: {
                            ...phaseChanges.turnStart,
                            ...(turnbarCurrentRound && { currentRound: turnbarCurrentRound }),
                        },
                    });
                    if (characterForSync) setActiveCharacterKey(getCharacterKey(characterForSync));
                });
                turnStartAppliedSync = true;
            } else if (phaseChanges.turnEnd) {
                flushSync(() => {
                    setActiveCharacterKey(null);
                    gridState?.clearAll();
                    addPhaseChangeEvent({ name: "turnEnd", data: phaseChanges.turnEnd });
                });
            }

            // ✅ 先处理 bossAIActions，完成当前 round 的 boss turn 更新；再处理 roundStart 避免覆盖
            if (phaseChanges.bossAIActions && phaseChanges.bossAIActions.length > 0) {
                for (const bossAIActionItem of phaseChanges.bossAIActions) {
                    const {
                        turnStart,
                        decision,
                        executionResults,
                        phaseTransition,
                        currentRoundWhenTurnActive,
                        currentRoundWhenTurnComplete,
                    } = bossAIActionItem;
                    const actorSource = turnStart && "turn" in turnStart ? turnStart.turn : turnStart;
                    const actor: TurnActor = { uid: actorSource.uid, character_id: actorSource.character_id };

                    const character = (actorSource.character_id && characters.find((c) => (c as any).character_id === actorSource.character_id)) ?? null;

                    if (character && gridState && character.q != null && character.r != null) {
                        gridState.clearAll();
                        gridState.setSelected({ q: character.q, r: character.r });
                    }
                    let startedTurn: GameTurn | null = null;
                    flushSync(() => {
                        if (character) setActiveCharacterKey(getCharacterKey(character));
                        addPhaseChangeEvent(
                            {
                                name: "turnStart",
                                data: {
                                    ...turnStart,
                                    ...(currentRoundWhenTurnActive && {
                                        currentRound: currentRoundWhenTurnActive,
                                    }),
                                },
                            },
                            { authoritativeRound: !!currentRoundWhenTurnActive }
                        );
                    });
                    startedTurn =
                        currentRoundWhenTurnActive?.turns.find((t: GameTurn) => isSameTurnActor(t, actor)) ??
                        ("turn" in turnStart ? turnStart.turn : null) ??
                        (game?.currentRound?.turns.find((t: GameTurn) => isSameTurnActor(t, actor)) ?? null);

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
                            turnStart,
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
                            addPhaseChangeEvent(
                                {
                                    name: "turnEnd",
                                    data: {
                                        ...turnStart,
                                        ...(currentRoundWhenTurnComplete && {
                                            currentRound: currentRoundWhenTurnComplete,
                                        }),
                                    },
                                },
                                { authoritativeRound: !!currentRoundWhenTurnComplete }
                            );
                            setActiveCharacterKey(null);
                        });
                    }
                }
            }

            // roundEnd：后端 lastRound 为按实际出手顺序排序的回合，供 turnbar 重排
            if (phaseChanges.roundEnd) {
                const roundForTurnbar = phaseChanges.roundEnd.lastRound ?? game?.currentRound;
                if (roundForTurnbar) {
                    flushSync(() => {
                        addPhaseChangeEvent({
                            name: "roundEnd",
                            data: {
                                ...phaseChanges.roundEnd,
                                currentRound: roundForTurnbar,
                            },
                        });
                    });
                }
            }

            if (phaseChanges.roundStart) {
                const round = roundFromRoundStart as GameRound;
                flushSync(() => {
                    addPhaseChangeEvent({ name: "roundStart", data: { ...phaseChanges.roundStart, round } });
                });
            }

            if (phaseChanges.turnStart) {
                const turnStartData = phaseChanges.turnStart;
                const actorSource = turnStartData && "turn" in turnStartData ? turnStartData.turn : turnStartData;
                const character_id = getTurnActorId(actorSource, phaseChanges.currentRound);
                const character = findCharacterById(character_id);
                const phaseChangeEventAlreadySet = turnStartAppliedSync; // already set in flushSync above
                if (!phaseChangeEventAlreadySet) {
                    flushSync(() => {
                        if (character) setActiveCharacterKey(getCharacterKey(character));
                        addPhaseChangeEvent({
                            name: "turnStart",
                            data: {
                                ...phaseChanges.turnStart,
                                ...(turnbarCurrentRound && { currentRound: turnbarCurrentRound }),
                            },
                        });
                    });
                }
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
                    const rawTurn = "turn" in turnStartData ? turnStartData.turn : (phaseChanges.turnStart as unknown as GameTurn);
                    const normalizedTurnCharacterId = getTurnActorId(rawTurn, phaseChanges.currentRound);
                    const turnForAnim = normalizedTurnCharacterId
                        ? ({ ...(rawTurn as any), character_id: normalizedTurnCharacterId } as GameTurn)
                        : rawTurn;
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
                    playTurnOn(turnForAnim, () => { }, { charactersOverride: charsForTurnStart });
                }
            }

            if (phaseChanges.gameOver) {
                // openModal("game_over", { gameId: game.gameId });
                console.log("gameOver:", phaseChanges.gameOver);
                flushSync(() => {
                    addPhaseChangeEvent({
                        name: "gameOver",
                        data: phaseChanges.gameOver,
                    });
                });
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
            addPhaseChangeEvent,
            setActiveCharacterKey,
            updateRuntimeGame,
            findTargetByIdentifierWrapper,
        ]
    );

    return { handlePhaseChanges, refreshWalkableFromPosition };
};
