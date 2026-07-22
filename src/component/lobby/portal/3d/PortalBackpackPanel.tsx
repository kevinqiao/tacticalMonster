import React from "react";
import { useTranslation } from "react-i18next";

import type { PortalBackpackItem } from "../service/usePortalManager";

export type PortalBackpackPanelProps = {
  replayTokenCount?: number | null;
  backpackItems?: PortalBackpackItem[];
  adReplayDailyRemaining?: number | null;
  giftCardOrderCount?: number;
  onOpenGiftCards?: () => void;
  onRequestUse?: (itemId: string) => Promise<{ ok: boolean; error?: string }>;
  onCancelUse?: (itemId: string) => Promise<{ ok: boolean; error?: string }>;
};

export function PortalBackpackPanel({
  replayTokenCount = 0,
  backpackItems = [],
  adReplayDailyRemaining = null,
  giftCardOrderCount = 0,
  onOpenGiftCards,
  onRequestUse,
  onCancelUse,
}: PortalBackpackPanelProps) {
  const { t } = useTranslation("portal.player");
  const tokens =
    typeof replayTokenCount === "number" && Number.isFinite(replayTokenCount)
      ? Math.max(0, Math.floor(replayTokenCount))
      : 0;
  const showAdReplay =
    typeof adReplayDailyRemaining === "number" &&
    Number.isFinite(adReplayDailyRemaining);
  const adRemaining = showAdReplay
    ? Math.max(0, Math.floor(adReplayDailyRemaining))
    : 0;

  return (
    <div className="portal-backpack-panel">
      <ul className="portal-backpack-panel__list">
        <li className="portal-backpack-panel__row">
          <span className="portal-backpack-panel__label">
            {t("lobby.accountMenu.replayTokens")}
          </span>
          <span className="portal-backpack-panel__value">{tokens}</span>
        </li>
        {showAdReplay ? (
          <li className="portal-backpack-panel__row">
            <span className="portal-backpack-panel__label">
              {t("lobby.accountMenu.adReplayRemaining")}
            </span>
            <span className="portal-backpack-panel__value">{adRemaining}</span>
          </li>
        ) : null}
        <li className="portal-backpack-panel__row">
          <span className="portal-backpack-panel__label">
            {t("lobby.accountMenu.vouchers")}
          </span>
          <span className="portal-backpack-panel__value">{backpackItems.length}</span>
        </li>
      </ul>
      <div className="portal-backpack-panel__vouchers">
        {backpackItems.length === 0 ? (
          <p className="portal-backpack-panel__empty">{t("lobby.accountMenu.emptyItem")}</p>
        ) : (
          backpackItems.map((item) => (
            <article key={item.itemId} className="portal-backpack-panel__voucher">
              <div className="portal-backpack-panel__voucher-main">
                <strong>{item.title}</strong>
                {item.rewardText ? <span>{item.rewardText}</span> : null}
                <code>{item.code}</code>
              </div>
              <div className="portal-backpack-panel__voucher-actions">
                <span className={`portal-backpack-panel__status portal-backpack-panel__status--${item.status}`}>
                  {t(`lobby.accountMenu.voucherStatus.${item.status}`)}
                </span>
                {item.status === "owned" && onRequestUse ? (
                  <button type="button" onClick={() => void onRequestUse(item.itemId)}>
                    {t("lobby.accountMenu.useVoucher")}
                  </button>
                ) : null}
                {item.status === "pending_use" && onCancelUse ? (
                  <button type="button" onClick={() => void onCancelUse(item.itemId)}>
                    {t("lobby.accountMenu.cancelVoucher")}
                  </button>
                ) : null}
              </div>
            </article>
          ))
        )}
      </div>
      {onOpenGiftCards ? (
        <button
          type="button"
          className="portal-backpack-panel__link"
          onClick={onOpenGiftCards}
        >
          {t("lobby.accountMenu.viewGiftCards", {
            count: giftCardOrderCount,
          })}
        </button>
      ) : null}
    </div>
  );
}
