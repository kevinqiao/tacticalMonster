/**
 * Block Blast 操作处理器（乐观落子 + PlayEffects + interactionPhase）
 */
import { useConvex } from 'convex/react';
import { useCallback, type RefObject } from 'react';
import { api } from '../../../../../../../convex/blockBlast/convex/_generated/api';
import { computeBlockBlastStepScoreFromClear } from '@/convex/blockBlast/convex/service/blockBlastScoreModel';
import {
    BlockBlastGameEngine,
    type ApplyPlaceShapeInput,
} from '@/convex/blockBlast/convex/service/BlockBlastGameEngine';
import { PlayEffects } from '../../animation/PlayEffects';
import {
    ActMode,
    BlockBlastActionData,
    BlockBlastGameState,
    BlockBlastGameStatus,
    GameInteractionPhase,
    inferGridSizeFromGrid,
    Shape,
} from '../../types/BlockBlastTypes';
import { useBlockBlastGameManager } from '../GameManager';

const SUBSTANTIAL_DRAG_PX = 6;

type PlaceShapeMutationData = {
    error?: string;
    mustEnd?: boolean;
    endReason?: string;
    status?: number;
    score?: number;
    lines?: number;
    moves?: number;
    grid?: number[][];
    shapes?: Shape[];
    nextShapes?: Shape[];
    shapeCounter?: number;
    cleared?: { rows: number[]; cols: number[] };
};

function snapshotEngineInput(gameState: BlockBlastGameState): ApplyPlaceShapeInput {
    return {
        grid: gameState.grid.map((row) => [...row]),
        gridSize: gameState.gridSize ?? inferGridSizeFromGrid(gameState.grid),
        shapes: gameState.shapes.map((s) => ({ ...s, shape: s.shape.map((r) => [...r]) })),
        nextShapes: gameState.nextShapes.map((s) => ({
            ...s,
            shape: s.shape.map((r) => [...r]),
        })),
        score: gameState.score,
        lines: gameState.lines,
        moves: gameState.moves,
        status: gameState.status,
        seed: gameState.seed,
        shapeCounter: gameState.shapeCounter,
    };
}

function rollbackPatchFromEngineInput(engineInput: ApplyPlaceShapeInput) {
    return {
        grid: engineInput.grid.map((row) => [...row]),
        shapes: engineInput.shapes.map((s) => ({ ...s, shape: s.shape.map((r) => [...r]) })),
        nextShapes: engineInput.nextShapes.map((s) => ({
            ...s,
            shape: s.shape.map((r) => [...r]),
        })),
        score: engineInput.score,
        lines: engineInput.lines,
        moves: engineInput.moves,
        status: engineInput.status,
        shapeCounter: engineInput.shapeCounter,
    };
}

function metaPatchFromServer(d: PlaceShapeMutationData) {
    return {
        ...(Array.isArray(d.shapes) ? { shapes: d.shapes } : {}),
        ...(Array.isArray(d.nextShapes) ? { nextShapes: d.nextShapes } : {}),
        ...(d.moves !== undefined ? { moves: d.moves } : {}),
        ...(d.status !== undefined ? { status: d.status } : {}),
        ...(d.shapeCounter !== undefined ? { shapeCounter: d.shapeCounter } : {}),
    };
}

function terminalStatusFromServer(d: PlaceShapeMutationData): number | undefined {
    if (d.mustEnd || (d.status !== undefined && d.status !== BlockBlastGameStatus.PLAYING)) {
        return d.status;
    }
    return undefined;
}

function playClearLinesAnim(
    rows: number[],
    cols: number[],
    gridCellRefs: RefObject<(HTMLDivElement | null)[][] | null>
): Promise<void> {
    return new Promise<void>((resolve) => {
        if (gridCellRefs.current) {
            PlayEffects.clearLines({
                data: { rows, cols, gridCellRefs: gridCellRefs.current },
                onComplete: () => resolve(),
            });
        } else {
            resolve();
        }
    });
}

const useActHandler = () => {
    const convex = useConvex();
    const { gameState, ruleManager, gridCellRefs, setInteractionPhase, commitGameState, completeCasualRunIfTerminal } =
        useBlockBlastGameManager();

    const cancelDrag = useCallback(
        (data: BlockBlastActionData) => {
            if (!data.shape) {
                setInteractionPhase(GameInteractionPhase.idle);
                return;
            }
            setInteractionPhase(GameInteractionPhase.animating);
            const fallbackIdleMs = 900;
            const tid = window.setTimeout(() => {
                setInteractionPhase(GameInteractionPhase.idle);
            }, fallbackIdleMs);
            PlayEffects.dragCancel({
                data: { shape: data.shape, dragGhostEl: data.dragGhostEl },
                onComplete: () => {
                    window.clearTimeout(tid);
                    setInteractionPhase(GameInteractionPhase.idle);
                },
            });
        },
        [setInteractionPhase]
    );

    const onClickOrTouch = useCallback(
        async (data: BlockBlastActionData) => {
            if (data.actModes?.includes(ActMode.DRAG) && (data.maxDragFromStart ?? 0) > SUBSTANTIAL_DRAG_PX) {
                cancelDrag(data);
                return;
            }
            if (data.dragGhostEl?.parentNode) data.dragGhostEl.remove();
            if (data.shape?.ele) data.shape.ele.style.visibility = '';
            setInteractionPhase(GameInteractionPhase.idle);
        },
        [cancelDrag, setInteractionPhase]
    );

    const onDrop = useCallback(
        async (data: BlockBlastActionData) => {
            const { shape, position, dragGhostEl } = data;
            if (!gameState || !ruleManager || !shape || !position) {
                if (dragGhostEl?.parentNode) dragGhostEl.remove();
                if (shape?.ele) shape.ele.style.visibility = '';
                setInteractionPhase(GameInteractionPhase.idle);
                return;
            }
            if (!ruleManager.canPlaceShape(shape, position)) {
                cancelDrag(data);
                return;
            }

            setInteractionPhase(GameInteractionPhase.animating);
            let handedOffToCancelDrag = false;
            const engineInput = snapshotEngineInput(gameState);
            let postOpTerminalStatus: number | undefined;

            const local = BlockBlastGameEngine.applyPlaceShape(
                engineInput,
                shape.id,
                position.row,
                position.col
            );
            if (!local.ok) {
                handedOffToCancelDrag = true;
                cancelDrag(data);
                return;
            }

            if (dragGhostEl?.parentNode) dragGhostEl.remove();
            if (shape.ele) shape.ele.style.visibility = '';

            const localData = local.data;
            if (localData.status !== BlockBlastGameStatus.PLAYING) {
                postOpTerminalStatus = localData.status;
            }

            const cleared = localData.cleared;
            const hasClear = cleared.rows.length + cleared.cols.length > 0;
            const gridSize = engineInput.gridSize ?? inferGridSizeFromGrid(engineInput.grid);
            const placementMeta = {
                shapes: localData.shapes,
                nextShapes: localData.nextShapes,
                moves: localData.moves,
                shapeCounter: localData.shapeCounter,
            };

            const mutationPromise = convex.mutation(api.service.gameManager.placeShape, {
                gameId: gameState.gameId,
                shapeId: shape.id,
                row: position.row,
                col: position.col,
            });

            try {
                if (hasClear) {
                    const through = BlockBlastGameEngine.applyPlaceShapeThroughPlacement(
                        engineInput,
                        shape.id,
                        position.row,
                        position.col
                    );
                    const gridAfterPlace = through.ok
                        ? through.data.grid
                        : engineInput.grid.map((row) => [...row]);
                    const lineCount = cleared.rows.length + cleared.cols.length;
                    const stepScore = computeBlockBlastStepScoreFromClear(
                        cleared.rows,
                        cleared.cols,
                        gridSize
                    );
                    commitGameState({
                        grid: gridAfterPlace,
                        score: localData.score - stepScore,
                        lines: localData.lines - lineCount,
                        status: BlockBlastGameStatus.PLAYING,
                        ...placementMeta,
                    });

                    await playClearLinesAnim(cleared.rows, cleared.cols, gridCellRefs);

                    commitGameState({
                        grid: localData.grid,
                        score: localData.score,
                        lines: localData.lines,
                        status: localData.status,
                        ...placementMeta,
                    });
                } else {
                    commitGameState({
                        grid: localData.grid,
                        score: localData.score,
                        lines: localData.lines,
                        status: localData.status,
                        ...placementMeta,
                    });
                }

                const result = (await mutationPromise) as { ok: boolean; data?: PlaceShapeMutationData };
                const d = result.data;

                if (!result.ok && d?.mustEnd) {
                    postOpTerminalStatus =
                        d.status ??
                        (d.error === 'time_expired' ? BlockBlastGameStatus.CANCELLED : undefined);
                    commitGameState({
                        ...(postOpTerminalStatus !== undefined ? { status: postOpTerminalStatus } : {}),
                        ...(d.score !== undefined ? { score: d.score } : {}),
                        ...(d.lines !== undefined ? { lines: d.lines } : {}),
                        ...(d.moves !== undefined ? { moves: d.moves } : {}),
                    });
                    handedOffToCancelDrag = true;
                    cancelDrag(data);
                } else if (!result.ok) {
                    commitGameState(rollbackPatchFromEngineInput(engineInput));
                    handedOffToCancelDrag = true;
                    cancelDrag(data);
                } else if (d) {
                    const serverTerminal = terminalStatusFromServer(d);
                    if (serverTerminal !== undefined) {
                        postOpTerminalStatus = serverTerminal;
                    }
                    commitGameState({
                        ...(d.grid ? { grid: d.grid } : {}),
                        ...(d.score !== undefined ? { score: d.score } : {}),
                        ...(d.lines !== undefined ? { lines: d.lines } : {}),
                        ...metaPatchFromServer(d),
                    });
                } else {
                    commitGameState(rollbackPatchFromEngineInput(engineInput));
                    handedOffToCancelDrag = true;
                    cancelDrag(data);
                }
            } catch (error) {
                console.error('placeShape failed:', error);
                commitGameState(rollbackPatchFromEngineInput(engineInput));
                handedOffToCancelDrag = true;
                cancelDrag(data);
            } finally {
                if (!handedOffToCancelDrag) {
                    setInteractionPhase(GameInteractionPhase.idle);
                }
                void completeCasualRunIfTerminal({
                    skipInteractionCheck: true,
                    ...(postOpTerminalStatus !== undefined
                        ? { terminalStatus: postOpTerminalStatus }
                        : {}),
                });
            }
        },
        [
            gameState,
            ruleManager,
            convex,
            gridCellRefs,
            setInteractionPhase,
            cancelDrag,
            commitGameState,
            completeCasualRunIfTerminal,
        ]
    );

    return { onDrop, onClickOrTouch, cancelDrag };
};

export default useActHandler;
