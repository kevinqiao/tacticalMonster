import { useConvex } from 'convex/react';
import React, { useEffect, useState } from 'react';

import { api } from '@/convex/solitaireArena/convex/_generated/api';
import type { SolitaireRolloutScript } from '@/convex/solitaireArena/convex/service/seedPool/solitaireRecordedOpTypes';

import type { CasualWatchContext } from '../../../shared/casualAsyncTableSummaryUI';
import SoloGameProvider from '../service/GameManager';
import SoloDnDProvider from '../service/SoloDnDProvider';
import SoloActHandlerProvider from '../service/handler/SoloActHandlerProvider';
import {
  estimateStepIndexForBotProgress,
  resolveWatchRollout,
} from './solitaireWatchReplay';
import SolitaireWatchBoard from './SolitaireWatchBoard';

type Props = {
  open: boolean;
  watchContext: CasualWatchContext | null;
  displayLabel: string;
  onClose: () => void;
};

export const SolitaireWatchOverlay: React.FC<Props> = ({
  open,
  watchContext,
  displayLabel,
  onClose,
}) => {
  const convex = useConvex();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [seedId, setSeedId] = useState('');
  const [rollout, setRollout] = useState<SolitaireRolloutScript | null>(null);
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

    setLoading(true);
    void convex
      .query(api.service.gameManager.getRecordedOps, { gameId: watchContext.gameId })
      .then((res) => {
        if (!res?.ok) {
          setLoadError('暂无回放数据');
          return;
        }
        const seed = res.seedId ?? watchContext.gameId;
        const resolved = resolveWatchRollout({
          kind: 'recorded',
          seedId: seed,
          steps: res.steps ?? [],
        });
        if (resolved.rollout.ops.length === 0) {
          setLoadError('暂无回放数据');
          return;
        }
        setSeedId(resolved.seedId);
        setRollout(resolved.rollout);
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
    <div className="solo-watch-overlay" role="presentation">
      <button type="button" className="solo-watch-backdrop" aria-label="关闭" onClick={onClose} />
      <div
        className="solo-watch-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="solo-watch-header">
          <h2 className="solo-watch-title">{title}</h2>
          <button type="button" className="solo-watch-close" onClick={onClose}>
            关闭
          </button>
        </header>

        {loading ? <p className="solo-watch-status">加载回放…</p> : null}
        {loadError ? <p className="solo-watch-status solo-watch-status--error">{loadError}</p> : null}

        {rollout && seedId ? (
          <SoloGameProvider
            key={`${seedId}-${watchContext.kind}-${watchContext.kind === 'recorded' ? watchContext.gameId : watchContext.rolloutIndex}`}
            replaySeedId={seedId}
          >
            <SoloActHandlerProvider>
              <SoloDnDProvider>
                <SolitaireWatchBoard
                  rollout={rollout}
                  seedId={seedId}
                  initialStepIndex={initialStepIndex}
                  watchContext={watchContext}
                  displayLabel={displayLabel}
                />
              </SoloDnDProvider>
            </SoloActHandlerProvider>
          </SoloGameProvider>
        ) : null}
      </div>
    </div>
  );
};

export default SolitaireWatchOverlay;
