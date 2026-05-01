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
                    <span
                        className={`blockblast-shape-preview-label ${
                            previewPortrait
                                ? 'blockblast-shape-preview-label--portrait'
                                : 'blockblast-shape-preview-label--landscape'
                        }`.trim()}
                    >
                        Hand
                    </span>
                    <div className="blockblast-shape-preview-hand-shapes">
                        {gameState.shapes.map((shape) => (
                            <ShapeBlock key={shape.id} shape={shape} cellSize={previewCellSize} />
                        ))}
                    </div>
                </div>
                {gameState.nextShapes?.length ? (
                    <div className="blockblast-shape-preview-col blockblast-shape-preview-col--next">
                        <span
                            className={`blockblast-shape-preview-label blockblast-shape-preview-label--next ${
                                previewPortrait
                                    ? 'blockblast-shape-preview-label--portrait'
                                    : 'blockblast-shape-preview-label--landscape'
                            }`.trim()}
                        >
                            Next
                        </span>
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
