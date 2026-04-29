/**
 * Block Blast 网格视图：10×10 + 单元格 ref（供消除动画）
 */
import React, { useEffect, useRef } from 'react';
import { useBlockBlastGameManager } from '../service/GameManager';
import { getBlockTileSurfaceStyle, getEmptyGridCellStyle } from '../utils/blockTileStyle';
import { SHAPE_COLORS } from '../types/BlockBlastTypes';

interface GridViewProps {
    className?: string;
}

const GridView: React.FC<GridViewProps> = ({ className = '' }) => {
    const { gameState, boardDimension, gridCellRefs } = useBlockBlastGameManager();
    const gridRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!gridRef.current || !boardDimension) return;

        const grid = gridRef.current;
        grid.style.left = `${boardDimension.grid.x}px`;
        grid.style.top = `${boardDimension.grid.y}px`;
        grid.style.width = `${boardDimension.grid.width}px`;
        grid.style.height = `${boardDimension.grid.height}px`;
    }, [boardDimension]);

    const setCellRef = (row: number, col: number, el: HTMLDivElement | null) => {
        const matrix = gridCellRefs.current;
        if (!matrix?.[row]) return;
        matrix[row][col] = el;
    };

    if (!gameState) return null;

    const cellSize = boardDimension?.cellSize ?? 40;
    const pad = boardDimension?.gridPadding ?? 10;

    return (
        <div
            ref={gridRef}
            className={`blockblast-grid ${className}`}
            style={{
                position: 'absolute',
                display: 'grid',
                gridTemplateColumns: `repeat(10, ${cellSize}px)`,
                gridTemplateRows: `repeat(10, ${cellSize}px)`,
                gap: `${boardDimension?.spacing ?? 2}px`,
                padding: `${pad}px`,
            }}
        >
            {gameState.grid.map((row, rowIndex) =>
                row.map((cell, colIndex) => (
                    <div
                        key={`${rowIndex}-${colIndex}`}
                        ref={(el) => setCellRef(rowIndex, colIndex, el)}
                        className={`blockblast-grid-cell ${cell === 0 ? 'blockblast-grid-cell--empty' : 'blockblast-grid-cell--filled'}`}
                        style={{
                            width: `${cellSize}px`,
                            height: `${cellSize}px`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxSizing: 'border-box',
                            ...(cell === 0
                                ? getEmptyGridCellStyle()
                                : getBlockTileSurfaceStyle(
                                      SHAPE_COLORS[cell - 1] || '#D6E2F0'
                                  )),
                        }}
                    />
                ))
            )}
        </div>
    );
};

export default GridView;
