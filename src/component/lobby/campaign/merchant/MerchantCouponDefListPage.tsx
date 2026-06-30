import React, { useCallback, useEffect, useState } from "react";

import { useTranslation } from "react-i18next";



import { PageProp } from "host/RenderApp";

import { useUserManager } from "host/service/UserManager";



import {

  campaignAdminErrorMessage,

  campaignSuccessMessage,

} from "../shared/campaignErrorMessage";

import { MerchantPageToolbar } from "../shared/CampaignLocaleSwitcher";

import { formatCampaignRewardLabel } from "../shared/campaignRewardDisplay";

import {

  MerchantCampaignProvider,

  useMerchantCampaignClient,

} from "../service/useMerchantCampaignManager";

import { MerchantNavLink } from "./MerchantEmbeddedNavContext";

import type { MerchantCouponDefOption } from "./campaignFormHelpers";

import "./merchant.css";



function merchantIdFromLocation(): string {

  return new URLSearchParams(window.location.search).get("merchantId") ?? "";

}



export const MerchantCouponDefListInner: React.FC<{
  visible: number;
  merchantId: string;
  embedded?: boolean;
}> = ({ visible, merchantId, embedded }) => {

  const { t } = useTranslation("campaign.merchant");

  const { askAuth } = useUserManager();

  const { http, authed, fns } = useMerchantCampaignClient();

  const [rows, setRows] = useState<MerchantCouponDefOption[]>([]);

  const [name, setName] = useState("");

  const [itemLabel, setItemLabel] = useState("");

  const [note, setNote] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);



  const refresh = useCallback(async () => {

    if (!http || !authed || !merchantId) {

      setRows([]);

      return;

    }

    setLoading(true);

    try {

      const list = (await http.query(fns.listCouponDefsForStaff, {

        merchantId,

        includeArchived: true,

      })) as MerchantCouponDefOption[];

      setRows(list ?? []);

    } finally {

      setLoading(false);

    }

  }, [http, authed, merchantId, fns.listCouponDefsForStaff]);



  useEffect(() => {

    void refresh();

  }, [refresh]);



  const createDef = async () => {

    if (!http || !authed || !merchantId) {

      askAuth({});

      return;

    }

    try {

      await http.mutation(fns.createCouponDef, {

        merchantId,

        name: name.trim(),

        itemLabel: itemLabel.trim(),

      });

      setName("");

      setItemLabel("");

      setNote(campaignSuccessMessage("couponDefCreated"));

      await refresh();

    } catch (e) {

      setNote(campaignAdminErrorMessage(e));

    }

  };



  const archiveDef = async (couponDefId: string) => {

    if (!http || !authed || !merchantId) return;

    try {

      await http.mutation(fns.archiveCouponDef, { merchantId, couponDefId });

      setNote(campaignSuccessMessage("archived"));

      await refresh();

    } catch (e) {

      setNote(campaignAdminErrorMessage(e));

    }

  };



  if (visible === 0) return null;

  const content = (
    <>
      {embedded ? <p className="merchant-note">{t("couponDefs.intro")}</p> : null}
      <section className="merchant-card">
        <h2>{t("couponDefs.newTitle")}</h2>
        <label className="merchant-field">
          {t("couponDefs.adminName")}
          <input
            value={name}
            placeholder={t("couponDefs.adminNamePlaceholder")}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="merchant-field">
          {t("couponDefs.itemLabel")}
          <input
            value={itemLabel}
            placeholder={t("couponDefs.itemLabelPlaceholder")}
            onChange={(e) => setItemLabel(e.target.value)}
          />
        </label>
        <button type="button" className="merchant-btn" onClick={() => void createDef()}>
          {t("couponDefs.create")}
        </button>
      </section>

      <h2>{t("couponDefs.existing")}</h2>
      {loading ? <p>{t("campaigns.loading")}</p> : null}
      {rows.map((def) => (
        <article key={def.couponDefId} className="merchant-card">
          <strong>{def.name}</strong>
          <p>{formatCampaignRewardLabel(def.reward)}</p>
          <p className="merchant-note">
            {def.status} · {def.couponDefId}
          </p>
          {def.status === "active" ? (
            <button
              type="button"
              className="merchant-btn"
              onClick={() => void archiveDef(def.couponDefId)}
            >
              {t("couponDefs.archive")}
            </button>
          ) : null}
        </article>
      ))}
      {rows.length === 0 && !loading ? (
        <p className="merchant-note">{t("couponDefs.empty")}</p>
      ) : null}
      {note ? <p className="merchant-note">{note}</p> : null}
    </>
  );

  if (embedded) return content;

  return (
    <div className="merchant-page">
      <MerchantPageToolbar />
      <h1>{t("couponDefs.title")}</h1>
      <p className="merchant-note">{t("couponDefs.intro")}</p>
      <nav className="merchant-nav">
        <MerchantNavLink route={{ view: "home" }}>{t("nav.back")}</MerchantNavLink>
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

const MerchantCouponDefListPage: React.FC<PageProp> = ({ visible, data }) => {

  const merchantId =

    (typeof data?.merchantId === "string" ? data.merchantId : "") || merchantIdFromLocation();

  return (

    <MerchantCampaignProvider>

      <MerchantCouponDefListInner visible={visible} merchantId={merchantId} />

    </MerchantCampaignProvider>

  );

};



export default MerchantCouponDefListPage;


