import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { PageProp } from "host/RenderApp";
import { ssoConvexClient } from "host/service/AppProviders";
import { useUserManager } from "host/service/UserManager";
import { api } from "@/convex/sso/convex/_generated/api";

import {
  campaignAdminErrorMessage,
  campaignSuccessMessage,
} from "../shared/campaignErrorMessage";
import { MerchantPageToolbar } from "../shared/CampaignLocaleSwitcher";
import {
  MerchantCampaignProvider,
  useMerchantCampaignClient,
} from "../service/useMerchantCampaignManager";
import { MerchantNavLink } from "./MerchantEmbeddedNavContext";
import { formatCampaignRewardLabel } from "../shared/campaignRewardDisplay";

import "./merchant.css";

function paramsFromLocation(): { partnerId: number; campaignId: string } {
  const q = new URLSearchParams(window.location.search);
  const n = Number(q.get("partnerId") ?? "");
  return {
    partnerId: Number.isFinite(n) && n > 0 ? n : 0,
    campaignId: q.get("campaignId") ?? "",
  };
}

type CouponRow = {
  couponId: string;
  code: string;
  campaignId: string;
  uid: string;
  status: string;
  issuedAt: number;
  activatesAt?: number;
  expiresAt: number;
  redeemedAt?: number;
  redeemedAtStoreId?: string;
  source?: "pass_run" | "campaign_settle";
  runTournamentId?: string;
  matchId?: string;
  settlementId?: string;
  ruleId: string;
  rewardSnapshot?: { displayText?: string; itemLabel?: string };
};

/** DB may still say `issued` until redeem/void patches it — treat past expiresAt as expired. */
function isCouponExpired(c: CouponRow, now = Date.now()): boolean {
  return c.status === "expired" || (c.status === "issued" && now > c.expiresAt);
}

function couponStatusMark(
  c: CouponRow,
  t: (key: string, opts?: Record<string, string>) => string,
  storeNameById: Map<string, string>
): { label: string; statusLabel: string } | null {
  if (c.status === "redeemed") {
    const storeId = c.redeemedAtStoreId?.trim();
    if (storeId) {
      const store = storeNameById.get(storeId) ?? storeId;
      const label = t("coupons.redeemedWithStore", { store });
      return { label, statusLabel: label };
    }
    const label = t("coupons.redeemed");
    return { label, statusLabel: label };
  }
  if (isCouponExpired(c)) {
    const label = t("coupons.expired");
    return { label, statusLabel: label };
  }
  return null;
}



export const MerchantCouponListInner: React.FC<{
  visible: number;
  partnerId: number;
  campaignId: string;
  embedded?: boolean;
}> = ({ visible, partnerId, campaignId, embedded }) => {

  const { t, i18n } = useTranslation("campaign.merchant");

  const { askAuth } = useUserManager();

  const { http, authed, fns } = useMerchantCampaignClient();

  const [rows, setRows] = useState<CouponRow[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [storeNameById, setStoreNameById] = useState<Map<string, string>>(
    () => new Map()
  );

  useEffect(() => {
    if (!authed || !partnerId) {
      setStoreNameById(new Map());
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const stores = (await ssoConvexClient.query(
          api.service.partner.storeAdmin.listStoresForPartner,
          { partnerId }
        )) as Array<{ storeId: string; name: string }>;
        if (cancelled) return;
        setStoreNameById(new Map(stores.map((s) => [s.storeId, s.name])));
      } catch (e) {
        console.warn("[MerchantCouponList] listStoresForPartner", e);
        if (!cancelled) setStoreNameById(new Map());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authed, partnerId]);

  const refresh = useCallback(async () => {

    if (!http || !authed || !partnerId) {

      setRows([]);

      return;

    }

    setLoading(true);

    try {

      const list = (await http.query(fns.listCampaignCouponsForStaff, {

        partnerId,

        campaignId: campaignId || undefined,

        limit: 200,

      })) as CouponRow[];

      setRows(list ?? []);

    } finally {

      setLoading(false);

    }

  }, [http, authed, partnerId, campaignId, fns.listCampaignCouponsForStaff]);



  useEffect(() => {

    void refresh();

  }, [refresh]);



  const voidCoupon = async (couponId: string) => {

    if (!http || !authed || !partnerId) {

      askAuth({});

      return;

    }

    try {

      await http.mutation(fns.voidCoupon, { partnerId, couponId });

      setNote(campaignSuccessMessage("voided"));

      await refresh();

    } catch (e) {

      setNote(campaignAdminErrorMessage(e));

    }

  };



  if (visible === 0) return null;



  const locale = i18n.language;

  const content = (
    <>
      {campaignId ? (
        <p className="merchant-note">{t("coupons.filterCampaign", { campaignId })}</p>
      ) : (
        <p className="merchant-note">{t("coupons.recent200")}</p>
      )}
      {loading ? <p>{t("campaigns.loading")}</p> : null}
      {rows.map((c) => {
        const mark = couponStatusMark(c, t, storeNameById);
        return (
          <article key={c.couponId} className="merchant-card">
            <strong>
              {c.code}
              {mark ? (
                <span className="merchant-coupon-status-mark"> · {mark.label}</span>
              ) : null}
            </strong>
            <p>{formatCampaignRewardLabel(c.rewardSnapshot)}</p>
            <p className="merchant-note">
              {t("coupons.statusLine", {
                status: mark?.statusLabel ?? c.status,
                ruleId: c.ruleId,
                uid: c.uid.slice(0, 10),
              })}
            </p>
            <p className="merchant-note">
              {t("coupons.issuedAt", {
                issuedAt: new Date(c.issuedAt).toLocaleString(locale),
                activatesAt: new Date(c.activatesAt ?? c.issuedAt).toLocaleString(locale),
                expiresAt: new Date(c.expiresAt).toLocaleString(locale),
              })}
            </p>
            {c.status === "redeemed" && c.redeemedAt ? (
              <p className="merchant-note">
                {t("coupons.redeemedAt", {
                  redeemedAt: new Date(c.redeemedAt).toLocaleString(locale),
                })}
              </p>
            ) : null}
            <p className="merchant-note">
              {c.source === "campaign_settle"
                ? t("coupons.metaSettle", {
                    campaignId: c.campaignId,
                    settlementId: c.settlementId ?? "—",
                  })
                : t("coupons.metaPassRun", {
                    campaignId: c.campaignId,
                    runTournamentId: c.runTournamentId ?? "—",
                  })}
            </p>
            {c.status === "issued" && !mark ? (
              <div className="merchant-nav">
                <button type="button" className="merchant-btn" onClick={() => void voidCoupon(c.couponId)}>
                  {t("coupons.void")}
                </button>
              </div>
            ) : null}
          </article>
        );
      })}
      {rows.length === 0 && !loading ? (
        <p className="merchant-note">{t("coupons.empty")}</p>
      ) : null}
      {note ? <p className="merchant-note">{note}</p> : null}
    </>
  );

  if (embedded) return content;

  return (
    <div className="merchant-page">
      <MerchantPageToolbar />
      <h1>{t("coupons.title")}</h1>
      <nav className="merchant-nav">
        <MerchantNavLink route={{ view: "home" }}>{t("nav.back")}</MerchantNavLink>
        {partnerId ? (
          <MerchantNavLink route={{ view: "coupon-defs", partnerId: String(partnerId) }}>
            {t("nav.couponDefs")}
          </MerchantNavLink>
        ) : null}
        {partnerId ? (
          <MerchantNavLink route={{ view: "campaigns", partnerId: String(partnerId) }}>
            {t("nav.campaigns")}
          </MerchantNavLink>
        ) : null}
      </nav>
      {content}
    </div>
  );
};



const MerchantCouponListPage: React.FC<PageProp> = ({ visible, data }) => {
  const fromLoc = paramsFromLocation();
  const fromData =
    typeof data?.partnerId === "number"
      ? data.partnerId
      : typeof data?.partnerId === "string"
        ? Number(data.partnerId)
        : 0;
  const partnerId =
    Number.isFinite(fromData) && fromData > 0 ? fromData : fromLoc.partnerId;
  const campaignId =
    (typeof data?.campaignId === "string" ? data.campaignId : "") || fromLoc.campaignId;

  return (
    <MerchantCampaignProvider>
      <MerchantCouponListInner
        visible={visible}
        partnerId={partnerId}
        campaignId={campaignId}
      />
    </MerchantCampaignProvider>
  );
};

export default MerchantCouponListPage;


