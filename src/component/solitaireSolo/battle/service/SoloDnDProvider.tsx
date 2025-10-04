/**
 * 单人纸牌游戏拖拽服务
 * 基于 solitaire 的多人版本，简化为单人玩法
 */

import gsap from 'gsap';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { SoloBoardDimension, SoloCard, SoloDragData } from '../types/SoloTypes';
import { getCoord } from '../Utils';
import { useSoloGameManager } from './GameManager';
import { SoloGameEngine } from './SoloGameEngine';

interface ISoloDnDContext {
    dragData: SoloDragData | null;
    isTouchDevice: boolean;
    isTransitioning: boolean;
    onDragStart: (card: SoloCard, event: React.MouseEvent | React.TouchEvent) => void;
    onDragMove: (event: React.MouseEvent | React.TouchEvent) => void;
    onDragEnd: (event: React.MouseEvent | React.TouchEvent) => void;
    onDragOver: (event: React.MouseEvent | React.TouchEvent) => void;
    onDrop: (event: React.MouseEvent | React.TouchEvent) => void;
    getDragPosition: (event: React.MouseEvent | React.TouchEvent) => { x: number; y: number };
}

const SoloDnDContext = createContext<ISoloDnDContext>({
    dragData: null,
    isTouchDevice: false,
    isTransitioning: false,
    onDragStart: () => { },
    onDragMove: () => { },
    onDragEnd: () => { },
    onDragOver: () => { },
    onDrop: () => { },
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
    const [isTouchDevice, setIsTouchDevice] = useState(false);
    const [hoveredTarget, setHoveredTarget] = useState<string | null>(null);
    const startPositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

    // 获取游戏管理器
    const { gameState, boardDimension } = useSoloGameManager();

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

    // 开始拖拽
    const onDragStart = useCallback((card: SoloCard, event: React.MouseEvent | React.TouchEvent) => {
        console.log('Drag started:', card);
        if (!card.ele || !gameState) return;
        event.preventDefault();
        event.stopPropagation();
        const cards = gameState.cards.filter((c: SoloCard) => c.zoneId === card.zoneId && c.zoneIndex > card.zoneIndex)
        const position = getDragPosition(event);
        // const target = event.currentTarget as HTMLDivElement;
        const rect = card.ele.getBoundingClientRect();
        // 获取可移动的卡牌序列
        // const movableCards = gameManager.getMovableSequence(card);
        // console.log(`Dragging sequence of ${movableCards.length} cards:`, movableCards.map(c => c.id));
        // gsap.set(card.ele, { zIndex: 99999 });
        const dragData: SoloDragData = {
            card,
            cards, // 包含整个序列
            source: card.zoneId, // 使用正确的zoneId
            // x: position.x,
            // y: position.y,
            offsetX: position.x - rect.left,
            offsetY: position.y - rect.top
        };
        dragDataRef.current = dragData;
        gsap.set(card.ele, { zIndex: card.zoneIndex + 99999 });
        cards.forEach((c: SoloCard) => {
            if (c.ele)
                gsap.set(c.ele, { zIndex: c.zoneIndex + 99999 });
        });


    }, [gameState, getDragPosition, boardDimension]);

    // 拖拽移动 - 使用 GSAP 优化
    const onDragMove = useCallback((event: React.MouseEvent | React.TouchEvent) => {
        event.preventDefault();
        event.stopPropagation();
        if (!dragDataRef.current || !boardDimension || !gameState) return;
        const card = dragDataRef.current.card;
        if (!card.ele) return;

        const position = getDragPosition(event);
        const { offsetX, offsetY, cards } = dragDataRef.current;
        const { left, top } = boardDimension as SoloBoardDimension;
        const x = position.x - left - offsetX;
        const y = position.y - top - offsetY;
        gsap.set(card.ele, { x, y });
        if (cards) {
            cards.forEach((c: SoloCard, index: number) => {
                const dy = y + (index + 1) * (boardDimension.cardHeight * 0.3);
                if (c.ele)
                    gsap.set(c.ele, { x, y: dy });
            });
        }
        //  else {
        //     const moveables = gameState.cards.filter((c: SoloCard) => c.zoneId === card.zoneId && c.zoneIndex > card.zoneIndex)
        //     dragDataRef.current.cards = moveables;
        //     moveables.forEach((c: SoloCard, index: number) => {
        //         const dy = y + (index + 1) * (boardDimension.cardHeight * 0.3);
        //         if (c.ele)
        //             gsap.set(c.ele, { x, y: dy, zIndex: c.zoneIndex + 99999 });
        //     });
        // }

    }, [gameState, getDragPosition, boardDimension]);

    // 结束拖拽
    const onDragEnd = useCallback((event: React.MouseEvent | React.TouchEvent) => {
        if (!dragDataRef.current || !boardDimension) return;
        const { card, cards } = dragDataRef.current;
        event.preventDefault();
        event.stopPropagation();

        const position = getDragPosition(event);
        const distance = Math.sqrt(
            Math.pow(position.x - startPositionRef.current.x, 2) +
            Math.pow(position.y - startPositionRef.current.y, 2)
        );

        // 处理点击（移动距离太小）
        if (distance < 5) {
            handleClickEvent();
            return;
        }

        dragDataRef.current = null;
        // 检查是否拖拽到有效区域
        // const dropResult = checkDropZone(position);
        const coord = getCoord(card, boardDimension);
        // card.ele.style.zIndex = (card.zoneIndex + 100).toString();
        const tl = gsap.timeline();
        if (card.ele)
            tl.to(card.ele, {
                onComplete: () => {
                    dragDataRef.current = null;
                    const zIndex = card.zoneIndex + 10;
                    if (card.ele)
                        gsap.set(card.ele, { zIndex });
                    if (cards)
                        cards.forEach((c: SoloCard) => {
                            if (c.ele)
                                gsap.set(c.ele, { zIndex: c.zoneIndex + 10 });
                        });
                },
                x: coord.x,
                y: coord.y,
                duration: 0.5,
                ease: "ease.out"
            });
        if (cards) {
            cards.forEach((c: SoloCard, index: number) => {
                const coord = getCoord(c, boardDimension);
                if (c.ele)
                    tl.to(c.ele, {
                        x: coord.x,
                        y: coord.y,
                        duration: 0.5,
                        ease: "ease.out"
                    }, "<");
            });
        }
        tl.play();
        // if (dropResult.success && dropResult.targetZoneId) {
        //     handleSuccessfulDrop(dropResult);
        // } else {
        //     handleDragCancel(event, position);
        // }

        // // 清理高亮状态
        // clearHoverEffects();
    }, [getDragPosition, boardDimension]);

    // 处理点击事件
    const handleClickEvent = useCallback(() => {
        console.log('Click detected instead of drag');
        // 点击逻辑可以在这里添加
    }, []);

    // 检查放置区域
    const checkDropZone = useCallback((position: { x: number; y: number }) => {
        if (!gameState) return { success: false, reason: 'No game state' };
        const elementUnderPointer = document.elementFromPoint(position.x, position.y);

        if (!elementUnderPointer) {
            return { success: false, reason: 'No element under pointer' };
        }

        // 查找最近的可放置区域
        const dropZone = elementUnderPointer.closest('[data-drop-zone]') ||
            elementUnderPointer.closest('.foundation-zone, .tableau-column, .waste-zone');

        if (!dropZone) {
            return { success: false, reason: 'No valid drop zone' };
        }

        console.log('Drag dropped to potential zone:', dropZone.className);

        // 解析目标区域ID
        let targetZoneId = dropZone.getAttribute('data-zone-id');
        if (!targetZoneId) {
            targetZoneId = parseZoneIdFromClassName(dropZone);
        }

        if (!targetZoneId) {
            return { success: false, reason: 'Could not resolve target zone ID' };
        }

        console.log('Resolved target zone ID:', targetZoneId);

        // 验证移动是否合法
        const isValidMove = SoloGameEngine.canMoveToZone(dragDataRef.current!.card, targetZoneId, gameState.cards);
        console.log('Move validation result:', isValidMove);

        // if (!isValidMove) {
        //     return { success: false, reason: 'Invalid move' };
        // }

        // // 执行移动
        // const moveSuccess = gameManager.moveCardToZone(dragData!.card, targetZoneId);
        // if (!moveSuccess) {
        //     return { success: false, reason: 'Move execution failed' };
        // }

        console.log(`Valid move executed: ${dragDataRef.current!.card.id} to ${targetZoneId}`);
        return { success: true, targetZoneId };
    }, [dragDataRef]);

    // 从className解析区域ID
    const parseZoneIdFromClassName = useCallback((dropZone: Element) => {
        const className = dropZone.className;

        if (className.includes('foundation')) {
            return dropZone.getAttribute('data-foundation-suit') || 'foundation';
        } else if (className.includes('tableau')) {
            return `tableau-${dropZone.getAttribute('data-tableau-index')}`;
        } else if (className.includes('waste')) {
            return 'waste';
        }

        return null;
    }, []);


    // 拖拽悬停
    const onDragOver = useCallback((event: React.MouseEvent | React.TouchEvent) => {
        if (!dragDataRef.current) return;

        event.preventDefault();
        event.stopPropagation();

        const target = event.currentTarget as HTMLElement;
        const targetCardId = target.getAttribute('data-card-id');

        // 如果悬停在被拖拽的卡牌上，给原始位置添加绿色边框
        if (targetCardId === dragDataRef.current.card.id && dragDataRef.current.card.ele) {
            // 移除之前的高亮
            document.querySelectorAll('.drag-over').forEach(el => {
                el.classList.remove('drag-over');
                const element = el as HTMLElement;
                element.style.backgroundColor = '';
                element.style.border = '';
                element.style.borderRadius = '';
            });

            // 给原始卡牌位置添加绿色边框
            const originalCard = dragDataRef.current.card.ele;
            originalCard.classList.add('drag-over');
            originalCard.style.backgroundColor = 'rgba(76, 175, 80, 0.1)';
            originalCard.style.border = '2px dashed #4CAF50';
            originalCard.style.borderRadius = '8px';


            setHoveredTarget(dragDataRef.current.card.id);
        } else {
            // 悬停在其他区域，清除绿色边框
            document.querySelectorAll('.drag-over').forEach(el => {
                el.classList.remove('drag-over');
                const element = el as HTMLElement;
                element.style.backgroundColor = '';
                element.style.border = '';
                element.style.borderRadius = '';
            });
            setHoveredTarget(null);
        }
    }, [dragDataRef, hoveredTarget]);

    // 放置
    const onDrop = useCallback((event: React.MouseEvent | React.TouchEvent) => {
        if (!dragDataRef.current) return;

        event.preventDefault();
        event.stopPropagation();

        const target = event.currentTarget as HTMLElement;

        // 清理所有高亮状态
        document.querySelectorAll('.drag-over').forEach(el => {
            const element = el as HTMLElement;
            element.classList.remove('drag-over');
            element.style.backgroundColor = '';
            element.style.border = '';
            element.style.borderRadius = '';
        });

        setHoveredTarget(null);

        console.log('Drop:', dragDataRef.current.card.id, 'on', target.id);

        // 这里需要处理放置逻辑
        // 包括验证移动是否合法、执行移动等
    }, [dragDataRef]);

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
        isTransitioning: false,
        onDragStart,
        onDragMove,
        onDragEnd,
        onDragOver,
        onDrop,
        getDragPosition
    };

    return (
        <SoloDnDContext.Provider value={value}>
            {children}
        </SoloDnDContext.Provider>
    );
};

export default SoloDnDProvider;
