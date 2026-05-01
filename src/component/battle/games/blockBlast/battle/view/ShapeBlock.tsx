/**
 * 可拖拽形状块：Pointer Events（对齐 solitaireSolo SoloDnDCard）
 */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useBlockBlastDnDManager } from '../service/BlockBlastDnDProvider';
import { useBlockBlastGameManager } from '../service/GameManager';
import { Shape, SHAPE_COLORS } from '../types/BlockBlastTypes';
import { getBlockTileSurfaceStyle } from '../utils/blockTileStyle';

interface ShapeBlockProps {
    shape: Shape;
    cellSize: number;
    className?: string;
    style?: React.CSSProperties;
    draggable?: boolean;
}

const ShapeBlock: React.FC<ShapeBlockProps> = ({
    shape,
    cellSize,
    className = '',
    style,
    draggable = true,
}) => {
    const shapeRef = useRef<HTMLDivElement>(null);
    const { onPointerDragStart } = useBlockBlastDnDManager();
    const { gameState } = useBlockBlastGameManager();

    useEffect(() => {
        if (shapeRef.current && gameState) {
            shape.ele = shapeRef.current;
        }
    }, [shape, gameState]);

    /** 拖曳异常退出时原件可能残留 visibility:hidden；commit 后会换新 shape 引用（可能同 id），靠引用触发恢复 */
    useLayoutEffect(() => {
        const el = shapeRef.current;
        if (el) el.style.visibility = '';
    }, [shape]);

    const shapeStyle = useMemo(() => {
        const shapeMatrix = shape.shape;
        const rows = shapeMatrix.length;
        const cols = shapeMatrix[0]?.length || 0;

        return {
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
            gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
            gap: '2px',
            backgroundColor: 'transparent',
            cursor: draggable ? 'grab' : 'default',
            touchAction: 'none' as const,
            ...style,
        };
    }, [shape, style, cellSize, draggable]);

    const handlePointerDown = useCallback(
        (e: React.PointerEvent) => {
            if (!draggable) return;
            e.preventDefault();
            e.stopPropagation();
            onPointerDragStart(shape, e);
        },
        [shape, onPointerDragStart, draggable]
    );

    return (
        <div
            ref={shapeRef}
            className={`blockblast-shape ${className}`}
            style={shapeStyle}
            data-preview-cell-size={String(cellSize)}
            onPointerDown={handlePointerDown}
        >
            {shape.shape.map((row, rowIndex) =>
                row.map((cell, colIndex) =>
                    cell === 1 ? (
                        <div
                            key={`${rowIndex}-${colIndex}`}
                            className="blockblast-tile"
                            style={{
                                width: `${cellSize}px`,
                                height: `${cellSize}px`,
                                boxSizing: 'border-box',
                                ...getBlockTileSurfaceStyle(
                                    SHAPE_COLORS[shape.color - 1] || '#D6E2F0'
                                ),
                            }}
                        />
                    ) : (
                        <div key={`${rowIndex}-${colIndex}`} />
                    )
                )
            )}
        </div>
    );
};

export default ShapeBlock;
