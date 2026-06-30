import React, { useCallback, useEffect, useState } from "react";

import { useTranslation } from "react-i18next";



import { PageProp } from "host/RenderApp";

import { useUserManager } from "host/service/UserManager";



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



function paramsFromLocation(): { merchantId: string; campaignId: string } {

  const q = new URLSearchParams(window.location.search);

  return {

    merchantId: q.get("merchantId") ?? "",

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

  expiresAt: number;

  matchId: string;

  ruleId: string;

  rewardSnapshot?: { displayText?: string; itemLabel?: string };

};



export const MerchantCouponListInner: React.FC<{
  visible: number;
  merchantId: string;
  campaignId: string;
  embedded?: boolean;
}> = ({ visible, merchantId, campaignId, embedded }) => {

  const { t, i18n } = useTranslation("campaign.merchant");

  const { askAuth } = useUserManager();

  const { http, authed, fns } = useMerchantCampaignClient();

  const [rows, setRows] = useState<CouponRow[]>([]);

  const [note, setNote] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);



  const refresh = useCallback(async () => {

    if (!http || !authed || !merchantId) {

      setRows([]);

      return;

    }

    setLoading(true);

    try {

      const list = (await http.query(fns.listCampaignCouponsForStaff, {

        merchantId,

        campaignId: campaignId || undefined,

        limit: 200,

      })) as CouponRow[];

      setRows(list ?? []);

    } finally {

      setLoading(false);

    }

  }, [http, authed, merchantId, campaignId, fns.listCampaignCouponsForStaff]);



  useEffect(() => {

    void refresh();

  }, [refresh]);



  const voidCoupon = async (couponId: string) => {

    if (!http || !authed || !merchantId) {

      askAuth({});

      return;

    }

    try {

      await http.mutation(fns.voidCoupon, { merchantId, couponId });

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
      {rows.map((c) => (
        <article key={c.couponId} className="merchant-card">
          <strong>{c.code}</strong>
          <p>{formatCampaignRewardLabel(c.rewardSnapshot)}</p>
          <p className="merchant-note">
            {t("coupons.statusLine", {
              status: c.status,
              ruleId: c.ruleId,
              uid: c.uid.slice(0, 10),
            })}
          </p>
          <p className="merchant-note">
            {t("coupons.issuedAt", {
              issuedAt: new Date(c.issuedAt).toLocaleString(locale),
              expiresAt: new Date(c.expiresAt).toLocaleString(locale),
            })}
          </p>
          <p className="merchant-note">
            {t("coupons.meta", { campaignId: c.campaignId, matchId: c.matchId })}
          </p>
          {c.status === "issued" ? (
            <div className="merchant-nav">
              <button type="button" className="merchant-btn" onClick={() => void voidCoupon(c.couponId)}>
                {t("coupons.void")}
              </button>
            </div>
          ) : null}
        </article>
      ))}
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
        {merchantId ? (
          <MerchantNavLink route={{ view: "coupon-defs", merchantId }}>
            {t("nav.couponDefs")}
          </MerchantNavLink>
        ) : null}
        {merchantId ? (
          <MerchantNavLink route={{ view: "campaigns", merchantId }}>
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

  const merchantId =

    (typeof data?.merchantId === "string" ? data.merchantId : "") || fromLoc.merchantId;

  const campaignId =

    (typeof data?.campaignId === "string" ? data.campaignId : "") || fromLoc.campaignId;



  return (

    <MerchantCampaignProvider>

      <MerchantCouponListInner

        visible={visible}

        merchantId={merchantId}

        campaignId={campaignId}

      />

    </MerchantCampaignProvider>

  );

};



export default MerchantCouponListPage;


