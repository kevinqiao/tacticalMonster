/**
 * 单人纸牌游戏拖拽服务
 * 基于 solitaire 的多人版本，简化为单人玩法
 */

import gsap from 'gsap';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { SoloBoardDimension, SoloCard, SoloDragData, SoloZone } from '../types/SoloTypes';
import { getCoord } from '../Utils';
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

            // 获取所有可能的放置区域
            const dropZones = document.querySelectorAll('[data-drop-zone], .foundation-zone, .tableau-column, .waste-zone');

            let bestTarget: { zoneId: string; element: Element; priority: number; count: number; area: number } | null = null;
            let bestScore = -1;

            dropZones.forEach(zone => {
                const rect = zone.getBoundingClientRect();
                const zoneId = zone.getAttribute('data-zone-id');

                if (!zoneId) return;

                // 计算卡牌与区域的交集面积
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
                // 优先级高的区域即使面积小也会被选中，但面积大的区域在同优先级下更有优势
                const score = priority * 100 + intersectionArea;

                // console.log(`Zone ${zoneId}: intersection area = ${intersectionArea}, priority = ${priority}, score = ${score}`);

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

            // console.log('Best target:', bestTarget);
            return bestTarget;

        } catch (error) {
            console.error('Error in findBestDropTarget:', error);
            return null;
        }
    }, [getZonePriority]);

    // 高亮目标区域
    const highlightDropTarget = useCallback((target: any) => {
        // 清除之前的高亮
        clearDropTargetHighlight();

        // 高亮当前目标
        if (target.element) {
            target.element.classList.add('drop-target-highlight');
        }
    }, []);

    // 清除目标高亮
    const clearDropTargetHighlight = useCallback(() => {
        document.querySelectorAll('.drop-target-highlight').forEach(el => {
            el.classList.remove('drop-target-highlight');
        });
    }, []);

    // 开始拖拽
    const onDragStart = useCallback((card: SoloCard, event: React.MouseEvent | React.TouchEvent) => {
        if (!card.ele || !gameState) return;
        event.preventDefault();
        event.stopPropagation();

        const position = getDragPosition(event);
        startPositionRef.current = position;

        const cards = gameState.cards.filter((c: SoloCard) => c.zoneId === card.zoneId && c.zoneIndex > card.zoneIndex)
        const rect = card.ele.getBoundingClientRect();

        const dragData: SoloDragData = {
            card,
            cards, // 包含整个序列
            source: card.zoneId, // 使用正确的zoneId
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

    }, [gameState, getDragPosition, boardDimension]);

    // 拖拽移动 - 优化版本
    const onDragMove = useCallback((event: React.MouseEvent | React.TouchEvent) => {
        event.preventDefault();
        event.stopPropagation();
        if (!dragDataRef.current || !boardDimension || !gameState) return;

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
                    if (dragDataRef.current.dropTarget) {
                        const prevZoneId = dragDataRef.current.dropTarget.zoneId;
                        const prevTargetZone = gameState.zones.find((z: SoloZone) => z.id === prevZoneId);
                        if (prevTargetZone && prevTargetZone.ele) {
                            gsap.set(prevTargetZone.ele, { backgroundColor: "transparent" });
                        }
                    }
                    const targetZone = gameState.zones.find((z: SoloZone) => z.id === dropTarget.zoneId);

                    dragDataRef.current.dropTarget = dropTarget;
                    if (targetZone && targetZone.ele) {
                        gsap.set(targetZone.ele, { backgroundColor: "white" });
                    }
                }
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

    }, [getDragPosition, gameState, boardDimension, findBestDropTarget, highlightDropTarget, clearDropTargetHighlight]);

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
            dragDataRef.current = null;
            handleClickEvent();
            return;
        }


        handleDragCancel(card, cards || []);
        // 清理状态
        // setCurrentTarget(null);
        // clearDropTargetHighlight();
        // dragDataRef.current = null;
    }, [getDragPosition, boardDimension, gameState]);

    // 处理点击事件
    const handleClickEvent = useCallback(() => {
        console.log('Click detected instead of drag');
        // 点击逻辑可以在这里添加
    }, []);

    // 处理成功放置
    const handleSuccessfulDrop = useCallback((card: SoloCard, targetZoneId: string) => {
        console.log('Successful drop:', card.id, 'to', targetZoneId);
        // 这里需要实现实际的移动逻辑
        // 包括更新游戏状态、执行移动等
    }, []);

    // 处理拖拽取消
    const handleDragCancel = useCallback((card: SoloCard, cards: SoloCard[]) => {
        console.log('Drag cancelled, returning to original position');
        if (!boardDimension) return;
        const coord = getCoord(card, boardDimension);

        // 返回原位置
        if (card.ele) {
            gsap.to(card.ele, {
                onStart: () => {
                    console.log("drag end", gameState, dragDataRef.current)
                    if (gameState && dragDataRef.current && dragDataRef.current.dropTarget) {
                        const prevZoneId = dragDataRef.current.dropTarget.zoneId;
                        const prevTargetZone = gameState.zones.find((z: SoloZone) => z.id === prevZoneId);
                        if (prevTargetZone && prevTargetZone.ele) {
                            gsap.set(prevTargetZone.ele, { backgroundColor: "transparent" });
                        }
                    }
                },
                onComplete: () => {
                    if (card.ele)
                        gsap.set(card.ele, { zIndex: card.zoneIndex + 10 });
                    dragDataRef.current = null;
                },
                x: coord.x,
                y: coord.y,
                duration: 0.5,
                ease: "ease.out"
            });
        }

        if (cards) {
            cards.forEach((c: SoloCard, index: number) => {
                const coord = getCoord(c, boardDimension);
                if (c.ele) {
                    gsap.to(c.ele, {
                        onComplete: () => {
                            if (c.ele)
                                gsap.set(c.ele, { zIndex: c.zoneIndex + 10 });
                        },
                        x: coord.x,
                        y: coord.y,
                        duration: 0.5,
                        ease: "ease.out"
                    });
                }
            });
        }
    }, [boardDimension, gameState]);

    // 拖拽悬停
    // const onDragOver = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    //     if (!dragDataRef.current) return;

    //     event.preventDefault();
    //     event.stopPropagation();

    //     const target = event.currentTarget as HTMLElement;
    //     const targetCardId = target.getAttribute('data-card-id');

    //     // 如果悬停在被拖拽的卡牌上，给原始位置添加绿色边框
    //     if (targetCardId === dragDataRef.current.card.id && dragDataRef.current.card.ele) {
    //         // 移除之前的高亮
    //         document.querySelectorAll('.drag-over').forEach(el => {
    //             el.classList.remove('drag-over');
    //             const element = el as HTMLElement;
    //             element.style.backgroundColor = '';
    //             element.style.border = '';
    //             element.style.borderRadius = '';
    //         });

    //         // 给原始卡牌位置添加绿色边框
    //         const originalCard = dragDataRef.current.card.ele;
    //         originalCard.classList.add('drag-over');
    //         originalCard.style.backgroundColor = 'rgba(76, 175, 80, 0.1)';
    //         originalCard.style.border = '2px dashed #4CAF50';
    //         originalCard.style.borderRadius = '8px';

    //     } else {
    //         // 悬停在其他区域，清除绿色边框
    //         document.querySelectorAll('.drag-over').forEach(el => {
    //             el.classList.remove('drag-over');
    //             const element = el as HTMLElement;
    //             element.style.backgroundColor = '';
    //             element.style.border = '';
    //             element.style.borderRadius = '';
    //         });

    //     }
    // }, [dragDataRef]);

    // 放置
    // const onDrop = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    //     if (!dragDataRef.current) return;

    //     event.preventDefault();
    //     event.stopPropagation();

    //     const target = event.currentTarget as HTMLElement;

    //     // 清理所有高亮状态
    //     document.querySelectorAll('.drag-over').forEach(el => {
    //         const element = el as HTMLElement;
    //         element.classList.remove('drag-over');
    //         element.style.backgroundColor = '';
    //         element.style.border = '';
    //         element.style.borderRadius = '';
    //     });



    //     console.log('Drop:', dragDataRef.current.card.id, 'on', target.id);

    //     // 这里需要处理放置逻辑
    //     // 包括验证移动是否合法、执行移动等
    // }, [dragDataRef]);

    // 全局事件监听
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (dragDataRef.current) {
                onDragMove(e as any);
            }
        };

        const handleMouseUp = (e: MouseEvent) => {
            console.log("mouse up", dragDataRef.current)
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
