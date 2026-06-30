import React, { useCallback, useEffect, useRef, useState } from "react";

import { useTranslation } from "react-i18next";

import { PageProp } from "host/RenderApp";

import { useUserManager } from "host/service/UserManager";

import {
  campaignAdminErrorMessage,
  campaignErrorMessage,
  campaignSuccessMessage,
} from "../shared/campaignErrorMessage";

import { MerchantPageToolbar } from "../shared/CampaignLocaleSwitcher";

import { MerchantCampaignProvider, useMerchantCampaignClient } from "../service/useMerchantCampaignManager";

import { formatCampaignRewardLabel } from "../shared/campaignRewardDisplay";

import { MerchantNavLink } from "./MerchantEmbeddedNavContext";

import i18n from "@/i18n";

import "./merchant.css";

function merchantIdFromLocation(): string {
  return new URLSearchParams(window.location.search).get("merchantId") ?? "";
}

function codeFromLocation(): string {
  return (new URLSearchParams(window.location.search).get("code") ?? "").trim().toUpperCase();
}

type CouponPreview = {
  ok: boolean;
  error?: string;
  coupon?: {
    code: string;
    rewardSnapshot?: { displayText?: string; itemLabel?: string };
    issuedAt: number;
    expiresAt: number;
  };
};

export const MerchantRedeemInner: React.FC<{
  visible: number;
  merchantId: string;
  embedded?: boolean;
}> = ({ visible, merchantId, embedded }) => {
  const { t } = useTranslation("campaign.merchant");
  const { askAuth } = useUserManager();
  const { http, authed, fns } = useMerchantCampaignClient();

  const initialCode = codeFromLocation();
  const [code, setCode] = useState(initialCode);
  const [scanMode] = useState(() => Boolean(initialCode));
  const [preview, setPreview] = useState<CouponPreview | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const autoValidatedRef = useRef(false);

  const validate = useCallback(
    async (codeToValidate?: string) => {
      if (!http || !merchantId) return;

      const normalized = (codeToValidate ?? code).trim().toUpperCase();
      if (!normalized) return;

      setValidating(true);
      setNote(null);
      try {
        const row = (await http.query(fns.validateCouponCode, {
          merchantId,
          code: normalized,
        })) as CouponPreview;
        setPreview(row);
        if (codeToValidate) setCode(normalized);
      } finally {
        setValidating(false);
      }
    },
    [http, merchantId, code, fns.validateCouponCode]
  );

  useEffect(() => {
    if (!http || !merchantId || !initialCode || autoValidatedRef.current) return;
    autoValidatedRef.current = true;
    void validate(initialCode);
  }, [http, merchantId, initialCode, validate]);

  const redeem = async () => {
    if (!http || !authed || !merchantId) {
      askAuth({});
      return;
    }

    const normalized = code.trim().toUpperCase();
    if (!normalized) return;

    setRedeeming(true);
    setNote(null);
    try {
      await http.mutation(fns.redeemCoupon, { merchantId, code: normalized });
      setNote(campaignSuccessMessage("redeemSuccess"));
      setPreview(null);
      setCode("");
    } catch (e) {
      setNote(campaignAdminErrorMessage(e));
    } finally {
      setRedeeming(false);
    }
  };

  if (visible === 0) return null;

  const locale = i18n.language;
  const showScanLayout = scanMode && (validating || preview !== null || note !== null);

  const content = showScanLayout ? (
        <div className="merchant-redeem-scan">
          {validating ? (
            <p className="merchant-note">{t("redeem.validating")}</p>
          ) : preview ? (
            preview.ok && preview.coupon ? (
              <article className="merchant-redeem-card">
                <p className="merchant-redeem-card__label">{t("redeem.couponLabel")}</p>
                <strong className="merchant-redeem-card__reward">
                  {formatCampaignRewardLabel(preview.coupon.rewardSnapshot)}
                </strong>
                <code className="merchant-redeem-card__code">{preview.coupon.code}</code>
                <p className="merchant-note">
                  {t("redeem.issuedAt", {
                    issuedAt: new Date(preview.coupon.issuedAt).toLocaleString(locale),
                    expiresAt: new Date(preview.coupon.expiresAt).toLocaleString(locale),
                  })}
                </p>
                <button
                  type="button"
                  className="merchant-btn merchant-btn--redeem-primary"
                  disabled={redeeming}
                  onClick={() => void redeem()}
                >
                  {redeeming ? t("redeem.redeeming") : t("redeem.redeemBtn")}
                </button>
              </article>
            ) : (
              <p className="merchant-note merchant-redeem-scan__error">
                {i18n.t("redeem.invalidOrUnavailable", {
                  ns: "campaign.errors",
                  error: campaignErrorMessage(preview.error),
                })}
              </p>
            )
          ) : null}

          {note ? <p className="merchant-note merchant-redeem-scan__success">{note}</p> : null}

          <details className="merchant-redeem-manual">
            <summary>{t("redeem.manualEntry")}</summary>
            <label className="merchant-field">
              {t("redeem.code")}
              <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
            </label>
            <div className="merchant-nav">
              <button
                type="button"
                className="merchant-btn"
                disabled={validating}
                onClick={() => void validate()}
              >
                {t("redeem.lookup")}
              </button>
            </div>
          </details>
        </div>
      ) : (
        <>
          <label className="merchant-field">
            {t("redeem.code")}
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
          </label>
          <div className="merchant-nav">
            <button
              type="button"
              className="merchant-btn"
              disabled={validating}
              onClick={() => void validate()}
            >
              {t("redeem.lookup")}
            </button>
            <button
              type="button"
              className="merchant-btn"
              disabled={redeeming || !preview?.ok}
              onClick={() => void redeem()}
            >
              {redeeming ? t("redeem.redeeming") : t("redeem.redeemBtn")}
            </button>
          </div>
          {preview ? (
            preview.ok && preview.coupon ? (
              <article className="merchant-card">
                <strong>{preview.coupon.code}</strong>
                <p>{formatCampaignRewardLabel(preview.coupon.rewardSnapshot)}</p>
                <p className="merchant-note">
                  {t("redeem.issuedAt", {
                    issuedAt: new Date(preview.coupon.issuedAt).toLocaleString(locale),
                    expiresAt: new Date(preview.coupon.expiresAt).toLocaleString(locale),
                  })}
                </p>
              </article>
            ) : (
              <p className="merchant-note">
                {i18n.t("redeem.invalidOrUnavailable", {
                  ns: "campaign.errors",
                  error: campaignErrorMessage(preview.error),
                })}
              </p>
            )
          ) : null}
          {note ? <p className="merchant-note">{note}</p> : null}
        </>
      );

  if (embedded) return content;

  return (
    <div className="merchant-page">
      <MerchantPageToolbar />
      <h1>{t("redeem.title")}</h1>
      <nav className="merchant-nav">
        <MerchantNavLink route={{ view: "home" }}>{t("nav.back")}</MerchantNavLink>
      </nav>
      {content}
    </div>
  );
};

const MerchantRedeemPage: React.FC<PageProp> = ({ visible, data }) => {
  const merchantId =
    (typeof data?.merchantId === "string" ? data.merchantId : "") || merchantIdFromLocation();
  return (
    <MerchantCampaignProvider>
      <MerchantRedeemInner visible={visible} merchantId={merchantId} />
    </MerchantCampaignProvider>
  );
};

export default MerchantRedeemPage;
