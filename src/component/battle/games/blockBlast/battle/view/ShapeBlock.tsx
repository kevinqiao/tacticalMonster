/**
 * Block Blast 形状块组件
 * 可拖拽的形状块
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useBlockBlastDnDManager } from '../service/BlockBlastDnDProvider';
import { useBlockBlastGameManager } from '../service/GameManager';
import { Shape, SHAPE_COLORS } from '../types/BlockBlastTypes';

interface ShapeBlockProps {
    shape: Shape;
    className?: string;
    style?: React.CSSProperties;
    onClick?: (shape: Shape) => void;
}

const ShapeBlock: React.FC<ShapeBlockProps> = ({
    shape,
    className = '',
    style,
    onClick
}) => {
    const shapeRef = useRef<HTMLDivElement>(null);
    const { onDragStart, onDragMove, onDragEnd, isTouchDevice } = useBlockBlastDnDManager();
    const { gameState, isPlaying } = useBlockBlastGameManager();

    useEffect(() => {
        if (shapeRef.current && gameState) {
            shape.ele = shapeRef.current;
        }
    }, [shape, gameState]);

    const shapeStyle = useMemo(() => {
        const cellSize = 30;
        const shapeMatrix = shape.shape;
        const rows = shapeMatrix.length;
        const cols = shapeMatrix[0]?.length || 0;

        return {
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
            gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
            gap: '2px',
            backgroundColor: 'transparent',
            cursor: 'grab',
            ...style,
        };
    }, [shape, style]);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onDragStart(shape, e);
    }, [shape, onDragStart]);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onDragStart(shape, e);
    }, [shape, onDragStart]);

    useEffect(() => {
        if (isTouchDevice) {
            const handleTouchMove = (e: TouchEvent) => {
                onDragMove(e as any);
            };
            const handleTouchEnd = (e: TouchEvent) => {
                onDragEnd(e as any);
            };

            window.addEventListener('touchmove', handleTouchMove);
            window.addEventListener('touchend', handleTouchEnd);

            return () => {
                window.removeEventListener('touchmove', handleTouchMove);
                window.removeEventListener('touchend', handleTouchEnd);
            };
        } else {
            const handleMouseMove = (e: MouseEvent) => {
                onDragMove(e as any);
            };
            const handleMouseUp = (e: MouseEvent) => {
                onDragEnd(e as any);
            };

            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);

            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isTouchDevice, onDragMove, onDragEnd]);

    const isDragging = isPlaying(shape.id);

    return (
        <div
            ref={shapeRef}
            className={`blockblast-shape ${className} ${isDragging ? 'dragging' : ''}`}
            style={shapeStyle}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onClick={() => onClick?.(shape)}
        >
            {shape.shape.map((row, rowIndex) =>
                row.map((cell, colIndex) => (
                    cell === 1 ? (
                        <div
                            key={`${rowIndex}-${colIndex}`}
                            style={{
                                width: '30px',
                                height: '30px',
                                backgroundColor: SHAPE_COLORS[shape.color - 1] || '#ccc',
                                border: '1px solid #333',
                                borderRadius: '4px',
                            }}
                        />
                    ) : (
                        <div key={`${rowIndex}-${colIndex}`} />
                    )
                ))
            )}
        </div>
    );
};

export default ShapeBlock;

