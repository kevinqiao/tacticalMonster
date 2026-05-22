import React, { useCallback, useEffect, useId, useState } from 'react';

import type { ManualSettleConfirmExtras } from './casualAsyncTableSummaryUI';
import './manualSettleConfirmOverlay.css';

export const MANUAL_SETTLE_DEFAULT_TITLE = '结束本局';

export const MANUAL_SETTLE_DEFAULT_MESSAGE_SOLITAIRE =
  '确定以当前分数结束本局并结算？未完成接龙将按当前得分上报。';

export const MANUAL_SETTLE_DEFAULT_MESSAGE_BLOCK_BLAST =
  '确定以当前分数结束本局并结算？未使用的形状将按当前得分上报。';

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
  const hasExtra = hasTable || m.pendingOthers === true || hasReplay;
  if (!hasExtra) return undefined;
  return {
    tableSummary: hasTable ? ts : undefined,
    pendingOthers: m.pendingOthers,
    ...(m.replayOffered ? { replayOffered: true } : {}),
    ...(m.replayTokenCount != null ? { replayTokenCount: m.replayTokenCount } : {}),
    ...(m.canReplay ? { canReplay: true } : {}),
    ...(m.replayWindowEndsAt != null ? { replayWindowEndsAt: m.replayWindowEndsAt } : {}),
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
  title = MANUAL_SETTLE_DEFAULT_TITLE,
  message,
  defaultMessage,
  onCancel,
  onConfirm,
  onSuccessClose,
  settlingTitle = '正在结算',
  settlingBody = '请稍候，正在提交本局结果…',
}) => {
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
    if (phase !== 'prompt') return;
    onCancel();
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
          : '结算失败，请稍后重试';
      setErrorMsg(msg);
      setPhase('error');
    }
  }, [phase, onConfirm, onSuccessClose]);

  const handleErrorAck = useCallback(() => {
    setPhase('prompt');
    setErrorMsg(null);
  }, []);

  if (!open) return null;

  return (
    <div className="msc-overlay" role="presentation">
      <button
        type="button"
        className={`msc-backdrop${phase === 'prompt' ? '' : ' msc-backdrop--inactive'}`}
        aria-label={phase === 'prompt' ? '关闭' : undefined}
        onClick={handleBackdrop}
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
                {title}
              </h2>
              <p className="ssc__body">{promptBody}</p>
              <div className="ssc__actions">
                <button type="button" className="ssc__btn ssc__btn--ghost" onClick={onCancel}>
                  取消
                </button>
                <button
                  type="button"
                  className="ssc__btn ssc__btn--primary"
                  onClick={() => void handleConfirm()}
                >
                  确定
                </button>
              </div>
            </>
          ) : null}

          {phase === 'settling' ? (
            <>
              <h2 id={titleId} className="ssc__title">
                {settlingTitle}
              </h2>
              <div className="msc-settlingRow" aria-live="polite">
                <span className="msc-spinner" aria-hidden />
                <p className="ssc__body msc-settlingBody">{settlingBody}</p>
              </div>
            </>
          ) : null}

          {phase === 'error' ? (
            <>
              <h2 id={titleId} className="ssc__title">
                结算未成功
              </h2>
              <p className="ssc__body">{errorMsg}</p>
              <div className="ssc__actions">
                <button type="button" className="ssc__btn ssc__btn--primary" onClick={handleErrorAck}>
                  知道了
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
