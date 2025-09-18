/**
 * 单人纸牌游戏拖拽服务
 * 基于 solitaire 的多人版本，简化为单人玩法
 */

import { gsap } from 'gsap';
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

        // 标记原始卡牌为拖拽状态
        if (card.ele) {
            card.ele.classList.add('dragging');
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
                // 简单地标记为成功，避免递归调用
                dropSuccessful = true;
                console.log('Drag dropped to valid zone:', dropZone.className);

                // 这里可以添加具体的放置逻辑，但不要触发新的事件
                // TODO: 实现具体的卡牌移动逻辑
            }
        }

        // 如果移动距离太小，认为是点击而不是拖拽
        if (distance < 5) {
            console.log('Click detected instead of drag');
        } else if (!dropSuccessful) {
            console.log('Drag cancelled - no valid drop zone');

            // 让拖拽副本执行回归动画，不修改其内容
            console.log('=== DEBUG: Checking drag element for cancel animation ===');
            console.log('dragElementRef.current:', dragElementRef.current);
            console.log('dragElementRef.current display:', dragElementRef.current?.style.display);
            console.log('dragElementRef.current visibility:', dragElementRef.current?.style.visibility);

            if (dragElementRef.current && dragData.card.ele) {
                const originalRect = dragData.card.ele.getBoundingClientRect();
                console.log('=== DEBUG: Starting cancel animation on drag element ===');

                // 给拖拽副本添加取消样式，不修改innerHTML
                dragElementRef.current.style.setProperty('background-color', '#ff6b6b', 'important');
                dragElementRef.current.style.setProperty('border', '3px solid #feca57', 'important');
                dragElementRef.current.style.setProperty('box-shadow', '0 0 20px rgba(255, 107, 107, 0.8)', 'important');

                // 使用GSAP让拖拽副本回到原始位置
                const tl = gsap.timeline({
                    onComplete: () => {
                        // 动画完成后只隐藏拖拽副本，状态清理由外部处理
                        if (dragElementRef.current) {
                            dragElementRef.current.style.display = 'none';
                        }
                        if (dragData.card.ele) {
                            dragData.card.ele.classList.remove('dragging');
                        }
                    }
                });

                // 强制从鼠标位置开始，移动到原始卡牌位置
                const mouseX = position.x - 30;
                const mouseY = position.y - 40;

                // 先移动拖拽副本到鼠标位置
                dragElementRef.current.style.left = `${mouseX}px`;
                dragElementRef.current.style.top = `${mouseY}px`;

                // 强制设置一个明显的移动距离进行测试
                const deltaX = -200; // 强制向左移动200px
                const deltaY = -100; // 强制向上移动100px

                console.log('=== DEBUG: Mouse position:', mouseX, mouseY);
                console.log('=== DEBUG: Target position:', originalRect.left, originalRect.top);
                console.log('=== DEBUG: Forced delta to move:', deltaX, deltaY);

                tl.to(dragElementRef.current, {
                    x: deltaX,
                    y: deltaY,
                    scale: 2,
                    duration: 2, // 2秒长动画
                    ease: "power2.inOut",
                    onStart: () => console.log('=== DEBUG: GSAP animation started ==='),
                    onUpdate: () => {
                        const rect = dragElementRef.current?.getBoundingClientRect();
                        console.log('=== DEBUG: Animation frame:', rect?.left.toFixed(1), rect?.top.toFixed(1));
                    }
                })
                    .to(dragElementRef.current, {
                        scale: 1,
                        duration: 0.5,
                        ease: "bounce.out"
                    });

                // 移除return，但延迟清理状态
                setTimeout(() => {
                    setIsDragging(false);
                    setDragData(null);
                }, 2500); // 等动画完成后再清理
                return; // 跳过立即清理
            }
        }

        // 恢复原始卡牌（只有非取消的情况才立即执行）
        if (dragData?.card?.ele) {
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
        setIsDragging(false);
        setDragData(null);

        // 隐藏拖拽元素
        if (dragElementRef.current) {
            dragElementRef.current.style.display = 'none';
        }
    }, [isDragging, dragData, getDragPosition]);

    // 拖拽悬停
    const onDragOver = useCallback((event: React.MouseEvent | React.TouchEvent) => {
        if (!isDragging) return;

        event.preventDefault();
        event.stopPropagation();

        // 添加悬停效果和目标区域高亮
        const target = event.currentTarget as HTMLElement;
        const targetId = target.getAttribute('data-zone-id') || target.id;

        // 移除之前的高亮
        if (hoveredTarget && hoveredTarget !== targetId) {
            const prevTarget = document.querySelector(`[data-zone-id="${hoveredTarget}"]`) ||
                document.getElementById(hoveredTarget);
            if (prevTarget) {
                prevTarget.classList.remove('drag-over');
            }
        }

        // 添加新的高亮
        target.classList.add('drag-over');
        setHoveredTarget(targetId);

        // 添加视觉反馈
        target.style.backgroundColor = 'rgba(76, 175, 80, 0.1)';
        target.style.border = '2px dashed #4CAF50';
        target.style.borderRadius = '8px';
    }, [isDragging, hoveredTarget]);

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
                    display: 'none',
                    transform: 'rotate(5deg) scale(1.1)',
                    opacity: 0.9,
                    filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.3))',
                    transition: 'all 0.1s ease',
                    animation: isDragging ? 'dragPulse 0.5s ease-in-out infinite alternate' : 'none'
                }}
            >
                {/* 渲染被拖拽的卡牌副本 */}
                {dragData && (
                    <SoloDnDCard
                        card={dragData.card}
                        source={dragData.source}
                        className="drag-copy"
                        style={{
                            transform: 'none', // 移除原始卡牌的变换
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
