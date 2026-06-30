import React from "react";
import QRCode from "react-qr-code";
import { useTranslation } from "react-i18next";

import { merchantCouponRedeemUrl } from "../shared/merchantCouponRedeemUrl";
import { formatCampaignRewardLabel } from "../shared/campaignRewardDisplay";
import type { CampaignCouponView } from "../shared/campaignTypes";
import { CampaignCenterModal } from "./CampaignCenterModal";

type Props = {
  open: boolean;
  onClose: () => void;
  merchantId: string;
  coupon: CampaignCouponView | null;
  locale: string;
};

export const CampaignCouponUseQrModal: React.FC<Props> = ({
  open,
  onClose,
  merchantId,
  coupon,
  locale,
}) => {
  const { t } = useTranslation("campaign.player");

  if (!coupon) return null;

  const redeemUrl = merchantCouponRedeemUrl(merchantId, coupon.code);

  const fmt = (ms: number) =>
    new Date(ms).toLocaleString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <CampaignCenterModal
      open={open}
      title={t("myCoupons.useTitle")}
      titleId="campaign-coupon-use-qr-title"
      onClose={onClose}
    >
      <div className="campaign-coupon-qr">
        <p className="campaign-coupon-qr__reward">
          {formatCampaignRewardLabel(coupon.rewardSnapshot)}
        </p>
        <div className="campaign-coupon-qr__frame" aria-hidden="true">
          <QRCode value={redeemUrl} size={220} />
        </div>
        <code className="campaign-coupon-qr__code">{coupon.code}</code>
        {coupon.expiresAt ? (
          <p className="campaign-coupon-qr__meta">
            {t("myCoupons.expiresAt", { at: fmt(coupon.expiresAt) })}
          </p>
        ) : null}
        <p className="campaign-coupon-qr__hint">{t("myCoupons.qrHint")}</p>
      </div>
    </CampaignCenterModal>
  );
};
