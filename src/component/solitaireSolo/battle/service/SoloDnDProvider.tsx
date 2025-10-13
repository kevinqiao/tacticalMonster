/**
 * 单人纸牌游戏拖拽服务
 * 基于 solitaire 的多人版本，简化为单人玩法
 */

import gsap from 'gsap';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ActionStatus, ActMode, SoloActionData, SoloBoardDimension, SoloCard, SoloDropTarget, SoloZone, ZoneType } from '../types/SoloTypes';
import { findBestDropTarget } from '../Utils';
import { useSoloGameManager } from './GameManager';
import useActHandler from './handler/useActHandler';

interface ISoloDnDContext {
    actionData: SoloActionData | null;
    isTouchDevice: boolean;
    onDragStart: (card: SoloCard, event: React.MouseEvent | React.TouchEvent) => void;
    onDragMove: (event: React.MouseEvent | React.TouchEvent) => void;
    onDragEnd: (event: React.MouseEvent | React.TouchEvent) => void;
    // onDrop: (event: React.MouseEvent | React.TouchEvent) => void;
    getDragPosition: (event: React.MouseEvent | React.TouchEvent) => { x: number; y: number };
}

const SoloDnDContext = createContext<ISoloDnDContext>({
    actionData: null,
    isTouchDevice: false,
    onDragStart: () => { },
    onDragMove: () => { },
    onDragEnd: () => { },
    getDragPosition: () => ({ x: 0, y: 0 })
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

export const SoloDnDProvider: React.FC<SoloDnDProviderProps> = ({ children }) => {

    const actionDataRef = useRef<SoloActionData>({});
    // const [currentTarget, setCurrentTarget] = useState<string | null>(null);
    const [isTouchDevice, setIsTouchDevice] = useState(false);
    // const [hoveredTarget, setHoveredTarget] = useState<string | null>(null);
    const startPositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

    // 获取游戏管理器
    const { gameState, ruleManager, boardDimension } = useSoloGameManager();
    const { onClickOrTouch, onDrop } = useActHandler();


    // 检测是否为触摸设备
    useEffect(() => {
        const checkTouchDevice = () => {
            setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
        };
        checkTouchDevice();
        window.addEventListener('resize', checkTouchDevice);
        return () => window.removeEventListener('resize', checkTouchDevice);
    }, []);

    // 获取鼠标或触摸位置
    const getDragPosition = useCallback((event: React.MouseEvent | React.TouchEvent) => {
        if ('touches' in event) {
            const touch = event.touches[0] || event.changedTouches[0];
            return { x: touch.clientX, y: touch.clientY };
        } else {
            return { x: event.clientX, y: event.clientY };
        }
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
    // 清除目标高亮
    const clearDropTargetHighlight = useCallback(() => {
        if (actionDataRef.current && actionDataRef.current.dropTarget && gameState) {
            const prevZoneId = actionDataRef.current.dropTarget.zoneId;
            const prevTargetZone = gameState.zones.find((z: SoloZone) => z.id === prevZoneId);
            if (prevTargetZone && prevTargetZone.ele) {
                gsap.set(prevTargetZone.ele, { backgroundColor: "transparent" });
            }
        }
    }, [gameState]);

    // 开始拖拽
    const onDragStart = useCallback((card: SoloCard, event: React.MouseEvent | React.TouchEvent) => {
        const actModes = ruleManager?.getActModes(card) || [];
        console.log('actModes', actModes);
        if (!ruleManager || !card.ele || !gameState || actModes.length === 0) return;
        gameState.actionStatus = ActionStatus.ACTING;
        event.preventDefault();
        event.stopPropagation();
        const position = getDragPosition(event);
        startPositionRef.current = position;
        const rect = card.ele.getBoundingClientRect();
        const cards = card.zone === ZoneType.TABLEAU ? gameState.cards.filter((c: SoloCard) => c.zoneId === card.zoneId && c.zoneIndex > card.zoneIndex).sort((a: SoloCard, b: SoloCard) => a.zoneIndex - b.zoneIndex) : [];
        // console.log('cards', card, cards);
        const dragData: SoloActionData = {
            card,
            cards, // 包含整个序列
            actModes,
            offsetX: position.x - rect.left,
            offsetY: position.y - rect.top,
            lastPosition: position, // 添加最后位置记录
            status: 'acting'
        };
        Object.assign(actionDataRef.current, dragData);
        gsap.set(card.ele, { zIndex: card.zoneIndex + 99999 });
        cards.forEach((c: SoloCard) => {
            if (c.ele)
                gsap.set(c.ele, { zIndex: c.zoneIndex + 99999 });
        });


    }, [gameState, getDragPosition, boardDimension]);

    // 拖拽移动 - 优化版本
    const onDragMove = useCallback((event: React.MouseEvent | React.TouchEvent) => {

        if (!actionDataRef.current.actModes?.includes(ActMode.DRAG) || gameState?.actionStatus !== ActionStatus.ACTING || !boardDimension || !gameState) return;

        const card = actionDataRef.current.card;
        if (!card || !card.ele) return;
        const position = getDragPosition(event);
        const { offsetX, offsetY, cards, lastPosition } = actionDataRef.current;
        const { left, top } = boardDimension as SoloBoardDimension;
        const x = position.x - left - (offsetX || 0);
        const y = position.y - top - (offsetY || 0);

        // 只在位置变化较大时重新检测
        const distance = lastPosition ? Math.sqrt(
            Math.pow(position.x - lastPosition.x, 2) +
            Math.pow(position.y - lastPosition.y, 2)
        ) : 10;

        if (distance > 10) { // 只在移动超过10像素时重新检测
            const dropTarget = findBestDropTarget(position, card, boardDimension);
            toggleDropTargetHighlight(card, dropTarget);
            actionDataRef.current.dropTarget = dropTarget;
            actionDataRef.current.lastPosition = position;
        }

        // 更新卡牌位置
        gsap.set(card.ele, { x, y });
        if (cards) {
            cards.forEach((c: SoloCard, index: number) => {
                const dy = y + (index + 1) * (boardDimension.cardHeight * 0.3);
                if (c.ele)
                    gsap.set(c.ele, { x, y: dy });
            });
        }

    }, [getDragPosition, gameState, boardDimension, clearDropTargetHighlight]);

    // 结束拖拽
    const onDragEnd = useCallback((event: React.MouseEvent | React.TouchEvent) => {
        if (!boardDimension || gameState?.actionStatus !== ActionStatus.ACTING) return;
        // const { card, cards } = dragDataRef.current;
        event.preventDefault();
        event.stopPropagation();

        const position = getDragPosition(event);
        const distance = Math.sqrt(
            Math.pow(position.x - startPositionRef.current.x, 2) +
            Math.pow(position.y - startPositionRef.current.y, 2)
        );
        console.log('distance', distance, gameState?.actionStatus, actionDataRef.current);
        // 处理点击（移动距离太小）
        gameState.actionStatus = ActionStatus.DROPPING;
        if (distance < 5) {
            onClickOrTouch(actionDataRef.current);
        } else {
            clearDropTargetHighlight();
            onDrop(actionDataRef.current);
        }
        // handleDrop();

    }, [getDragPosition, boardDimension, gameState]);

    // 全局事件监听
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (actionDataRef.current) {
                e.preventDefault();
                e.stopPropagation();
                onDragMove(e as any);
            }
        };

        const handleMouseUp = (e: MouseEvent) => {

            if (actionDataRef.current) {
                document.body.style.cursor = 'default';
                onDragEnd(e as any);
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (actionDataRef.current) {
                e.preventDefault();
                onDragMove(e as any);
            }
        };

        const handleTouchEnd = (e: TouchEvent) => {
            if (actionDataRef.current) {
                onDragEnd(e as any);
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (actionDataRef.current && e.key === 'Escape') {
                console.log('Drag cancelled by ESC key');
                // 创建一个模拟的取消事件
                const cancelEvent = new MouseEvent('mouseup', {
                    clientX: startPositionRef.current.x,
                    clientY: startPositionRef.current.y,
                    bubbles: true,
                    cancelable: true
                });
                onDragEnd(cancelEvent as any);
            }
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [actionDataRef, onDragMove, onDragEnd]);

    const value: ISoloDnDContext = {
        actionData: actionDataRef.current,
        isTouchDevice,
        onDragStart,
        onDragMove,
        onDragEnd,
        getDragPosition
    };

    return (
        <SoloDnDContext.Provider value={value}>
            {children}
        </SoloDnDContext.Provider>
    );
};

export default SoloDnDProvider;
