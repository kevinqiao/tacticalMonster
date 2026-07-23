import React from "react";
import { useTranslation } from "react-i18next";

import type { PortalBackpackItem } from "../service/usePortalManager";

export type PortalBackpackPanelProps = {
  backpackItems?: PortalBackpackItem[];
  onRequestUse?: (itemId: string) => Promise<{ ok: boolean; error?: string }>;
  onCancelUse?: (itemId: string) => Promise<{ ok: boolean; error?: string }>;
};

/** Account sheet backpack: vouchers only (tickets live on the lobby chip). */
export function PortalBackpackPanel({
  backpackItems = [],
  onRequestUse,
  onCancelUse,
}: PortalBackpackPanelProps) {
  const { t } = useTranslation("portal.player");

  return (
    <div className="portal-backpack-panel">
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
    </div>
  );
}
