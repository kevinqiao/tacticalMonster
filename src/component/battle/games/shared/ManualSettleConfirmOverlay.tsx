import React, { useCallback, useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import i18n from '@/i18n';
import type { ManualSettleConfirmExtras } from './casualAsyncTableSummaryUI';
import './manualSettleConfirmOverlay.css';

export const MANUAL_SETTLE_DEFAULT_TITLE = '结束本局';

export const MANUAL_SETTLE_DEFAULT_MESSAGE_SOLITAIRE =
  '确定以当前分数结束本局并结算？未完成接龙将按当前得分上报。';

export const MANUAL_SETTLE_DEFAULT_MESSAGE_BLOCK_BLAST =
  '确定以当前分数结束本局并结算？未使用的形状将按当前得分上报。';

export const MANUAL_SETTLE_DEFAULT_MESSAGE_MATCH3 =
  '确定以当前分数结束本局并结算？未完成的消除将按当前得分上报。';

export const MANUAL_SETTLE_DEFAULT_MESSAGE_YATZ =
  '确定以当前分数结束本局并结算？未填写的计分类别将按当前得分上报。';

/** Localized defaults (prefer these at call sites). */
export function manualSettleMessageKey(
  game: 'solitaire' | 'blockBlast' | 'match3' | 'yatz'
): string {
  switch (game) {
    case 'solitaire':
      return 'manualSettle.messageSolitaire';
    case 'blockBlast':
      return 'manualSettle.messageBlockBlast';
    case 'match3':
      return 'manualSettle.messageMatch3';
    case 'yatz':
      return 'manualSettle.messageYatz';
  }
}

export function getManualSettleDefaultMessage(
  game: 'solitaire' | 'blockBlast' | 'match3' | 'yatz'
): string {
  return i18n.t(manualSettleMessageKey(game), { ns: 'shared.casual' });
}

type FlowPhase = 'prompt' | 'settling' | 'error';

function normalizeSettleExtras(maybe: unknown): ManualSettleConfirmExtras | undefined {
  if (!maybe || typeof maybe !== 'object') return undefined;
  const m = maybe as ManualSettleConfirmExtras;
  const ts = m.tableSummary;
  const hasTable =
    ts != null && typeof ts === 'object' && Array.isArray(ts.rows) && ts.rows.length > 0;
  const hasReplay =
    m.replayOffered === true ||
    m.canReplay === true ||
    typeof m.replayTokenCount === 'number' ||
    typeof m.replayWindowEndsAt === 'number';
  const hasChallenge = typeof m.seedScoreThreshold === 'number';
  const hasExtra = hasTable || m.pendingOthers === true || hasReplay || hasChallenge;
  if (!hasExtra) return undefined;
  return {
    tableSummary: hasTable ? ts : undefined,
    pendingOthers: m.pendingOthers,
    ...(m.replayOffered ? { replayOffered: true } : {}),
    ...(m.replayTokenCount != null ? { replayTokenCount: m.replayTokenCount } : {}),
    ...(m.canReplay ? { canReplay: true } : {}),
    ...(m.replayWindowEndsAt != null ? { replayWindowEndsAt: m.replayWindowEndsAt } : {}),
    ...(hasChallenge ? { seedScoreThreshold: m.seedScoreThreshold } : {}),
    ...(typeof m.success === 'boolean' ? { success: m.success } : {}),
  };
}

export type ManualSettleConfirmOverlayProps = {
  open: boolean;
  title?: string;
  message?: string;
  defaultMessage: string;
  onCancel: () => void;
  /** 须在后端整条链路成功时 resolve；可返回 `ManualSettleConfirmExtras` 供后续同桌榜。 */
  onConfirm: () => Promise<void | ManualSettleConfirmExtras>;
  /** 结算提交成功后立即调用（进入本局得分明细 → 同桌榜）。 */
  onSuccessClose: (extras?: ManualSettleConfirmExtras) => void;
  settlingTitle?: string;
  settlingBody?: string;
};

/**
 * In-game fixed overlay for manual settle confirmation (no host ModalManager).
 * 流程：确认 → 正在结算 → 成功后直接进入宿主后续弹窗（得分明细 / 同桌榜）。
 */
export const ManualSettleConfirmOverlay: React.FC<ManualSettleConfirmOverlayProps> = ({
  open,
  title,
  message,
  defaultMessage,
  onCancel,
  onConfirm,
  onSuccessClose,
  settlingTitle,
  settlingBody,
}) => {
  const { t } = useTranslation('shared.casual');
  const titleId = useId();
  const [phase, setPhase] = useState<FlowPhase>('prompt');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const promptBody =
    typeof message === 'string' && message.trim() ? message.trim() : defaultMessage;

  useEffect(() => {
    if (!open) {
      setPhase('prompt');
      setErrorMsg(null);
    }
  }, [open]);

  const handleBackdrop = useCallback(() => {
    if (phase === 'prompt') {
      onCancel();
    }
  }, [phase, onCancel]);

  const handleConfirm = useCallback(async () => {
    if (phase !== 'prompt') return;
    setPhase('settling');
    setErrorMsg(null);
    try {
      const maybe = await onConfirm();
      onSuccessClose(normalizeSettleExtras(maybe));
    } catch (e) {
      const msg =
        e instanceof Error && e.message.trim()
          ? e.message.trim()
          : t('manualSettle.failedDefault');
      setErrorMsg(msg);
      setPhase('error');
    }
  }, [phase, onConfirm, onSuccessClose, t]);

  const handleErrorAck = useCallback(() => {
    setPhase('prompt');
    setErrorMsg(null);
  }, []);

  if (!open) return null;

  return (
    <div className="msc-overlay" role="presentation">
      <button
        type="button"
        className={`msc-backdrop${phase === 'settling' ? ' msc-backdrop--inactive' : ''}`}
        aria-label={phase === 'prompt' ? t('postSettle.close') : undefined}
        onClick={phase === 'prompt' ? handleBackdrop : undefined}
        tabIndex={phase === 'settling' ? -1 : undefined}
      />
      <div
        className="msc-dialog"
        role="dialog"
        aria-labelledby={titleId}
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ssc">
          {phase === 'prompt' ? (
            <>
              <h2 id={titleId} className="ssc__title">
                {title ?? t('manualSettle.title')}
              </h2>
              <p className="ssc__body">{promptBody}</p>
              <div className="ssc__actions">
                <button type="button" className="ssc__btn ssc__btn--ghost" onClick={onCancel}>
                  {t('manualSettle.cancel')}
                </button>
                <button
                  type="button"
                  className="ssc__btn ssc__btn--primary"
                  onClick={() => void handleConfirm()}
                >
                  {t('manualSettle.confirm')}
                </button>
              </div>
            </>
          ) : null}

          {phase === 'settling' ? (
            <>
              <h2 id={titleId} className="ssc__title">
                {settlingTitle ?? t('manualSettle.settlingTitle')}
              </h2>
              <div className="msc-settlingRow" aria-live="polite">
                <span className="msc-spinner" aria-hidden />
                <p className="ssc__body msc-settlingBody">
                  {settlingBody ?? t('manualSettle.settlingBody')}
                </p>
              </div>
            </>
          ) : null}

          {phase === 'error' ? (
            <>
              <h2 id={titleId} className="ssc__title">
                {t('manualSettle.failedTitle')}
              </h2>
              <p className="ssc__body">{errorMsg}</p>
              <div className="ssc__actions">
                <button type="button" className="ssc__btn ssc__btn--primary" onClick={handleErrorAck}>
                  {t('manualSettle.ack')}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
