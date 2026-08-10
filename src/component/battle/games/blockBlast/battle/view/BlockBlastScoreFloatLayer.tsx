/**
 * 消行得分飘字（锚定清除格质心 / 棋盘中心）
 */
import React, { useMemo } from 'react';
import type { BlockBlastScoreFloat } from '../service/GameManager';
import type { BoardDimension } from '../types/BlockBlastTypes';

export function BlockBlastScoreFloatLayer({
    floats,
    boardDimension,
}: {
    floats: BlockBlastScoreFloat[];
    boardDimension: BoardDimension | null;
}) {
    const items = useMemo(() => {
        if (floats.length === 0) return [];
        const fallbackX = boardDimension
            ? boardDimension.grid.x + boardDimension.grid.width / 2
            : 0;
        const fallbackY = boardDimension
            ? boardDimension.grid.y + boardDimension.grid.height * 0.4
            : 0;
        return floats.map((f) => ({
            ...f,
            x: f.x ?? fallbackX,
            y: f.y ?? fallbackY,
        }));
    }, [floats, boardDimension]);

    if (items.length === 0) return null;

    return (
        <div className="blockblast-score-float-layer" aria-hidden>
            {items.map((f) => (
                <span
                    key={f.id}
                    className={
                        f.delta > 0
                            ? 'blockblast-score-float blockblast-score-float--plus'
                            : 'blockblast-score-float blockblast-score-float--minus'
                    }
                    style={{ left: f.x, top: f.y }}
                >
                    {f.delta > 0 ? `+${f.delta}` : `${f.delta}`}
                </span>
            ))}
        </div>
    );
}
