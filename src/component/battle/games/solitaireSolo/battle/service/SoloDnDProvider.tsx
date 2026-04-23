/**
 * 单人纸牌游戏拖拽服务（Pointer Events + 会话 ref）
 */

import gsap from 'gsap';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ActMode, GameInteractionPhase, SoloActionData, SoloBoardDimension, SoloCard, SoloDropTarget, SoloZone, ZoneType } from '../types/SoloTypes';
import { findBestDropTarget } from '../Utils';
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

export const SoloDnDProvider: React.FC<SoloDnDProviderProps> = ({ children }) => {

    const actionDataRef = useRef<SoloActionData>({});
    const [isTouchDevice, setIsTouchDevice] = useState(false);
    const startPositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const [, bump] = useState(0);

    const { gameState, ruleManager, boardDimension, setInteractionPhase } = useSoloGameManager();
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

    const toggleDropTargetHighlight = useCallback((card: SoloCard, dropTarget: SoloDropTarget | null) => {
        if (!gameState) return;
        if (actionDataRef.current && actionDataRef.current.dropTarget && actionDataRef.current.dropTarget.zoneId === dropTarget?.zoneId) return;
        if (dropTarget && dropTarget.element) {
            gsap.set(dropTarget.element, { backgroundColor: "white" });
        }

        if (actionDataRef.current && actionDataRef.current.dropTarget) {
            const prevZoneId = actionDataRef.current.dropTarget.zoneId;
            const prevTargetZone = gameState.zones.find((z: SoloZone) => z.id === prevZoneId);
            if (prevTargetZone && prevTargetZone.ele) {
                gsap.set(prevTargetZone.ele, { backgroundColor: "transparent" });
            }
        }
    }, [gameState]);

    const clearDropTargetHighlight = useCallback(() => {
        if (actionDataRef.current && actionDataRef.current.dropTarget && gameState) {
            const prevZoneId = actionDataRef.current.dropTarget.zoneId;
            const prevTargetZone = gameState.zones.find((z: SoloZone) => z.id === prevZoneId);
            if (prevTargetZone && prevTargetZone.ele) {
                gsap.set(prevTargetZone.ele, { backgroundColor: "transparent" });
            }
        }
    }, [gameState]);

    const onPointerDragStart = useCallback((card: SoloCard, event: React.PointerEvent) => {
        const actModes = ruleManager?.getActModes(card) || [];
        console.log("onPointerDragStart", card, actModes);
        if (!ruleManager || !card.ele || !gameState || actModes.length === 0) return;
        setInteractionPhase(GameInteractionPhase.pointerDrag);
        event.preventDefault();
        event.stopPropagation();
        const position = getClientPoint(event);
        startPositionRef.current = position;
        const rect = card.ele.getBoundingClientRect();
        const cards = card.zone === ZoneType.TABLEAU ? gameState.cards.filter((c: SoloCard) => c.zoneId === card.zoneId && c.zoneIndex > card.zoneIndex).sort((a: SoloCard, b: SoloCard) => a.zoneIndex - b.zoneIndex) : [];
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
        gsap.set(card.ele, { zIndex: card.zoneIndex + 99999 });
        cards.forEach((c: SoloCard) => {
            if (c.ele)
                gsap.set(c.ele, { zIndex: c.zoneIndex + 99999 });
        });
        bump(n => n + 1);
    }, [gameState, getClientPoint, ruleManager, setInteractionPhase]);

    const onPointerMove = useCallback((event: PointerEvent) => {
        const session = actionDataRef.current;
        if (!session.card) return;
        if (!session.actModes?.includes(ActMode.DRAG) || !boardDimension || !gameState) return;
        if (session.pointerId !== undefined && event.pointerId !== session.pointerId) return;

        const card = session.card;
        if (!card || !card.ele) return;
        const position = getClientPoint(event);
        const { offsetX, offsetY, cards, lastPosition } = session;
        const { left: originLeft, top: originTop } = getBoardSurfaceOrigin(card.ele, boardDimension);
        const x = position.x - originLeft - (offsetX || 0);
        const y = position.y - originTop - (offsetY || 0);

        const distance = lastPosition ? Math.sqrt(
            Math.pow(position.x - lastPosition.x, 2) +
            Math.pow(position.y - lastPosition.y, 2)
        ) : 10;

        if (distance > 10) {
            const dropTarget = findBestDropTarget(position, card, boardDimension);
            toggleDropTargetHighlight(card, dropTarget);
            session.dropTarget = dropTarget;
            session.lastPosition = position;
        }

        gsap.set(card.ele, { x, y });
        if (cards) {
            cards.forEach((c: SoloCard, index: number) => {
                const dy = y + (index + 1) * (boardDimension.cardHeight * 0.3);
                if (c.ele)
                    gsap.set(c.ele, { x, y: dy });
            });
        }
    }, [getClientPoint, gameState, boardDimension, toggleDropTargetHighlight]);

    const endPointerSession = useCallback((event: PointerEvent) => {
        const session = actionDataRef.current;
        if (!boardDimension || !gameState) return;
        if (!session.card) return;
        if (session.pointerId !== undefined && event.pointerId !== session.pointerId) return;

        event.preventDefault();
        event.stopPropagation();

        const position = getClientPoint(event);
        const distance = Math.sqrt(
            Math.pow(position.x - startPositionRef.current.x, 2) +
            Math.pow(position.y - startPositionRef.current.y, 2)
        );
        console.log('pointer session end', distance, session);

        const payload: SoloActionData = { ...session };
        clearDropTargetHighlight();
        clearActionData(actionDataRef.current);
        document.body.style.cursor = 'default';
        bump(n => n + 1);

        if (distance < 5) {
            onClickOrTouch(payload);
        } else {
            onDrop(payload);
        }
    }, [boardDimension, gameState, getClientPoint, clearDropTargetHighlight, onClickOrTouch, onDrop]);

    const onPointerCancel = useCallback((event: PointerEvent) => {
        const session = actionDataRef.current;
        if (!session.card) return;
        if (session.pointerId !== undefined && event.pointerId !== session.pointerId) return;

        const payload: SoloActionData = { ...session };
        clearDropTargetHighlight();
        clearActionData(actionDataRef.current);
        document.body.style.cursor = 'default';
        bump(n => n + 1);
        cancelDrag(payload);
    }, [clearDropTargetHighlight, cancelDrag]);

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
                const payload: SoloActionData = { ...actionDataRef.current };
                clearDropTargetHighlight();
                clearActionData(actionDataRef.current);
                document.body.style.cursor = 'default';
                bump(n => n + 1);
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
    }, [onPointerMove, endPointerSession, onPointerCancel, cancelDrag, clearDropTargetHighlight]);

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
