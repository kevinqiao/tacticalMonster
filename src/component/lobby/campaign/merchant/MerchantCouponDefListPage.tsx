import React, { useCallback, useEffect, useState } from "react";

import { useTranslation } from "react-i18next";

import { PageProp } from "host/RenderApp";

import { MerchantPageToolbar } from "../shared/CampaignLocaleSwitcher";

import {
  MerchantCampaignProvider,
  useMerchantCampaignClient,
} from "../service/useMerchantCampaignManager";

import { MerchantNavLink } from "./MerchantEmbeddedNavContext";

import { portalVoucherSkuLabel, type PortalVoucherSkuOption } from "./campaignFormHelpers";

import "./merchant.css";

function partnerIdFromLocation(): number {
  const raw = new URLSearchParams(window.location.search).get("partnerId") ?? "";
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Voucher SKUs are owned by Portal's Partner/Platform shop admin now — this
 * console is a read-only mirror so merchant staff can see what's available
 * to pick as campaign rewards. No create/edit/archive here.
 */
export const MerchantCouponDefListInner: React.FC<{
  visible: number;
  partnerId: number;
  embedded?: boolean;
}> = ({ visible, partnerId, embedded }) => {
  const { t } = useTranslation("campaign.merchant");
  const { http, authed, fns } = useMerchantCampaignClient();

  const [rows, setRows] = useState<PortalVoucherSkuOption[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!http || !authed || !partnerId) {
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      const list = (await http.action(fns.listPartnerVoucherSkusForStaff, {
        partnerId,
      })) as PortalVoucherSkuOption[];
      setRows(list ?? []);
      setNote(null);
    } catch (e) {
      console.warn("[MerchantCouponDefList] listPartnerVoucherSkusForStaff", e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [http, authed, partnerId, fns.listPartnerVoucherSkusForStaff]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (visible === 0) return null;

  const content = (
    <>
      <p className="merchant-note">{t("couponDefs.skuIntro")}</p>
      <h2>{t("couponDefs.existing")}</h2>
      {loading ? <p>{t("campaigns.loading")}</p> : null}
      {rows.map((sku) => (
        <article key={sku.skuId} className="merchant-card">
          <strong>{sku.title}</strong>
          <p>{portalVoucherSkuLabel(sku)}</p>
          <p className="merchant-note">
            {t("couponDefs.skuIdLabel", { skuId: sku.skuId })} ·{" "}
            {sku.validityDays != null
              ? t("couponDefs.validityDaysLabel", { days: sku.validityDays })
              : t("couponDefs.validityDaysUnset")}{" "}
            · {sku.active ? t("couponDefs.activeYes") : t("couponDefs.activeNo")}
          </p>
        </article>
      ))}
      {rows.length === 0 && !loading ? (
        <p className="merchant-note">{t("couponDefs.skuEmpty")}</p>
      ) : null}
      {note ? <p className="merchant-note">{note}</p> : null}
    </>
  );

  if (embedded) return content;

  return (
    <div className="merchant-page">
      <MerchantPageToolbar />
      <h1>{t("couponDefs.title")}</h1>
      <p className="merchant-note">{t("couponDefs.skuIntro")}</p>
      <nav className="merchant-nav">
        <MerchantNavLink route={{ view: "home" }}>{t("nav.back")}</MerchantNavLink>
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

const MerchantCouponDefListPage: React.FC<PageProp> = ({ visible, data }) => {
  const fromData =
    typeof data?.partnerId === "number"
      ? data.partnerId
      : typeof data?.partnerId === "string"
        ? Number(data.partnerId)
        : 0;
  const partnerId =
    Number.isFinite(fromData) && fromData > 0 ? fromData : partnerIdFromLocation();

  return (
    <MerchantCampaignProvider>
      <MerchantCouponDefListInner visible={visible} partnerId={partnerId} />
    </MerchantCampaignProvider>
  );
};

export default MerchantCouponDefListPage;
