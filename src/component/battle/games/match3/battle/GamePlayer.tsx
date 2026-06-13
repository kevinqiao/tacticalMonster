import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { findValidMoves } from '@/convex/match3Arena/convex/service/Match3GameEngine';
import { playInvalidSwapRevert } from './animation/effects/invalidSwapAnim';
import {
  DEFAULT_MATCH3_BOARD_METRICS,
  measureMatch3Board,
  type Match3BoardMetrics,
} from './animation/boardMetrics';
import { cellKey } from './animation/match3TurnPlayback';
import {
  CANDY_COLORS,
  GameInteractionPhase,
  MATCH3_GRID_COLS,
  MATCH3_GRID_ROWS,
  Match3GameStatus,
} from './types/Match3Types';
import { useMatch3GameManager } from './service/GameManager';
import { useActHandler } from './service/handler/useActHandler';
import { CasualGameScoreReportOverlay } from '../../shared/CasualGameScoreReportOverlay';
import { CasualPostSettleSummaryOverlay } from '../../shared/CasualPostSettleSummaryOverlay';
import Match3WatchOverlay from './replay/Match3WatchOverlay';
import { ManualSettleConfirmOverlay } from '../../shared/ManualSettleConfirmOverlay';

const CANDY_EMOJI = ['🍎', '🍇', '🍋', '🍑', '🫐', '🍉'];
const DRAG_SWAP_THRESHOLD_RATIO = 14 / 44;

type DragSession = {
  r: number;
  c: number;
  x: number;
  y: number;
  pointerId: number;
};

type DragRevertHint = {
  offsetX: number;
  offsetY: number;
};

function fullSwapOffset(
  r1: number,
  c1: number,
  r2: number,
  c2: number,
  cellStepPx: number
): DragRevertHint {
  return {
    offsetX: (c2 - c1) * cellStepPx,
    offsetY: (r2 - r1) * cellStepPx,
  };
}
type DragVisual = {
  origin: { r: number; c: number };
  offsetX: number;
  offsetY: number;
  target: { r: number; c: number } | null;
};

function computeDragDelta(
  session: DragSession,
  clientX: number,
  clientY: number,
  cellStepPx: number
) {
  const rawDx = clientX - session.x;
  const rawDy = clientY - session.y;
  const dragSwapThresholdPx = cellStepPx * DRAG_SWAP_THRESHOLD_RATIO;

  if (Math.abs(rawDx) < 4 && Math.abs(rawDy) < 4) {
    return { offsetX: 0, offsetY: 0, target: null as { r: number; c: number } | null };
  }

  const horizontal = Math.abs(rawDx) >= Math.abs(rawDy);
  if (horizontal) {
    const offsetX = Math.max(-cellStepPx, Math.min(cellStepPx, rawDx));
    let target: { r: number; c: number } | null = null;
    if (Math.abs(offsetX) >= dragSwapThresholdPx) {
      const tc = session.c + (offsetX > 0 ? 1 : -1);
      if (tc >= 0 && tc < MATCH3_GRID_COLS) {
        target = { r: session.r, c: tc };
      }
    }
    return { offsetX, offsetY: 0, target };
  }

  const offsetY = Math.max(-cellStepPx, Math.min(cellStepPx, rawDy));
  let target: { r: number; c: number } | null = null;
  if (Math.abs(offsetY) >= dragSwapThresholdPx) {
    const tr = session.r + (offsetY > 0 ? 1 : -1);
    if (tr >= 0 && tr < MATCH3_GRID_ROWS) {
      target = { r: tr, c: session.c };
    }
  }
  return { offsetX: 0, offsetY, target };
}

const Match3Player: React.FC = () => {
  const {
    gameState,
    gridCellRefs,
    boardMetricsRef,
    loadError,
    interactionPhase,
    setInteractionPhase,
    settleManuallyAndExit,
    settleConfirmOpen,
    cancelSettleConfirm,
    confirmSettleAndExit,
    postCasualScoreReportOpen,
    postCasualScoreReport,
    dismissPostCasualScoreReport,
    postCasualSummaryOpen,
    postCasualTableSummary,
    dismissPostCasualSummary,
    watchTarget,
    watchTargetLabel,
    openWatch,
    closeWatch,
    openSelfReplay,
  } = useMatch3GameManager();
  const { trySwap } = useActHandler({
    onSwapCommitted: () => setDragVisual(null),
  });
  const [selected, setSelected] = useState<{ r: number; c: number } | null>(null);
  const [dragVisual, setDragVisual] = useState<DragVisual | null>(null);
  const [boardMetrics, setBoardMetrics] = useState<Match3BoardMetrics>(
    DEFAULT_MATCH3_BOARD_METRICS
  );
  const dragSessionRef = useRef<DragSession | null>(null);
  const suppressClickRef = useRef(false);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const cellStepPx = boardMetrics.cellStepPx;

  useLayoutEffect(() => {
    const board = boardRef.current;
    const outer = containerRef.current;
    if (!board) return;

    const runMeasure = () => {
      const metrics = measureMatch3Board(board, MATCH3_GRID_ROWS, MATCH3_GRID_COLS);
      boardMetricsRef.current = metrics;
      setBoardMetrics(metrics);
    };

    runMeasure();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        runMeasure();
        requestAnimationFrame(runMeasure);
      });
    });

    let cancelled = false;
    const lateId = window.setTimeout(() => {
      if (!cancelled) runMeasure();
    }, 80);

    if (typeof document !== 'undefined' && document.fonts?.ready) {
      void document.fonts.ready.then(() => {
        if (!cancelled) runMeasure();
      });
    }

    const ro = new ResizeObserver(() => {
      runMeasure();
    });
    ro.observe(board);
    if (outer) ro.observe(outer);

    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    const onVv = () => {
      if (!cancelled) runMeasure();
    };
    if (vv) {
      vv.addEventListener('resize', onVv);
      vv.addEventListener('scroll', onVv);
    }

    return () => {
      cancelled = true;
      window.clearTimeout(lateId);
      if (vv) {
        vv.removeEventListener('resize', onVv);
        vv.removeEventListener('scroll', onVv);
      }
      ro.disconnect();
    };
  }, [boardMetricsRef, gameState?.gameId]);

  const canPlay =
    gameState != null && Number(gameState.status) === Match3GameStatus.PLAYING;
  const canStartInteraction =
    canPlay && interactionPhase === GameInteractionPhase.idle;

  const validMoveHints = useMemo(() => {
    if (!gameState?.grid) return new Set<string>();
    const moves = findValidMoves(gameState.grid);
    const keys = new Set<string>();
    for (const m of moves) {
      keys.add(`${m.r1},${m.c1}`);
      keys.add(`${m.r2},${m.c2}`);
    }
    return keys;
  }, [gameState?.grid]);

  const dueRemainingSec = useMemo(() => {
    if (!gameState?.dueTime) return null;
    return Math.max(0, Math.ceil((gameState.dueTime - Date.now()) / 1000));
  }, [gameState?.dueTime, gameState?.score]);

  const runSwap = useCallback(
    (r1: number, c1: number, r2: number, c2: number, dragHint?: DragRevertHint) => {
      const revertStart =
        dragHint ?? fullSwapOffset(r1, c1, r2, c2, cellStepPx);

      void trySwap(r1, c1, r2, c2).then(async (outcome) => {
        if (outcome === 'invalid') {
          setInteractionPhase(GameInteractionPhase.animating);
          flushSync(() => setDragVisual(null));
          const refs = gridCellRefs.current;
          if (refs) {
            await playInvalidSwapRevert({
              r1,
              c1,
              r2,
              c2,
              refs,
              startOffsetX: revertStart.offsetX,
              startOffsetY: revertStart.offsetY,
            });
          }
          setInteractionPhase(GameInteractionPhase.idle);
          return;
        }
      });
    },
    [trySwap, setInteractionPhase, gridCellRefs, cellStepPx]
  );

  const dragOffsetX = dragVisual?.offsetX ?? 0;
  const dragOffsetY = dragVisual?.offsetY ?? 0;

  const setCellRef = (r: number, c: number, el: HTMLDivElement | null) => {
    const matrix = gridCellRefs.current;
    if (!matrix?.[r]) return;
    matrix[r][c] = el;
  };

  const cellDragStyle = (r: number, c: number): React.CSSProperties => {
    if (!dragVisual) return {};
    const { origin, offsetX, offsetY, target } = dragVisual;
    if (origin.r === r && origin.c === c) {
      return {
        transform: `translate(${offsetX}px, ${offsetY}px) scale(1.1)`,
        zIndex: 3,
      };
    }
    if (target && target.r === r && target.c === c) {
      return {
        transform: `translate(${-offsetX}px, ${-offsetY}px) scale(1.05)`,
        zIndex: 2,
      };
    }
    return {};
  };

  const onCellPointerDown = useCallback(
    (r: number, c: number, e: React.PointerEvent<HTMLDivElement>) => {
      if (!canStartInteraction) return;
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      dragSessionRef.current = { r, c, x: e.clientX, y: e.clientY, pointerId: e.pointerId };
      setDragVisual({ origin: { r, c }, offsetX: 0, offsetY: 0, target: null });
      setSelected({ r, c });
      setInteractionPhase(GameInteractionPhase.pointerDrag);
    },
    [canStartInteraction, setInteractionPhase]
  );

  const onCellPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const session = dragSessionRef.current;
    if (!session || session.pointerId !== e.pointerId) return;
    const { offsetX, offsetY, target } = computeDragDelta(session, e.clientX, e.clientY, cellStepPx);
    setDragVisual({
      origin: { r: session.r, c: session.c },
      offsetX,
      offsetY,
      target,
    });
  }, [cellStepPx]);

  const finishDrag = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const session = dragSessionRef.current;
      if (!session || session.pointerId !== e.pointerId) return;

      dragSessionRef.current = null;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }

      if (!canPlay) {
        setDragVisual(null);
        setInteractionPhase(GameInteractionPhase.idle);
        return;
      }

      const { offsetX, offsetY, target } = computeDragDelta(
        session,
        e.clientX,
        e.clientY,
        cellStepPx
      );
      if (!target) {
        setDragVisual(null);
        setInteractionPhase(GameInteractionPhase.idle);
        setSelected({ r: session.r, c: session.c });
        return;
      }

      suppressClickRef.current = true;
      runSwap(session.r, session.c, target.r, target.c, { offsetX, offsetY });
      setSelected(null);
    },
    [canPlay, cellStepPx, runSwap, setInteractionPhase]
  );

  const onCellPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      finishDrag(e);
    },
    [finishDrag]
  );

  const onCellPointerCancel = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const session = dragSessionRef.current;
      if (!session || session.pointerId !== e.pointerId) return;
      dragSessionRef.current = null;
      setDragVisual(null);
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      setInteractionPhase(GameInteractionPhase.idle);
      setSelected(null);
    },
    [setInteractionPhase]
  );

  const onCellClick = useCallback(
    (r: number, c: number) => {
      if (suppressClickRef.current) {
        suppressClickRef.current = false;
        return;
      }
      if (!canStartInteraction) return;
      if (!selected) {
        setSelected({ r, c });
        return;
      }
      if (selected.r === r && selected.c === c) {
        setSelected(null);
        return;
      }
      const dr = Math.abs(selected.r - r);
      const dc = Math.abs(selected.c - c);
      if (dr + dc === 1) {
        runSwap(selected.r, selected.c, r, c);
        setSelected(null);
        return;
      }
      setSelected({ r, c });
    },
    [canStartInteraction, runSwap, selected]
  );

  if (loadError) {
    return (
      <div className="match3-game-container">
        <p>加载失败：{loadError}</p>
        <p className="match3-hint">请确认 match3Arena convex dev 在运行，且 casual 桥接已配置。</p>
      </div>
    );
  }

  if (!gameState) {
    return <div className="match3-game-container">Loading Match-3…</div>;
  }

  return (
    <div className="match3-game-container" ref={containerRef}>
      <header className="match3-header">
        <div className="match3-score">Score: {gameState.score}</div>
        {dueRemainingSec != null && <div className="match3-timer">{dueRemainingSec}s</div>}
        <div className="match3-actions">
          <button
            type="button"
            className="match3-btn"
            disabled={interactionPhase !== GameInteractionPhase.idle}
            onClick={() => void settleManuallyAndExit()}
          >
            End
          </button>
        </div>
      </header>
      <p className="match3-hint">向相邻方向滑动交换；或点选两颗相邻糖果。须形成 3 连才会消除。</p>

      <div className="match3-board-wrap">
        <div
          ref={boardRef}
          className={`match3-board${dragVisual ? ' match3-board--dragging' : ''}`}
          style={{
            gridTemplateColumns: `repeat(${MATCH3_GRID_COLS}, 1fr)`,
            gridTemplateRows: `repeat(${MATCH3_GRID_ROWS}, 1fr)`,
            ['--match3-cell-size' as string]: `${boardMetrics.cellSizePx}px`,
            ['--match3-cell-gap' as string]: `${boardMetrics.cellGapPx}px`,
          }}
        >
          {gameState.grid.flatMap((row, r) =>
            row.map((cell, c) => {
              const key = cellKey(r, c);
              const isEmpty = cell.asset < 0;
              const isSelected = !dragVisual && selected?.r === r && selected?.c === c;
              const isHint = !dragVisual && validMoveHints.has(key);
              const isDragOrigin = dragVisual?.origin.r === r && dragVisual.origin.c === c;
              const isSwapTarget = dragVisual?.target?.r === r && dragVisual?.target?.c === c;
              const color = isEmpty
                ? 'transparent'
                : CANDY_COLORS[cell.asset % CANDY_COLORS.length];
              return (
                <div
                  key={key}
                  ref={(el) => setCellRef(r, c, el)}
                  data-match3-cell
                  data-row={r}
                  data-col={c}
                  className={`match3-cell${isEmpty ? ' match3-cell--empty' : ''}${isSelected ? ' match3-cell--selected' : ''}${isHint ? ' match3-cell--hint' : ''}${isDragOrigin ? ' match3-cell--dragging' : ''}${isSwapTarget ? ' match3-cell--swap-target' : ''}`}
                  style={{ background: color, ...cellDragStyle(r, c) }}
                  onPointerDown={(e) => onCellPointerDown(r, c, e)}
                  onPointerMove={onCellPointerMove}
                  onPointerUp={onCellPointerUp}
                  onPointerCancel={onCellPointerCancel}
                  onClick={() => onCellClick(r, c)}
                >
                  {!isEmpty && CANDY_EMOJI[cell.asset % CANDY_EMOJI.length]}
                </div>
              );
            })
          )}
        </div>
      </div>

      <ManualSettleConfirmOverlay
        open={settleConfirmOpen}
        message="结束本局并按当前分数结算？"
        onCancel={cancelSettleConfirm}
        onConfirm={() => void confirmSettleAndExit()}
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
        summary={postCasualTableSummary}
        onDismiss={dismissPostCasualSummary}
        onWatchRow={openWatch}
      />
      <Match3WatchOverlay
        open={watchTarget != null}
        watchContext={watchTarget}
        displayLabel={watchTargetLabel}
        onClose={closeWatch}
      />
    </div>
  );
};

export default Match3Player;
