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
    BoardDimension,
    GameInteractionPhase,
    Shape,
} from '../types/BlockBlastTypes';
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

/** Flight ghost cells match board grid cell pixel size (see ShapeBlock `data-preview-cell-size`). */
function buildFlightTransformForBoard(el: HTMLElement, boardCellPx: number): string {
    const raw = el.dataset.previewCellSize;
    const previewPx = Math.max(1, Number.parseFloat(raw ?? '') || 1);
    const scale = boardCellPx / previewPx;
    return `translateZ(0.2px) scale(${scale})`;
}

/** Maps a screen point (usually top-left of a board cell region) to grid indices. */
function screenPointToGridCell(
    clientX: number,
    clientY: number,
    dim: BoardDimension
): { row: number; col: number } | undefined {
    const pad = dim.gridPadding;
    const gx = clientX - dim.left - dim.grid.x - pad;
    const gy = clientY - dim.top - dim.grid.y - pad;
    const step = dim.cellSize + dim.spacing;
    if (step <= 0) return undefined;
    const col = Math.floor(gx / step);
    const row = Math.floor(gy / step);
    const n = dim.gridDimension;
    if (col >= 0 && col < n && row >= 0 && row < n) {
        return { row, col };
    }
    return undefined;
}

/**
 * Placement anchor = shape matrix [0][0]. First DOM cell matches row-major index (0,0).
 * Uses actual board cell rects—avoids border/subpixel/floor vs Grid CSS mismatch (−1 row/col drift).
 */
function shapeMatrixOriginToGridCell(
    flyEl: HTMLElement,
    gridRefs: React.RefObject<GridCellRefs | null>,
    dim: BoardDimension
): { row: number; col: number } | undefined {
    const root =
        flyEl.classList.contains('blockblast-shape')
            ? flyEl
            : (flyEl.querySelector('.blockblast-shape') as HTMLElement | null);
    const gridRoot = root ?? flyEl;
    const firstCell = gridRoot.children[0] as HTMLElement | undefined;
    if (!firstCell) return undefined;
    const br = firstCell.getBoundingClientRect();
    const mx = (br.left + br.right) / 2;
    const my = (br.top + br.bottom) / 2;

    const matrix = gridRefs.current;
    const n = dim.gridDimension;
    if (matrix) {
        for (let row = 0; row < n; row++) {
            for (let col = 0; col < n; col++) {
                const cel = matrix[row]?.[col];
                if (!cel) continue;
                const cr = cel.getBoundingClientRect();
                if (mx >= cr.left && mx < cr.right && my >= cr.top && my < cr.bottom) {
                    return { row, col };
                }
            }
        }
    }

    return screenPointToGridCell(br.left + 1, br.top + 1, dim);
}

export const BlockBlastDnDProvider: React.FC<BlockBlastDnDProviderProps> = ({ children }) => {
    const actionDataRef = useRef<BlockBlastActionData>({});
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
            setInteractionPhase(GameInteractionPhase.pointerDrag);
            event.preventDefault();
            event.stopPropagation();
            try {
                event.currentTarget.setPointerCapture(event.pointerId);
            } catch {
                /* ignore */
            }
            const position = getClientPoint(event);
            startPositionRef.current = position;
            maxDragFromStartRef.current = 0;
            const el = shape.ele;
            const rect = el.getBoundingClientRect();
            const flightTransform = buildFlightTransformForBoard(el, boardDimension.cellSize);
            const ghost = el.cloneNode(true) as HTMLElement;
            ghost.removeAttribute('id');
            ghost.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));
            ghost.setAttribute('aria-hidden', 'true');
            ghost.classList.add('blockblast-shape--drag-ghost');
            const layer = dragLayerRef.current ?? document.body;
            layer.appendChild(ghost);
            el.style.visibility = 'hidden';

            gsap.killTweensOf(ghost);
            ghost.style.position = 'fixed';
            ghost.style.left = `${Math.round(rect.left)}px`;
            ghost.style.top = `${Math.round(rect.top)}px`;
            ghost.style.margin = '0';
            ghost.style.pointerEvents = 'none';
            ghost.style.zIndex = String(DRAG_FLIGHT_BASE_Z + 100);
            ghost.style.opacity = '1';
            ghost.style.visibility = 'visible';
            ghost.style.transformOrigin = '0 0';
            ghost.style.transform = flightTransform;
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
                dragGhostTransform: flightTransform,
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
            if (!session.shape) return;
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

            const { offsetX, offsetY } = session;
            const left = position.x - (offsetX || 0);
            const top = position.y - (offsetY || 0);
            const flightTransform = session.dragGhostTransform ?? 'translateZ(0.2px)';
            gsap.killTweensOf(flyEl);
            flyEl.style.position = 'fixed';
            flyEl.style.transformOrigin = '0 0';
            flyEl.style.left = `${Math.round(left)}px`;
            flyEl.style.top = `${Math.round(top)}px`;
            flyEl.style.transform = flightTransform;
            flyEl.style.zIndex = String(DRAG_FLIGHT_BASE_Z + 100);

            void flyEl.offsetHeight;
            const cell = shapeMatrixOriginToGridCell(flyEl, gridCellRefs, boardDimension);
            if (cell && ruleManager?.canPlaceShape(shape, cell)) {
                session.position = cell;
            } else {
                session.position = undefined;
            }
            session.lastPosition = position;
        },
        [getClientPoint, gameState, boardDimension, ruleManager, gridCellRefs]
    );

    const endPointerSession = useCallback(
        (event: PointerEvent) => {
            const session = actionDataRef.current;
            if (!boardDimension || !gameState) {
                if (session.shape) {
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
            if (flyEl && session.dragGhostTransform) {
                const left = position.x - (session.offsetX || 0);
                const top = position.y - (session.offsetY || 0);
                flyEl.style.position = 'fixed';
                flyEl.style.transformOrigin = '0 0';
                flyEl.style.left = `${Math.round(left)}px`;
                flyEl.style.top = `${Math.round(top)}px`;
                flyEl.style.transform = session.dragGhostTransform;
                void flyEl.offsetHeight;
            }

            let releasePosition: { row: number; col: number } | undefined;
            if (flyEl && boardDimension && session.shape) {
                const fromAnchor = shapeMatrixOriginToGridCell(flyEl, gridCellRefs, boardDimension);
                if (
                    fromAnchor !== undefined &&
                    ruleManager?.canPlaceShape(session.shape, fromAnchor)
                ) {
                    releasePosition = fromAnchor;
                }
            }
            /** pointerup 时幽灵位置可能与最后一帧 move 差 1px，命中检测失败；回退到上一帧合法落点 */
            if (
                releasePosition === undefined &&
                session.position &&
                session.shape &&
                ruleManager?.canPlaceShape(session.shape, session.position)
            ) {
                releasePosition = session.position;
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
                void onDrop({ ...payload });
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
            ruleManager,
            setInteractionPhase,
        ]
    );

    const onPointerCancel = useCallback(
        (event: PointerEvent) => {
            const session = actionDataRef.current;
            if (!session.shape) return;
            if (session.pointerId !== undefined && event.pointerId !== session.pointerId) return;

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
            if (actionDataRef.current.shape) {
                e.preventDefault();
                onPointerMove(e);
            }
        };
        const handlePointerUp = (e: PointerEvent) => {
            if (actionDataRef.current.shape) {
                endPointerSession(e);
            }
        };
        const handlePointerCancel = (e: PointerEvent) => {
            if (actionDataRef.current.shape) {
                onPointerCancel(e);
            }
        };
        const handleKeyDown = (e: KeyboardEvent) => {
            if (actionDataRef.current.shape && e.key === 'Escape') {
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
