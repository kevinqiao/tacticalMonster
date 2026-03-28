/**
 * 3D 移动后攻击 - 原子操作（walkAndAttack 后端 API）
 * 承载近战「先移动再攻击」的完整流程
 */

import type { Dispatch, SetStateAction } from "react";
import gsap from "gsap";
import { useCallback, useRef } from "react";
import { flushSync } from "react-dom";
import { api } from "../../../../../../../convex/tacticalMonster/convex/_generated/api";
import { useCombatManager } from "../../../service/CombatManager";
import type { MonsterSprite } from "../../../types/CombatTypes";
import type { SkillSyncState } from "../../../types/skillTypes";
import { createCharacterIdentifiers } from "../../../utils/characterUtils";
import { findPath, isCellPassableForMovement } from "../../../utils/PathFind";
import { canPerformAction } from "../../../utils/validationUtils";
import { getCharacterKey } from "../../utils/battle3DAdapter";
import type { BattleMapDimension } from "../../utils/coordinate3DUtils";
import { hexTo3DCenter } from "../../utils/coordinate3DUtils";

export const useWalkAndAttack3D = (
    game: any,
    characters: any[],
    gridCells: any[][],
    mode: string,
    convex: any,
    playWalk: (
        character: any,
        path: Array<{ q: number; r: number }>,
        onComplete: () => void | Promise<void>
    ) => void,
    playSkill: (
        caster: MonsterSprite,
        skillId: string,
        targets: MonsterSprite[],
        onComplete: () => void | Promise<void>
    ) => gsap.core.Timeline | null,
    setSkillSyncState: Dispatch<SetStateAction<SkillSyncState | null>>,
    handlePhaseChanges: (phaseChanges: any) => Promise<void>,
    mapDimension: BattleMapDimension | null,
    refreshWalkableFromPosition?: (character: any, moveRange: number, onlyFurthestLayer?: boolean) => void
) => {
    const { setCharacterAnimating } = useCombatManager();
    const stepsUsedThisTurnRef = useRef(0);
    const lastTurnKeyRef = useRef<string | null>(null);

    const walkAndAttack = useCallback(
        async (to: { q: number; r: number }, skillId: string, target: MonsterSprite): Promise<void> => {
            const validation = canPerformAction(mode, game, characters);
            if (!validation.can || !validation.character || !gridCells || !game?.map || !mapDimension) {
                return Promise.reject(new Error("Cannot perform walkAndAttack"));
            }

            const { character } = validation;
            const charKey = getCharacterKey(character);
            if (charKey !== lastTurnKeyRef.current) {
                lastTurnKeyRef.current = charKey;
                stepsUsedThisTurnRef.current = 0;
            }
            const currentTurn = game?.currentRound?.turns?.find(
                (t: any) => t.status === 1 && t.character_id === character.character_id
            );
            const backendStepsUsed = (currentTurn?.stepsUsed ?? 0) as number;
            if (backendStepsUsed > stepsUsedThisTurnRef.current) {
                stepsUsedThisTurnRef.current = backendStepsUsed;
            }
            const originalPos = { q: character.q ?? 0, r: character.r ?? 0 };

            const startPos = hexTo3DCenter(originalPos.q, originalPos.r, mapDimension, 0);
            if (startPos) {
                queueMicrotask(() =>
                    flushSync(() => {
                        setCharacterAnimating(getCharacterKey(character), [startPos.x, startPos.y, startPos.z]);
                    })
                );
            }

            const isFlying = character.isFlying ?? false;
            const canIgnoreObstacles = character.canIgnoreObstacles ?? isFlying;

            const walkGrid = gridCells.map((row: any[]) =>
                row.map((cell: any) => {
                    const occupied = characters.some(
                        (c: any) =>
                            c.q === cell.q &&
                            c.r === cell.r &&
                            !(c.uid === character.uid && c.character_id === character.character_id)
                    );
                    const walkable = isCellPassableForMovement(cell, canIgnoreObstacles, occupied);
                    return { q: cell.q, r: cell.r, walkable };
                })
            );
            const path = findPath(walkGrid, originalPos, to, canIgnoreObstacles, "walk");

            if (!path) {
                return Promise.reject(new Error("Cannot find path"));
            }

            const pathSteps = path.length - 1;
            const moveRange = character.move_range ?? 3;
            const remainingSteps = Math.max(0, moveRange - backendStepsUsed);
            if (pathSteps > remainingSteps) {
                setCharacterAnimating(null);
                return Promise.reject(
                    new Error(
                        `WalkAndAttack: path steps ${pathSteps} exceed remaining move ${remainingSteps} (moveRange=${moveRange}, stepsUsed=${backendStepsUsed})`
                    )
                );
            }
            const finalPos = path[path.length - 1];
            const { casterIdentifier: characterIdentifier } = createCharacterIdentifiers(
                characters,
                character
            );
            const { targetIdentifiers } = createCharacterIdentifiers(characters, character, target);

            const backendRequestPromise = convex.mutation(
                (api as any).service.game.gameService.walkAndAttack,
                {
                    gameId: game.gameId,
                    to: { q: to.q, r: to.r },
                    steps: pathSteps,
                    identifier: characterIdentifier,
                    skillId,
                    targets: targetIdentifiers.length > 0 ? targetIdentifiers : undefined,
                }
            );

            const rollbackToOriginal = () => {
                const ref = character.ref3D;
                if (ref?.groupRef.current && mapDimension) {
                    const pos = hexTo3DCenter(originalPos.q, originalPos.r, mapDimension, 0);
                    if (pos) {
                        gsap.to(ref.groupRef.current.position, {
                            x: pos.x,
                            z: pos.z,
                            duration: 0.3,
                            ease: "power2.out",
                        });
                    }
                }
            };

            return new Promise<void>((resolve, reject) => {
                playWalk(character, path, async () => {
                    if (!game) {
                        setCharacterAnimating(null);
                        reject(new Error("Game not found"));
                        return;
                    }
                    try {
                        const result = await backendRequestPromise;
                        if (result.ok && result.success && result.phaseChanges) {
                            character.q = finalPos.q;
                            character.r = finalPos.r;
                            setCharacterAnimating(null);
                            stepsUsedThisTurnRef.current += pathSteps;

                            let activeSkillTimeline: gsap.core.Timeline | null = null;
                            activeSkillTimeline = playSkill(character, skillId, [target], () => {
                                setSkillSyncState((prev) =>
                                    prev
                                        ? {
                                            ...prev,
                                            animationCompleted: true,
                                            activeSkillTimeline: activeSkillTimeline || prev.activeSkillTimeline || undefined,
                                        }
                                        : null
                                );
                            });

                            setSkillSyncState({
                                animationCompleted: false,
                                backendResponse: {
                                    ok: true,
                                    data: {
                                        success: true,
                                        phaseChanges: result.phaseChanges,
                                    },
                                },
                                activeSkillTimeline: activeSkillTimeline || undefined,
                                character,
                                target,
                                skillId,
                            });

                            queueMicrotask(() =>
                                flushSync(() => {
                                    const remainingAfter = moveRange - stepsUsedThisTurnRef.current;
                                    if (remainingAfter <= 0) {
                                        refreshWalkableFromPosition?.(character, 0, true);
                                    } else {
                                        refreshWalkableFromPosition?.(character, 1, true);
                                    }
                                })
                            );
                            resolve();
                        } else {
                            const msg = (result as any).error ?? "unknown";
                            console.error("[HexDebug] walkAndAttack backend rejected", { message: msg, result, originalPos, to });
                            rollbackToOriginal();
                            setCharacterAnimating(null);
                            queueMicrotask(() =>
                                flushSync(() =>
                                    refreshWalkableFromPosition?.(
                                        character,
                                        stepsUsedThisTurnRef.current > 0 ? 1 : moveRange - stepsUsedThisTurnRef.current,
                                        stepsUsedThisTurnRef.current > 0
                                    )
                                )
                            );
                            reject(new Error(`WalkAndAttack rejected: ${msg}`));
                        }
                    } catch (error) {
                        console.error("[HexDebug] walkAndAttack error, rollback", { error, originalPos });
                        rollbackToOriginal();
                        setCharacterAnimating(null);
                        queueMicrotask(() =>
                            flushSync(() =>
                                refreshWalkableFromPosition?.(
                                    character,
                                    stepsUsedThisTurnRef.current > 0 ? 1 : moveRange - stepsUsedThisTurnRef.current,
                                    stepsUsedThisTurnRef.current > 0
                                )
                            )
                        );
                        reject(error);
                    }
                });
            });
        },
        [
            game,
            characters,
            gridCells,
            mode,
            convex,
            playWalk,
            playSkill,
            setSkillSyncState,
            handlePhaseChanges,
            mapDimension,
            setCharacterAnimating,
            refreshWalkableFromPosition,
        ]
    );

    return { walkAndAttack };
};
