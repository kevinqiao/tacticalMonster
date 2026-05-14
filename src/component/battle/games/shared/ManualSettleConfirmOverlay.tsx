import React, { useCallback, useId, useState } from 'react';

import './manualSettleConfirmOverlay.css';

export const MANUAL_SETTLE_DEFAULT_TITLE = '结束本局';

export const MANUAL_SETTLE_DEFAULT_MESSAGE_SOLITAIRE =
  '确定以当前分数结束本局并结算？未完成接龙将按当前得分上报。';

export const MANUAL_SETTLE_DEFAULT_MESSAGE_BLOCK_BLAST =
  '确定以当前分数结束本局并结算？未使用的形状将按当前得分上报。';

export type ManualSettleConfirmOverlayProps = {
  open: boolean;
  title?: string;
  message?: string;
  defaultMessage: string;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
};

/**
 * In-game fixed overlay for manual settle confirmation (no host ModalManager).
 */
export const ManualSettleConfirmOverlay: React.FC<ManualSettleConfirmOverlayProps> = ({
  open,
  title = MANUAL_SETTLE_DEFAULT_TITLE,
  message,
  defaultMessage,
  onCancel,
  onConfirm,
}) => {
  const titleId = useId();
  const [busy, setBusy] = useState(false);
  const body =
    typeof message === 'string' && message.trim() ? message.trim() : defaultMessage;

  const handleCancel = useCallback(() => {
    if (busy) return;
    onCancel();
  }, [busy, onCancel]);

  const handleConfirm = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  }, [busy, onConfirm]);

  if (!open) return null;

  return (
    <div className="msc-overlay" role="presentation">
      <button type="button" className="msc-backdrop" aria-label="关闭" onClick={handleCancel} />
      <div
        className="msc-dialog"
        role="dialog"
        aria-labelledby={titleId}
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ssc">
          <h2 id={titleId} className="ssc__title">
            {title}
          </h2>
          <p className="ssc__body">{body}</p>
          <div className="ssc__actions">
            <button
              type="button"
              className="ssc__btn ssc__btn--ghost"
              disabled={busy}
              onClick={handleCancel}
            >
              取消
            </button>
            <button
              type="button"
              className="ssc__btn ssc__btn--primary"
              disabled={busy}
              onClick={() => void handleConfirm()}
            >
              {busy ? '…' : '确定'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
