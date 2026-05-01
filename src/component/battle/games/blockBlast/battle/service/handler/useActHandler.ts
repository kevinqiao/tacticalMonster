/**
 * Block Blast 操作处理器（对齐 solitaireSolo：mutation + PlayEffects + interactionPhase）
 */
import { useConvex } from 'convex/react';
import { useCallback } from 'react';
import { api } from '../../../../../../../convex/blockBlast/convex/_generated/api';
import {
    BlockBlastGameEngine,
    type ApplyPlaceShapeInput,
} from '@/convex/blockBlast/convex/service/BlockBlastGameEngine';
import { PlayEffects } from '../../animation/PlayEffects';
import {
    ActMode,
    BlockBlastActionData,
    GameInteractionPhase,
    inferGridSizeFromGrid,
} from '../../types/BlockBlastTypes';
import { useBlockBlastGameManager } from '../GameManager';

const SUBSTANTIAL_DRAG_PX = 6;

const useActHandler = () => {
    const convex = useConvex();
    const { gameState, ruleManager, gridCellRefs, setInteractionPhase, commitGameState, config } =
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
            /** await 前快照；mutation 返回后闭包里的 gameState 可能已过时，禁止用来推导落子前盘面 */
            const engineInput: ApplyPlaceShapeInput = {
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
            try {
                const result = await convex.mutation(api.service.gameManager.placeShape, {
                    gameId: gameState.gameId,
                    shapeId: shape.id,
                    row: position.row,
                    col: position.col,
                });

                if (result.ok && result.data) {
                    if (dragGhostEl?.parentNode) dragGhostEl.remove();
                    if (shape.ele) shape.ele.style.visibility = '';
                    const d = result.data;

                    const metaFromServer = {
                        ...(Array.isArray(d.shapes) ? { shapes: d.shapes } : {}),
                        ...(Array.isArray(d.nextShapes) ? { nextShapes: d.nextShapes } : {}),
                        ...(d.moves !== undefined ? { moves: d.moves } : {}),
                        ...(d.status !== undefined ? { status: d.status } : {}),
                        ...(d.shapeCounter !== undefined ? { shapeCounter: d.shapeCounter } : {}),
                    };

                    const cleared = d.cleared;
                    const hasClear =
                        cleared &&
                        ((cleared.rows && cleared.rows.length > 0) ||
                            (cleared.cols && cleared.cols.length > 0));

                    /** 有消除时：先显示「已落子、满行满列仍在」的盘面与手牌，再播消除，最后写回服务器终态（与全量等动画再刷盘不同） */
                    if (hasClear) {
                        const through = BlockBlastGameEngine.applyPlaceShapeThroughPlacement(
                            engineInput,
                            shape.id,
                            position.row,
                            position.col
                        );
                        const gridAfterPlace =
                            through.ok ? through.data.grid : engineInput.grid.map((row) => [...row]);
                        const lineCount = cleared!.rows.length + cleared!.cols.length;
                        commitGameState({
                            grid: gridAfterPlace,
                            score:
                                d.score !== undefined
                                    ? d.score - lineCount * config.scoring.lineScore
                                    : undefined,
                            lines:
                                d.lines !== undefined ? d.lines - lineCount : undefined,
                            ...metaFromServer,
                        });

                        await new Promise<void>((resolve) => {
                            if (gridCellRefs.current) {
                                PlayEffects.clearLines({
                                    data: {
                                        rows: cleared!.rows,
                                        cols: cleared!.cols,
                                        gridCellRefs: gridCellRefs.current,
                                    },
                                    onComplete: () => resolve(),
                                });
                            } else {
                                resolve();
                            }
                        });

                        /** await 之后闭包里的 gameState 可能是过时引用，必须用 patch 交给 setState，不能把终态写回旧对象 */
                        if (d.grid) {
                            commitGameState({
                                grid: d.grid,
                                ...(d.score !== undefined ? { score: d.score } : {}),
                                ...(d.lines !== undefined ? { lines: d.lines } : {}),
                            });
                        }
                    } else {
                        /** 无消除：一次性写入服务器终态（含手牌），禁止 await 后就地改闭包 gameState */
                        commitGameState({
                            ...(d.grid ? { grid: d.grid } : {}),
                            ...(d.score !== undefined ? { score: d.score } : {}),
                            ...(d.lines !== undefined ? { lines: d.lines } : {}),
                            ...metaFromServer,
                        });
                    }
                } else {
                    handedOffToCancelDrag = true;
                    cancelDrag(data);
                }
            } catch (error) {
                console.error('placeShape failed:', error);
                handedOffToCancelDrag = true;
                cancelDrag(data);
            } finally {
                if (!handedOffToCancelDrag) {
                    setInteractionPhase(GameInteractionPhase.idle);
                }
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
            config.scoring.lineScore,
        ]
    );

    return { onDrop, onClickOrTouch, cancelDrag };
};

export default useActHandler;
