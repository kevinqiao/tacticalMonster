/**
 * Block Blast 状态栏：竖屏顶栏（左头像 · 右计时+分数）；横屏左侧竖栏（上计时与分数 · 下头像贴底）
 */
import type { User } from '@/service/UserManager';
import { useUserManager } from '@/service/UserManager';
import React, { useEffect, useMemo, useState } from 'react';
import type { BlockBlastGameState } from '../types/BlockBlastTypes';
import { useBlockBlastGameManager } from '../service/GameManager';

/** 竖屏：状态栏下沿与棋盘（目标区）上沿的间距（与 GamePlayer 一致） */
export const BLOCK_BLAST_PORTRAIT_STATUS_TO_GRID_GAP_PX = 12;

/** 横屏侧栏宽度 = 棋盘单格边长（像素）的 1.5 倍，取整 */
export function blockBlastStatusLandscapeRailPx(cellSize: number): number {
    return Math.max(1, Math.round(1.5 * cellSize));
}

/** 竖屏顶栏高度 = 棋盘单格边长（像素）的 1.5 倍，取整 */
export function blockBlastStatusPortraitBarHeightPx(cellSize: number): number {
    return Math.max(1, Math.round(1.5 * cellSize));
}

/** 竖屏：棋盘区域起始 Y = 顶栏高度 + 间距（供 GamePlayer 与布局公式共用） */
export function blockBlastPortraitGridTopPx(cellSize: number): number {
    return blockBlastStatusPortraitBarHeightPx(cellSize) + BLOCK_BLAST_PORTRAIT_STATUS_TO_GRID_GAP_PX;
}

function avatarPhotoUrlFromUser(u: User | null): string | undefined {
    if (!u) return undefined;
    const d = (u.data ?? null) as Record<string, unknown> | null;
    const raw = d?.['imageUrl'] ?? d?.['avatar'] ?? d?.['picture'] ?? d?.['photoUrl'];
    if (typeof raw === 'string' && raw.trim().length > 0) {
        return raw.trim();
    }
    const uAny = u as { picture?: string; imageUrl?: string; avatar?: string };
    for (const v of [uAny.picture, uAny.imageUrl, uAny.avatar]) {
        if (typeof v === 'string' && v.trim().length > 0) return v.trim();
    }
    return undefined;
}

function displayNameFromUser(u: User | null): string {
    if (!u) return '玩家';
    if (typeof u.name === 'string' && u.name.trim()) return u.name.trim();
    if (typeof u.email === 'string' && u.email.trim()) return u.email.trim();
    return '玩家';
}

function formatElapsed(totalSec: number): string {
    const sec = Math.max(0, Math.floor(totalSec));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) {
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
}

export interface BlockBlastStatusBarProps {
    isPortrait: boolean;
    gameState: BlockBlastGameState;
}

const BlockBlastStatusBar: React.FC<BlockBlastStatusBarProps> = ({ isPortrait, gameState }) => {
    const { user } = useUserManager();
    const { boardDimension } = useBlockBlastGameManager();
    const cellSizeForChrome = boardDimension?.cellSize ?? 24;
    const landscapeRailPx = useMemo(
        () => blockBlastStatusLandscapeRailPx(cellSizeForChrome),
        [cellSizeForChrome]
    );
    const portraitBarHeightPx = useMemo(
        () => blockBlastStatusPortraitBarHeightPx(cellSizeForChrome),
        [cellSizeForChrome]
    );
    const avatarUrl = useMemo(() => avatarPhotoUrlFromUser(user as User | null), [user]);
    const playerLabel = useMemo(() => displayNameFromUser(user as User | null), [user]);

    const [elapsedSec, setElapsedSec] = useState(0);

    useEffect(() => {
        setElapsedSec(0);
        const t0 = Date.now();
        const id = window.setInterval(() => {
            setElapsedSec(Math.floor((Date.now() - t0) / 1000));
        }, 1000);
        return () => window.clearInterval(id);
    }, [gameState.gameId]);

    const timerText = formatElapsed(elapsedSec);

    const avatarEl = (
        <div className="blockblast-status__avatar" aria-hidden>
            {avatarUrl ? (
                <img
                    className="blockblast-status__avatar-img"
                    src={avatarUrl}
                    alt=""
                    referrerPolicy="no-referrer"
                />
            ) : (
                <span className="blockblast-status__avatar-fallback">{playerLabel.slice(0, 1).toUpperCase()}</span>
            )}
        </div>
    );

    const statsSecondary = (
        <div className="blockblast-status__secondary">
            <span>L{gameState.lines}</span>
            <span aria-hidden> · </span>
            <span>M{gameState.moves}</span>
        </div>
    );

    if (isPortrait) {
        return (
            <header
                className="blockblast-status blockblast-status--portrait"
                aria-label="对局状态"
                style={{ minHeight: portraitBarHeightPx, height: portraitBarHeightPx }}
            >
                <div className="blockblast-status__player">{avatarEl}</div>
                <div className="blockblast-status__portrait-row">
                    <time className="blockblast-status__timer" dateTime={`PT${elapsedSec}S`}>
                        {timerText}
                    </time>
                    <span className="blockblast-status__score-main">{gameState.score}</span>
                    {statsSecondary}
                </div>
            </header>
        );
    }

    return (
        <aside
            className="blockblast-status blockblast-status--landscape"
            aria-label="对局状态"
            style={{ width: landscapeRailPx }}
        >
            <div className="blockblast-status__landscape-top">
                <time className="blockblast-status__timer" dateTime={`PT${elapsedSec}S`}>
                    {timerText}
                </time>
                <div className="blockblast-status__score-main">{gameState.score}</div>
                {statsSecondary}
            </div>
            <div className="blockblast-status__landscape-bottom">{avatarEl}</div>
        </aside>
    );
};

export default BlockBlastStatusBar;
