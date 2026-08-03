import React, { useCallback, useState } from "react";

import { useTranslation } from "react-i18next";



import { AddToAppleWalletButton } from "./AddToAppleWalletButton";
import type { CampaignCouponView } from "./campaignTypes";
import { formatCampaignRewardLabel } from "./campaignRewardDisplay";

type Props = {
  coupon: CampaignCouponView;
  alreadyClaimed?: boolean;
  onDismiss?: () => void;
};

export const CouponRevealPanel: React.FC<Props> = ({
  coupon,
  alreadyClaimed = false,
  onDismiss,
}) => {
  const { t } = useTranslation("campaign.player");
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(coupon.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [coupon.code]);

  return (
    <div className="pfc-coupon-panel" role="dialog" aria-labelledby="pfc-coupon-title">
      <div className="pfc-coupon-panel__inner">
        <p className="pfc-coupon-panel__eyebrow">
          {alreadyClaimed ? t("coupon.alreadyClaimed") : t("coupon.congrats")}
        </p>
        <h2 id="pfc-coupon-title" className="pfc-coupon-panel__title">
          {formatCampaignRewardLabel(coupon.rewardSnapshot)}
        </h2>
        <div className="pfc-coupon-panel__code" aria-label={t("coupon.codeAriaLabel")}>
          {coupon.code}
        </div>
        <button type="button" className="pfc-btn pfc-btn-primary" onClick={handleCopy}>
          {copied ? t("coupon.copied") : t("coupon.copyCode")}
        </button>
        {coupon.status === "issued" ? (
          <AddToAppleWalletButton couponId={coupon.couponId} />
        ) : null}
        <ul className="pfc-coupon-panel__tips">
          <li>{t("coupon.tipShowAtStore")}</li>
          <li>{t("coupon.tipExpiry")}</li>
        </ul>
        {onDismiss ? (
          <button type="button" className="pfc-btn pfc-btn-text" onClick={onDismiss}>
            {t("coupon.dismiss")}
          </button>
        ) : null}
      </div>
    </div>
  );
};


