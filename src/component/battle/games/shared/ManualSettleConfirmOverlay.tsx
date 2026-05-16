import React, { useCallback, useEffect, useId, useState } from 'react';

import type { ManualSettleConfirmExtras } from './casualAsyncTableSummaryUI';
import { CasualTableSummaryPanel } from './CasualTableSummaryPanel';
import './manualSettleConfirmOverlay.css';

export const MANUAL_SETTLE_DEFAULT_TITLE = '结束本局';

export const MANUAL_SETTLE_DEFAULT_MESSAGE_SOLITAIRE =
  '确定以当前分数结束本局并结算？未完成接龙将按当前得分上报。';

export const MANUAL_SETTLE_DEFAULT_MESSAGE_BLOCK_BLAST =
  '确定以当前分数结束本局并结算？未使用的形状将按当前得分上报。';

type FlowPhase = 'prompt' | 'settling' | 'success' | 'error';

export type ManualSettleConfirmOverlayProps = {
  open: boolean;
  title?: string;
  message?: string;
  defaultMessage: string;
  onCancel: () => void;
  /** 须在后端整条链路成功时 resolve；可返回 `ManualSettleConfirmExtras` 以在成功态展示同桌摘要。 */
  onConfirm: () => Promise<void | ManualSettleConfirmExtras>;
  /** 用户点击成功态「继续」后调用，用于关闭本层遮罩（宿主可在此同时关棋盘/弹层）。 */
  onSuccessClose: () => void;
  settlingTitle?: string;
  settlingBody?: string;
  successTitle?: string;
  successBody?: string;
  /** 成功态主按钮文案 */
  successConfirmLabel?: string;
};

/**
 * In-game fixed overlay for manual settle confirmation (no host ModalManager).
 * 流程：确认 → 正在结算 → 成功结算 → 用户点击继续 → onSuccessClose。
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
  successConfirmLabel = '继续',
}) => {
  const titleId = useId();
  const [phase, setPhase] = useState<FlowPhase>('prompt');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successExtras, setSuccessExtras] = useState<ManualSettleConfirmExtras | null>(null);

  const promptBody =
    typeof message === 'string' && message.trim() ? message.trim() : defaultMessage;

  useEffect(() => {
    if (!open) {
      setPhase('prompt');
      setErrorMsg(null);
      setSuccessExtras(null);
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
      if (maybe && typeof maybe === 'object') {
        const m = maybe as ManualSettleConfirmExtras;
        const ts = m.tableSummary;
        const hasTable =
          ts != null &&
          typeof ts === 'object' &&
          Array.isArray(ts.rows) &&
          ts.rows.length > 0;
        const hasExtra = hasTable || m.pendingOthers === true;
        setSuccessExtras(
          hasExtra
            ? { tableSummary: hasTable ? ts : undefined, pendingOthers: m.pendingOthers }
            : null
        );
      } else {
        setSuccessExtras(null);
      }
      setPhase('success');
    } catch (e) {
      const msg =
        e instanceof Error && e.message.trim()
          ? e.message.trim()
          : '结算失败，请稍后重试';
      setErrorMsg(msg);
      setPhase('error');
    }
  }, [phase, onConfirm]);

  const handleSuccessContinue = useCallback(() => {
    if (phase !== 'success') return;
    onSuccessClose();
  }, [phase, onSuccessClose]);

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
              {successExtras?.tableSummary &&
              successExtras.tableSummary.rows.length > 0 ? (
                <CasualTableSummaryPanel s={successExtras.tableSummary} />
              ) : successExtras?.pendingOthers ? (
                <p className="ssc__body msc-pendingPeersNote">
                  成绩已提交。同桌全部完成后，将产生本桌名次与分差。
                </p>
              ) : null}
              <div className="ssc__actions">
                <button
                  type="button"
                  className="ssc__btn ssc__btn--primary"
                  onClick={handleSuccessContinue}
                >
                  {successConfirmLabel}
                </button>
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
