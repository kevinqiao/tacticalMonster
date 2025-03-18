import React, { ReactNode, useCallback, useEffect, useState } from 'react';
import { useDnDManager } from '../service/DndManager';
import { Card } from '../types/CombatTypes';
// 抽象事件类型
type DragEventType = 'start' | 'move' | 'end' | 'over' | 'drop';
export type DragEventData = {
    x: number;
    y: number;
    id: string;
};

// Card 组件
const DnDCard = ({ card, children }: { card: Card, children: ReactNode }) => {
    // const ref = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const { onDragStart, onDrag, onDragEnd, onDragOver, onDrop, isTouchDevice } = useDnDManager()


    // 抽象事件处理函数
    const handleDragEvent = useCallback((type: DragEventType, data: DragEventData | null) => {
        switch (type) {
            case 'start':
                if (data && card.ele) {
                    setIsDragging(true);
                    onDragStart(card, data);
                }
                break;
            case 'move':

                if (data && isDragging && card.ele) {
                    onDrag(card, data);
                    const elements = document.elementsFromPoint(data.x, data.y);
                    const dropTarget = elements.find(
                        (el) => el !== card.ele && el.classList.contains('card')
                    );
                    if (dropTarget && dropTarget.getAttribute('data-id') !== card.id) {
                        dropTarget.dispatchEvent(
                            new CustomEvent('customover', { detail: { draggedId: card.id } })
                        );
                    }
                }
                break;
            case 'end':
                setIsDragging(false);
                if (data) {
                    const elements = document.elementsFromPoint(data.x, data.y);
                    const dropTarget = elements.find(
                        (el) => el !== card.ele && el.classList.contains('card')
                    );
                    if (dropTarget && dropTarget.getAttribute('data-id') !== card.id) {
                        dropTarget.dispatchEvent(
                            new CustomEvent('customdrop', { detail: { draggedId: card.id } })
                        );
                    } else {
                        onDragEnd(card, data);
                        console.log(`${card.id} drag ended at (${data.x}, ${data.y})`);
                    }
                }
                break;
            case 'over':
                if (data && data.id !== card.id) {
                    // console.log(`${data.id} is over ${card.id}`);
                    onDragOver(card, data);
                }
                break;
            case 'drop':
                if (data && data.id !== card.id) {
                    console.log(`${data.id} dropped on ${card.id}`);
                    onDrop(card, data);
                }
                break;
        }
    }, [card, isDragging]);

    // PC 鼠标事件绑定
    useEffect(() => {
        const ele = card.ele;
        if (!ele) return;

        const handleMouseDown = (e: MouseEvent) => {
            console.log(`${card.id} PC mousedown`);
            e.preventDefault();
            handleDragEvent('start', { x: e.clientX, y: e.clientY, id: card.id });
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                e.preventDefault();
                handleDragEvent('move', { x: e.clientX, y: e.clientY, id: card.id });
            }
        };

        const handleMouseUp = (e: MouseEvent) => {
            if (isDragging) {
                console.log(`${card.id} PC mouseup`);
                handleDragEvent('end', { x: e.clientX, y: e.clientY, id: card.id });
            }
        };

        const handleCustomOver = (e: CustomEvent) => {
            handleDragEvent('over', { x: 0, y: 0, id: e.detail.draggedId });
        };

        const handleCustomDrop = (e: CustomEvent) => {
            handleDragEvent('drop', { x: 0, y: 0, id: e.detail.draggedId });
        };
        if (card.status === 1 && !isTouchDevice) {
            ele.addEventListener('mousedown', handleMouseDown);
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            ele.addEventListener('customover' as any, handleCustomOver);
            ele.addEventListener('customdrop' as any, handleCustomDrop);
        }

        return () => {
            ele.removeEventListener('mousedown', handleMouseDown);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            ele.removeEventListener('customover' as any, handleCustomOver);
            ele.removeEventListener('customdrop' as any, handleCustomDrop);
        };
    }, [card, isDragging]);

    // 触摸事件绑定
    useEffect(() => {
        const ele = card.ele;
        if (!ele) return;

        const handleTouchStart = (e: TouchEvent) => {
            console.log(`${card.id} Touchstart triggered, touches: ${e.touches.length}`);
            if (e.touches.length === 1) {
                e.preventDefault();
                const touch = e.touches[0];
                console.log(`${card.id} Touch start at (${touch.clientX}, ${touch.clientY})`);
                handleDragEvent('start', { x: touch.clientX, y: touch.clientY, id: card.id });
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            console.log(`${card.id} Touchmove triggered, touches: ${e.touches.length}`);
            if (isDragging && e.touches.length > 0) {
                e.preventDefault();
                const touch = e.touches[0];
                console.log(`${card.id} Touch move at (${touch.clientX}, ${touch.clientY})`);
                handleDragEvent('move', { x: touch.clientX, y: touch.clientY, id: card.id });
            }
        };

        const handleTouchEnd = (e: TouchEvent) => {
            console.log(`${card.id} Touchend triggered, changedTouches: ${e.changedTouches.length}`);
            if (isDragging && e.changedTouches.length > 0) {
                e.preventDefault();
                const touch = e.changedTouches[0];
                console.log(`${card.id} Touch end at (${touch.clientX}, ${touch.clientY})`);
                handleDragEvent('end', { x: touch.clientX, y: touch.clientY, id: card.id });
            }
        };

        const handleCustomOver = (e: CustomEvent) => {
            handleDragEvent('over', { x: 0, y: 0, id: e.detail.draggedId });
        };

        const handleCustomDrop = (e: CustomEvent) => {
            handleDragEvent('drop', { x: 0, y: 0, id: e.detail.draggedId });
        };
        if (card.status === 1 && isTouchDevice) {
            ele.addEventListener('touchstart', handleTouchStart, { passive: false });
            document.addEventListener('touchmove', handleTouchMove, { passive: false });
            document.addEventListener('touchend', handleTouchEnd, { passive: false });
            ele.addEventListener('customover' as any, handleCustomOver);
            ele.addEventListener('customdrop' as any, handleCustomDrop);
        }

        return () => {
            ele.removeEventListener('touchstart', handleTouchStart);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
            ele.removeEventListener('customover' as any, handleCustomOver);
            ele.removeEventListener('customdrop' as any, handleCustomDrop);
        };
    }, [card, isDragging]);

    const style: React.CSSProperties = {
        border: '1px solid black',
        cursor: 'grab',
        // opacity: isDragging ? 0.7 : 1,
        userSelect: 'none',
        touchAction: 'none',
    };

    return (
        <div ref={(ele) => card.ele = ele} key={card.id} className="card" data-id={card.id} style={style}>
            {children}
        </div>
    );
};

export default DnDCard;