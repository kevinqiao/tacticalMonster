import { ModalProp } from "host/service/ModalManager";
import React, { useCallback, useState } from "react";

import "./solitaireSettleConfirmModal.css";

const DEFAULT_MESSAGE =
  "确定以当前分数结束本局并结算？未完成接龙将按当前得分上报。";

export interface SolitaireSettleConfirmModalData {
  message?: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

const SolitaireSettleConfirmModal: React.FC<ModalProp> = ({ visible, close, data }) => {
  const [busy, setBusy] = useState(false);
  const payload = data as SolitaireSettleConfirmModalData | undefined;
  const message = typeof payload?.message === "string" && payload.message.trim() ? payload.message.trim() : DEFAULT_MESSAGE;

  const handleCancel = useCallback(() => {
    if (busy) return;
    payload?.onCancel?.();
    close();
  }, [busy, close, payload]);

  const handleConfirm = useCallback(async () => {
    if (busy || !payload?.onConfirm) return;
    setBusy(true);
    close();
    try {
      await payload.onConfirm();
    } finally {
      setBusy(false);
    }
  }, [busy, close, payload]);

  if (!visible) return null;

  return (
    <div className="ssc" role="dialog" aria-labelledby="ssc-title" aria-modal="true">
      <h2 id="ssc-title" className="ssc__title">
        结束本局
      </h2>
      <p className="ssc__body">{message}</p>
      <div className="ssc__actions">
        <button type="button" className="ssc__btn ssc__btn--ghost" disabled={busy} onClick={handleCancel}>
          取消
        </button>
        <button type="button" className="ssc__btn ssc__btn--primary" disabled={busy} onClick={() => void handleConfirm()}>
          {busy ? "…" : "确定"}
        </button>
      </div>
    </div>
  );
};

export default SolitaireSettleConfirmModal;
