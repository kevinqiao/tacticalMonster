import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { formatCampaignRewardLabel } from "../shared/campaignRewardDisplay";
import type { CampaignCouponView } from "../shared/campaignTypes";
import { CampaignCenterModal } from "./CampaignCenterModal";
import { CampaignCouponUseQrModal } from "./CampaignCouponUseQrModal";

type Props = {
  open: boolean;
  onClose: () => void;
  merchantId: string;
  authed: boolean;
  coupons: CampaignCouponView[] | undefined;
  loading: boolean;
  locale: string;
};

function CouponCopyButton({ code }: { code: string }) {
  const { t } = useTranslation("campaign.player");
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [code]);

  return (
    <button type="button" className="campaign-coupons-sheet__copy" onClick={() => void handleCopy()}>
      {copied ? t("coupon.copied") : t("coupon.copyCode")}
    </button>
  );
}

export const CampaignMyCouponsSheet: React.FC<Props> = ({
  open,
  onClose,
  merchantId,
  authed,
  coupons,
  loading,
  locale,
}) => {
  const { t } = useTranslation("campaign.player");
  const [qrCoupon, setQrCoupon] = useState<CampaignCouponView | null>(null);

  useEffect(() => {
    if (!open) setQrCoupon(null);
  }, [open]);

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
      title={t("myCoupons.title")}
      titleId="campaign-my-coupons-title"
      onClose={onClose}
    >
      <div className="campaign-coupons-sheet">
        {!authed ? (
          <p className="campaign-coupons-sheet__empty">{t("myCoupons.signInHint")}</p>
        ) : loading || coupons === undefined ? (
          <p className="campaign-coupons-sheet__empty">{t("myCoupons.loading")}</p>
        ) : coupons.length === 0 ? (
          <p className="campaign-coupons-sheet__empty">{t("myCoupons.empty")}</p>
        ) : (
          <ul className="campaign-coupons-sheet__list">
            {coupons.map((coupon) => {
              const statusLabel = t(`myCoupons.status.${coupon.status}`, {
                defaultValue: coupon.status,
              });

              return (
                <li key={coupon.couponId} className="campaign-coupons-sheet__item">
                  <div className="campaign-coupons-sheet__row">
                    <strong className="campaign-coupons-sheet__reward">
                      {formatCampaignRewardLabel(coupon.rewardSnapshot)}
                    </strong>
                    <span
                      className={`campaign-coupons-sheet__status campaign-coupons-sheet__status--${coupon.status}`}
                    >
                      {statusLabel}
                    </span>
                  </div>
                  <div className="campaign-coupons-sheet__code-row">
                    <code className="campaign-coupons-sheet__code">{coupon.code}</code>
                    {coupon.status === "issued" ? (
                      <div className="campaign-coupons-sheet__actions">
                        <button
                          type="button"
                          className="campaign-coupons-sheet__use"
                          onClick={() => setQrCoupon(coupon)}
                        >
                          {t("myCoupons.use")}
                        </button>
                        <CouponCopyButton code={coupon.code} />
                      </div>
                    ) : null}
                  </div>
                  <p className="campaign-coupons-sheet__meta">
                    {t("myCoupons.issuedAt", { at: fmt(coupon.issuedAt) })}
                  </p>
                  {coupon.expiresAt ? (
                    <p className="campaign-coupons-sheet__meta">
                      {t("myCoupons.expiresAt", { at: fmt(coupon.expiresAt) })}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <CampaignCouponUseQrModal
        open={qrCoupon !== null}
        onClose={() => setQrCoupon(null)}
        merchantId={merchantId}
        coupon={qrCoupon}
        locale={locale}
      />
    </CampaignCenterModal>
  );
};
