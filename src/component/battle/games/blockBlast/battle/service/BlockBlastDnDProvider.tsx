/**
 * Block Blast 拖拽：Pointer Events + 会话 ref（对齐 solitaireSolo SoloDnDProvider）
 */
import gsap from 'gsap';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BLOCK_BLAST_ANIMATION_CONFIG } from '../animation/animationConfig';
import {
    ActMode,
    BlockBlastActionData,
    GameInteractionPhase,
    Shape,
} from '../types/BlockBlastTypes';
import {
    createBoardSizedDragGhost,
    firstFilledTile,
    positionGhostFromGrabTile,
    readGrabTileFromPointer,
    resolvePlacementOnRelease,
    snapGhostToPlacementOrigin,
    visualHintFromGhost,
} from '../utils/blockBlastDragPlacement';
import { type GridCellRefs, useBlockBlastGameManager } from './GameManager';
import useActHandler from './handler/useActHandler';

interface IBlockBlastDnDContext {
    actionData: BlockBlastActionData | null;
    isTouchDevice: boolean;
    onPointerDragStart: (shape: Shape, event: React.PointerEvent) => void;
    getClientPoint: (event: PointerEvent | React.PointerEvent) => { x: number; y: number };
}

const BlockBlastDnDContext = createContext<IBlockBlastDnDContext>({
    actionData: null,
    isTouchDevice: false,
    onPointerDragStart: () => {},
    getClientPoint: () => ({ x: 0, y: 0 }),
});

export const useBlockBlastDnDManager = () => {
    const context = useContext(BlockBlastDnDContext);
    if (!context) {
        throw new Error('useBlockBlastDnDManager must be used within a BlockBlastDnDProvider');
    }
    return context;
};

interface BlockBlastDnDProviderProps {
    children: ReactNode;
}

function clearActionData(target: BlockBlastActionData) {
    for (const k of Object.keys(target)) {
        delete (target as Record<string, unknown>)[k];
    }
}

const DRAG_FLIGHT_BASE_Z = BLOCK_BLAST_ANIMATION_CONFIG.zIndex.dragFlightBase;

export const BlockBlastDnDProvider: React.FC<BlockBlastDnDProviderProps> = ({ children }) => {
    const actionDataRef = useRef<BlockBlastActionData>({});
    const sessionEndedRef = useRef(false);
    const [isTouchDevice, setIsTouchDevice] = useState(false);
    const startPositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const maxDragFromStartRef = useRef(0);
    const [, bump] = useState(0);
    const dragLayerRef = useRef<HTMLDivElement | null>(null);

    const { gameState, ruleManager, boardDimension, setInteractionPhase, gridCellRefs } =
        useBlockBlastGameManager();
    const { onDrop, onClickOrTouch, cancelDrag } = useActHandler();

    useEffect(() => {
        const checkTouchDevice = () => {
            setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
        };
        checkTouchDevice();
        window.addEventListener('resize', checkTouchDevice);
        return () => window.removeEventListener('resize', checkTouchDevice);
    }, []);

    const getClientPoint = useCallback((event: PointerEvent | React.PointerEvent) => {
        return { x: event.clientX, y: event.clientY };
    }, []);

    const onPointerDragStart = useCallback(
        (shape: Shape, event: React.PointerEvent) => {
            const modes = ruleManager?.getActModes(shape) ?? [];
            if (!ruleManager || !shape.ele || !gameState || modes.length === 0) return;
            if (!boardDimension) return;
            sessionEndedRef.current = false;
            setInteractionPhase(GameInteractionPhase.pointerDrag);
            event.preventDefault();
            event.stopPropagation();
            // 与 Solitaire 一致：不用 setPointerCapture（隐藏元素 + capture 会触发过早 pointerup）

            const position = getClientPoint(event);
            startPositionRef.current = position;
            maxDragFromStartRef.current = 0;

            const grabTile =
                readGrabTileFromPointer(event) ?? firstFilledTile(shape.shape);

            const layer = dragLayerRef.current ?? document.body;
            const ghost = createBoardSizedDragGhost(shape, boardDimension);
            ghost.setAttribute('aria-hidden', 'true');
            ghost.style.pointerEvents = 'none';
            ghost.style.zIndex = String(DRAG_FLIGHT_BASE_Z + 100);
            ghost.style.opacity = '1';
            ghost.style.visibility = 'visible';
            layer.appendChild(ghost);

            shape.ele.style.visibility = 'hidden';

            positionGhostFromGrabTile(ghost, shape.ele, grabTile);
            void ghost.offsetHeight;
            const gr = ghost.getBoundingClientRect();
            const offsetX = position.x - gr.left;
            const offsetY = position.y - gr.top;

            const dragData: BlockBlastActionData = {
                shape,
                actModes: modes,
                offsetX,
                offsetY,
                lastPosition: position,
                status: 'acting',
                pointerId: event.pointerId,
                dragGhostEl: ghost,
                grabTile,
            };
            clearActionData(actionDataRef.current);
            Object.assign(actionDataRef.current, dragData);
            bump((n) => n + 1);
        },
        [gameState, boardDimension, getClientPoint, ruleManager, setInteractionPhase]
    );

    const onPointerMove = useCallback(
        (event: PointerEvent) => {
            const session = actionDataRef.current;
            if (!session.shape || sessionEndedRef.current) return;
            if (!session.actModes?.includes(ActMode.DRAG) || !boardDimension || !gameState) return;
            if (session.pointerId !== undefined && event.pointerId !== session.pointerId) return;

            const shape = session.shape;
            const flyEl = session.dragGhostEl ?? shape.ele;
            if (!flyEl) return;
            const position = getClientPoint(event);
            const fromStart = Math.hypot(
                position.x - startPositionRef.current.x,
                position.y - startPositionRef.current.y
            );
            maxDragFromStartRef.current = Math.max(maxDragFromStartRef.current, fromStart);

            const left = position.x - (session.offsetX || 0);
            const top = position.y - (session.offsetY || 0);
            gsap.killTweensOf(flyEl);
            flyEl.style.position = 'fixed';
            flyEl.style.transform = 'none';
            flyEl.style.left = `${Math.round(left)}px`;
            flyEl.style.top = `${Math.round(top)}px`;
            flyEl.style.zIndex = String(DRAG_FLIGHT_BASE_Z + 100);

            // 拖拽中只跟随指针，不磁吸、不落子（预览合法落点供 UI 可选扩展）
            const hint = visualHintFromGhost(flyEl, shape.shape, gridCellRefs, session.grabTile);
            session.position =
                hint && ruleManager?.canPlaceShape(shape, hint) ? hint : undefined;
            session.lastPosition = position;
        },
        [getClientPoint, gameState, boardDimension, ruleManager, gridCellRefs]
    );

    const endPointerSession = useCallback(
        (event: PointerEvent) => {
            if (sessionEndedRef.current) return;
            const session = actionDataRef.current;
            if (!boardDimension || !gameState) {
                if (session.shape) {
                    sessionEndedRef.current = true;
                    const ghost = session.dragGhostEl;
                    if (ghost?.parentNode) ghost.remove();
                    if (session.shape.ele) session.shape.ele.style.visibility = '';
                    clearActionData(actionDataRef.current);
                    bump((n) => n + 1);
                    setInteractionPhase(GameInteractionPhase.idle);
                }
                return;
            }
            if (!session.shape) return;
            if (session.pointerId !== undefined && event.pointerId !== session.pointerId) return;

            sessionEndedRef.current = true;
            event.preventDefault();
            event.stopPropagation();

            const position = getClientPoint(event);
            const distance = Math.hypot(
                position.x - startPositionRef.current.x,
                position.y - startPositionRef.current.y
            );
            const maxD = maxDragFromStartRef.current;
            const dragIntent =
                session.actModes?.includes(ActMode.DRAG) && Math.max(distance, maxD) >= 5;

            const flyEl = session.dragGhostEl;
            if (flyEl) {
                const left = position.x - (session.offsetX || 0);
                const top = position.y - (session.offsetY || 0);
                flyEl.style.position = 'fixed';
                flyEl.style.transform = 'none';
                flyEl.style.left = `${Math.round(left)}px`;
                flyEl.style.top = `${Math.round(top)}px`;
                void flyEl.offsetHeight;
            }

            let releasePosition: { row: number; col: number } | undefined;
            if (flyEl && session.shape && ruleManager) {
                releasePosition = resolvePlacementOnRelease(
                    flyEl,
                    session.shape.shape,
                    gridCellRefs,
                    session.grabTile,
                    (origin) => ruleManager.canPlaceShape(session.shape!, origin)
                );
                if (releasePosition) {
                    snapGhostToPlacementOrigin(flyEl, releasePosition, gridCellRefs);
                }
            }

            const payload: BlockBlastActionData = {
                ...session,
                position: releasePosition,
                maxDragFromStart: maxD,
            };
            maxDragFromStartRef.current = 0;
            clearActionData(actionDataRef.current);
            bump((n) => n + 1);

            if (dragIntent) {
                if (releasePosition) {
                    void onDrop({ ...payload });
                } else {
                    cancelDrag(payload);
                }
            } else {
                void onClickOrTouch({ ...payload });
            }
        },
        [
            boardDimension,
            gameState,
            getClientPoint,
            gridCellRefs,
            onClickOrTouch,
            onDrop,
            cancelDrag,
            ruleManager,
            setInteractionPhase,
        ]
    );

    const onPointerCancel = useCallback(
        (event: PointerEvent) => {
            if (sessionEndedRef.current) return;
            const session = actionDataRef.current;
            if (!session.shape) return;
            if (session.pointerId !== undefined && event.pointerId !== session.pointerId) return;

            sessionEndedRef.current = true;
            const payload: BlockBlastActionData = {
                ...session,
                maxDragFromStart: maxDragFromStartRef.current,
            };
            maxDragFromStartRef.current = 0;
            clearActionData(actionDataRef.current);
            bump((n) => n + 1);
            cancelDrag(payload);
        },
        [cancelDrag]
    );

    useEffect(() => {
        const handlePointerMove = (e: PointerEvent) => {
            if (actionDataRef.current.shape && !sessionEndedRef.current) {
                e.preventDefault();
                onPointerMove(e);
            }
        };
        const handlePointerUp = (e: PointerEvent) => {
            if (actionDataRef.current.shape && !sessionEndedRef.current) {
                endPointerSession(e);
            }
        };
        const handlePointerCancel = (e: PointerEvent) => {
            if (actionDataRef.current.shape && !sessionEndedRef.current) {
                onPointerCancel(e);
            }
        };
        const handleKeyDown = (e: KeyboardEvent) => {
            if (actionDataRef.current.shape && !sessionEndedRef.current && e.key === 'Escape') {
                sessionEndedRef.current = true;
                const payload: BlockBlastActionData = {
                    ...actionDataRef.current,
                    maxDragFromStart: maxDragFromStartRef.current,
                };
                maxDragFromStartRef.current = 0;
                clearActionData(actionDataRef.current);
                bump((n) => n + 1);
                cancelDrag(payload);
            }
        };

        document.addEventListener('pointermove', handlePointerMove, { passive: false });
        document.addEventListener('pointerup', handlePointerUp);
        document.addEventListener('pointercancel', handlePointerCancel);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('pointermove', handlePointerMove);
            document.removeEventListener('pointerup', handlePointerUp);
            document.removeEventListener('pointercancel', handlePointerCancel);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [onPointerMove, endPointerSession, onPointerCancel, cancelDrag]);

    const value: IBlockBlastDnDContext = {
        actionData: actionDataRef.current,
        isTouchDevice,
        onPointerDragStart,
        getClientPoint,
    };

    const dragPortal =
        typeof document !== 'undefined'
            ? createPortal(
                  <div
                      ref={dragLayerRef}
                      className="blockblast-drag-layer"
                      aria-hidden
                  />,
                  document.body
              )
            : null;

    return (
        <>
            {dragPortal}
            <BlockBlastDnDContext.Provider value={value}>{children}</BlockBlastDnDContext.Provider>
        </>
    );
};

export default BlockBlastDnDProvider;
