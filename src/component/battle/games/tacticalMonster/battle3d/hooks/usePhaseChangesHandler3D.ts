/**
 * 3D 阶段变化处理器 - 与 2D 逻辑一致，使用 3D 动画 Hook
 */

import { useModalManager } from "@/service/ModalManager";
import { useCallback } from "react";
import { useCombatManager } from "../../battle/service/CombatManager";
import { useBossAIHandler } from "../../battle/service/handler/hooks/useBossAIHandler";
import { applyStateChanges } from "../../battle/service/handler/utils/backendResponseUtils";
import { findTargetByIdentifier, getTargetsFromAction } from "../../battle/service/handler/utils/characterUtils";
import type { CharacterIdentifier } from "../../types/gameTypes";
import { usePlayPhase3D } from "../animation/usePlayPhase3D";
import { usePlaySkill3D } from "../animation/usePlaySkill3D";
import { usePlayWalk3D } from "../animation/usePlayWalk3D";
import type { BattleMapDimension } from "../utils/coordinate3DUtils";
import type { UseBattleGridStateReturn } from "./useBattleGridState";

interface UsePhaseChangesHandler3DOptions {
    gridState: UseBattleGridStateReturn | null;
    mapDimension: BattleMapDimension | null;
    playbackSpeed?: number;
}

export const usePhaseChangesHandler3D = (options: UsePhaseChangesHandler3DOptions) => {
    const { gridState, mapDimension, playbackSpeed = 1.0 } = options;
    const { game, characters, groundCells, setActiveCharacterKey } = useCombatManager();
    const { openModal } = useModalManager();

    const { playSkill } = usePlaySkill3D({ mapDimension, playbackSpeed });
    const { playWalk } = usePlayWalk3D({ mapDimension, playbackSpeed });
    const { playTurnStart, playTurnOn } = usePlayPhase3D(gridState);

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

            if (phaseChanges.turnEnd) {
                const { uid, monsterId } = phaseChanges.turnEnd;
                if (game.currentRound) {
                    const currentTurn = game.currentRound.turns.find(
                        (t) => t.uid === uid && t.monsterId === monsterId
                    );
                    if (currentTurn) currentTurn.status = 2;
                }
                // ✅ 回合结束：清除活跃角色高亮和格子高亮
                setActiveCharacterKey(null);
                gridState?.clearAll();
            }

            if (phaseChanges.bossAIActions && phaseChanges.bossAIActions.length > 0) {
                for (const bossAIActionItem of phaseChanges.bossAIActions) {
                    const { turnStart, decision, executionResults, phaseTransition } = bossAIActionItem;
                    const { uid, monsterId } = turnStart;

                    if (game.currentRound) {
                        const currentTurn = game.currentRound.turns.find(
                            (t) => t.uid === uid && t.monsterId === monsterId
                        );
                        if (currentTurn) {
                            currentTurn.status = 2;
                            const character = characters.find(
                                (c) => c.uid === uid && c.monsterId === monsterId
                            );
                            if (character && currentTurn) {
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
                                const bossPhaseChanges = { ...phaseChanges, turnStart };
                                const turnStartTimeline = await playTurnStart(
                                    character,
                                    currentTurn,
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
                                await handleBossAIAction({
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
                            }
                        }
                    }
                }
            }

            if (phaseChanges.turnStart) {
                const { uid, monsterId } = phaseChanges.turnStart;
                console.log("[handlePhaseChanges] turnStart:", { uid, monsterId, hasCurrentRound: !!game.currentRound });
                if (uid !== "boss" && game.currentRound) {
                    const currentTurn = game.currentRound.turns.find(
                        (t) => t.uid === uid && t.monsterId === monsterId
                    );
                    console.log("[handlePhaseChanges] currentTurn found:", !!currentTurn);
                    if (currentTurn) {
                        currentTurn.status = 1;
                        const character = characters.find(
                            (c) => c.uid === uid && c.monsterId === monsterId
                        );
                        console.log("[handlePhaseChanges] character found:", !!character, "will call playTurnOn");
                        if (character && currentTurn) {
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
                            const turnStartTimeline = await playTurnStart(
                                character,
                                currentTurn,
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
                            playTurnOn(currentTurn, () => { });
                        }
                    }
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
            setActiveCharacterKey,
            findTargetByIdentifierWrapper,
        ]
    );

    return { handlePhaseChanges };
};
