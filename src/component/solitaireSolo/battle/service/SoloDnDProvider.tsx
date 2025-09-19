/**
 * 单人纸牌游戏拖拽服务
 * 基于 solitaire 的多人版本，简化为单人玩法
 */

import React, { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { SoloCard, SoloDragData } from '../types/SoloTypes';
import SoloDnDCard from '../view/SoloDnDCard';

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

        const dragData: SoloDragData = {
            card,
            source: card.id, // 这里需要根据实际位置设置
            x: position.x,
            y: position.y,
            offsetX: position.x - rect.left,
            offsetY: position.y - rect.top
        };

        setDragData(dragData);
        setIsDragging(true);
        startPositionRef.current = { x: position.x, y: position.y };

        // 标记原始卡牌为拖拽状态，立即隐藏所有同ID卡牌
        const allCardsWithId = document.querySelectorAll(`[data-card-id="${card.id}"]`);
        allCardsWithId.forEach(cardElement => {
            cardElement.classList.add('dragging');
            (cardElement as HTMLElement).style.setProperty('opacity', '0', 'important');
            (cardElement as HTMLElement).style.setProperty('visibility', 'hidden', 'important');
        });

        if (card.ele) {
            card.ele.classList.add('dragging');
            // 立即隐藏原始卡牌，使用!important确保优先级
            card.ele.style.setProperty('opacity', '0', 'important');
            card.ele.style.setProperty('visibility', 'hidden', 'important');
        }

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

        // 更新拖拽元素位置
        if (dragElementRef.current) {
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

        // 检查是否拖拽到有效的放置区域
        let dropSuccessful = false;
        const elementUnderPointer = document.elementFromPoint(position.x, position.y);

        if (elementUnderPointer && distance >= 5) {
            // 查找最近的可放置区域
            const dropZone = elementUnderPointer.closest('[data-drop-zone]') ||
                elementUnderPointer.closest('.foundation-zone, .tableau-column, .waste-zone');

            if (dropZone) {
                console.log('Drag dropped to potential zone:', dropZone.className);

                // 暂时设置为取消，直到实现具体的移动验证逻辑
                // TODO: 这里需要实现具体的卡牌移动规则验证
                // 比如：检查移动是否符合纸牌游戏规则
                dropSuccessful = false; // 暂时都视为取消，显示动画效果

                console.log('Move validation not implemented, treating as cancelled');
            }
        }

        // 如果移动距离太小，认为是点击而不是拖拽
        if (distance < 5) {
            console.log('Click detected instead of drag');
        } else if (!dropSuccessful) {
            console.log('Drag cancelled - no valid drop zone');

            // 取消动画：创建回归移动效果
            if (dragData.card.ele) {
                // 立即确保原始卡牌完全隐藏，移除边框和遮盖
                dragData.card.ele.style.setProperty('opacity', '0', 'important');
                dragData.card.ele.style.setProperty('visibility', 'hidden', 'important');
                dragData.card.ele.style.removeProperty('border');
                dragData.card.ele.style.removeProperty('box-shadow');
                dragData.card.ele.style.removeProperty('background-color');

                // 查找游戏区域中的原始卡牌
                const allCardsWithId = document.querySelectorAll(`[data-card-id="${dragData.card.id}"]`);

                // 第一阶段：拖拽副本回归动画
                const mousePos = getDragPosition(event as any);
                const returnElement = document.createElement('div');

                // 找到游戏区域中的目标卡牌位置
                let targetRect;
                let targetCard;

                for (const card of allCardsWithId) {
                    const parent = card.parentElement;
                    if (parent && parent.style.display !== 'none') {
                        targetRect = card.getBoundingClientRect();
                        targetCard = card as HTMLDivElement;
                        break;
                    }
                }

                if (!targetRect || !targetCard) {
                    console.log('CANCEL: Could not find target card for animation');
                    return;
                }

                // 创建回归动画元素，完全复制真实卡牌外观
                returnElement.style.cssText = `
                    position: fixed !important;
                    left: ${mousePos.x - 40}px !important;
                    top: ${mousePos.y - 50}px !important;
                    width: 80px !important;
                    height: 100px !important;
                    z-index: 9999999 !important;
                    opacity: 1 !important;
                    visibility: visible !important;
                    display: block !important;
                    transition: left 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94), top 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94), width 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94), height 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) !important;
                `;

                // 复制真实卡牌的完整样式和内容
                if (targetCard) {
                    // 复制内容
                    returnElement.innerHTML = targetCard.innerHTML;

                    // 复制样式，但保持position和z-index
                    const computedStyle = window.getComputedStyle(targetCard);
                    returnElement.style.backgroundColor = computedStyle.backgroundColor;
                    returnElement.style.border = computedStyle.border;
                    returnElement.style.borderRadius = computedStyle.borderRadius;
                    returnElement.style.boxShadow = computedStyle.boxShadow;
                    returnElement.style.color = computedStyle.color;
                    returnElement.style.fontSize = computedStyle.fontSize;
                    returnElement.style.fontFamily = computedStyle.fontFamily;
                }

                document.body.appendChild(returnElement);

                console.log('CANCEL: Created return element at mouse position:', mousePos.x - 40, mousePos.y - 50);
                console.log('CANCEL: Target position:', targetRect.left, targetRect.top);

                // 立即开始移动到目标位置，同时平滑调整尺寸，不改变外观
                setTimeout(() => {
                    returnElement.style.left = `${targetRect.left}px`;
                    returnElement.style.top = `${targetRect.top}px`;
                    returnElement.style.width = `${targetRect.width}px`;
                    returnElement.style.height = `${targetRect.height}px`;
                    // 不改变颜色和其他视觉属性，保持卡牌原本外观
                }, 50);

                // 0.8秒后回归完成，无缝切换
                setTimeout(() => {
                    // 首先准备原始卡牌，但保持隐藏
                    const allCardsToRestore = document.querySelectorAll(`[data-card-id="${dragData.card.id}"]`);
                    allCardsToRestore.forEach(cardElement => {
                        const card = cardElement as HTMLElement;
                        // 清理拖拽相关的样式
                        card.style.removeProperty('display');
                        card.style.removeProperty('transform');
                        card.style.removeProperty('background-color');
                        card.style.removeProperty('border-color');
                        card.style.removeProperty('box-shadow');
                        card.style.removeProperty('transition');
                        card.classList.remove('dragging', 'drag-copy', 'drag-cancelled');

                        // 设置为透明但可见，准备淡入
                        card.style.setProperty('opacity', '0', 'important');
                        card.style.setProperty('visibility', 'visible', 'important');

                        // 预设z-index
                        const isRevealed = card.dataset.revealed === 'true';
                        if (isRevealed) {
                            card.style.setProperty('z-index', '10', 'important');
                        }
                    });

                    // 快速但平滑的过渡：0.1s
                    returnElement.style.transition = 'opacity 0.1s ease';
                    returnElement.style.opacity = '0';

                    // 原始卡牌快速淡入
                    allCardsToRestore.forEach(cardElement => {
                        const card = cardElement as HTMLElement;
                        card.style.setProperty('transition', 'opacity 0.1s ease', 'important');
                        card.style.setProperty('opacity', '1', 'important');
                    });

                    // 0.1秒后清理过渡效果和回归元素
                    setTimeout(() => {
                        allCardsToRestore.forEach(cardElement => {
                            const card = cardElement as HTMLElement;
                            card.style.removeProperty('transition');
                            card.style.removeProperty('opacity');
                            card.style.removeProperty('visibility');
                        });

                        // 移除回归元素
                        if (document.body.contains(returnElement)) {
                            document.body.removeChild(returnElement);
                        }
                        console.log('CANCEL: Smooth fast transition complete');
                    }, 100);

                }, 800);
            }
        }

        // 摆动动画函数
        const startSwingAnimation = (cardElement: HTMLDivElement) => {
            if (!cardElement) return;

            // 使用JavaScript实现摆动动画
            cardElement.style.setProperty('opacity', '1', 'important');
            cardElement.style.setProperty('visibility', 'visible', 'important');
            cardElement.style.setProperty('z-index', '99999', 'important');
            cardElement.style.setProperty('position', 'relative', 'important');

            // JavaScript摆动动画
            const startTime = Date.now();
            const duration = 1200;

            const swingAnimate = () => {
                if (!cardElement) return;

                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // 计算摆动角度和颜色
                let rotation = 0;
                let scale = 1;
                let bgColor = 'white';
                let borderColor = '#333';

                if (progress < 0.15) {
                    const p = progress / 0.15;
                    rotation = -15 * p;
                    scale = 1 + 0.4 * p;
                    bgColor = `rgb(${255}, ${255 - 20 * p}, ${255 - 20 * p})`;
                    borderColor = `rgb(${51 + 193 * p}, ${51 + 16 * p}, ${51 + 3 * p})`;
                } else if (progress < 0.3) {
                    const p = (progress - 0.15) / 0.15;
                    rotation = -15 + 30 * p;
                    scale = 1.4 - 0.3 * p;
                    bgColor = `rgb(${255 - 11 * p}, ${235 - 168 * p}, ${238 - 171 * p})`;
                    borderColor = `rgb(${244 - 33 * p}, ${67}, ${54 - 7 * p})`;
                } else if (progress < 0.5) {
                    const p = (progress - 0.3) / 0.2;
                    rotation = 15 - 25 * p;
                    scale = 1.1 + 0.2 * p;
                    bgColor = `rgb(${255}, ${87 + 0 * p}, ${34})`;
                    borderColor = `rgb(${216}, ${67 + 0 * p}, ${21})`;
                } else {
                    const p = (progress - 0.5) / 0.5;
                    rotation = -10 + 10 * p;
                    scale = 1.3 - 0.3 * p;
                    bgColor = `rgb(${255}, ${255}, ${255})`;
                    borderColor = `rgb(${51}, ${51}, ${51})`;
                }

                cardElement.style.transform = `scale(${scale}) rotate(${rotation}deg)`;
                cardElement.style.backgroundColor = bgColor;
                cardElement.style.borderColor = borderColor;
                cardElement.style.boxShadow = `0 0 ${20 + Math.abs(rotation)}px rgba(244, 67, 54, ${0.8 - progress * 0.3})`;


                if (progress < 1) {
                    requestAnimationFrame(swingAnimate);
                } else {
                    console.log('SWING: Animation complete');
                    // 恢复正常样式，但保持可见性
                    setTimeout(() => {
                        const restoreElement = document.querySelector(`[data-card-id="${dragData.card.id}"]`) as HTMLDivElement;
                        if (restoreElement) {
                            restoreElement.classList.remove('drag-cancelled');
                            restoreElement.style.removeProperty('transform');
                            restoreElement.style.removeProperty('background-color');
                            restoreElement.style.removeProperty('border-color');
                            restoreElement.style.removeProperty('box-shadow');
                            // 强制确保卡牌保持可见状态
                            restoreElement.style.setProperty('opacity', '1', 'important');
                            restoreElement.style.setProperty('visibility', 'visible', 'important');
                            restoreElement.style.setProperty('z-index', '10', 'important');
                            restoreElement.style.setProperty('position', 'relative', 'important');

                            // 确保移除所有可能导致隐藏的CSS类
                            restoreElement.classList.remove('dragging', 'drag-copy', 'drag-cancelled');

                            // 检查最终状态
                            const finalStyle = window.getComputedStyle(restoreElement);
                            console.log('SWING: Final card state:', {
                                opacity: finalStyle.opacity,
                                visibility: finalStyle.visibility,
                                display: finalStyle.display,
                                zIndex: finalStyle.zIndex
                            });
                        }
                    }, 100);
                }
            };

            requestAnimationFrame(swingAnimate);
        };

        // 恢复原始卡牌（只有非取消的情况才立即执行）
        if (dragData?.card?.ele && (dropSuccessful || distance < 5)) {
            dragData.card.ele.classList.remove('dragging', 'drag-copy');
        }

        // 清理所有高亮状态
        document.querySelectorAll('.drag-over').forEach(el => {
            const element = el as HTMLElement;
            element.classList.remove('drag-over');
            element.style.backgroundColor = '';
            element.style.border = '';
            element.style.borderRadius = '';
        });

        setHoveredTarget(null);

        // 立即清理拖拽状态，但不影响原始卡牌
        setIsDragging(false);
        setDragData(null);
        if (dragElementRef.current) {
            dragElementRef.current.style.display = 'none';
        }

    }, [isDragging, dragData, getDragPosition]);

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
                {/* 渲染被拖拽的卡牌副本 */}
                {dragData && (
                    <SoloDnDCard
                        card={dragData.card}
                        source={dragData.source}
                        className="drag-copy"
                        style={{
                            opacity: 1,
                            pointerEvents: 'none'
                        }}
                    />
                )}
            </div>
        </SoloDnDContext.Provider>
    );
};

export default SoloDnDProvider;
