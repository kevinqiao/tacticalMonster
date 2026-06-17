/**
 * 当前可放置形状（Hand）预览
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { useBlockBlastGameManager } from '../service/GameManager';
import {
    computeHandPreviewSlots,
    fitPreviewCellSizeForShape,
    previewCellSizeCap,
    type HandPreviewLayout,
} from '../utils/blockBlastPreviewLayout';
import ShapeBlock from './ShapeBlock';

interface ShapePreviewProps {
    className?: string;
}

const ShapePreview: React.FC<ShapePreviewProps> = ({ className = '' }) => {
    const { gameState, boardDimension, replayMode } = useBlockBlastGameManager();
    const previewRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const preview = previewRef.current;
        if (!preview || !boardDimension) return;

        const sp = boardDimension.shapePreview;
        const intrinsicW = sp.width === 'intrinsic';
        const intrinsicH = sp.height === 'intrinsic';

        preview.style.top = `${sp.y}px`;

        if (intrinsicW) {
            preview.style.left = '50%';
            preview.style.transform = 'translateX(-50%)';
            preview.style.width = 'max-content';
            preview.style.maxWidth = `${Math.max(120, boardDimension.width - 32)}px`;
        } else {
            preview.style.left = `${sp.x}px`;
            preview.style.transform = '';
            preview.style.width = `${sp.width}px`;
            preview.style.maxWidth = '';
        }

        if (intrinsicH) {
            preview.style.height = 'auto';
            preview.style.minHeight = '0';
        } else {
            preview.style.height = `${sp.height}px`;
            preview.style.minHeight = '';
        }

        preview.classList.toggle('blockblast-shape-preview--intrinsic-width', intrinsicW);
        preview.classList.toggle('blockblast-shape-preview--intrinsic-height', intrinsicH);
    }, [boardDimension]);

    const gridGap = boardDimension?.spacing ?? 2;
    const previewPortrait =
        boardDimension !== null && boardDimension.height >= boardDimension.width;
    const handLayout: HandPreviewLayout = previewPortrait ? 'portraitRow' : 'landscapeColumn';

    const sp = boardDimension?.shapePreview;
    const previewW = typeof sp?.width === 'number' ? sp.width : boardDimension?.width ?? 0;
    const previewH = typeof sp?.height === 'number' ? sp.height : 120;

    const slots = useMemo(
        () => computeHandPreviewSlots(handLayout, previewW, previewH),
        [handLayout, previewW, previewH]
    );

    const maxCellCap = previewCellSizeCap(boardDimension?.cellSize ?? 36);
    const minPreviewCell = 14;

    if (!gameState) return null;

    return (
        <div
            ref={previewRef}
            className={`blockblast-shape-preview ${className}`.trim()}
            style={{
                position: 'absolute',
            }}
        >
            <div
                className={`blockblast-shape-preview-scroll ${
                    previewPortrait ? 'blockblast-shape-preview-scroll--stacked' : ''
                }`.trim()}
            >
                <div className="blockblast-shape-preview-col blockblast-shape-preview-col--hand">
                    <div className="blockblast-shape-preview-hand-shapes">
                        {gameState.shapes.map((shape, index) => {
                            const slot = slots[index] ?? slots[0] ?? { width: 80, height: 80 };
                            const cellSize = fitPreviewCellSizeForShape(
                                shape.shape,
                                slot,
                                gridGap,
                                minPreviewCell,
                                maxCellCap
                            );
                            return (
                                <div
                                    key={shape.id}
                                    className="blockblast-shape-preview-slot"
                                >
                                    <ShapeBlock
                                        shape={shape}
                                        cellSize={cellSize}
                                        gridGap={gridGap}
                                        draggable={!replayMode}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ShapePreview;
