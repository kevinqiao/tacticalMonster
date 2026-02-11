/**
 * 3D 移动操作 - 乐观动画 + 悲观状态，失败时通过 3D 位置回滚
 */

import gsap from "gsap";
import { useCallback } from "react";
import { api } from "../../../../../../../convex/tacticalMonster/convex/_generated/api";
import { createCharacterIdentifiers } from "../../../battle/service/handler/utils/characterUtils";
import { canPerformAction } from "../../../battle/service/handler/utils/validationUtils";
import { findPath } from "../../../battle/utils/PathFind";
import { logicToView } from "../../../team/utils/coordinateUtils";
import { useBattleCharacterRefsContext } from "../../BattleCharacterRefsContext";
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
    mapDimension: BattleMapDimension | null
) => {
    const refsContext = useBattleCharacterRefsContext();

    const walk = useCallback(
        async (to: { q: number; r: number }): Promise<void> => {
            const validation = canPerformAction(mode, game, characters);
            if (!validation.can || !validation.character || !gridCells || !game?.map || !mapDimension) {
                return Promise.reject(new Error("Cannot perform walk action"));
            }

            const { character } = validation;
            const originalPos = { q: character.q ?? 0, r: character.r ?? 0 };

            const col = game.map.direction === 1 ? game.map.cols - to.q - 1 : to.q;
            const isFlying = character.isFlying ?? false;
            const canIgnoreObstacles = character.canIgnoreObstacles ?? isFlying;
            const path = findPath(
                gridCells,
                { q: originalPos.q, r: originalPos.r },
                { q: col, r: to.r },
                canIgnoreObstacles
            );

            if (!path) {
                return Promise.reject(new Error("Cannot find path"));
            }

            const finalPos = path[path.length - 1];
            const { casterIdentifier: characterIdentifier } = createCharacterIdentifiers(
                characters,
                character
            );

            console.log("[useWalkAction3D] walk request:", {
                from: originalPos,
                to: { q: to.q, r: to.r },
                col,
                direction: game.map.direction,
                identifier: characterIdentifier,
            });

            const backendRequestPromise = convex.mutation(
                (api as any).service.game.gameService.walk,
                {
                    gameId: game.gameId,
                    to: { q: col, r: to.r },
                    identifier: characterIdentifier,
                }
            );

            return new Promise<void>((resolve, reject) => {
                playWalk(character, path, async () => {
                    if (!game) {
                        reject(new Error("Game not found"));
                        return;
                    }
                    try {
                        const result = await backendRequestPromise;
                        if (result.success) {
                            character.q = finalPos.q;
                            character.r = finalPos.r;
                            if (result.phaseChanges) await handlePhaseChanges(result.phaseChanges);
                            resolve();
                        } else {
                            console.error("[useWalkAction3D] Walk rejected. Backend result:", result);
                            // 3D 回滚：将角色移回原始逻辑坐标对应的 3D 位置
                            const ref = refsContext?.getRef(character);
                            if (ref?.groupRef.current && mapDimension) {
                                const view = logicToView(originalPos.q, originalPos.r, mapDimension);
                                const pos = hexTo3DCenter(view.q, view.r, mapDimension, 0);
                                if (pos) {
                                    gsap.to(ref.groupRef.current.position, {
                                        x: pos.x,
                                        z: pos.z,
                                        duration: 0.3,
                                        ease: "power2.out",
                                    });
                                }
                            }
                            reject(new Error("Walk rejected by backend"));
                        }
                    } catch (error) {
                        const ref = refsContext?.getRef(character);
                        if (ref?.groupRef.current && mapDimension) {
                            const view = logicToView(originalPos.q, originalPos.r, mapDimension);
                            const pos = hexTo3DCenter(view.q, view.r, mapDimension, 0);
                            if (pos) {
                                gsap.to(ref.groupRef.current.position, {
                                    x: pos.x,
                                    z: pos.z,
                                    duration: 0.3,
                                    ease: "power2.out",
                                });
                            }
                        }
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
            refsContext,
        ]
    );

    return { walk };
};
