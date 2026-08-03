import React, { useState } from "react";
import { useTranslation } from "react-i18next";

import type { PortalBackpackItem } from "../service/usePortalManager";
import {
  PortalVoucherRedeemQrModal,
  type PortalVoucherRedeemQrTarget,
} from "./PortalVoucherRedeemQrModal";

export type PortalBackpackPanelProps = {
  backpackItems?: PortalBackpackItem[];
  /** Cancel leftover pending_use rows from the old request flow. */
  onCancelUse?: (itemId: string) => Promise<{ ok: boolean; error?: string }>;
};

/** Account sheet backpack: vouchers only. Use → store redeem QR (not pending_use). */
export function PortalBackpackPanel({
  backpackItems = [],
  onCancelUse,
}: PortalBackpackPanelProps) {
  const { t } = useTranslation("portal.player");
  const [qrTarget, setQrTarget] = useState<PortalVoucherRedeemQrTarget | null>(null);

  const usable = (item: PortalBackpackItem) =>
    item.status === "owned" || item.status === "pending_use";

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
                {usable(item) ? (
                  <button
                    type="button"
                    onClick={() =>
                      setQrTarget({
                        code: item.code,
                        title: item.title,
                        rewardText: item.rewardText,
                        expiresAt: item.expiresAt,
                      })
                    }
                  >
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

      <PortalVoucherRedeemQrModal
        open={qrTarget !== null}
        onClose={() => setQrTarget(null)}
        voucher={qrTarget}
      />
    </div>
  );
}
