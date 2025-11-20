/**
 * Block Blast 形状预览区
 * 显示当前可用的形状块
 */

import React, { useEffect, useRef } from 'react';
import { useBlockBlastGameManager } from '../service/GameManager';
import ShapeBlock from './ShapeBlock';

interface ShapePreviewProps {
    className?: string;
}

const ShapePreview: React.FC<ShapePreviewProps> = ({ className = '' }) => {
    const { gameState, boardDimension } = useBlockBlastGameManager();
    const previewRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!previewRef.current || !boardDimension) return;

        const preview = previewRef.current;
        preview.style.left = `${boardDimension.shapePreview.x}px`;
        preview.style.top = `${boardDimension.shapePreview.y}px`;
        preview.style.width = `${boardDimension.shapePreview.width}px`;
        preview.style.height = `${boardDimension.shapePreview.height}px`;
    }, [boardDimension]);

    if (!gameState) return null;

    return (
        <div
            ref={previewRef}
            className={`blockblast-shape-preview ${className}`}
            style={{
                position: 'absolute',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                padding: '10px',
            }}
        >
            {gameState.shapes.map((shape) => (
                <ShapeBlock key={shape.id} shape={shape} />
            ))}
        </div>
    );
};

export default ShapePreview;

