/**
 * 单人纸牌游戏拖拽服务
 * 基于 solitaire 的多人版本，简化为单人玩法
 */

import React, { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { SoloCard, SoloDragData } from '../types/SoloTypes';
import SoloDnDCard from '../view/SoloDnDCard';
import { useSoloGameManager } from './SoloGameManager';

interface ISoloDnDContext {
    isDragging: boolean;
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
    isDragging: false,
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
    const [isDragging, setIsDragging] = useState(false);
    const [dragData, setDragData] = useState<SoloDragData | null>(null);
    const [isTouchDevice, setIsTouchDevice] = useState(false);
    const [hoveredTarget, setHoveredTarget] = useState<string | null>(null);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [forceShow, setForceShow] = useState(false);
    const dragElementRef = useRef<HTMLDivElement | null>(null);
    const startPositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

    // 获取游戏管理器
    const gameManager = useSoloGameManager();

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
        event.preventDefault();
        event.stopPropagation();

        const position = getDragPosition(event);
        const target = event.currentTarget as HTMLDivElement;
        const rect = target.getBoundingClientRect();

        // 获取可移动的卡牌序列
        const movableCards = gameManager.getMovableSequence(card);
        console.log(`Dragging sequence of ${movableCards.length} cards:`, movableCards.map(c => c.id));

        const dragData: SoloDragData = {
            card,
            cards: movableCards, // 包含整个序列
            source: card.zoneId, // 使用正确的zoneId
            x: position.x,
            y: position.y,
            offsetX: position.x - rect.left,
            offsetY: position.y - rect.top
        };

        setDragData(dragData);
        setIsDragging(true);
        startPositionRef.current = { x: position.x, y: position.y };

        // 隐藏整个拖拽序列
        dragData.cards.forEach(sequenceCard => {
            const allCardsWithId = document.querySelectorAll(`[data-card-id="${sequenceCard.id}"]`);
            allCardsWithId.forEach(cardElement => {
                cardElement.classList.add('dragging');
                (cardElement as HTMLElement).style.setProperty('opacity', '0', 'important');
                (cardElement as HTMLElement).style.setProperty('visibility', 'hidden', 'important');
            });
        });

        // 创建拖拽元素
        if (dragElementRef.current) {
            dragElementRef.current.style.display = 'block';
            dragElementRef.current.style.left = `${position.x - dragData.offsetX}px`;
            dragElementRef.current.style.top = `${position.y - dragData.offsetY}px`;
        }

        console.log('Drag started:', card.id);
    }, [getDragPosition]);

    // 拖拽移动
    const onDragMove = useCallback((event: React.MouseEvent | React.TouchEvent) => {
        if (!isDragging || !dragData) return;

        event.preventDefault();
        const position = getDragPosition(event);

        setDragData(prev => prev ? {
            ...prev,
            x: position.x,
            y: position.y
        } : null);

        // 更新拖拽元素位置，确保元素存在且仍在拖拽状态
        if (dragElementRef.current && isDragging && dragData) {
            dragElementRef.current.style.left = `${position.x - dragData.offsetX}px`;
            dragElementRef.current.style.top = `${position.y - dragData.offsetY}px`;
        }
    }, [isDragging, dragData, getDragPosition]);

    // 结束拖拽
    const onDragEnd = useCallback((event: React.MouseEvent | React.TouchEvent) => {
        if (!isDragging || !dragData) return;

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

        // 检查是否拖拽到有效区域
        const dropResult = checkDropZone(position);

        if (dropResult.success && dropResult.targetZoneId) {
            handleSuccessfulDrop(dropResult);
        } else {
            handleDragCancel(event, position);
        }

        // 清理高亮状态
        clearHoverEffects();
    }, [isDragging, dragData, getDragPosition, gameManager]);

    // 处理点击事件
    const handleClickEvent = useCallback(() => {
        console.log('Click detected instead of drag');
        // 点击逻辑可以在这里添加
    }, []);

    // 检查放置区域
    const checkDropZone = useCallback((position: { x: number; y: number }) => {
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
        const isValidMove = gameManager.canMoveToZone(dragData!.card, targetZoneId);
        console.log('Move validation result:', isValidMove);

        if (!isValidMove) {
            return { success: false, reason: 'Invalid move' };
        }

        // 执行移动
        const moveSuccess = gameManager.moveCardToZone(dragData!.card, targetZoneId);
        if (!moveSuccess) {
            return { success: false, reason: 'Move execution failed' };
        }

        console.log(`Valid move executed: ${dragData!.card.id} to ${targetZoneId}`);
        return { success: true, targetZoneId };
    }, [dragData, gameManager]);

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

    // 处理成功放置
    const handleSuccessfulDrop = useCallback((dropResult: { success: boolean; targetZoneId?: string }) => {
        console.log('Move successful - cleaning up drag state');

        // 立即重置拖拽状态
        setIsDragging(false);
        setDragData(null);
        setIsTransitioning(false);

        // 清理拖拽元素
        if (dragElementRef.current) {
            dragElementRef.current.style.display = 'none';
        }

        // 清理拖拽样式
        if (dragData) {
            clearDragStyles(dragData.cards);
        }
    }, [dragData]);

    // 处理拖拽取消
    const handleDragCancel = useCallback((event: React.MouseEvent | React.TouchEvent, position: { x: number; y: number }) => {
        console.log('Drag cancelled - no valid drop zone');

        // 获取鼠标位置和原始卡牌位置
        const mousePos = position;
        const targetCard = findOriginalCard();

        if (targetCard && dragElementRef.current) {
            createReturnAnimation(targetCard, mousePos);
        } else {
            // 如果找不到目标卡牌，直接清理
            cleanupDragState();
        }
    }, [dragData]);

    // 查找原始卡牌
    const findOriginalCard = useCallback(() => {
        if (!dragData || !dragData.cards) return null;

        const allCardsWithId = document.querySelectorAll(`[data-card-id="${dragData.card.id}"]`);
        for (const card of allCardsWithId) {
            const parent = card.parentElement;
            if (parent && parent.style.display !== 'none' && !card.classList.contains('drag-copy')) {
                return card as HTMLElement;
            }
        }
        return null;
    }, [dragData]);

    // 创建回归动画
    const createReturnAnimation = useCallback((targetCard: HTMLElement, mousePos: { x: number; y: number }) => {
        const originalRect = targetCard.getBoundingClientRect();

        // 创建回归卡牌
        const returnCard = createReturnCardElement(mousePos);
        document.body.appendChild(returnCard);

        // 停止拖拽状态
        setIsDragging(false);
        setIsTransitioning(true);

        // 清理拖拽元素
        if (dragElementRef.current) {
            dragElementRef.current.style.display = 'none';
        }

        // 执行回归动画
        setTimeout(() => {
            returnCard.style.left = `${originalRect.left}px`;
            returnCard.style.top = `${originalRect.top}px`;
        }, 100);

        // 清理回归元素
        setTimeout(() => {
            if (document.body.contains(returnCard)) {
                document.body.removeChild(returnCard);
            }
        }, 1100);

        // 延迟清理原始卡牌样式
        setTimeout(() => {
            if (dragData && dragData.cards) {
                clearDragStyles(dragData.cards);
            }
        }, 1000);

        // 延迟清理所有状态
        setTimeout(() => {
            setIsTransitioning(false);
            setDragData(null);
            console.log('Drag cancelled - simple return complete');
        }, 1200);
    }, [dragData]);

    // 创建回归卡牌元素
    const createReturnCardElement = useCallback((mousePos: { x: number; y: number }) => {
        const returnCard = document.createElement('div');
        const card = dragData!.card;

        // 卡牌样式
        returnCard.style.cssText = `
            position: fixed;
            left: ${mousePos.x - dragData!.offsetX}px;
            top: ${mousePos.y - dragData!.offsetY}px;
            width: ${gameManager.boardDimension?.cardWidth || 80}px;
            height: ${gameManager.boardDimension?.cardHeight || 144}px;
            background: linear-gradient(135deg, #ffffff, #f0f0f0);
            border: 2px solid #333;
            border-radius: 8px;
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 12px;
            color: #333;
            transition: all 1s ease-out;
        `;

        // 卡牌内容
        const suitSymbols = {
            'hearts': '♥',
            'diamonds': '♦',
            'clubs': '♣',
            'spades': '♠'
        };
        const suitSymbol = suitSymbols[card.suit as keyof typeof suitSymbols] || '?';
        const cardColor = card.isRed ? '#d32f2f' : '#000';

        returnCard.innerHTML = `
            <div style="
                position: absolute;
                top: 4px;
                left: 4px;
                font-size: 10px;
                color: ${cardColor};
                line-height: 1;
            ">
                <div>${card.rank}</div>
                <div style="font-size: 8px;">${suitSymbol}</div>
            </div>
            <div style="
                font-size: 20px;
                color: ${cardColor};
            ">${suitSymbol}</div>
            <div style="
                position: absolute;
                bottom: 4px;
                right: 4px;
                font-size: 10px;
                color: ${cardColor};
                transform: rotate(180deg);
                line-height: 1;
            ">
                <div>${card.rank}</div>
                <div style="font-size: 8px;">${suitSymbol}</div>
            </div>
        `;

        return returnCard;
    }, [dragData, gameManager]);

    // 清理拖拽样式
    const clearDragStyles = useCallback((cards: SoloCard[]) => {
        cards.forEach(sequenceCard => {
            const allCardsWithId = document.querySelectorAll(`[data-card-id="${sequenceCard.id}"]`);
            allCardsWithId.forEach(cardElement => {
                const card = cardElement as HTMLElement;
                card.classList.remove('dragging', 'drag-copy', 'drag-cancelled');
                card.style.removeProperty('opacity');
                card.style.removeProperty('visibility');
                card.style.removeProperty('display');
                card.style.removeProperty('transform');
            });
        });
    }, []);

    // 清理拖拽状态
    const cleanupDragState = useCallback(() => {
        setIsDragging(false);
        setIsTransitioning(true);
        if (dragElementRef.current) {
            dragElementRef.current.style.display = 'none';
        }
    }, []);

    // 清理悬停效果
    const clearHoverEffects = useCallback(() => {
        document.querySelectorAll('.drag-over').forEach(el => {
            const element = el as HTMLElement;
            element.classList.remove('drag-over');
            element.style.backgroundColor = '';
            element.style.border = '';
            element.style.borderRadius = '';
        });
        setHoveredTarget(null);
    }, []);

    // 拖拽悬停
    const onDragOver = useCallback((event: React.MouseEvent | React.TouchEvent) => {
        if (!isDragging || !dragData) return;

        event.preventDefault();
        event.stopPropagation();

        const target = event.currentTarget as HTMLElement;
        const targetCardId = target.getAttribute('data-card-id');

        // 如果悬停在被拖拽的卡牌上，给原始位置添加绿色边框
        if (targetCardId === dragData.card.id && dragData.card.ele) {
            // 移除之前的高亮
            document.querySelectorAll('.drag-over').forEach(el => {
                el.classList.remove('drag-over');
                const element = el as HTMLElement;
                element.style.backgroundColor = '';
                element.style.border = '';
                element.style.borderRadius = '';
            });

            // 给原始卡牌位置添加绿色边框
            const originalCard = dragData.card.ele;
            originalCard.classList.add('drag-over');
            originalCard.style.backgroundColor = 'rgba(76, 175, 80, 0.1)';
            originalCard.style.border = '2px dashed #4CAF50';
            originalCard.style.borderRadius = '8px';


            setHoveredTarget(dragData.card.id);
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
    }, [isDragging, dragData, hoveredTarget]);

    // 放置
    const onDrop = useCallback((event: React.MouseEvent | React.TouchEvent) => {
        if (!isDragging || !dragData) return;

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

        console.log('Drop:', dragData.card.id, 'on', target.id);

        // 这里需要处理放置逻辑
        // 包括验证移动是否合法、执行移动等
    }, [isDragging, dragData]);

    // 全局事件监听
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                onDragMove(e as any);
            }
        };

        const handleMouseUp = (e: MouseEvent) => {
            if (isDragging) {
                onDragEnd(e as any);
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (isDragging) {
                e.preventDefault();
                onDragMove(e as any);
            }
        };

        const handleTouchEnd = (e: TouchEvent) => {
            if (isDragging) {
                onDragEnd(e as any);
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (isDragging && e.key === 'Escape') {
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

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.addEventListener('touchmove', handleTouchMove, { passive: false });
            document.addEventListener('touchend', handleTouchEnd);
            document.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isDragging, onDragMove, onDragEnd]);

    const value: ISoloDnDContext = {
        isDragging,
        dragData,
        isTouchDevice,
        isTransitioning,
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
            {/* 拖拽元素 */}
            <div
                ref={dragElementRef}
                style={{
                    position: 'fixed',
                    zIndex: 9999,
                    pointerEvents: 'none',
                    display: (isDragging || isTransitioning || forceShow) ? 'block' : 'none',
                    opacity: 1,
                    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))'
                }}
            >
                {/* 渲染被拖拽的卡牌序列 */}
                {dragData && dragData.cards.map((sequenceCard, index) => {
                    // 获取游戏管理器中的尺寸信息
                    const cardWidth = gameManager.boardDimension?.cardWidth || 80;
                    const cardHeight = gameManager.boardDimension?.cardHeight || 144;

                    return (
                        <SoloDnDCard
                            key={sequenceCard.id}
                            card={sequenceCard}
                            source={dragData.source}
                            className="drag-copy"
                            style={{
                                opacity: 1,
                                pointerEvents: 'none',
                                position: 'absolute',
                                top: `${index * 20}px`, // 序列中的卡牌垂直偏移
                                left: '0px',
                                zIndex: 9999 + index, // 修正：后面的卡牌在最前面
                                // 确保拖拽副本使用正确的尺寸
                                width: cardWidth,
                                height: cardHeight,
                                minWidth: cardWidth,
                                maxWidth: cardWidth,
                                minHeight: cardHeight,
                                maxHeight: cardHeight
                            }}
                        />
                    );
                })}
            </div>
        </SoloDnDContext.Provider>
    );
};

export default SoloDnDProvider;
