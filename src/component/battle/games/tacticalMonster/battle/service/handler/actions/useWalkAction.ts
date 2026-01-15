/**
 * 移动操作 Hook
 */

import gsap from "gsap";
import { useCallback } from "react";
import { api } from "../../../../../../../../convex/tacticalMonster/convex/_generated/api";
import { findPath } from "../../../utils/PathFind";
import { OperationQueue } from "../../optimistic/OperationQueue";
import { StateSnapshot } from "../../optimistic/StateSnapshot";
import { createCharacterIdentifiers } from "../utils/characterUtils";
import { handleBackendError } from "../utils/errorUtils";
import { clearPathHighlight, highlightPath } from "../utils/pathHighlightUtils";
import { canPerformAction } from "../utils/validationUtils";

/**
 * 移动操作
 */
export const useWalkAction = (
    game: any,
    characters: any[],
    gridCells: any[][],
    mode: string,
    convex: any,
    playWalk: (character: any, path: Array<{ x: number; y: number }>, onComplete: () => void | Promise<void>) => void,
    operationQueue: OperationQueue,
    handlePhaseChanges: (phaseChanges: any) => Promise<void>
) => {
    const walk = useCallback(async (to: { q: number; r: number }) => {
        const validation = canPerformAction(mode, game, characters);
        if (!validation.can || !validation.character || !gridCells || !game?.map) return;

        const { character } = validation;

        const col = game.map.direction === 1 ? game.map.cols - to.q - 1 : to.q;
        // 飞行单位可以忽略障碍物
        const isFlying = character.isFlying ?? false;
        const canIgnoreObstacles = character.canIgnoreObstacles ?? isFlying;
        const path = findPath(
            gridCells,
            { x: character.q ?? 0, y: character.r ?? 0 },
            { x: col, y: to.r },
            canIgnoreObstacles
        );

        if (!path) return;

        const finalPos = path[path.length - 1];
        highlightPath(path, gridCells, { q: col, r: to.r });
        if (character.container) {
            gsap.to(character.container, { filter: "brightness(1.2)", duration: 0.2 });
        }

        const snapshot = StateSnapshot.createSnapshot(game);
        const originalQ = character.q;
        const originalR = character.r;
        const rollback = () => {
            if (snapshot) {
                StateSnapshot.restoreSnapshot(game, snapshot);
            } else {
                character.q = originalQ;
                character.r = originalR;
            }
        };

        const { casterIdentifier: characterIdentifier } = createCharacterIdentifiers(characters, character);

        const operationId = operationQueue.addOperation({
            type: 'walk',
            timestamp: Date.now(),
            snapshot,
            rollback,
            data: {
                to: { q: col, r: to.r },
                identifier: characterIdentifier,
                characterId: character.character_id
            }
        });

        playWalk(character, path, async () => {
            character.q = finalPos.x;
            character.r = finalPos.y;
            if (character.container) gsap.set(character.container, { filter: "none" });
            clearPathHighlight(path, gridCells, { q: col, r: to.r });

            if (!game) return;
            try {
                const result = await convex.mutation((api as any).service.game.gameService.walk, {
                    gameId: game.gameId,
                    to: { q: col, r: to.r },
                    identifier: characterIdentifier
                });

                if (result.success) {
                    operationQueue.confirmOperation(operationId);
                    if (result.phaseChanges) await handlePhaseChanges(result.phaseChanges);
                } else {
                    handleBackendError("Walk rejected", { rollback }, operationId, operationQueue);
                }
            } catch (error) {
                handleBackendError(error, { rollback }, operationId, operationQueue);
            }
        });
    }, [game, characters, gridCells, mode, convex, playWalk, operationQueue, handlePhaseChanges]);

    return { walk };
};

