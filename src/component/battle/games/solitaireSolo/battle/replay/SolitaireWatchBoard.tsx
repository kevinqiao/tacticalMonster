import React from 'react';

import type { CasualWatchContext } from '../../../shared/casualAsyncTableSummaryUI';
import type { SolitaireRolloutScript } from '@/convex/solitaireArena/convex/service/seedPool/solitaireRecordedOpTypes';
import {
  GameInteractionPhase,
  SoloGameStatus,
} from '../types/SoloTypes';
import { useSolitaireRolloutReplayer } from './useSolitaireRolloutReplayer';
import { useSoloGameManager } from '../service/GameManager';
import GamePlayer from '../GamePlayer';

type Props = {
  rollout: SolitaireRolloutScript;
  seedId: string;
  initialStepIndex: number;
  watchContext: CasualWatchContext;
  displayLabel: string;
};

export const SolitaireWatchBoard: React.FC<Props> = ({
  rollout,
  seedId,
  initialStepIndex,
  watchContext,
  displayLabel,
}) => {
  const {
    gameState,
    boardDimension,
    boardDimensionRef,
    saveUpdate,
    syncReplayState,
    setInteractionPhase,
    interactionPhase,
  } = useSoloGameManager();

  const replayer = useSolitaireRolloutReplayer({
    rollout,
    seedId,
    gameState,
    boardDimensionRef,
    boardDimension,
    saveUpdate,
    syncReplayState,
    setInteractionPhase,
    initialStepIndex,
  });

  const title =
    watchContext.kind === 'rollout'
      ? `观战 · ${displayLabel}`
      : displayLabel === '你'
        ? '本局复盘'
        : `观战 · ${displayLabel}`;

  return (
    <>
      <div className="solo-watch-hud">
        <span className="solo-watch-title-inline">{title}</span>
        <span>Score: {Math.max(0, gameState?.score ?? 0)}</span>
        <span>
          步数 {replayer.stepIndex}/{replayer.totalSteps}
        </span>
        {watchContext.kind === 'rollout' && watchContext.expectedScore != null ? (
          <span>目标 {watchContext.expectedScore}</span>
        ) : null}
      </div>
      <div className="solo-watch-board">
        <GamePlayer />
      </div>
      <div className="solo-watch-controls">
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
        <p className="solo-watch-status">
          回放结束
          {gameState?.status === SoloGameStatus.CANCELLED ? '（已结束）' : ''}
        </p>
      ) : null}
    </>
  );
};

export default SolitaireWatchBoard;
