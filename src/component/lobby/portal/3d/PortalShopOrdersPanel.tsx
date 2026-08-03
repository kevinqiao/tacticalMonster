import React, { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

import type { PortalShopOrderRow } from "../service/usePortalManager";
import { portalGiftCardFeedbackMessage } from "../shared/portalErrorMessage";

type PortalShopOrdersPanelProps = {
  orders: PortalShopOrderRow[];
  onRedeem: (orderId: string) => Promise<{ ok: boolean; error?: string; rewardLink?: string }>;
  onResendEmail: (orderId: string) => Promise<{ ok: boolean; error?: string }>;
  onFeedback?: (message: string | null) => void;
};

function formatFiat(cents?: number, currency?: string): string | null {
  if (cents == null || !Number.isFinite(cents)) return null;
  const amount = (cents / 100).toFixed(2);
  const cur = (currency ?? "usd").toUpperCase();
  return cur === "USD" ? `$${amount}` : `${amount} ${cur}`;
}

export function PortalShopOrdersPanel({
  orders,
  onRedeem,
  onResendEmail,
  onFeedback,
}: PortalShopOrdersPanelProps) {
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
    return <p className="portal-giftcard-panel__empty">{t("orders.empty")}</p>;
  }

  return (
    <ul className="portal-giftcard-panel__list">
      {orders.map((o) => {
        const isIap = o.orderKind === "iap";
        const fiat = formatFiat(o.priceCents, o.currency);
        const grants: string[] = [];
        if ((o.grantTicketCount ?? 0) > 0) {
          grants.push(t("shop.grantTickets", { count: o.grantTicketCount }));
        }
        if ((o.grantCoinCount ?? 0) > 0) {
          grants.push(t("shop.grantCoins", { count: o.grantCoinCount }));
        }

        return (
          <li key={`${o.orderKind}:${o.orderId}`} className="portal-giftcard-panel__item">
            <div className="portal-giftcard-panel__main">
              <div className="portal-shop-panel__itemTitleRow">
                <strong>{o.title}</strong>
                <span className="portal-shop-panel__badge">
                  {isIap ? t("shop.badgeIap") : t("shop.badgeGiftCard")}
                </span>
              </div>
              {isIap ? (
                <p className="portal-giftcard-panel__meta">
                  {[fiat, ...grants].filter(Boolean).join(" · ")}
                </p>
              ) : (
                <p className="portal-giftcard-panel__meta">
                  {o.faceValueDisplay}
                  {o.brandName ? ` · ${o.brandName}` : ""}
                  {o.priceCoins != null ? ` · ${o.priceCoins} ${t("orders.coins")}` : ""}
                </p>
              )}
              <p className="portal-giftcard-panel__status">
                {isIap
                  ? t(`orders.status.${o.status}`, { defaultValue: o.status })
                  : t(`giftcard.status.${o.status}`, { defaultValue: o.status })}
                {o.failureReason ? ` — ${o.failureReason}` : ""}
              </p>
            </div>
            <div className="portal-giftcard-panel__actions">
              {!isIap && o.canRedeem ? (
                <button
                  type="button"
                  className="portal-giftcard-panel__btn"
                  disabled={busy != null}
                  onClick={() => void handleRedeem(o.orderId)}
                >
                  {busy === o.orderId ? t("giftcard.redeeming") : t("giftcard.redeem")}
                </button>
              ) : null}
              {!isIap && o.canResendEmail ? (
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
        );
      })}
    </ul>
  );
}

/** @deprecated Use PortalShopOrdersPanel */
export { PortalShopOrdersPanel as PortalGiftCardPanel };
