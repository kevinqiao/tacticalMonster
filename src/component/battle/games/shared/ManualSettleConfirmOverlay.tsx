import React, { useCallback, useEffect, useId, useRef, useState } from 'react';

import './manualSettleConfirmOverlay.css';

export const MANUAL_SETTLE_DEFAULT_TITLE = '结束本局';

export const MANUAL_SETTLE_DEFAULT_MESSAGE_SOLITAIRE =
  '确定以当前分数结束本局并结算？未完成接龙将按当前得分上报。';

export const MANUAL_SETTLE_DEFAULT_MESSAGE_BLOCK_BLAST =
  '确定以当前分数结束本局并结算？未使用的形状将按当前得分上报。';

const DEFAULT_SUCCESS_HOLD_MS = 1400;

type FlowPhase = 'prompt' | 'settling' | 'success' | 'error';

export type ManualSettleConfirmOverlayProps = {
  open: boolean;
  title?: string;
  message?: string;
  defaultMessage: string;
  onCancel: () => void;
  /** 须在后端整条链路成功时 resolve；失败请 reject 或 throw，以便回到错误态。 */
  onConfirm: () => Promise<void>;
  /** 展示「成功结算」约 `successHoldMs` 后调用，用于关闭本层遮罩（宿主可在此同时关棋盘/弹层）。 */
  onSuccessClose: () => void;
  settlingTitle?: string;
  settlingBody?: string;
  successTitle?: string;
  successBody?: string;
  successHoldMs?: number;
};

/**
 * In-game fixed overlay for manual settle confirmation (no host ModalManager).
 * 流程：确认 → 正在结算 → 成功结算（短暂停留）→ onSuccessClose。
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
  successTitle = '成功结算',
  successBody = '本局已成功提交。',
  successHoldMs = DEFAULT_SUCCESS_HOLD_MS,
}) => {
  const titleId = useId();
  const successTimerRef = useRef<number | null>(null);
  const [phase, setPhase] = useState<FlowPhase>('prompt');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const promptBody =
    typeof message === 'string' && message.trim() ? message.trim() : defaultMessage;

  const clearSuccessTimer = useCallback(() => {
    if (successTimerRef.current != null) {
      window.clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!open) {
      clearSuccessTimer();
      setPhase('prompt');
      setErrorMsg(null);
    }
  }, [open, clearSuccessTimer]);

  useEffect(() => () => clearSuccessTimer(), [clearSuccessTimer]);

  const handleBackdrop = useCallback(() => {
    if (phase !== 'prompt') return;
    onCancel();
  }, [phase, onCancel]);

  const handleConfirm = useCallback(async () => {
    if (phase !== 'prompt') return;
    setPhase('settling');
    setErrorMsg(null);
    try {
      await onConfirm();
      setPhase('success');
      clearSuccessTimer();
      successTimerRef.current = window.setTimeout(() => {
        successTimerRef.current = null;
        onSuccessClose();
      }, successHoldMs);
    } catch (e) {
      const msg =
        e instanceof Error && e.message.trim()
          ? e.message.trim()
          : '结算失败，请稍后重试';
      setErrorMsg(msg);
      setPhase('error');
    }
  }, [phase, onConfirm, onSuccessClose, successHoldMs, clearSuccessTimer]);

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

          {phase === 'success' ? (
            <>
              <h2 id={titleId} className="ssc__title msc-successTitle">
                {successTitle}
              </h2>
              <p className="ssc__body">{successBody}</p>
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
