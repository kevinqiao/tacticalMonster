import React, { useState } from "react";

import { useTranslation } from "react-i18next";



import { PageProp } from "host/RenderApp";

import { useUserManager } from "host/service/UserManager";



import {

  campaignAdminErrorMessage,

  campaignErrorMessage,

  campaignSuccessMessage,

} from "../shared/campaignErrorMessage";

import { MerchantPageToolbar } from "../shared/CampaignLocaleSwitcher";

import { applyMerchantTheme } from "../service/applyMerchantTheme";

import { MerchantCampaignProvider, useMerchantCampaignClient } from "../service/useMerchantCampaignManager";

import { MerchantNavLink } from "./MerchantEmbeddedNavContext";

import "./merchant.css";



function partnerIdFromLocation(): number {
  const raw = new URLSearchParams(window.location.search).get("partnerId") ?? "";
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
}



export const MerchantBrandSettingsInner: React.FC<{
  visible: number;
  partnerId: number;
  embedded?: boolean;
}> = ({ visible, partnerId, embedded }) => {

  const { t } = useTranslation("campaign.merchant");

  const { askAuth } = useUserManager();

  const { http, authed, fns } = useMerchantCampaignClient();

  const [brandUrl, setBrandUrl] = useState("");

  const [note, setNote] = useState<string | null>(null);

  const [draftTheme, setDraftTheme] = useState<unknown | null>(null);



  const syncTheme = async () => {

    if (!http || !authed || !partnerId) {

      askAuth({});

      return;

    }

    try {

      const result = (await http.action(fns.syncThemeFromUrl, {

        partnerId,

        sourceUrl: brandUrl,

      })) as { ok?: boolean; themeDraft?: unknown; error?: string };

      if (result?.themeDraft) {

        setDraftTheme(result.themeDraft);

        applyMerchantTheme(result.themeDraft as Parameters<typeof applyMerchantTheme>[0]);

        setNote(campaignSuccessMessage("themeDraftFetched"));

      } else {

        setNote(campaignErrorMessage(result?.error) ?? campaignErrorMessage("sync_failed"));

      }

    } catch (e) {

      setNote(campaignAdminErrorMessage(e));

    }

  };



  const approve = async () => {

    if (!http || !authed || !partnerId || !draftTheme) return;

    await http.action(fns.approveMerchantTheme, {
      partnerId,
      themeJson: draftTheme,
    });

    setNote(campaignSuccessMessage("themePublished"));

  };



  if (visible === 0) return null;

  const content = (
    <>
      <label className="merchant-field">
        {t("brand.brandUrl")}
        <input
          value={brandUrl}
          onChange={(e) => setBrandUrl(e.target.value)}
          placeholder={t("brand.brandUrlPlaceholder")}
        />
      </label>
      <div className="merchant-nav">
        <button type="button" className="merchant-btn" onClick={() => void syncTheme()}>
          {t("brand.syncTheme")}
        </button>
        <button
          type="button"
          className="merchant-btn"
          disabled={!draftTheme}
          onClick={() => void approve()}
        >
          {t("brand.approve")}
        </button>
      </div>
      {draftTheme ? (
        <pre className="merchant-card">{JSON.stringify(draftTheme, null, 2)}</pre>
      ) : null}
      {note ? <p className="merchant-note">{note}</p> : null}
    </>
  );

  if (embedded) return content;

  return (
    <div className="merchant-page">
      <MerchantPageToolbar />
      <h1>{t("brand.title")}</h1>
      <nav className="merchant-nav">
        <MerchantNavLink route={{ view: "home" }}>{t("nav.back")}</MerchantNavLink>
      </nav>
      {content}
    </div>
  );
};



const MerchantBrandSettingsPage: React.FC<PageProp> = ({ visible, data }) => {
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
      <MerchantBrandSettingsInner visible={visible} partnerId={partnerId} />
    </MerchantCampaignProvider>
  );
};



export default MerchantBrandSettingsPage;


