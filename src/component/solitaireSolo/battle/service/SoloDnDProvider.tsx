/**
 * 单人纸牌游戏拖拽服务
 * 基于 solitaire 的多人版本，简化为单人玩法
 */

import gsap from 'gsap';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { PlayEffects } from '../animation/PlayEffects';
import { SoloBoardDimension, SoloCard, SoloDragData, SoloZone } from '../types/SoloTypes';
import { useEventManager } from './EventProvider';
import { useSoloGameManager } from './GameManager';

interface ISoloDnDContext {
    dragData: SoloDragData | null;
    isTouchDevice: boolean;
    onDragStart: (card: SoloCard, event: React.MouseEvent | React.TouchEvent) => void;
    onDragMove: (event: React.MouseEvent | React.TouchEvent) => void;
    onDragEnd: (event: React.MouseEvent | React.TouchEvent) => void;
    // onDrop: (event: React.MouseEvent | React.TouchEvent) => void;
    getDragPosition: (event: React.MouseEvent | React.TouchEvent) => { x: number; y: number };
}

const SoloDnDContext = createContext<ISoloDnDContext>({
    dragData: null,
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

    const dragDataRef = useRef<SoloDragData | null>(null);
    // const [currentTarget, setCurrentTarget] = useState<string | null>(null);
    const [isTouchDevice, setIsTouchDevice] = useState(false);
    // const [hoveredTarget, setHoveredTarget] = useState<string | null>(null);
    const startPositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

    // 获取游戏管理器
    const { gameState, boardDimension } = useSoloGameManager();
    const { eventQueue, addEvent } = useEventManager();

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

    // 获取区域优先级
    const getZonePriority = useCallback((zoneId: string, card: SoloCard) => {
        if (zoneId.startsWith('foundation-')) return 100; // Foundation 最高优先级
        if (zoneId.startsWith('tableau-')) return 50;    // Tableau 中等优先级
        if (zoneId.startsWith('waste-')) return 25;      // Waste 较低优先级
        return 0;
    }, []);

    // 改进的 findBestDropTarget 函数 - 基于交集面积
    const findBestDropTarget = useCallback((position: { x: number; y: number }, card: SoloCard): { zoneId: string; element: Element; priority: number; count: number; area: number } | null => {
        try {
            // 边界检查
            if (position.x < 0 || position.y < 0 || position.x > window.innerWidth || position.y > window.innerHeight) {
                return null;
            }

            // 卡牌尺寸
            const cardWidth = 60;
            const cardHeight = 84;

            // 卡牌边界
            const cardLeft = position.x - cardWidth / 2;
            const cardRight = position.x + cardWidth / 2;
            const cardTop = position.y - cardHeight / 2;
            const cardBottom = position.y + cardHeight / 2;

            // 只选择带有 data-drop-zone 属性的元素
            const dropZones = document.querySelectorAll('[data-drop-zone]');

            let bestTarget: { zoneId: string; element: Element; priority: number; count: number; area: number } | null = null;
            let bestScore = -1;

            dropZones.forEach(zone => {
                const rect = zone.getBoundingClientRect();
                const zoneId = zone.getAttribute('data-zone-id');

                if (!zoneId) return;

                // 计算交集面积
                const intersectionLeft = Math.max(cardLeft, rect.left);
                const intersectionRight = Math.min(cardRight, rect.right);
                const intersectionTop = Math.max(cardTop, rect.top);
                const intersectionBottom = Math.min(cardBottom, rect.bottom);

                // 如果没有交集，跳过
                if (intersectionLeft >= intersectionRight || intersectionTop >= intersectionBottom) {
                    return;
                }

                // 计算交集面积
                const intersectionArea = (intersectionRight - intersectionLeft) * (intersectionBottom - intersectionTop);

                // 如果完全没有交集，跳过
                if (intersectionArea <= 0) {
                    return;
                }

                // 获取优先级
                const priority = getZonePriority(zoneId, card);

                // 计算分数：优先级 * 100 + 交集面积
                const score = priority * 100 + intersectionArea;

                if (score > bestScore) {
                    bestScore = score;
                    bestTarget = {
                        zoneId,
                        element: zone,
                        priority,
                        count: 1,
                        area: intersectionArea
                    };
                }
            });

            return bestTarget;

        } catch (error) {
            console.error('Error in findBestDropTarget:', error);
            return null;
        }
    }, [getZonePriority]);



    // 清除目标高亮
    const clearDropTargetHighlight = useCallback(() => {
        if (dragDataRef.current && dragDataRef.current.dropTarget && gameState) {
            const prevZoneId = dragDataRef.current.dropTarget.zoneId;
            const prevTargetZone = gameState.zones.find((z: SoloZone) => z.id === prevZoneId);
            if (prevTargetZone && prevTargetZone.ele) {
                gsap.set(prevTargetZone.ele, { backgroundColor: "transparent" });
            }
        }
    }, [gameState]);

    // 开始拖拽
    const onDragStart = useCallback((card: SoloCard, event: React.MouseEvent | React.TouchEvent) => {
        if (eventQueue.length > 0 || !card.ele || !gameState || dragDataRef.current) return;
        event.preventDefault();
        event.stopPropagation();

        const position = getDragPosition(event);
        startPositionRef.current = position;

        const cards = gameState.cards.filter((c: SoloCard) => c.zoneId === card.zoneId && c.zoneIndex > card.zoneIndex).sort((a: SoloCard, b: SoloCard) => a.zoneIndex - b.zoneIndex);
        const rect = card.ele.getBoundingClientRect();

        const dragData: SoloDragData = {
            card,
            cards, // 包含整个序列
            offsetX: position.x - rect.left,
            offsetY: position.y - rect.top,
            lastPosition: position // 添加最后位置记录
        };
        dragDataRef.current = dragData;
        gsap.set(card.ele, { zIndex: card.zoneIndex + 99999 });
        cards.forEach((c: SoloCard) => {
            if (c.ele)
                gsap.set(c.ele, { zIndex: c.zoneIndex + 99999 });
        });
        console.log('dragData', dragData)

    }, [gameState, getDragPosition, boardDimension]);

    // 拖拽移动 - 优化版本
    const onDragMove = useCallback((event: React.MouseEvent | React.TouchEvent) => {
        event.preventDefault();
        event.stopPropagation();
        if (!dragDataRef.current || eventQueue.length > 0 || !boardDimension || !gameState) return;

        const card = dragDataRef.current.card;
        if (!card.ele) return;

        const position = getDragPosition(event);
        const { offsetX, offsetY, cards, lastPosition } = dragDataRef.current;
        const { left, top } = boardDimension as SoloBoardDimension;
        const x = position.x - left - offsetX;
        const y = position.y - top - offsetY;

        // 只在位置变化较大时重新检测
        const distance = lastPosition ? Math.sqrt(
            Math.pow(position.x - lastPosition.x, 2) +
            Math.pow(position.y - lastPosition.y, 2)
        ) : 10;

        if (distance > 10) { // 只在移动超过10像素时重新检测
            const dropTarget = findBestDropTarget(position, card);
            if (dropTarget) {
                if (!dragDataRef.current.dropTarget || dragDataRef.current.dropTarget.zoneId !== dropTarget.zoneId) {
                    clearDropTargetHighlight();
                    const targetZone = gameState.zones.find((z: SoloZone) => z.id === dropTarget.zoneId);
                    dragDataRef.current.dropTarget = dropTarget;
                    if (targetZone && targetZone.ele) {
                        gsap.set(targetZone.ele, { backgroundColor: "white" });
                    }
                }
            } else {
                clearDropTargetHighlight();
                dragDataRef.current.dropTarget = null;
            }
            // console.log('dropTarget', dragDataRef.current.dropTarget);
            dragDataRef.current.lastPosition = position;
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

    }, [getDragPosition, eventQueue, gameState, boardDimension, findBestDropTarget, clearDropTargetHighlight]);

    // 结束拖拽
    const onDragEnd = useCallback((event: React.MouseEvent | React.TouchEvent) => {
        if (!dragDataRef.current || !boardDimension) return;
        // const { card, cards } = dragDataRef.current;
        event.preventDefault();
        event.stopPropagation();

        const position = getDragPosition(event);
        const distance = Math.sqrt(
            Math.pow(position.x - startPositionRef.current.x, 2) +
            Math.pow(position.y - startPositionRef.current.y, 2)
        );

        // 处理点击（移动距离太小）
        if (distance < 5) {
            dragDataRef.current = null;
            handleClickEvent();
            return;
        }
        handleDrop();

        // if (dragDataRef.current.cards && dragDataRef.current.cards.length > 0) {
        //     // handleDragCancel();
        //     handleDrop();
        // } else {
        //     handleDrop();
        // }
    }, [getDragPosition, boardDimension, gameState, eventQueue]);

    // 处理点击事件
    const handleClickEvent = useCallback(() => {
        console.log('Click detected instead of drag');
        // 点击逻辑可以在这里添加
    }, []);

    const handleDrop = useCallback(() => {
        if (!boardDimension || !dragDataRef.current || !gameState) return;
        clearDropTargetHighlight();

        const { card, cards } = dragDataRef.current;
        const targetZoneId = dragDataRef.current.dropTarget?.zoneId;

        if (targetZoneId && targetZoneId !== card.zoneId) {
            const dropCards = [];
            const zoneCards = gameState.cards.filter((c: SoloCard) => c.zoneId === targetZoneId).sort((a: SoloCard, b: SoloCard) => a.zoneIndex - b.zoneIndex);
            const zoneIndex = zoneCards.length === 0 ? 0 : zoneCards[zoneCards.length - 1].zoneIndex + 1;
            // card.zoneId = targetZoneId;
            // card.zoneIndex = zoneIndex;
            dropCards.push({ ...card, zoneId: targetZoneId, zoneIndex: zoneIndex });
            cards?.sort((a: SoloCard, b: SoloCard) => a.zoneIndex - b.zoneIndex).forEach((c: SoloCard, index: number) => {
                // c.zoneId = targetZoneId;
                // c.zoneIndex = zoneIndex + index + 1;
                dropCards.push({ ...c, zoneId: targetZoneId, zoneIndex: zoneIndex + index + 1 });
            });

            addEvent({
                id: Date.now().toString(),
                name: "drop",
                data: { dropCards, targetZoneId }
            });

            // const newZoneCards = gameState.cards.filter((c: SoloCard) => c.zoneId === targetZoneId).sort((a: SoloCard, b: SoloCard) => a.zoneIndex - b.zoneIndex);
            // console.log('newZoneCards', newZoneCards)

        }
        // dragDataRef.current = null;
        handleDragCancel();


    }, [boardDimension, dragDataRef, gameState, addEvent]);
    // 处理拖拽取消
    const handleDragCancel = useCallback(() => {

        if (!boardDimension || !dragDataRef.current || !gameState) return;
        clearDropTargetHighlight();
        PlayEffects.dragCancel({
            data: { card: dragDataRef.current.card, cards: dragDataRef.current.cards, boardDimension }, onComplete: () => {
                dragDataRef.current = null;
            }
        });
    }, [boardDimension, dragDataRef, gameState]);

    // 全局事件监听
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (dragDataRef.current) {
                onDragMove(e as any);
            }
        };

        const handleMouseUp = (e: MouseEvent) => {

            if (dragDataRef.current) {
                document.body.style.cursor = 'default';
                onDragEnd(e as any);
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (dragDataRef.current) {
                e.preventDefault();
                onDragMove(e as any);
            }
        };

        const handleTouchEnd = (e: TouchEvent) => {
            if (dragDataRef.current) {
                onDragEnd(e as any);
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (dragDataRef.current && e.key === 'Escape') {
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
    }, [dragDataRef, onDragMove, onDragEnd]);

    const value: ISoloDnDContext = {
        dragData: dragDataRef.current,
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
