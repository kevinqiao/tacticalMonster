/**
 * Block Blast 状态栏：顶栏（左计时 / 中目标 / 右分数），开盘目标飞入动画
 */
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import gsap from 'gsap';
import type { BlockBlastGameState } from '../types/BlockBlastTypes';
import { useBlockBlastGameManager } from '../service/GameManager';
import { playTargetGoalIntro } from '../../../shared/targetGoalIntro';
import {
    CasualTargetStars,
    CasualTargetStarsIntroRows,
} from '../../../shared/CasualTargetStars';

/** 状态栏下沿与棋盘（目标区）上沿的间距（与 GamePlayer 一致） */
export const BLOCK_BLAST_PORTRAIT_STATUS_TO_GRID_GAP_PX = 12;

/** 预览区下沿与底栏命令条上沿的间距 */
export const BLOCK_BLAST_PORTRAIT_PREVIEW_TO_COMMAND_GAP_PX = 8;

/** 顶栏高度 = 棋盘单格边长的 0.75 倍（原 1.5× 的一半），取整 */
export function blockBlastStatusPortraitBarHeightPx(cellSize: number): number {
    return Math.max(28, Math.round(0.75 * cellSize));
}

/** 底栏命令条高度 = 与顶栏同高（承接顶栏减半腾出的空间） */
export function blockBlastCommandBarHeightPx(cellSize: number): number {
    return blockBlastStatusPortraitBarHeightPx(cellSize);
}

/** 竖屏：棋盘区域起始 Y = 顶栏高度 + 间距（供 GamePlayer 与布局公式共用） */
export function blockBlastPortraitGridTopPx(cellSize: number): number {
    return blockBlastStatusPortraitBarHeightPx(cellSize) + BLOCK_BLAST_PORTRAIT_STATUS_TO_GRID_GAP_PX;
}

/** 竖屏底部 chrome（预览→底栏间距 + 命令条） */
export function blockBlastPortraitBottomChromePx(cellSize: number): number {
    return (
        BLOCK_BLAST_PORTRAIT_PREVIEW_TO_COMMAND_GAP_PX +
        blockBlastCommandBarHeightPx(cellSize)
    );
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
    /** 兼容：仅 clear-bar 时的单目标 */
    targetScore?: number;
    /** HUD 双档目标 */
    targetScoreP75?: number;
    targetScoreP90?: number;
}

const BlockBlastStatusBar: React.FC<BlockBlastStatusBarProps> = ({
    gameState,
    dueTime,
    onMatchTimeout,
    targetScore,
    targetScoreP75,
    targetScoreP90,
}) => {
    const { t } = useTranslation('shared.casual');
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

    const [scorePulse, setScorePulse] = useState(false);
    const prevScoreRef = useRef(gameState.score);
    useEffect(() => {
        const prev = prevScoreRef.current;
        prevScoreRef.current = gameState.score;
        if (gameState.score > prev) {
            setScorePulse(false);
            const raf = window.requestAnimationFrame(() => setScorePulse(true));
            const tid = window.setTimeout(() => setScorePulse(false), 420);
            return () => {
                window.cancelAnimationFrame(raf);
                window.clearTimeout(tid);
            };
        }
        return undefined;
    }, [gameState.score]);

    const targetSlotRef = useRef<HTMLSpanElement>(null);
    const flyRef = useRef<HTMLDivElement>(null);
    const introPlayedForRef = useRef<string | null>(null);
    const [targetSettled, setTargetSettled] = useState(false);
    const [introVisible, setIntroVisible] = useState(false);

    const gameKey = gameState.gameId ?? '';
    const hasDual =
        typeof targetScoreP75 === 'number' &&
        Number.isFinite(targetScoreP75) &&
        typeof targetScoreP90 === 'number' &&
        Number.isFinite(targetScoreP90);
    const hasSingle =
        !hasDual && typeof targetScore === 'number' && Number.isFinite(targetScore);
    const hasTarget = hasDual || hasSingle;
    const introKey = hasDual
        ? `${gameKey}:p75=${targetScoreP75}:p90=${targetScoreP90}`
        : `${gameKey}:t=${targetScore}`;

    useEffect(() => {
        introPlayedForRef.current = null;
        setTargetSettled(false);
        setIntroVisible(false);
    }, [gameKey]);

    useLayoutEffect(() => {
        if (!hasTarget || !gameKey) return;
        if (introPlayedForRef.current === introKey) {
            setTargetSettled(true);
            setIntroVisible(false);
            return;
        }
        const slotEl = targetSlotRef.current;
        const flyEl = flyRef.current;
        if (!slotEl || !flyEl) return;

        setTargetSettled(false);
        setIntroVisible(true);

        let finished = false;
        const rootEl = flyEl.parentElement;
        const tl = playTargetGoalIntro({
            flyEl,
            slotEl,
            rootEl,
            onComplete: () => {
                finished = true;
                introPlayedForRef.current = introKey;
                setTargetSettled(true);
                setIntroVisible(false);
            },
        });

        return () => {
            tl.kill();
            gsap.killTweensOf(flyEl);
            if (!finished) {
                setIntroVisible(false);
            }
        };
    }, [hasTarget, gameKey, introKey]);

    return (
        <>
            <header
                className="blockblast-status blockblast-status--portrait"
                aria-label={t('hud.matchStatusAria')}
                style={{ minHeight: portraitBarHeightPx, height: portraitBarHeightPx }}
            >
                <div className="blockblast-status__portrait-row">
                    <div className="blockblast-status__target-slot">
                        {hasDual ? (
                            <CasualTargetStars
                                ref={targetSlotRef}
                                className={
                                    targetSettled
                                        ? 'blockblast-status__target-wrap--settled'
                                        : undefined
                                }
                                hudOpacity={targetSettled ? 1 : 0}
                                currentScore={gameState.score}
                                p75={targetScoreP75!}
                                p90={targetScoreP90!}
                                gameKey={gameKey}
                            />
                        ) : hasSingle ? (
                            <span
                                ref={targetSlotRef}
                                className={[
                                    'blockblast-status__target',
                                    targetSettled ? 'blockblast-status__target--settled' : '',
                                ]
                                    .filter(Boolean)
                                    .join(' ')}
                                aria-label={t('hud.targetScoreAria')}
                                style={{ opacity: targetSettled ? 1 : 0 }}
                            >
                                <span className="blockblast-status__target-label">
                                    {t('hud.target')}
                                </span>
                                <span className="blockblast-status__target-value">
                                    {targetScore}
                                </span>
                            </span>
                        ) : null}
                    </div>

                    <div className="blockblast-status__side blockblast-status__side--right">
                        {timerText != null ? (
                            <time
                                className="blockblast-status__timer"
                                aria-label={t('hud.remainingTimeAria')}
                            >
                                {timerText}
                            </time>
                        ) : null}
                        <span
                            className={[
                                'blockblast-status__score-main',
                                scorePulse ? 'blockblast-status__score-main--pulse' : '',
                            ]
                                .filter(Boolean)
                                .join(' ')}
                        >
                            {gameState.score}
                        </span>
                        <div className="blockblast-status__secondary">
                            <span>L{gameState.lines}</span>
                            <span aria-hidden> · </span>
                            <span>M{gameState.moves}</span>
                        </div>
                    </div>
                </div>
            </header>

            {hasTarget ? (
                <div
                    ref={flyRef}
                    className={[
                        'blockblast-target-intro',
                        hasDual ? 'blockblast-target-intro--dual' : '',
                    ]
                        .filter(Boolean)
                        .join(' ')}
                    aria-hidden={!introVisible}
                    style={{ visibility: introVisible ? 'visible' : 'hidden' }}
                >
                    <span className="blockblast-target-intro__label">{t('hud.targetIntro')}</span>
                    {hasDual ? (
                        <CasualTargetStarsIntroRows
                            p75={targetScoreP75!}
                            p90={targetScoreP90!}
                        />
                    ) : (
                        <span className="blockblast-target-intro__value">{targetScore}</span>
                    )}
                </div>
            ) : null}
        </>
    );
};

export default BlockBlastStatusBar;
