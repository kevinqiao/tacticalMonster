import React from 'react';

import type { CasualWatchContext } from '../../../shared/casualAsyncTableSummaryUI';
import type { BlockBlastRolloutScript } from '@/convex/blockBlast/convex/service/seedPool/blockBlastRecordedOpTypes';

import GamePlayer from '../GamePlayer';
import { useBlockBlastGameManager } from '../service/GameManager';
import { BlockBlastGameStatus, GameInteractionPhase } from '../types/BlockBlastTypes';
import { useBlockBlastWatchReplayer } from './useBlockBlastWatchReplayer';

type Props = {
    rollout: BlockBlastRolloutScript;
    seedId: string;
    initialStepIndex: number;
    watchContext: CasualWatchContext;
    displayLabel: string;
};

export const BlockBlastWatchBoard: React.FC<Props> = ({
    rollout,
    seedId,
    initialStepIndex,
    watchContext,
    displayLabel,
}) => {
    const { gameState, gridCellRefs, commitGameState, setInteractionPhase, interactionPhase } =
        useBlockBlastGameManager();

    const replayer = useBlockBlastWatchReplayer({
        rollout,
        seedId,
        gameState,
        gridCellRefs,
        commitGameState,
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
            <div className="blockblast-watch-hud">
                <span className="blockblast-watch-title-inline">{title}</span>
                <span>Score: {Math.max(0, gameState?.score ?? 0)}</span>
                <span>
                    步数 {replayer.stepIndex}/{replayer.totalSteps}
                </span>
                {/* 多人竞技后端不挂 expectedScore；有则视为单人挑战目标 */}
                {watchContext.kind === 'rollout' && watchContext.expectedScore != null ? (
                    <span>目标 {watchContext.expectedScore}</span>
                ) : null}
            </div>
            <div className="blockblast-watch-board">
                <GamePlayer />
            </div>
            <div className="blockblast-watch-controls">
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
                <p className="blockblast-watch-status">
                    回放结束
                    {gameState?.status === BlockBlastGameStatus.CANCELLED ? '（已结束）' : ''}
                </p>
            ) : null}
        </>
    );
};

export default BlockBlastWatchBoard;
