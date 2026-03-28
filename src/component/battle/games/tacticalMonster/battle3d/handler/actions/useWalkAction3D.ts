/**
 * 3D 移动操作 - 乐观动画 + 悲观状态，失败时通过 3D 位置回滚
 * 横竖屏统一在逻辑空间寻路，path 始终为逻辑坐标。
 */

import gsap from "gsap";
import { useCallback, useRef } from "react";
import { flushSync } from "react-dom";
import { api } from "../../../../../../../convex/tacticalMonster/convex/_generated/api";
import { useCombatManager } from "../../../service/CombatManager";
import { createCharacterIdentifiers } from "../../../utils/characterUtils";
import { findPath, isCellPassableForMovement } from "../../../utils/PathFind";
import { canPerformAction } from "../../../utils/validationUtils";
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
    const walkInFlightRef = useRef(false);

    const walk = useCallback(
        async (to: { q: number; r: number }): Promise<void> => {
            if (walkInFlightRef.current) {
                return Promise.reject(new Error("Walk action in progress"));
            }
            let validation = canPerformAction(mode, game, characters);
            // 回合切换瞬间可能短暂出现“无 active turn”，给一个极短重试窗口避免误判
            if ((!validation.can || !validation.character) && mode === "play") {
                const retryableReason =
                    validation.reason === "no active turn (status=1)" ||
                    validation.reason?.startsWith("active turn character not found");
                if (retryableReason) {
                    for (let i = 0; i < 3; i++) {
                        await new Promise((resolve) => setTimeout(resolve, 20));
                        validation = canPerformAction(mode, game, characters);
                        if (validation.can && validation.character) break;
                    }
                }
            }
            if (!validation.can || !validation.character || !gridCells || !game?.map || !mapDimension) {
                const reason =
                    !validation.can
                        ? (validation.reason ?? "validation.can is false")
                        : !validation.character
                          ? "no character for current turn (e.g. summoned unit not in characters yet)"
                          : !gridCells
                            ? "no gridCells"
                            : !game?.map
                              ? "no map"
                              : "no mapDimension";
                return Promise.reject(new Error(`Cannot perform walk action: ${reason}`));
            }

            const { character } = validation;
            const charKey = getCharacterKey(character);
            if (charKey !== lastTurnKeyRef.current) {
                lastTurnKeyRef.current = charKey;
                stepsUsedThisTurnRef.current = 0;
            }
            // 与后端 currentTurn.stepsUsed 同步，避免重载/回放后本地 ref 落后于后端
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
                const characterKey = getCharacterKey(character);
                queueMicrotask(() =>
                    flushSync(() => {
                        setCharacterAnimating(characterKey, [startPos.x, startPos.y, startPos.z]);
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
            const remainingSteps = moveRange - stepsUsedThisTurnRef.current;
            if (pathSteps > remainingSteps) {
                console.warn("[HexDebug] walk pathSteps over remainingSteps", {
                    pathSteps,
                    remainingSteps,
                    moveRange,
                    toLogic: to,
                    originalPos,
                });
            }

            const finalPos = path[path.length - 1];
            // 发送 mutation 前再次校验，避免回合切换窗口把过期点击发到后端
            const preflight = canPerformAction(mode, game, characters);
            if (
                !preflight.can ||
                !preflight.character ||
                preflight.character.character_id !== character.character_id
            ) {
                const reason = preflight.reason ?? "turn changed before request";
                return Promise.reject(new Error(`Cannot perform walk action: ${reason}`));
            }
            const { casterIdentifier: characterIdentifier } = createCharacterIdentifiers(
                characters,
                character
            );

            // 结束回合由后端根据 stepsUsedBefore>0（第二次点击行走）或步数用尽判定，前端不需传 endTurn/forceEndTurn
            const backendRequestPromise = convex.mutation(
                (api as any).service.game.gameService.walk,
                {
                    gameId: game.gameId,
                    to: { q: to.q, r: to.r },
                    identifier: characterIdentifier,
                    steps: pathSteps,
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
                walkInFlightRef.current = true;
                playWalk(character, path, async () => {
                    if (!game) {
                        clearAnimatingState();
                        walkInFlightRef.current = false;
                        reject(new Error("Game not found"));
                        return;
                    }
                    try {
                        const result = await backendRequestPromise;
                        if (result.success) {
                            character.q = finalPos.q;
                            character.r = finalPos.r;
                            clearAnimatingState(); // 动画已结束、逻辑位置已提交，先清除「正在移动」状态

                            // 后端结束回合时返回 phaseChanges（含 turnEnd），未结束时无 phaseChanges
                            if (result.phaseChanges) {
                                await handlePhaseChanges(result.phaseChanges);
                            } else {
                                stepsUsedThisTurnRef.current += pathSteps;
                                const remainingAfter = moveRange - stepsUsedThisTurnRef.current;
                                // 步数用尽时清除可行走高亮并结束回合 UI，避免出现「新的暗区」导致回合无法结束
                                queueMicrotask(() =>
                                    flushSync(() => {
                                        if (remainingAfter <= 0) {
                                            refreshWalkableFromPosition?.(character, 0, true);
                                        } else {
                                            refreshWalkableFromPosition?.(character, 1, true);
                                        }
                                    })
                                );
                            }
                            walkInFlightRef.current = false;
                            resolve();
                        } else {
                            const msg = (result as any).message ?? (result as any).error ?? "unknown";
                            console.error("[HexDebug] walk backend rejected", { message: msg, result, originalPos, toLogic: to });
                            rollbackToOriginal();
                            clearAnimatingState();
                            queueMicrotask(() =>
                                flushSync(() =>
                                    refreshWalkableFromPosition?.(
                                        character,
                                        stepsUsedThisTurnRef.current > 0 ? 1 : moveRange - stepsUsedThisTurnRef.current,
                                        stepsUsedThisTurnRef.current > 0
                                    )
                                )
                            );
                            walkInFlightRef.current = false;
                            reject(new Error(`Walk rejected: ${msg}`));
                        }
                    } catch (error) {
                        console.error("[HexDebug] walk error, rollback to original", { error, originalPos });
                        rollbackToOriginal();
                        clearAnimatingState();
                        queueMicrotask(() =>
                            flushSync(() =>
                                refreshWalkableFromPosition?.(
                                    character,
                                    stepsUsedThisTurnRef.current > 0 ? 1 : moveRange - stepsUsedThisTurnRef.current,
                                    stepsUsedThisTurnRef.current > 0
                                )
                            )
                        );
                        walkInFlightRef.current = false;
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
