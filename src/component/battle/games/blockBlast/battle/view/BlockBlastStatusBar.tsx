/**
 * Block Blast 状态栏：顶栏（右对齐计时+分数），仅竖向布局
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { BlockBlastGameState } from '../types/BlockBlastTypes';
import { useBlockBlastGameManager } from '../service/GameManager';

/** 状态栏下沿与棋盘（目标区）上沿的间距（与 GamePlayer 一致） */
export const BLOCK_BLAST_PORTRAIT_STATUS_TO_GRID_GAP_PX = 12;

/** 顶栏高度 = 棋盘单格边长（像素）的 1.5 倍，取整 */
export function blockBlastStatusPortraitBarHeightPx(cellSize: number): number {
    return Math.max(1, Math.round(1.5 * cellSize));
}

/** 竖屏：棋盘区域起始 Y = 顶栏高度 + 间距（供 GamePlayer 与布局公式共用） */
export function blockBlastPortraitGridTopPx(cellSize: number): number {
    return blockBlastStatusPortraitBarHeightPx(cellSize) + BLOCK_BLAST_PORTRAIT_STATUS_TO_GRID_GAP_PX;
}

function formatMatchRemainingSec(sec: number): string {
    const s = Math.max(0, Math.ceil(sec));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, '0')}`;
}

export interface BlockBlastStatusBarProps {
    gameState: BlockBlastGameState;
    /** 休闲 run 倒计时；复盘模式不传 */
    dueTime?: number;
    /** 倒计时归零时触发强制结束（与 GameManager 定时器互为兜底） */
    onMatchTimeout?: () => void;
    /** P75 挑战：本局 seed 分位目标分 */
    targetScore?: number;
}

const BlockBlastStatusBar: React.FC<BlockBlastStatusBarProps> = ({
    gameState,
    dueTime,
    onMatchTimeout,
    targetScore,
}) => {
    const { boardDimension } = useBlockBlastGameManager();
    const cellSizeForChrome = boardDimension?.cellSize ?? 24;
    const portraitBarHeightPx = useMemo(
        () => blockBlastStatusPortraitBarHeightPx(cellSizeForChrome),
        [cellSizeForChrome]
    );

    const [remainingSec, setRemainingSec] = useState<number | null>(null);
    const matchTimeoutFiredRef = useRef(false);
    useEffect(() => {
        matchTimeoutFiredRef.current = false;
        if (dueTime == null || !Number.isFinite(dueTime)) {
            setRemainingSec(null);
            return;
        }
        const tick = () => {
            const sec = Math.max(0, (dueTime - Date.now()) / 1000);
            setRemainingSec(sec);
            if (sec <= 0 && onMatchTimeout && !matchTimeoutFiredRef.current) {
                matchTimeoutFiredRef.current = true;
                onMatchTimeout();
            }
        };
        tick();
        const id = window.setInterval(tick, 1000);
        return () => window.clearInterval(id);
    }, [dueTime, onMatchTimeout]);

    const timerText =
        remainingSec != null ? formatMatchRemainingSec(remainingSec) : null;

    const statsSecondary = (
        <div className="blockblast-status__secondary">
            <span>L{gameState.lines}</span>
            <span aria-hidden> · </span>
            <span>M{gameState.moves}</span>
        </div>
    );

    return (
        <header
            className="blockblast-status blockblast-status--portrait"
            aria-label="对局状态"
            style={{ minHeight: portraitBarHeightPx, height: portraitBarHeightPx }}
        >
            <div className="blockblast-status__portrait-row">
                {timerText != null ? (
                    <time className="blockblast-status__timer" aria-label="剩余时间">
                        {timerText}
                    </time>
                ) : null}
                {targetScore != null ? (
                    <span className="blockblast-status__target" aria-label="目标分数">
                        目标 {targetScore}
                    </span>
                ) : null}
                <span className="blockblast-status__score-main">{gameState.score}</span>
                {statsSecondary}
            </div>
        </header>
    );
};

export default BlockBlastStatusBar;
