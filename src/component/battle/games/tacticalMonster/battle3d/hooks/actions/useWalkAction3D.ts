/**
 * 3D 移动操作 - 乐观动画 + 悲观状态，失败时通过 3D 位置回滚
 * 横竖屏统一在逻辑空间寻路，path 始终为逻辑坐标。
 */

import gsap from "gsap";
import { useCallback, useRef } from "react";
import { flushSync } from "react-dom";
import { api } from "../../../../../../../convex/tacticalMonster/convex/_generated/api";
import { useCombatManager } from "../../../service/CombatManager";
import { createCharacterIdentifiers } from "../../../service/handler/utils/characterUtils";
import { canPerformAction } from "../../../service/handler/utils/validationUtils";
import { findPath } from "../../../utils/PathFind";
import { getCharacterKey } from "../../utils/battle3DAdapter";
import type { BattleMapDimension } from "../../utils/coordinate3DUtils";
import { hexTo3DCenter } from "../../utils/coordinate3DUtils";

export const useWalkAction3D = (
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
    handlePhaseChanges: (phaseChanges: any) => Promise<void>,
    mapDimension: BattleMapDimension | null,
    refreshWalkableFromPosition?: (character: any, moveRange: number, onlyFurthestLayer?: boolean) => void
) => {
    const { setCharacterAnimating } = useCombatManager();
    const stepsUsedThisTurnRef = useRef(0);
    const lastTurnKeyRef = useRef<string | null>(null);

    const walk = useCallback(
        async (to: { q: number; r: number }): Promise<void> => {
            const validation = canPerformAction(mode, game, characters);
            if (!validation.can || !validation.character || !gridCells || !game?.map || !mapDimension) {
                return Promise.reject(new Error("Cannot perform walk action"));
            }

            const { character } = validation;
            const charKey = getCharacterKey(character);
            if (charKey !== lastTurnKeyRef.current) {
                lastTurnKeyRef.current = charKey;
                stepsUsedThisTurnRef.current = 0;
            }
            const originalPos = { q: character.q ?? 0, r: character.r ?? 0 };

            const startPos = hexTo3DCenter(originalPos.q, originalPos.r, mapDimension, 0);
            if (startPos) {
                const characterKey = getCharacterKey(character);
                flushSync(() => {
                    setCharacterAnimating(characterKey, [startPos.x, startPos.y, startPos.z]);
                });
            }

            const isFlying = character.isFlying ?? false;
            const canIgnoreObstacles = character.canIgnoreObstacles ?? isFlying;

            const walkGrid = gridCells.map((row: any[]) =>
                row.map((cell: any) => {
                    const occupied = characters.some(
                        (c: any) =>
                            c.q === cell.q &&
                            c.r === cell.r &&
                            !(c.uid === character.uid && c.monsterId === character.monsterId)
                    );
                    const walkable = canIgnoreObstacles
                        ? !cell.disable
                        : !cell.disable && !occupied;
                    return { q: cell.q, r: cell.r, walkable };
                })
            );
            const path = findPath(walkGrid, originalPos, to, canIgnoreObstacles, "walk");

            if (!path) {
                return Promise.reject(new Error("Cannot find path"));
            }

            const pathSteps = path.length - 1;
            const moveRange = character.move_range ?? 3;
            const remainingSteps = moveRange - stepsUsedThisTurnRef.current;
            if (pathSteps > remainingSteps) {
                console.warn("[HexDebug] walk path over remainingSteps", {
                    pathSteps,
                    remainingSteps,
                    moveRange,
                    toLogic: to,
                    originalPos,
                });
            }

            const finalPos = path[path.length - 1];
            const { casterIdentifier: characterIdentifier } = createCharacterIdentifiers(
                characters,
                character
            );

            // 本步用尽剩余步数（走到暗区）时传 forceEndTurn，后端结束回合并返回 phaseChanges；pathSteps > remainingSteps 为异常，不设 forceEndTurn
            const forceEndTurn = pathSteps === remainingSteps;
            const backendRequestPromise = convex.mutation(
                (api as any).service.game.gameService.walk,
                {
                    gameId: game.gameId,
                    to: { q: to.q, r: to.r },
                    identifier: characterIdentifier,
                    steps: pathSteps,
                    forceEndTurn,
                }
            );
            // console.log("[useWalkAction3D] backendRequestPromise", backendRequestPromise);
            const clearAnimatingState = () => {
                setCharacterAnimating(null);
            };

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
                        clearAnimatingState();
                        reject(new Error("Game not found"));
                        return;
                    }
                    try {
                        const result = await backendRequestPromise;
                        console.log("[useWalkAction3D] result", result);
                        if (result.success) {
                            character.q = finalPos.q;
                            character.r = finalPos.r;
                            clearAnimatingState(); // 动画已结束、逻辑位置已提交，先清除「正在移动」状态

                            // 后端结束回合时返回 phaseChanges（含 turnEnd），未结束时无 phaseChanges
                            if (result.phaseChanges) {
                                await handlePhaseChanges(result.phaseChanges);
                            } else {
                                stepsUsedThisTurnRef.current += pathSteps;
                                flushSync(() =>
                                    refreshWalkableFromPosition?.(
                                        character,
                                        moveRange - stepsUsedThisTurnRef.current
                                    )
                                );
                            }
                            resolve();
                        } else {
                            const msg = (result as any).message ?? "unknown";
                            console.error("[HexDebug] walk backend rejected", { message: msg, result, originalPos, toLogic: to });
                            rollbackToOriginal();
                            clearAnimatingState();
                            flushSync(() =>
                                refreshWalkableFromPosition?.(
                                    character,
                                    moveRange - stepsUsedThisTurnRef.current,
                                    stepsUsedThisTurnRef.current > 0
                                )
                            );
                            reject(new Error(`Walk rejected: ${msg}`));
                        }
                    } catch (error) {
                        console.error("[HexDebug] walk error, rollback to original", { error, originalPos });
                        rollbackToOriginal();
                        clearAnimatingState();
                        flushSync(() =>
                            refreshWalkableFromPosition?.(
                                character,
                                moveRange - stepsUsedThisTurnRef.current,
                                stepsUsedThisTurnRef.current > 0
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
            handlePhaseChanges,
            mapDimension,
            setCharacterAnimating,
            refreshWalkableFromPosition,
        ]
    );

    return { walk };
};
