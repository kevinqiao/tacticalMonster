/**
 * Block Blast 主界面（对齐 solitaireSolo：测量 board、终局自动进入休闲结算弹窗）
 */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { registerCasualGameModalExitHandler } from '../../shared/casualGameModalExitBridge';
import { useBlockBlastGameManager } from './service/GameManager';
import {
    BLOCK_BLAST_DEFAULT_GRID_SIZE,
    BoardDimension,
    inferGridSizeFromGrid,
} from './types/BlockBlastTypes';
import { useGameVisualTheme } from '../../shared/visualTheme/useGameVisualTheme';
import { CasualGameScoreReportOverlay } from '../../shared/CasualGameScoreReportOverlay';
import { CasualPostSettleSummaryOverlay } from '../../shared/CasualPostSettleSummaryOverlay';
import {
    isCasualSoloChallengeFinalScoreReport,
    resolveCasualPostSettleReplayPresentation,
    resolveCasualScoreReportSecondaryAction,
} from '../../shared/casualGameScoreReportUI';
import {
    MANUAL_SETTLE_DEFAULT_MESSAGE_BLOCK_BLAST,
    ManualSettleConfirmOverlay,
} from '../../shared/ManualSettleConfirmOverlay';
import BlockBlastStatusBar, {
    blockBlastPortraitGridTopPx,
} from './view/BlockBlastStatusBar';
import GridView from './view/GridView';
import ShapePreview from './view/ShapePreview';
import BlockBlastWatchOverlay from './replay/BlockBlastWatchOverlay';
import type { CasualWatchContext } from '../../shared/casualAsyncTableSummaryUI';

/** 棋盘深色底框内沿与格子网之间的留白（尽量小以放大格子） */
const GRID_PADDING = 4;
/** Gap between grid row and preview row. */
const SECTION_GAP = 24;
const MIN_CELL_PX = 18;
/** 预览高度相对棋盘外框（目标区）高度的比例 */
const PREVIEW_SIZE_OF_GRID = 2 / 5;

const BlockBlastPlayer: React.FC<{ onGameLoadComplete?: () => void }> = ({ onGameLoadComplete }) => {
    const visualTheme = useGameVisualTheme('block_blast');
    const containerRef = useRef<HTMLDivElement>(null);
    const {
        gameState,
        updateBoardDimension,
        settleManuallyAndExit,
        completeCasualRunOnTimeout,
        settleConfirmOpen,
        cancelSettleConfirm,
        confirmSettleAndExit,
        finishManualSettleSuccess,
        postCasualScoreReportOpen,
        postCasualScoreReport,
        dismissPostCasualScoreReport,
        postCasualSummaryOpen,
        postCasualTableSummary,
        postCasualWeeklyLeagueSettle,
        postCasualWaitingForPeers,
        postCasualCanReplay,
        postCasualReplayOffered,
        postCasualReplayMode,
        postCasualReplayWindowEndsAt,
        postCasualAdReplayDailyRemaining,
        postCasualAdReplayDailyCap,
        casualReplayBusy,
        replayCasualRun,
        dismissPostCasualSummary,
        casualTournamentId,
        replayMode,
        targetScore,
    } = useBlockBlastGameManager();

    const [watchTarget, setWatchTarget] = useState<CasualWatchContext | null>(null);
    const [watchTargetLabel, setWatchTargetLabel] = useState('');
    const openWatch = useCallback((ctx: CasualWatchContext, displayLabel: string) => {
        setWatchTarget(ctx);
        setWatchTargetLabel(displayLabel);
    }, []);
    const closeWatch = useCallback(() => {
        setWatchTarget(null);
        setWatchTargetLabel('');
    }, []);
    const scoreReportActions = useMemo(
        () =>
            resolveCasualScoreReportSecondaryAction({
                templateId: casualTournamentId,
                replayOffered: postCasualReplayOffered,
                canReplay: postCasualCanReplay,
                replayMode: postCasualReplayMode,
                challengeSuccess: postCasualScoreReport?.challenge?.success,
                adReplayDailyRemaining: postCasualAdReplayDailyRemaining,
                adReplayDailyCap: postCasualAdReplayDailyCap,
            }),
        [
            casualTournamentId,
            postCasualReplayOffered,
            postCasualCanReplay,
            postCasualReplayMode,
            postCasualScoreReport?.challenge?.success,
            postCasualAdReplayDailyRemaining,
            postCasualAdReplayDailyCap,
        ]
    );
    const showPostSettleSummary =
        postCasualSummaryOpen && !isCasualSoloChallengeFinalScoreReport(casualTournamentId);
    const postSettleReplay = useMemo(
        () =>
            resolveCasualPostSettleReplayPresentation({
                replayOffered: postCasualReplayOffered,
                canReplay: postCasualCanReplay,
                replayMode: postCasualReplayMode,
                adReplayDailyRemaining: postCasualAdReplayDailyRemaining,
                adReplayDailyCap: postCasualAdReplayDailyCap,
                replayWindowEndsAt: postCasualReplayWindowEndsAt,
            }),
        [
            postCasualReplayOffered,
            postCasualCanReplay,
            postCasualReplayMode,
            postCasualAdReplayDailyRemaining,
            postCasualAdReplayDailyCap,
            postCasualReplayWindowEndsAt,
        ]
    );

    useEffect(() => {
        if (replayMode) return;
        registerCasualGameModalExitHandler(() => {
            void settleManuallyAndExit();
        });
        return () => registerCasualGameModalExitHandler(null);
    }, [replayMode, settleManuallyAndExit]);

    const gridDimension =
        gameState != null
            ? gameState.gridSize ?? inferGridSizeFromGrid(gameState.grid)
            : BLOCK_BLAST_DEFAULT_GRID_SIZE;

    const calculateBoardDimension = useCallback((): BoardDimension | null => {
        const n = gridDimension;
        const gapCount = Math.max(0, n - 1);
        if (!containerRef.current) {
            return {
                left: 0,
                top: 0,
                width: 480,
                height: 800,
                gridDimension: n,
                cellSize: 40,
                spacing: 2,
                gridPadding: GRID_PADDING,
                grid: {
                    x: 40,
                    y: 72,
                    width: 400,
                    height: 400,
                },
                shapePreview: {
                    x: 40,
                    y: 496,
                    width: 400,
                    height: 160,
                },
            };
        }

        const rect = containerRef.current.getBoundingClientRect();
        const containerWidth = rect.width;
        const containerHeight = rect.height;
        const spacing = 2;

        const hPad = 16;
        const bottomPad = 12;
        /** 抵消 round(预览高)、预览边框/安全区等，避免总高度超出容器触发页面滚动 */
        const PORTRAIT_VERTICAL_SLACK_PX = 8;
        const maxBlockW = containerWidth - hPad * 2;
        const innerPad = 2 * GRID_PADDING;
        const gutter = gapCount * spacing;

        /** 顶栏高度随 cellSize 变化，与 GamePlayer 用同一公式迭代到不动点 */
        let cellSize = 32;
        for (let iter = 0; iter < 24; iter++) {
            const gridTopCand = blockBlastPortraitGridTopPx(cellSize);
            const verticalBudget =
                containerHeight - gridTopCand - SECTION_GAP - bottomPad - PORTRAIT_VERTICAL_SLACK_PX;
            const maxGridBoxH = verticalBudget / (1 + PREVIEW_SIZE_OF_GRID);
            const cellFromW = (maxBlockW - innerPad - gutter) / n;
            const cellFromH = (maxGridBoxH - innerPad - gutter) / n;
            const next = Math.max(MIN_CELL_PX, Math.floor(Math.min(cellFromW, cellFromH)));
            if (next === cellSize) break;
            cellSize = next;
        }

        const computeBoxes = (cs: number) => {
            const gw = cs * n + gutter;
            const gh = cs * n + gutter;
            const boxW = gw + innerPad;
            const boxH = gh + innerPad;
            const previewH = Math.max(1, Math.round(boxH * PREVIEW_SIZE_OF_GRID));
            return { gridBoxW: boxW, gridBoxH: boxH, previewH };
        };

        let { gridBoxW, gridBoxH, previewH } = computeBoxes(cellSize);

        while (cellSize > 12) {
            const gt = blockBlastPortraitGridTopPx(cellSize);
            if (
                gt + gridBoxH + SECTION_GAP + previewH + bottomPad <=
                containerHeight - PORTRAIT_VERTICAL_SLACK_PX
            ) {
                break;
            }
            cellSize -= 1;
            ({ gridBoxW, gridBoxH, previewH } = computeBoxes(cellSize));
        }

        const gridTopResolved = blockBlastPortraitGridTopPx(cellSize);
        const gridX = (containerWidth - gridBoxW) / 2;
        const gridY = gridTopResolved;
        const previewY = gridTopResolved + gridBoxH + SECTION_GAP;

        return {
            left: rect.left,
            top: rect.top,
            width: containerWidth,
            height: containerHeight,
            gridDimension: n,
            cellSize,
            spacing,
            gridPadding: GRID_PADDING,
            grid: {
                x: gridX,
                y: gridY,
                width: gridBoxW,
                height: gridBoxH,
            },
            shapePreview: {
                x: gridX,
                y: previewY,
                width: gridBoxW,
                height: previewH,
            },
        };
    }, [gridDimension]);

    useLayoutEffect(() => {
        let cancelled = false;
        let rafOuter = 0;
        let rafInner = 0;

        const measureAndPublish = () => {
            if (cancelled) return;
            const el = containerRef.current;
            if (!el) return;
            const r = el.getBoundingClientRect();
            if (r.width < 2 || r.height < 2) {
                return;
            }
            const d = calculateBoardDimension();
            if (d) updateBoardDimension(d);
        };

        /** 父级 flex / 100% 链在首帧后常再稳定一帧；双 rAF 补测可修正首帧尺寸未稳定导致的布局偏差 */
        const schedulePostLayoutRemeasure = () => {
            cancelAnimationFrame(rafOuter);
            cancelAnimationFrame(rafInner);
            rafOuter = requestAnimationFrame(() => {
                rafInner = requestAnimationFrame(() => {
                    if (!cancelled) measureAndPublish();
                });
            });
        };

        const run = () => {
            measureAndPublish();
            schedulePostLayoutRemeasure();
        };

        run();
        const ro =
            typeof ResizeObserver !== 'undefined' && containerRef.current
                ? new ResizeObserver(() => run())
                : null;
        if (ro && containerRef.current) ro.observe(containerRef.current);
        window.addEventListener('resize', run);
        const vv = typeof window !== 'undefined' ? window.visualViewport : null;
        const onVv = () => run();
        vv?.addEventListener('resize', onVv);
        vv?.addEventListener('scroll', onVv);
        const onVisibility = () => {
            if (document.visibilityState === 'visible') run();
        };
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            cancelled = true;
            cancelAnimationFrame(rafOuter);
            cancelAnimationFrame(rafInner);
            ro?.disconnect();
            window.removeEventListener('resize', run);
            vv?.removeEventListener('resize', onVv);
            vv?.removeEventListener('scroll', onVv);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [calculateBoardDimension, updateBoardDimension, gameState?.gameId, gridDimension]);

    if (!gameState) {
        return (
            <div
                ref={containerRef}
                className="blockblast-player-container blockblast-player-container--boot"
            >
                <div className="blockblast-loading">
                    <div>Loading...</div>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="blockblast-player-container"
            data-game-visual-key={visualTheme.visualKey}
            style={{
                width: '100%',
                height: '100%',
                position: 'absolute',
                left: 0,
                top: 0,
            }}
        >
            <BlockBlastStatusBar
                gameState={gameState}
                dueTime={replayMode ? undefined : gameState.dueTime}
                targetScore={replayMode ? undefined : targetScore}
                onMatchTimeout={
                    replayMode
                        ? undefined
                        : () => {
                              void completeCasualRunOnTimeout();
                          }
                }
            />
            <GridView />
            <ShapePreview />
            {!replayMode && (
                <>
                    <ManualSettleConfirmOverlay
                        open={settleConfirmOpen}
                        defaultMessage={MANUAL_SETTLE_DEFAULT_MESSAGE_BLOCK_BLAST}
                        onCancel={cancelSettleConfirm}
                        onConfirm={confirmSettleAndExit}
                        onSuccessClose={finishManualSettleSuccess}
                    />
                    <CasualGameScoreReportOverlay
                        open={postCasualScoreReportOpen && watchTarget == null}
                        report={postCasualScoreReport}
                        onConfirm={dismissPostCasualScoreReport}
                        secondaryLabel={
                            scoreReportActions.showReplaySecondary
                                ? scoreReportActions.secondaryLabel
                                : undefined
                        }
                        onSecondary={
                            scoreReportActions.showReplaySecondary
                                ? () => void replayCasualRun()
                                : undefined
                        }
                        secondaryDisabled={
                            scoreReportActions.showReplaySecondary && !postCasualCanReplay
                        }
                        secondaryBusy={casualReplayBusy}
                        adReplayDailyRemaining={
                            scoreReportActions.showReplaySecondary
                                ? scoreReportActions.adReplayDailyRemaining
                                : undefined
                        }
                        adReplayDailyCap={
                            scoreReportActions.showReplaySecondary
                                ? scoreReportActions.adReplayDailyCap
                                : undefined
                        }
                        replayWindowEndsAt={
                            scoreReportActions.showReplaySecondary
                                ? postCasualReplayWindowEndsAt
                                : undefined
                        }
                    />
                    <CasualPostSettleSummaryOverlay
                        open={showPostSettleSummary && watchTarget == null}
                        title="同桌成绩"
                        summary={postCasualTableSummary}
                        waitingForPeers={postCasualWaitingForPeers}
                        replayAvailable={postSettleReplay.showReplay}
                        replayMode={postCasualReplayMode}
                        adReplayDailyRemaining={postSettleReplay.adReplayDailyRemaining}
                        adReplayDailyCap={postSettleReplay.adReplayDailyCap}
                        replayBusy={casualReplayBusy}
                        replayWindowEndsAt={postCasualReplayWindowEndsAt}
                        onReplay={postSettleReplay.showReplay ? () => void replayCasualRun() : undefined}
                        replayLabel={postSettleReplay.replayLabel}
                        onDismiss={dismissPostCasualSummary}
                        weeklyLeagueSettle={postCasualWeeklyLeagueSettle}
                    />
                    <BlockBlastWatchOverlay
                        open={watchTarget != null}
                        watchContext={watchTarget}
                        displayLabel={watchTargetLabel}
                        onClose={closeWatch}
                    />
                </>
            )}
        </div>
    );
};

export default BlockBlastPlayer;
