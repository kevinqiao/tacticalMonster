import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ConvexProvider, useQuery } from "convex/react";
import { useTranslation } from "react-i18next";

import { PageProp } from "host/RenderApp";
import { ssoConvexClient } from "host/service/AppProviders";
import { useUserManager } from "host/service/UserManager";
import { api } from "@/convex/sso/convex/_generated/api";
import i18n from "@/i18n";

import {
  campaignAdminErrorMessage,
  campaignErrorMessage,
  campaignSuccessMessage,
} from "../shared/campaignErrorMessage";
import { MerchantPageToolbar } from "../shared/CampaignLocaleSwitcher";
import {
  MerchantCampaignProvider,
  useMerchantCampaignClient,
} from "../service/useMerchantCampaignManager";
import { formatCampaignRewardLabel } from "../shared/campaignRewardDisplay";
import { MerchantNavLink } from "./MerchantEmbeddedNavContext";
import MerchantWebSignInForm from "./MerchantWebSignInForm";
import { useLogoutUnauthorizedSession } from "../../shared/useLogoutUnauthorizedSession";

import "./merchant.css";

function storeIdFromLocation(): string {
  const params = new URLSearchParams(window.location.search);
  // Prefer storeId; accept legacy merchantId query.
  return (params.get("storeId") ?? params.get("merchantId") ?? "").trim();
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
    activatesAt?: number;
    expiresAt: number;
  };
};

type StoreOption = {
  storeId: string;
  name: string;
  slug: string;
  status: string;
  role: string;
};

type MerchantRedeemInnerProps = {
  visible: number;
  /** Pre-selected store (home card / legacy deep link). */
  initialStoreId?: string;
  embedded?: boolean;
};

const MerchantRedeemBody: React.FC<MerchantRedeemInnerProps> = ({
  visible,
  initialStoreId = "",
  embedded,
}) => {
  const { t } = useTranslation("campaign.merchant");
  const { askAuth } = useUserManager();
  const { http, authed, fns } = useMerchantCampaignClient();

  const initialCode = codeFromLocation();
  const urlStoreId = storeIdFromLocation() || initialStoreId.trim();

  const [code, setCode] = useState(initialCode);
  const [scanMode] = useState(() => Boolean(initialCode));
  const [storeId, setStoreId] = useState(urlStoreId);
  const [preview, setPreview] = useState<CouponPreview | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const autoValidatedRef = useRef(false);

  const stores = useQuery(
    api.service.partner.storeAdmin.listMyStores,
    authed ? {} : "skip"
  ) as StoreOption[] | undefined;

  const activeStores = useMemo(
    () => (stores ?? []).filter((s) => s.status === "active"),
    [stores]
  );

  // Resolve store: URL/prop → single store auto → keep multi for picker
  useEffect(() => {
    if (urlStoreId) {
      setStoreId(urlStoreId);
      return;
    }
    if (!authed || stores === undefined) return;
    if (activeStores.length === 1) {
      setStoreId(activeStores[0]!.storeId);
    }
  }, [urlStoreId, authed, stores, activeStores]);

  const selectedStore = activeStores.find((s) => s.storeId === storeId) ?? null;
  const needsStorePick = authed && !urlStoreId && activeStores.length > 1 && !storeId;
  const noStores = authed && stores !== undefined && activeStores.length === 0;
  useLogoutUnauthorizedSession(noStores);

  const validate = useCallback(
    async (codeToValidate?: string, storeOverride?: string) => {
      const sid = (storeOverride ?? storeId).trim();
      if (!http || !sid) return;

      const normalized = (codeToValidate ?? code).trim().toUpperCase();
      if (!normalized) return;

      setValidating(true);
      setNote(null);
      try {
        const row = (await http.action(fns.validateCouponCode, {
          storeId: sid,
          code: normalized,
        })) as CouponPreview;
        setPreview(row);
        if (codeToValidate) setCode(normalized);
      } finally {
        setValidating(false);
      }
    },
    [http, storeId, code, fns.validateCouponCode]
  );

  useEffect(() => {
    if (!http || !storeId || !initialCode || autoValidatedRef.current) return;
    autoValidatedRef.current = true;
    void validate(initialCode, storeId);
  }, [http, storeId, initialCode, validate]);

  const onPickStore = (id: string) => {
    setStoreId(id);
    setPreview(null);
    setNote(null);
    autoValidatedRef.current = false;
    if (initialCode || code) {
      autoValidatedRef.current = true;
      void validate(initialCode || code, id);
    }
  };

  const redeem = async () => {
    if (!http || !authed || !storeId) {
      askAuth({});
      return;
    }

    const normalized = code.trim().toUpperCase();
    if (!normalized) return;

    setRedeeming(true);
    setNote(null);
    try {
      const result = (await http.action(fns.redeemCoupon, {
        storeId,
        code: normalized,
      })) as { ok?: boolean; error?: string };
      if (result && result.ok === false) {
        setNote(campaignErrorMessage(result.error));
        return;
      }
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

  if (!authed) {
    const gate = (
      <>
        <p className="merchant-note">{t("redeem.signInRequired")}</p>
        {initialCode ? (
          <p className="merchant-note">
            {t("redeem.pendingCode", { code: initialCode })}
          </p>
        ) : null}
        <MerchantWebSignInForm />
      </>
    );
    if (embedded) return gate;
    return (
      <div className="merchant-page">
        <MerchantPageToolbar />
        <h1>{t("redeem.title")}</h1>
        {gate}
      </div>
    );
  }

  if (stores === undefined) {
    const loading = <p className="merchant-note">{t("redeem.loadingStores")}</p>;
    if (embedded) return loading;
    return (
      <div className="merchant-page">
        <MerchantPageToolbar />
        <h1>{t("redeem.title")}</h1>
        {loading}
      </div>
    );
  }

  if (noStores) {
    const empty = <p className="merchant-note">当前账号无门店权限，正在退出并打开登录…</p>;
    if (embedded) return empty;
    return (
      <div className="merchant-page">
        <MerchantPageToolbar />
        <h1>{t("redeem.title")}</h1>
        {empty}
      </div>
    );
  }

  const storePicker =
    activeStores.length > 1 ? (
      <label className="merchant-field">
        {t("redeem.store")}
        <select
          value={storeId}
          onChange={(e) => onPickStore(e.target.value)}
        >
          {!storeId ? (
            <option value="">{t("redeem.pickStore")}</option>
          ) : null}
          {activeStores.map((s) => (
            <option key={s.storeId} value={s.storeId}>
              {s.name} (/{s.slug})
            </option>
          ))}
        </select>
      </label>
    ) : selectedStore ? (
      <p className="merchant-note">
        {t("redeem.currentStore", { name: selectedStore.name })}
      </p>
    ) : null;

  const showScanLayout = scanMode && (validating || preview !== null || note !== null || needsStorePick);

  const content = (
    <>
      {storePicker}
      {needsStorePick ? (
        <p className="merchant-note">{t("redeem.pickStoreHint")}</p>
      ) : showScanLayout ? (
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
                    activatesAt: new Date(
                      preview.coupon.activatesAt ?? preview.coupon.issuedAt
                    ).toLocaleString(locale),
                    expiresAt: new Date(preview.coupon.expiresAt).toLocaleString(locale),
                  })}
                </p>
                <button
                  type="button"
                  className="merchant-btn merchant-btn--redeem-primary"
                  disabled={redeeming || !storeId}
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
                disabled={validating || !storeId}
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
              disabled={validating || !storeId}
              onClick={() => void validate()}
            >
              {t("redeem.lookup")}
            </button>
            <button
              type="button"
              className="merchant-btn"
              disabled={redeeming || !preview?.ok || !storeId}
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
                    activatesAt: new Date(
                      preview.coupon.activatesAt ?? preview.coupon.issuedAt
                    ).toLocaleString(locale),
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
      )}
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

/** SSO listMyStores — nest under campaign provider without routing queries to campaign deploy. */
export const MerchantRedeemInner: React.FC<MerchantRedeemInnerProps> = (props) => (
  <ConvexProvider client={ssoConvexClient}>
    <MerchantRedeemBody {...props} />
  </ConvexProvider>
);

const MerchantRedeemPage: React.FC<PageProp> = ({ visible, data }) => {
  const initialStoreId =
    (typeof data?.storeId === "string" ? data.storeId : "") ||
    (typeof data?.merchantId === "string" ? data.merchantId : "") ||
    storeIdFromLocation();
  return (
    <MerchantCampaignProvider>
      <MerchantRedeemInner visible={visible} initialStoreId={initialStoreId} />
    </MerchantCampaignProvider>
  );
};

export default MerchantRedeemPage;
