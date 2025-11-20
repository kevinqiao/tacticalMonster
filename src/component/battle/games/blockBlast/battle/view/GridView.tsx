/**
 * Block Blast 网格视图
 * 渲染 10x10 的游戏网格
 */

import React, { useEffect, useRef } from 'react';
import { useBlockBlastGameManager } from '../service/GameManager';
import { SHAPE_COLORS } from '../types/BlockBlastTypes';

interface GridViewProps {
    className?: string;
}

const GridView: React.FC<GridViewProps> = ({ className = '' }) => {
    const { gameState, boardDimension } = useBlockBlastGameManager();
    const gridRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!gridRef.current || !boardDimension) return;

        const grid = gridRef.current;
        grid.style.left = `${boardDimension.grid.x}px`;
        grid.style.top = `${boardDimension.grid.y}px`;
        grid.style.width = `${boardDimension.grid.width}px`;
        grid.style.height = `${boardDimension.grid.height}px`;
    }, [boardDimension]);

    if (!gameState) return null;

    const cellSize = boardDimension?.cellSize || 40;

    return (
        <div
            ref={gridRef}
            className={`blockblast-grid ${className}`}
            style={{
                position: 'absolute',
                display: 'grid',
                gridTemplateColumns: `repeat(10, ${cellSize}px)`,
                gridTemplateRows: `repeat(10, ${cellSize}px)`,
                gap: '2px',
            }}
        >
            {gameState.grid.map((row, rowIndex) =>
                row.map((cell, colIndex) => (
                    <div
                        key={`${rowIndex}-${colIndex}`}
                        className="blockblast-grid-cell"
                        style={{
                            width: `${cellSize}px`,
                            height: `${cellSize}px`,
                            backgroundColor: cell === 0 ? '#f0f0f0' : SHAPE_COLORS[cell - 1] || '#ccc',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    />
                ))
            )}
        </div>
    );
};

export default GridView;

