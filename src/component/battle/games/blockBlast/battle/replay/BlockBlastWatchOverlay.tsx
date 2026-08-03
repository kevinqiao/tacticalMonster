import { useConvex } from 'convex/react';
import React, { useEffect, useState } from 'react';

import { api } from '@/convex/blockBlast/convex/_generated/api';
import type { BlockBlastRolloutScript } from '@/convex/blockBlast/convex/service/seedPool/blockBlastRecordedOpTypes';

import type { BlockBlastRecordedStep } from '@/convex/blockBlast/convex/service/seedPool/blockBlastRecordedOpTypes';

import type { CasualWatchContext } from '../../../shared/casualAsyncTableSummaryUI';
import BlockBlastGameProvider from '../service/GameManager';
import BlockBlastDnDProvider from '../service/BlockBlastDnDProvider';
import {
    estimateStepIndexForBotProgress,
    resolveWatchRollout,
} from './blockBlastWatchReplay';
import BlockBlastWatchBoard from './BlockBlastWatchBoard';

type Props = {
    open: boolean;
    watchContext: CasualWatchContext | null;
    displayLabel: string;
    onClose: () => void;
};

function asRecordedSteps(
    steps: ReadonlyArray<Record<string, unknown>> | undefined
): BlockBlastRecordedStep[] {
    if (!steps?.length) return [];
    return steps as BlockBlastRecordedStep[];
}

function applyRecordedReplay(args: {
    seedId: string;
    steps: BlockBlastRecordedStep[];
    setSeedId: (v: string) => void;
    setRollout: (v: BlockBlastRolloutScript) => void;
    setLoadError: (v: string | null) => void;
}) {
    const resolved = resolveWatchRollout({
        kind: 'recorded',
        seedId: args.seedId,
        steps: args.steps,
    });
    if (resolved.rollout.ops.length === 0) {
        args.setLoadError('暂无回放数据');
        return;
    }
    args.setLoadError(null);
    args.setSeedId(resolved.seedId);
    args.setRollout(resolved.rollout);
}

export const BlockBlastWatchOverlay: React.FC<Props> = ({
    open,
    watchContext,
    displayLabel,
    onClose,
}) => {
    const convex = useConvex();
    const [loadError, setLoadError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [seedId, setSeedId] = useState('');
    const [rollout, setRollout] = useState<BlockBlastRolloutScript | null>(null);
    const [initialStepIndex, setInitialStepIndex] = useState(0);

    useEffect(() => {
        if (!open || !watchContext) return;
        setLoadError(null);
        setSeedId('');
        setRollout(null);
        setInitialStepIndex(0);
        setLoading(false);

        if (watchContext.kind === 'rollout') {
            const resolved = resolveWatchRollout({
                kind: 'rollout',
                seedId: watchContext.seedId,
                rolloutIndex: watchContext.rolloutIndex,
            });
            if (resolved.rollout.ops.length === 0) {
                setLoadError('暂无回放数据');
                return;
            }
            setSeedId(resolved.seedId);
            setRollout(resolved.rollout);
            if (watchContext.revealAt != null && watchContext.duration != null) {
                setInitialStepIndex(
                    estimateStepIndexForBotProgress({
                        rollout: resolved.rollout,
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
                seedId: watchContext.seedId ?? watchContext.gameId,
                steps: inlineSteps,
                setSeedId,
                setRollout,
                setLoadError,
            });
            return;
        }

        setLoading(true);
        void convex
            .query(api.service.gameManager.getRecordedOps, { gameId: watchContext.gameId })
            .then((res) => {
                if (!res?.ok) {
                    setLoadError('暂无回放数据');
                    return;
                }
                applyRecordedReplay({
                    seedId: res.seedId ?? watchContext.gameId,
                    steps: (res.steps ?? []) as BlockBlastRecordedStep[],
                    setSeedId,
                    setRollout,
                    setLoadError,
                });
            })
            .catch(() => {
                setLoadError('加载回放失败');
            })
            .finally(() => setLoading(false));
    }, [open, watchContext, convex]);

    if (!open || !watchContext) return null;

    const title =
        watchContext.kind === 'rollout'
            ? `观战 · ${displayLabel}`
            : displayLabel === '你'
              ? '本局复盘'
              : `观战 · ${displayLabel}`;

    return (
        <div className="blockblast-watch-overlay" role="presentation">
            <button
                type="button"
                className="blockblast-watch-backdrop"
                aria-label="关闭"
                onClick={onClose}
            />
            <div
                className="blockblast-watch-dialog"
                role="dialog"
                aria-modal="true"
                aria-label={title}
                onClick={(e) => e.stopPropagation()}
            >
                <header className="blockblast-watch-header">
                    <h2 className="blockblast-watch-title">{title}</h2>
                    <button type="button" className="blockblast-watch-close" onClick={onClose}>
                        关闭
                    </button>
                </header>

                {loading ? <p className="blockblast-watch-status">加载回放…</p> : null}
                {loadError ? (
                    <p className="blockblast-watch-status blockblast-watch-status--error">{loadError}</p>
                ) : null}

                {rollout && seedId ? (
                    <BlockBlastGameProvider
                        key={`${seedId}-${watchContext.kind}-${watchContext.kind === 'recorded' ? watchContext.gameId : watchContext.rolloutIndex}`}
                        replaySeedId={seedId}
                    >
                        <BlockBlastDnDProvider>
                            <BlockBlastWatchBoard
                                rollout={rollout}
                                seedId={seedId}
                                initialStepIndex={initialStepIndex}
                                watchContext={watchContext}
                                displayLabel={displayLabel}
                            />
                        </BlockBlastDnDProvider>
                    </BlockBlastGameProvider>
                ) : null}
            </div>
        </div>
    );
};

export default BlockBlastWatchOverlay;
