import React, { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

import type { PortalGiftCardOrderRow } from "../service/usePortalManager";
import { portalGiftCardFeedbackMessage } from "../shared/portalErrorMessage";

type PortalGiftCardPanelProps = {
  orders: PortalGiftCardOrderRow[];
  onRedeem: (orderId: string) => Promise<{ ok: boolean; error?: string; rewardLink?: string }>;
  onResendEmail: (orderId: string) => Promise<{ ok: boolean; error?: string }>;
  onFeedback?: (message: string | null) => void;
};

export function PortalGiftCardPanel({
  orders,
  onRedeem,
  onResendEmail,
  onFeedback,
}: PortalGiftCardPanelProps) {
  const { t } = useTranslation("portal.player");
  const [busy, setBusy] = useState<string | null>(null);

  const handleRedeem = useCallback(
    async (orderId: string) => {
      setBusy(orderId);
      onFeedback?.(null);
      try {
        const r = await onRedeem(orderId);
        if (r.ok && r.rewardLink) {
          window.open(r.rewardLink, "_blank", "noopener,noreferrer");
          onFeedback?.(portalGiftCardFeedbackMessage("linkOpened"));
        } else {
          onFeedback?.(
            r.error === "not_ready"
              ? portalGiftCardFeedbackMessage("notReady")
              : portalGiftCardFeedbackMessage("redeemFailed")
          );
        }
      } finally {
        setBusy(null);
      }
    },
    [onRedeem, onFeedback]
  );

  const handleResend = useCallback(
    async (orderId: string) => {
      setBusy(`resend_${orderId}`);
      try {
        const r = await onResendEmail(orderId);
        onFeedback?.(
          r.ok
            ? portalGiftCardFeedbackMessage("resendSuccess")
            : portalGiftCardFeedbackMessage("resendFailed")
        );
      } finally {
        setBusy(null);
      }
    },
    [onResendEmail, onFeedback]
  );

  if (orders.length === 0) {
    return <p className="portal-giftcard-panel__empty">{t("giftcard.empty")}</p>;
  }

  return (
    <ul className="portal-giftcard-panel__list">
      {orders.map((o) => (
        <li key={o.orderId} className="portal-giftcard-panel__item">
          <div className="portal-giftcard-panel__main">
            <strong>{o.title}</strong>
            <p className="portal-giftcard-panel__meta">
              {o.faceValueDisplay}
              {o.brandName ? ` · ${o.brandName}` : ""}
            </p>
            <p className="portal-giftcard-panel__status">
              {t(`giftcard.status.${o.status}`, { defaultValue: o.status })}
              {o.failureReason ? ` — ${o.failureReason}` : ""}
            </p>
          </div>
          <div className="portal-giftcard-panel__actions">
            {o.canRedeem ? (
              <button
                type="button"
                className="portal-giftcard-panel__btn"
                disabled={busy != null}
                onClick={() => void handleRedeem(o.orderId)}
              >
                {busy === o.orderId ? t("giftcard.redeeming") : t("giftcard.redeem")}
              </button>
            ) : null}
            {o.canResendEmail ? (
              <button
                type="button"
                className="portal-giftcard-panel__btn portal-giftcard-panel__btn--secondary"
                disabled={busy != null}
                onClick={() => void handleResend(o.orderId)}
              >
                {busy === `resend_${o.orderId}` ? t("giftcard.sending") : t("giftcard.resendEmail")}
              </button>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
