import { useConvex } from 'convex/react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { api } from '@/convex/match3Arena/convex/_generated/api';
import type { Match3RecordedStep } from '@/convex/match3Arena/convex/service/seedPool/match3RecordedOpTypes';
import { simulateRollout } from '@/convex/match3Arena/convex/service/seedPool/match3SeedSimulator';
import { Match3GameEngine } from '@/convex/match3Arena/convex/service/Match3GameEngine';

import type { Match3WatchContext } from '../../../shared/casualAsyncTableSummaryUI';
import {
  DEFAULT_MATCH3_BOARD_METRICS,
  type Match3BoardMetrics,
} from '../animation/boardMetrics';
import { allocateGridCellRefs, type GridCellRefs } from '../animation/gridCellRefs';
import {
  createWatchReplayState,
  estimateStepIndexForBotProgress,
  type Match3WatchStepSource,
} from '../replay/match3WatchReplay';
import { useMatch3WatchReplayer } from '../replay/useMatch3WatchReplayer';
import {
  GameInteractionPhase,
  Match3GameStatus,
  type Match3GameState,
} from '../types/Match3Types';
import Match3BoardView from '../view/Match3BoardView';

type Props = {
  open: boolean;
  watchContext: Match3WatchContext | null;
  displayLabel: string;
  onClose: () => void;
};

export const Match3WatchOverlay: React.FC<Props> = ({
  open,
  watchContext,
  displayLabel,
  onClose,
}) => {
  const convex = useConvex();
  const gridCellRefs = useRef<GridCellRefs | null>(null);
  if (!gridCellRefs.current) {
    gridCellRefs.current = allocateGridCellRefs();
  }
  const boardMetricsRef = useRef<Match3BoardMetrics>(DEFAULT_MATCH3_BOARD_METRICS);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [recordedSteps, setRecordedSteps] = useState<Match3RecordedStep[]>([]);
  const [recordedSeedId, setRecordedSeedId] = useState('');
  const [gameState, setGameState] = useState<Match3GameState | null>(null);
  const [interactionPhase, setInteractionPhase] = useState(GameInteractionPhase.idle);
  const [initialStepIndex, setInitialStepIndex] = useState(0);

  const stepSource: Match3WatchStepSource | null = useMemo(() => {
    if (!watchContext) return null;
    if (watchContext.kind === 'rollout') {
      return {
        kind: 'rollout',
        seedId: watchContext.seedId,
        rolloutIndex: watchContext.rolloutIndex,
      };
    }
    if (!recordedSeedId) return null;
    return {
      kind: 'recorded',
      seedId: recordedSeedId,
      steps: recordedSteps,
    };
  }, [watchContext, recordedSeedId, recordedSteps]);

  useEffect(() => {
    if (!open || !watchContext) return;
    setLoadError(null);
    setRecordedSteps([]);
    setRecordedSeedId('');
    setInitialStepIndex(0);
    setLoading(false);

    if (watchContext.kind === 'rollout') {
      const sim = createWatchReplayState(watchContext.seedId);
      const gs = Match3GameEngine.createGame(watchContext.seedId, 'watch_rollout') as Match3GameState;
      gs.grid = sim.grid;
      gs.score = sim.score;
      gs.moves = sim.moves;
      gs.status = sim.status;
      gs.refillCounter = sim.refillCounter;
      setGameState(gs);
      if (watchContext.revealAt != null && watchContext.duration != null) {
        const rollout = simulateRollout(watchContext.seedId, watchContext.rolloutIndex);
        const steps: Match3RecordedStep[] = rollout.ops.map((op, i) => ({
          ...op,
          pacingMs: rollout.replayPacingMs?.[i],
        }));
        setInitialStepIndex(
          estimateStepIndexForBotProgress({
            steps,
            revealAt: watchContext.revealAt,
            duration: watchContext.duration,
          })
        );
      }
      return;
    }

    setLoading(true);
    void convex
      .query(api.service.gameManager.getRecordedOps, { gameId: watchContext.gameId })
      .then((res) => {
        if (!res?.ok) {
          setLoadError('暂无回放数据');
          setGameState(null);
          return;
        }
        const seed = res.seedId ?? watchContext.gameId;
        setRecordedSeedId(seed);
        setRecordedSteps(res.steps ?? []);
        const sim = createWatchReplayState(seed);
        const gs = Match3GameEngine.createGame(seed, watchContext.gameId) as Match3GameState;
        gs.grid = sim.grid;
        gs.score = sim.score;
        gs.moves = sim.moves;
        gs.status = sim.status;
        gs.refillCounter = sim.refillCounter;
        setGameState(gs);
      })
      .catch(() => {
        setLoadError('加载回放失败');
      })
      .finally(() => setLoading(false));
  }, [open, watchContext, convex]);

  const syncReplayState = useCallback((next: Match3GameState) => {
    setGameState({ ...next });
  }, []);

  const replayer = useMatch3WatchReplayer({
    source: stepSource,
    gameState,
    gridCellRefs,
    boardMetricsRef,
    syncReplayState,
    setInteractionPhase,
    initialStepIndex,
  });

  if (!open || !watchContext) return null;

  const title =
    watchContext.kind === 'rollout'
      ? `观战 · ${displayLabel}`
      : displayLabel === '你'
        ? '本局复盘'
        : `观战 · ${displayLabel}`;

  return (
    <div className="match3-watch-overlay" role="presentation">
      <button type="button" className="match3-watch-backdrop" aria-label="关闭" onClick={onClose} />
      <div
        className="match3-watch-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="match3-watch-header">
          <h2 className="match3-watch-title">{title}</h2>
          <button type="button" className="match3-watch-close" onClick={onClose}>
            关闭
          </button>
        </header>

        {loading ? <p className="match3-watch-status">加载回放…</p> : null}
        {loadError ? <p className="match3-watch-status match3-watch-status--error">{loadError}</p> : null}

        {gameState ? (
          <>
            <div className="match3-watch-hud">
              <span>Score: {gameState.score}</span>
              <span>
                步数 {replayer.stepIndex}/{replayer.totalSteps}
              </span>
              {watchContext.kind === 'rollout' && watchContext.expectedScore != null ? (
                <span>目标 {watchContext.expectedScore}</span>
              ) : null}
            </div>
            <Match3BoardView
              gameState={gameState}
              gridCellRefs={gridCellRefs}
              boardMetricsRef={boardMetricsRef}
            />
            <div className="match3-watch-controls">
              <button
                type="button"
                disabled={interactionPhase !== GameInteractionPhase.idle || replayer.done}
                onClick={() => replayer.play()}
              >
                播放
              </button>
              <button type="button" onClick={() => replayer.pause()}>
                暂停
              </button>
              <button
                type="button"
                disabled={interactionPhase !== GameInteractionPhase.idle || replayer.done}
                onClick={() => void replayer.stepForward()}
              >
                单步
              </button>
              <button type="button" onClick={() => replayer.reset()}>
                重置
              </button>
            </div>
            {replayer.done ? (
              <p className="match3-watch-status">
                回放结束
                {gameState.status === Match3GameStatus.CANCELLED ? '（已结束）' : ''}
              </p>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
};

export default Match3WatchOverlay;
