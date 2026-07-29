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

/** Portal backpack item shape returned by `listCampaignCouponsForStaff`. */
type PortalCouponItem = {
  itemId: string;
  code: string;
  title?: string;
  rewardText?: string;
  campaignId: string;
  uid: string;
  status: string;
  issuedAt: number;
  expiresAt?: number | null;
  redeemedAt?: number | null;
  redeemedAtStoreId?: string | null;
};

/** Local display row — mapped from Portal's backpack status vocabulary. */
type CouponRow = {
  couponId: string;
  code: string;
  campaignId: string;
  uid: string;
  status: "issued" | "redeemed" | "void" | "expired" | string;
  issuedAt: number;
  activatesAt: number;
  expiresAt: number;
  redeemedAt?: number;
  redeemedAtStoreId?: string;
  ruleId: string;
  rewardSnapshot?: { displayText?: string; itemLabel?: string };
};

/** Portal backpack status (owned/pending_use/redeemed/void/…) → merchant display status. */
function couponRowFromPortalItem(item: PortalCouponItem, now = Date.now()): CouponRow {
  const expiresAt = item.expiresAt ?? 0;
  let status: CouponRow["status"];
  if (item.status === "redeemed") {
    status = "redeemed";
  } else if (item.status === "void") {
    status = "void";
  } else if (expiresAt && now > expiresAt) {
    status = "expired";
  } else if (item.status === "owned" || item.status === "pending_use") {
    status = "issued";
  } else {
    status = item.status;
  }
  return {
    couponId: item.itemId,
    code: item.code,
    campaignId: item.campaignId,
    uid: item.uid,
    status,
    issuedAt: item.issuedAt,
    activatesAt: item.issuedAt,
    expiresAt,
    redeemedAt: item.redeemedAt ?? undefined,
    redeemedAtStoreId: item.redeemedAtStoreId ?? undefined,
    ruleId: "—",
    rewardSnapshot: { displayText: item.rewardText, itemLabel: item.title },
  };
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
  if (c.status === "expired") {
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
      const list = (await http.action(fns.listCampaignCouponsForStaff, {
        partnerId,
        campaignId: campaignId || undefined,
        limit: 200,
      })) as PortalCouponItem[];
      setRows((list ?? []).map((item) => couponRowFromPortalItem(item)));
    } finally {
      setLoading(false);
    }
  }, [http, authed, partnerId, campaignId, fns.listCampaignCouponsForStaff]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const voidCoupon = async (c: CouponRow) => {
    if (!http || !authed || !partnerId) {
      askAuth({});
      return;
    }
    try {
      await http.action(fns.voidCouponForStaff, {
        partnerId,
        campaignId: c.campaignId,
        code: c.code,
      });
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
                activatesAt: new Date(c.activatesAt).toLocaleString(locale),
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
            <p className="merchant-note">{t("coupons.meta", { campaignId: c.campaignId })}</p>
            {c.status === "issued" && !mark ? (
              <div className="merchant-nav">
                <button type="button" className="merchant-btn" onClick={() => void voidCoupon(c)}>
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
