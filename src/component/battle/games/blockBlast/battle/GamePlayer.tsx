/**
 * Block Blast 主界面（对齐 solitaireSolo：测量 board、终局自动进入休闲结算弹窗）
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
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
    MANUAL_SETTLE_DEFAULT_MESSAGE_BLOCK_BLAST,
    ManualSettleConfirmOverlay,
} from '../../shared/ManualSettleConfirmOverlay';
import BlockBlastStatusBar, {
    blockBlastPortraitGridTopPx,
    blockBlastStatusLandscapeRailPx,
} from './view/BlockBlastStatusBar';
import GridView from './view/GridView';
import ShapePreview from './view/ShapePreview';
import BlockBlastWatchOverlay from './replay/BlockBlastWatchOverlay';
import type { CasualWatchContext } from '../../shared/casualAsyncTableSummaryUI';

/** 棋盘深色底框内沿与格子网之间的留白（尽量小以放大格子） */
const GRID_PADDING = 4;
/** Gap between grid column and preview column (landscape), or grid row and preview row (portrait). */
const SECTION_GAP = 24;
const MIN_CELL_PX = 18;
/** 预览相对棋盘外框（目标区）：竖屏为预览高度比、横屏为预览宽度比 */
const PREVIEW_SIZE_OF_GRID = 2 / 5;

/**
 * 横屏：棋盘相对容器上、下各留的边距（单边像素）。
 * 数值越大 → 可用垂直空间越小 → 棋盘能达到的最大高度越低。
 */
const LANDSCAPE_GRID_VERTICAL_MARGIN_PX = 8;

/**
 * 横屏：棋盘外框（含 `GRID_PADDING` 的整块目标区）最大允许高度（像素）。
 * - `undefined`：不设上限，仅用 `容器高度 − 2 × LANDSCAPE_GRID_VERTICAL_MARGIN_PX`。
 */
const LANDSCAPE_GRID_MAX_BOX_HEIGHT_PX: number | undefined = undefined;
const BlockBlastPlayer: React.FC<{ onGameLoadComplete?: () => void }> = ({ onGameLoadComplete }) => {
    const visualTheme = useGameVisualTheme('block_blast');
    const containerRef = useRef<HTMLDivElement>(null);
    const [isPortrait, setIsPortrait] = useState(
        () => typeof window !== 'undefined' && window.innerHeight >= window.innerWidth
    );
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
        postCasualReplayWindowEndsAt,
        casualReplayBusy,
        replayCasualRun,
        dismissPostCasualSummary,
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
    const openSelfReplay = useCallback(() => {
        const gid = gameState?.gameId;
        if (!gid) return;
        openWatch({ kind: 'recorded', gameId: gid }, '你');
    }, [gameState?.gameId, openWatch]);

    const postCasualReplayDisabled = postCasualReplayOffered && !postCasualCanReplay;

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
                width: 800,
                height: 600,
                gridDimension: n,
                cellSize: 40,
                spacing: 2,
                gridPadding: GRID_PADDING,
                grid: {
                    x: 50,
                    y: 50,
                    width: 400,
                    height: 400,
                },
                shapePreview: {
                    x: 474,
                    y: 50,
                    width: 200,
                    height: 400,
                },
            };
        }

        const rect = containerRef.current.getBoundingClientRect();
        const containerWidth = rect.width;
        const containerHeight = rect.height;
        const isPortrait = containerHeight >= containerWidth;
        const spacing = 2;

        if (isPortrait) {
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
        }

        let maxInnerH = Math.max(
            120,
            containerHeight - LANDSCAPE_GRID_VERTICAL_MARGIN_PX * 2
        );
        if (LANDSCAPE_GRID_MAX_BOX_HEIGHT_PX !== undefined) {
            maxInnerH = Math.min(maxInnerH, LANDSCAPE_GRID_MAX_BOX_HEIGHT_PX);
        }

        const innerPad = 2 * GRID_PADDING;
        const gutter = gapCount * spacing;

        const gridBoxFromCellSize = (cs: number) => {
            const side = cs * n + gutter;
            const box = side + innerPad;
            return { gridBoxW: box, gridBoxH: box };
        };

        /** 侧栏宽度 = 1.5×cellSize，与 contentW 耦合，迭代至稳定 */
        let rail = blockBlastStatusLandscapeRailPx(MIN_CELL_PX);
        let cellSize = MIN_CELL_PX;
        let gridBoxW = 0;
        let gridBoxH = 0;
        let previewWidth = 0;

        for (let iter = 0; iter < 20; iter++) {
            const contentW = containerWidth - rail;
            if (contentW < 80) break;

            cellSize = Math.floor((maxInnerH - innerPad - gutter) / n);
            cellSize = Math.max(MIN_CELL_PX, cellSize);

            ({ gridBoxW, gridBoxH } = gridBoxFromCellSize(cellSize));
            previewWidth = Math.round(gridBoxW * PREVIEW_SIZE_OF_GRID);

            while (gridBoxW + SECTION_GAP + previewWidth > contentW && cellSize > 12) {
                cellSize -= 1;
                ({ gridBoxW, gridBoxH } = gridBoxFromCellSize(cellSize));
                previewWidth = Math.round(gridBoxW * PREVIEW_SIZE_OF_GRID);
            }

            const nextRail = blockBlastStatusLandscapeRailPx(cellSize);
            if (nextRail === rail) break;
            rail = nextRail;
        }

        const contentW = containerWidth - rail;
        const clusterW = gridBoxW + SECTION_GAP + previewWidth;
        const startX = rail + Math.max(0, (contentW - clusterW) / 2);
        const gridY = (containerHeight - gridBoxH) / 2;
        const gridX = startX;
        const previewX = startX + gridBoxW + SECTION_GAP;

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
                x: previewX,
                y: gridY,
                width: previewWidth,
                height: gridBoxH,
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
            setIsPortrait(r.height >= r.width);
            const d = calculateBoardDimension();
            if (d) updateBoardDimension(d);
        };

        /** 父级 flex / 100% 链在首帧后常再稳定一帧；双 rAF 补测可修正横屏 gridY 初次不垂直居中 */
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
        return () => {
            cancelled = true;
            cancelAnimationFrame(rafOuter);
            cancelAnimationFrame(rafInner);
            ro?.disconnect();
            window.removeEventListener('resize', run);
            vv?.removeEventListener('resize', onVv);
            vv?.removeEventListener('scroll', onVv);
        };
    }, [calculateBoardDimension, updateBoardDimension, gameState?.gameId, gridDimension]);

    if (!gameState) {
        return (
            <div
                ref={containerRef}
                className="blockblast-player-container blockblast-player-container--boot"
            >
                <div className="blockblast-loading">
                    <div>Loading game…</div>
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
                isPortrait={isPortrait}
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
                        secondaryLabel="复盘本局"
                        onSecondary={openSelfReplay}
                    />
                    <CasualPostSettleSummaryOverlay
                        open={postCasualSummaryOpen && watchTarget == null}
                        title="同桌成绩"
                        summary={postCasualTableSummary}
                        waitingForPeers={postCasualWaitingForPeers}
                        replayAvailable={postCasualReplayOffered}
                        replayDisabled={postCasualReplayDisabled}
                        replayBusy={casualReplayBusy}
                        replayWindowEndsAt={postCasualReplayWindowEndsAt}
                        onReplay={postCasualCanReplay ? () => void replayCasualRun() : undefined}
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
