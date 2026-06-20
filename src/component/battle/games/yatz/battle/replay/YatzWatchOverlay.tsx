import { useConvex } from 'convex/react';

import React, { useCallback, useEffect, useMemo, useState } from 'react';



import { api } from '@/convex/yatzArena/convex/_generated/api';

import type { YatzRecordedStep } from '@/convex/yatzArena/convex/service/seedPool/yatzRecordedOpTypes';

import { rolloutReplaySeed } from '@/convex/yatzArena/convex/service/seedPool/yatzSeedSimulator';



import type { Match3WatchContext } from '../../../shared/casualAsyncTableSummaryUI';

import { YatzGameStatus, type YatzGameState } from '../types/YatzTypes';

import YatzReplayBoard from './YatzReplayBoard';

import {

  createWatchReplayState,

  estimateStepIndexForBotProgress,

  resolveWatchSteps,

  type YatzWatchStepSource,

} from './yatzWatchReplay';

import { useYatzWatchReplayer } from './useYatzWatchReplayer';



type Props = {

  open: boolean;

  watchContext: Match3WatchContext | null;

  displayLabel: string;

  onClose: () => void;

};



function asRecordedSteps(steps: ReadonlyArray<Record<string, unknown>> | undefined): YatzRecordedStep[] {

  if (!steps?.length) return [];

  return steps as YatzRecordedStep[];

}



function applyRecordedReplay(args: {

  watchContext: Extract<Match3WatchContext, { kind: 'recorded' }>;

  steps: YatzRecordedStep[];

  seedId: string;

  setRecordedSteps: (steps: YatzRecordedStep[]) => void;

  setRecordedSeedId: (seed: string) => void;

  setGameState: (state: YatzGameState) => void;

  setLoadError: (msg: string | null) => void;

}) {

  const { watchContext, steps, seedId } = args;

  if (steps.length === 0) {

    args.setLoadError('暂无回放步骤（对局未记录操作）');

    args.setGameState(null);

    return;

  }

  args.setLoadError(null);

  args.setRecordedSeedId(seedId);

  args.setRecordedSteps(steps);

  args.setGameState(createWatchReplayState(seedId, watchContext.gameId));

}



export const YatzWatchOverlay: React.FC<Props> = ({

  open,

  watchContext,

  displayLabel,

  onClose,

}) => {

  const convex = useConvex();

  const [loadError, setLoadError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  const [recordedSteps, setRecordedSteps] = useState<YatzRecordedStep[]>([]);

  const [recordedSeedId, setRecordedSeedId] = useState('');

  const [gameState, setGameState] = useState<YatzGameState | null>(null);

  const [initialStepIndex, setInitialStepIndex] = useState(0);



  const stepSource: YatzWatchStepSource | null = useMemo(() => {

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

      gameId: watchContext.gameId,

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

      const sim = createWatchReplayState(

        rolloutReplaySeed(watchContext.seedId, watchContext.rolloutIndex)

      );

      setGameState(sim);

      if (watchContext.revealAt != null && watchContext.duration != null) {

        const resolved = resolveWatchSteps(

          {

            kind: 'rollout',

            seedId: watchContext.seedId,

            rolloutIndex: watchContext.rolloutIndex,

          },

          { targetDurationMs: watchContext.duration },

        );

        setInitialStepIndex(

          estimateStepIndexForBotProgress({

            steps: resolved.steps,

            pacingMs: resolved.pacingMs,

            revealAt: watchContext.revealAt,

            duration: watchContext.duration,

          })

        );

      }

      return;

    }



    const inlineSteps = asRecordedSteps(watchContext.steps);

    if (inlineSteps.length > 0) {

      applyRecordedReplay({

        watchContext,

        steps: inlineSteps,

        seedId: watchContext.seedId ?? watchContext.gameId,

        setRecordedSteps,

        setRecordedSeedId,

        setGameState,

        setLoadError,

      });

      return;

    }



    setLoading(true);

    void convex

      .query(api.service.gameManager.getGame, { gameId: watchContext.gameId })

      .then((row) => {

        if (!row) {

          setLoadError('暂无回放数据');

          setGameState(null);

          return;

        }

        const steps = (row.recordedOps ?? []) as YatzRecordedStep[];

        applyRecordedReplay({

          watchContext,

          steps,

          seedId: row.seed ?? watchContext.gameId,

          setRecordedSteps,

          setRecordedSeedId,

          setGameState,

          setLoadError,

        });

      })

      .catch(() => {

        setLoadError('加载回放失败');

      })

      .finally(() => setLoading(false));

  }, [open, watchContext, convex]);



  const syncReplayState = useCallback((next: YatzGameState) => {

    setGameState(next);

  }, []);



  const botTargetDurationMs =

    watchContext?.kind === 'rollout' && watchContext.duration != null && watchContext.duration > 0

      ? watchContext.duration

      : undefined;



  const replayer = useYatzWatchReplayer({

    source: stepSource,

    gameState,

    syncReplayState,

    initialStepIndex,

    targetDurationMs: botTargetDurationMs,

  });



  if (!open || !watchContext) return null;



  const title =

    watchContext.kind === 'rollout'

      ? `观战 · ${displayLabel}`

      : displayLabel === '你'

        ? '本局复盘'

        : `观战 · ${displayLabel}`;



  const expectedScore =

    watchContext.kind === 'rollout' && watchContext.expectedScore != null

      ? watchContext.expectedScore

      : replayer.rollout?.finalScore;



  return (

    <div className="yatz-watch-overlay" role="presentation">

      <button type="button" className="yatz-watch-backdrop" aria-label="关闭" onClick={onClose} />

      <div

        className="yatz-watch-dialog"

        role="dialog"

        aria-modal="true"

        aria-label={title}

        onClick={(e) => e.stopPropagation()}

      >

        <header className="yatz-watch-header">

          <h2 className="yatz-watch-title">{title}</h2>

          <button type="button" className="yatz-watch-close" onClick={onClose}>

            关闭

          </button>

        </header>



        {loading ? <p className="yatz-watch-status">加载回放…</p> : null}

        {loadError ? (

          <p className="yatz-watch-status yatz-watch-status--error">{loadError}</p>

        ) : null}



        {gameState ? (

          <>

            <div className="yatz-watch-hud">

              <span>总分 {gameState.score}</span>

              <span>

                步骤 {replayer.stepIndex}/{replayer.totalSteps}

              </span>

              {expectedScore != null ? <span>目标 {expectedScore}</span> : null}

            </div>

            <YatzReplayBoard gameState={gameState} />

            {replayer.totalSteps === 0 ? (

              <p className="yatz-watch-status yatz-watch-status--error">暂无回放步骤</p>

            ) : null}

            {replayer.stepError ? (

              <p className="yatz-watch-status yatz-watch-status--error">{replayer.stepError}</p>

            ) : null}

            <div className="yatz-watch-controls">

              <button

                type="button"

                disabled={replayer.done || replayer.totalSteps === 0}

                onClick={() => replayer.play()}

              >

                播放

              </button>

              <button type="button" onClick={() => replayer.pause()}>

                暂停

              </button>

              <button

                type="button"

                disabled={replayer.done}

                onClick={() => void replayer.stepForward()}

              >

                单步

              </button>

              <button type="button" onClick={() => replayer.reset()}>

                重置

              </button>

            </div>

            {replayer.done ? (

              <p className="yatz-watch-status">

                回放结束

                {gameState.status === YatzGameStatus.CANCELLED ? '（已提前结束）' : ''}

              </p>

            ) : null}

          </>

        ) : null}

      </div>

    </div>

  );

};



export default YatzWatchOverlay;


