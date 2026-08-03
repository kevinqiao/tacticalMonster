import React, { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { useTranslation } from "react-i18next";

import { merchantCouponRedeemUrl } from "@/component/lobby/campaign/shared/merchantCouponRedeemUrl";

import { PortalCenterModal } from "../PortalCenterModal";

export type PortalVoucherRedeemQrTarget = {
  code: string;
  title: string;
  rewardText?: string;
  expiresAt?: number | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  voucher: PortalVoucherRedeemQrTarget | null;
};

/**
 * Store redeem QR (same deep link as Campaign coupons).
 * Does not change backpack status — staff scans and redeems by code.
 */
export const PortalVoucherRedeemQrModal: React.FC<Props> = ({
  open,
  onClose,
  voucher,
}) => {
  const { t, i18n } = useTranslation("portal.player");
  /** Keep payload while closing so exit animation still has content. */
  const [held, setHeld] = useState<PortalVoucherRedeemQrTarget | null>(voucher);

  useEffect(() => {
    if (voucher) setHeld(voucher);
  }, [voucher]);

  useEffect(() => {
    if (!open && !voucher) {
      const id = window.setTimeout(() => setHeld(null), 520);
      return () => window.clearTimeout(id);
    }
  }, [open, voucher]);

  const target = voucher ?? held;
  if (!target) return null;

  const redeemUrl = merchantCouponRedeemUrl(target.code);
  const fmt = (ms: number) =>
    new Date(ms).toLocaleString(i18n.language, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <PortalCenterModal
      open={open}
      title={t("lobby.accountMenu.useTitle")}
      onClose={onClose}
    >
      <div className="portal-voucher-qr">
        <p className="portal-voucher-qr__reward">
          {target.rewardText?.trim() || target.title}
        </p>
        <div className="portal-voucher-qr__frame" aria-hidden="true">
          <QRCode value={redeemUrl} size={220} />
        </div>
        <code className="portal-voucher-qr__code">{target.code}</code>
        {target.expiresAt != null ? (
          <p className="portal-voucher-qr__meta">
            {t("lobby.accountMenu.expiresAt", { at: fmt(target.expiresAt) })}
          </p>
        ) : null}
        <p className="portal-voucher-qr__hint">{t("lobby.accountMenu.qrHint")}</p>
      </div>
    </PortalCenterModal>
  );
};
