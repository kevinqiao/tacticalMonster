/**
 * 单人纸牌游戏拖拽服务（Pointer Events + 会话 ref）
 */

import gsap from 'gsap';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ActMode, GameInteractionPhase, SoloActionData, SoloBoardDimension, SoloCard, SoloDropTarget, ZoneType } from '../types/SoloTypes';
import { SOLO_ANIMATION_CONFIG } from '../animation/animationConfig';
import { buildDropZoneCache, DropZoneCacheEntry, findBestDropTarget } from '../Utils';
import { useSoloGameManager } from './GameManager';
import useActHandler from './handler/useActHandler';

interface ISoloDnDContext {
    actionData: SoloActionData | null;
    isTouchDevice: boolean;
    onPointerDragStart: (card: SoloCard, event: React.PointerEvent) => void;
    getClientPoint: (event: PointerEvent | React.PointerEvent) => { x: number; y: number };
}

const SoloDnDContext = createContext<ISoloDnDContext>({
    actionData: null,
    isTouchDevice: false,
    onPointerDragStart: () => { },
    getClientPoint: () => ({ x: 0, y: 0 })
});

export const useSoloDnDManager = () => {
    const context = useContext(SoloDnDContext);
    if (!context) {
        throw new Error('useSoloDnDManager must be used within a SoloDnDProvider');
    }
    return context;
};

interface SoloDnDProviderProps {
    children: ReactNode;
}

function clearActionData(target: SoloActionData) {
    for (const k of Object.keys(target)) {
        delete (target as Record<string, unknown>)[k];
    }
}

/** 拖拽中的牌统一提升到顶层，防止与其它列卡牌发生视觉穿插 */
const DRAG_FLIGHT_BASE_Z = SOLO_ANIMATION_CONFIG.zIndex.dragFlightBase;

/** GSAP x/y 相对 offsetParent；须用当前视口矩形换算 clientX/Y，不能用缓存的 boardDimension.left/top（滚动/弹层会错位） */
function getBoardSurfaceOrigin(
    cardEle: HTMLElement | null | undefined,
    fallback: SoloBoardDimension | null
): { left: number; top: number } {
    if (!cardEle) {
        return { left: fallback?.left ?? 0, top: fallback?.top ?? 0 };
    }
    const op = cardEle.offsetParent;
    if (op instanceof HTMLElement) {
        const r = op.getBoundingClientRect();
        return { left: r.left, top: r.top };
    }
    return { left: fallback?.left ?? 0, top: fallback?.top ?? 0 };
}

function bestHitToDropTarget(
    best: { zoneId: string; element: Element; priority: number; count: number; area: number } | null
): SoloDropTarget | null {
    if (!best) return null;
    return {
        zoneId: best.zoneId,
        element: best.element,
        priority: best.priority,
        count: best.count,
        area: best.area
    };
}

function setDropHighlight(el: Element | null | undefined, on: boolean) {
    if (!(el instanceof HTMLElement)) return;
    el.classList.toggle('drag-over', on);
}

export const SoloDnDProvider: React.FC<SoloDnDProviderProps> = ({ children }) => {

    const actionDataRef = useRef<SoloActionData>({});
    const [isTouchDevice, setIsTouchDevice] = useState(false);
    const startPositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const maxDragFromStartRef = useRef(0);
    const [, bump] = useState(0);

    /** 拖拽开始缓存落点区；pointermove 用缓存几何，避免每帧 layout thrash */
    const dropZoneCacheRef = useRef<DropZoneCacheEntry[]>([]);
    /** 最新指针位置；rAF 合并到每帧一次 */
    const pendingPointerRef = useRef<{ x: number; y: number } | null>(null);
    const dragRafRef = useRef<number | null>(null);
    const highlightedElRef = useRef<Element | null>(null);

    const { gameState, ruleManager, boardDimension, setInteractionPhase } = useSoloGameManager();

    const legalDropPredicate = useCallback(
        (c: SoloCard, zoneId: string) => (ruleManager ? ruleManager.canMoveToZone(c, zoneId) : false),
        [ruleManager]
    );
    const { onClickOrTouch, onDrop, cancelDrag } = useActHandler();

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

    const clearDropTargetHighlight = useCallback(() => {
        setDropHighlight(highlightedElRef.current, false);
        highlightedElRef.current = null;
        if (actionDataRef.current?.dropTarget?.element) {
            setDropHighlight(actionDataRef.current.dropTarget.element, false);
        }
    }, []);

    const cancelDragRaf = useCallback(() => {
        if (dragRafRef.current != null) {
            cancelAnimationFrame(dragRafRef.current);
            dragRafRef.current = null;
        }
        pendingPointerRef.current = null;
    }, []);

    const applyDragFrame = useCallback(() => {
        dragRafRef.current = null;
        const position = pendingPointerRef.current;
        pendingPointerRef.current = null;
        if (!position) return;

        const session = actionDataRef.current;
        if (!session.card || !boardDimension || !gameState) return;
        if (!session.actModes?.includes(ActMode.DRAG)) return;

        const card = session.card;
        if (!card.ele) return;

        const fromStart = Math.hypot(
            position.x - startPositionRef.current.x,
            position.y - startPositionRef.current.y
        );
        maxDragFromStartRef.current = Math.max(maxDragFromStartRef.current, fromStart);

        const { offsetX, offsetY, cards: stackFollowers } = session;
        const { left: originLeft, top: originTop } = getBoardSurfaceOrigin(card.ele, boardDimension);
        const x = position.x - originLeft - (offsetX || 0);
        const y = position.y - originTop - (offsetY || 0);

        gsap.set(card.ele, { x, y });
        const followerCount = stackFollowers?.length ?? 0;
        if (stackFollowers) {
            stackFollowers.forEach((c: SoloCard, index: number) => {
                const dy = y + (index + 1) * (boardDimension.cardHeight * 0.3);
                if (c.ele) gsap.set(c.ele, { x, y: dy });
            });
        }

        const cardW = boardDimension.cardWidth;
        const cardH = boardDimension.cardHeight;
        const stackExtra = followerCount * (cardH * 0.3);
        const dragBox = {
            left: originLeft + x,
            right: originLeft + x + cardW,
            top: originTop + y,
            bottom: originTop + y + cardH + stackExtra,
        };
        const center = {
            x: dragBox.left + cardW / 2,
            y: dragBox.top + (cardH + stackExtra) / 2,
        };

        const best = findBestDropTarget(
            center,
            card,
            boardDimension,
            (zid) => legalDropPredicate(card, zid),
            stackFollowers ?? undefined,
            dropZoneCacheRef.current,
            dragBox
        );
        const dropTarget = bestHitToDropTarget(best);

        const nextEl = dropTarget?.element ?? null;
        const prevEl = highlightedElRef.current;
        if (prevEl !== nextEl) {
            setDropHighlight(prevEl, false);
            setDropHighlight(nextEl, true);
            highlightedElRef.current = nextEl;
        }
        session.dropTarget = dropTarget ?? undefined;
        session.lastPosition = position;
    }, [boardDimension, gameState, legalDropPredicate]);

    const onPointerDragStart = useCallback((card: SoloCard, event: React.PointerEvent) => {
        const actModes = ruleManager?.getActModes(card) || [];
        if (!ruleManager || !card.ele || !gameState || actModes.length === 0) return;
        setInteractionPhase(GameInteractionPhase.pointerDrag);
        event.preventDefault();
        event.stopPropagation();
        const position = getClientPoint(event);
        startPositionRef.current = position;
        maxDragFromStartRef.current = 0;
        cancelDragRaf();
        clearDropTargetHighlight();
        dropZoneCacheRef.current = buildDropZoneCache();
        const rect = card.ele.getBoundingClientRect();
        const cards = card.zone === ZoneType.TABLEAU
            ? gameState.cards
                .filter((c: SoloCard) => c.zoneId === card.zoneId && c.zoneIndex > card.zoneIndex)
                .sort((a: SoloCard, b: SoloCard) => a.zoneIndex - b.zoneIndex)
            : [];
        const dragData: SoloActionData = {
            card,
            cards,
            actModes,
            offsetX: position.x - rect.left,
            offsetY: position.y - rect.top,
            lastPosition: position,
            status: 'acting',
            pointerId: event.pointerId
        };
        clearActionData(actionDataRef.current);
        Object.assign(actionDataRef.current, dragData);
        gsap.set(card.ele, { zIndex: DRAG_FLIGHT_BASE_Z, willChange: 'transform' });
        cards.forEach((c: SoloCard, index: number) => {
            if (c.ele) gsap.set(c.ele, { zIndex: DRAG_FLIGHT_BASE_Z + index + 1, willChange: 'transform' });
        });
        bump(n => n + 1);
    }, [gameState, getClientPoint, ruleManager, setInteractionPhase, cancelDragRaf, clearDropTargetHighlight]);

    const onPointerMove = useCallback((event: PointerEvent) => {
        const session = actionDataRef.current;
        if (!session.card) return;
        if (!session.actModes?.includes(ActMode.DRAG) || !boardDimension || !gameState) return;
        if (session.pointerId !== undefined && event.pointerId !== session.pointerId) return;

        pendingPointerRef.current = getClientPoint(event);
        if (dragRafRef.current == null) {
            dragRafRef.current = requestAnimationFrame(applyDragFrame);
        }
    }, [getClientPoint, gameState, boardDimension, applyDragFrame]);

    const endPointerSession = useCallback((event: PointerEvent) => {
        const session = actionDataRef.current;
        cancelDragRaf();
        if (!boardDimension || !gameState) {
            if (session.card) {
                clearDropTargetHighlight();
                clearActionData(actionDataRef.current);
                bump((n) => n + 1);
                setInteractionPhase(GameInteractionPhase.idle);
            }
            return;
        }
        if (!session.card) return;
        if (session.pointerId !== undefined && event.pointerId !== session.pointerId) return;

        event.preventDefault();
        event.stopPropagation();

        // 用最后一帧指针位置再算一次落点，避免 rAF 未跑完时 dropTarget 过期
        const position = getClientPoint(event);
        pendingPointerRef.current = position;
        applyDragFrame();

        const distance = Math.hypot(
            position.x - startPositionRef.current.x,
            position.y - startPositionRef.current.y
        );
        const maxD = maxDragFromStartRef.current;
        // 用「整段拖动的最大位移」而不仅是起止直线距：先拖远再回松手点附近时 distance 会很小，否则会误走 onClickOrTouch
        // 且 maxDragFromStart>6 会 cancelDrag，出现无 onDrop 日志、一律回弹。
        const dragIntent = session.actModes?.includes(ActMode.DRAG) && Math.max(distance, maxD) >= 5;
        const payload: SoloActionData = {
            ...session,
            maxDragFromStart: maxD
        };
        if (session.card?.ele && dragIntent) {
            const card = session.card;
            const { left: originLeft, top: originTop } = getBoardSurfaceOrigin(card.ele, boardDimension);
            const gx = (gsap.getProperty(card.ele, 'x') as number) || 0;
            const gy = (gsap.getProperty(card.ele, 'y') as number) || 0;
            const followerCount = session.cards?.length ?? 0;
            const cardW = boardDimension.cardWidth;
            const cardH = boardDimension.cardHeight;
            const stackExtra = followerCount * (cardH * 0.3);
            const dragBox = {
                left: originLeft + gx,
                right: originLeft + gx + cardW,
                top: originTop + gy,
                bottom: originTop + gy + cardH + stackExtra,
            };
            const center = {
                x: dragBox.left + cardW / 2,
                y: dragBox.top + (cardH + stackExtra) / 2,
            };
            const best = findBestDropTarget(
                center,
                card,
                boardDimension,
                (zid) => legalDropPredicate(card, zid),
                session.cards ?? undefined,
                dropZoneCacheRef.current,
                dragBox
            );
            payload.dropTarget = bestHitToDropTarget(best) ?? undefined;
        }
        maxDragFromStartRef.current = 0;
        dropZoneCacheRef.current = [];
        clearDropTargetHighlight();
        if (session.card?.ele) gsap.set(session.card.ele, { clearProps: 'willChange' });
        session.cards?.forEach((c) => {
            if (c.ele) gsap.set(c.ele, { clearProps: 'willChange' });
        });
        clearActionData(actionDataRef.current);
        bump(n => n + 1);

        if (dragIntent) {
            onDrop(payload);
        } else {
            onClickOrTouch(payload);
        }
    }, [
        boardDimension,
        gameState,
        getClientPoint,
        clearDropTargetHighlight,
        onClickOrTouch,
        onDrop,
        setInteractionPhase,
        legalDropPredicate,
        cancelDragRaf,
        applyDragFrame,
    ]);

    const onPointerCancel = useCallback((event: PointerEvent) => {
        const session = actionDataRef.current;
        if (!session.card) return;
        if (session.pointerId !== undefined && event.pointerId !== session.pointerId) return;

        cancelDragRaf();
        const payload: SoloActionData = {
            ...session,
            maxDragFromStart: maxDragFromStartRef.current,
        };
        maxDragFromStartRef.current = 0;
        dropZoneCacheRef.current = [];
        clearDropTargetHighlight();
        if (session.card?.ele) gsap.set(session.card.ele, { clearProps: 'willChange' });
        session.cards?.forEach((c) => {
            if (c.ele) gsap.set(c.ele, { clearProps: 'willChange' });
        });
        clearActionData(actionDataRef.current);
        bump(n => n + 1);
        cancelDrag(payload);
    }, [clearDropTargetHighlight, cancelDrag, cancelDragRaf]);

    useEffect(() => {
        const handlePointerMove = (e: PointerEvent) => {
            if (actionDataRef.current.card) {
                e.preventDefault();
                onPointerMove(e);
            }
        };

        const handlePointerUp = (e: PointerEvent) => {
            if (actionDataRef.current.card) {
                endPointerSession(e);
            }
        };

        const handlePointerCancel = (e: PointerEvent) => {
            if (actionDataRef.current.card) {
                onPointerCancel(e);
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (actionDataRef.current.card && e.key === 'Escape') {
                cancelDragRaf();
                const payload: SoloActionData = {
                    ...actionDataRef.current,
                    maxDragFromStart: maxDragFromStartRef.current,
                };
                maxDragFromStartRef.current = 0;
                dropZoneCacheRef.current = [];
                clearDropTargetHighlight();
                const session = actionDataRef.current;
                if (session.card?.ele) gsap.set(session.card.ele, { clearProps: 'willChange' });
                session.cards?.forEach((c) => {
                    if (c.ele) gsap.set(c.ele, { clearProps: 'willChange' });
                });
                clearActionData(actionDataRef.current);
                bump(n => n + 1);
                cancelDrag(payload);
            }
        };

        document.addEventListener('pointermove', handlePointerMove, { passive: false });
        document.addEventListener('pointerup', handlePointerUp);
        document.addEventListener('pointercancel', handlePointerCancel);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            cancelDragRaf();
            document.removeEventListener('pointermove', handlePointerMove);
            document.removeEventListener('pointerup', handlePointerUp);
            document.removeEventListener('pointercancel', handlePointerCancel);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [onPointerMove, endPointerSession, onPointerCancel, cancelDrag, clearDropTargetHighlight, cancelDragRaf]);

    const value: ISoloDnDContext = {
        actionData: actionDataRef.current,
        isTouchDevice,
        onPointerDragStart,
        getClientPoint
    };

    return (
        <SoloDnDContext.Provider value={value}>
            {children}
        </SoloDnDContext.Provider>
    );
};

export default SoloDnDProvider;
