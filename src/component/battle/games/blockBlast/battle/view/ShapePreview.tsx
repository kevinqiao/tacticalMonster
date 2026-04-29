/**
 * 当前可放置形状 + 下一批预览（与后端 nextShapes 对齐）
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

    const previewCellSize = Math.max(
        22,
        Math.min(44, Math.floor((boardDimension?.cellSize ?? 36) * 0.85))
    );

    const previewPortrait =
        boardDimension !== null && boardDimension.height >= boardDimension.width;

    return (
        <div
            ref={previewRef}
            className={`blockblast-shape-preview ${className}`}
            style={{
                position: 'absolute',
            }}
        >
            <div
                className={`blockblast-shape-preview-scroll ${
                    previewPortrait ? 'blockblast-shape-preview-scroll--stacked' : ''
                }`.trim()}
            >
                <div className="blockblast-shape-preview-col">
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.95)' }}>
                        Hand
                    </div>
                    <div className="blockblast-shape-preview-hand-shapes">
                        {gameState.shapes.map((shape) => (
                            <ShapeBlock key={shape.id} shape={shape} cellSize={previewCellSize} />
                        ))}
                    </div>
                </div>
                {gameState.nextShapes?.length ? (
                    <div className="blockblast-shape-preview-col blockblast-shape-preview-col--next">
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>
                            Next
                        </div>
                        <div className="blockblast-shape-preview-next-shapes">
                            {gameState.nextShapes.map((shape) => (
                                <ShapeBlock
                                    key={shape.id}
                                    shape={shape}
                                    cellSize={Math.floor(previewCellSize * 0.75)}
                                    draggable={false}
                                />
                            ))}
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
};

export default ShapePreview;
