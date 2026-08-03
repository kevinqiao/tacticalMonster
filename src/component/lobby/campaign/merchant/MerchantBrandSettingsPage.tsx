import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ConvexProvider, useAction, useMutation, useQuery } from "convex/react";

import { api } from "@/convex/sso/convex/_generated/api";
import { PageProp } from "host/RenderApp";
import { ssoConvexClient } from "host/service/AppProviders";
import { useUserManager } from "host/service/UserManager";

import {
  campaignAdminErrorMessage,
  campaignErrorMessage,
  campaignSuccessMessage,
} from "../shared/campaignErrorMessage";
import { MerchantPageToolbar } from "../shared/CampaignLocaleSwitcher";
import { applyMerchantTheme } from "../service/applyMerchantTheme";
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

  const brandView = useQuery(
    api.service.partner.partnerBrandAdmin.getPartnerBrandAdmin,
    partnerId >= 0 ? { partnerId } : "skip"
  );
  const syncFromUrl = useAction(api.service.partner.partnerBrandSync.syncPartnerBrandFromUrl);
  const approveBrand = useAction(api.service.partner.partnerBrandAdmin.approvePartnerBrand);
  const updateHost = useMutation(api.service.partner.partnerBrandAdmin.updatePartnerHost);

  const [host, setHost] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [draftTheme, setDraftTheme] = useState<unknown | null>(null);
  const [primary, setPrimary] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!brandView) return;
    setHost(brandView.host || brandView.brand?.sourceUrl || "");
    if (brandView.brandDraft) {
      setDraftTheme(brandView.brandDraft);
      applyMerchantTheme(brandView.brandDraft as Parameters<typeof applyMerchantTheme>[0]);
    } else if (brandView.brand?.theme) {
      setDraftTheme(brandView.brand.theme);
      applyMerchantTheme(brandView.brand.theme as Parameters<typeof applyMerchantTheme>[0]);
    }
    const p = brandView.brand?.theme?.brand?.primary ?? "";
    setPrimary(p);
  }, [brandView]);

  const syncTheme = async () => {
    if (!partnerId && partnerId !== 0) {
      askAuth({});
      return;
    }
    const url = host.trim();
    if (!url) {
      setNote(campaignErrorMessage("https_required") ?? "URL required");
      return;
    }
    setBusy(true);
    try {
      const result = (await syncFromUrl({
        partnerId,
        sourceUrl: url,
      })) as { ok?: boolean; themeDraft?: unknown; error?: string };
      if (result?.themeDraft) {
        setDraftTheme(result.themeDraft);
        applyMerchantTheme(result.themeDraft as Parameters<typeof applyMerchantTheme>[0]);
        const draft = result.themeDraft as { brand?: { primary?: string } };
        if (draft.brand?.primary) setPrimary(draft.brand.primary);
        setNote(campaignSuccessMessage("themeDraftFetched"));
      } else {
        setNote(campaignErrorMessage(result?.error) ?? campaignErrorMessage("sync_failed"));
      }
    } catch (e) {
      setNote(campaignAdminErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const approve = async () => {
    if (!draftTheme) return;
    setBusy(true);
    try {
      let themeJson = draftTheme as Record<string, unknown>;
      if (primary.trim() && themeJson.brand && typeof themeJson.brand === "object") {
        const brand = { ...(themeJson.brand as Record<string, unknown>), primary: primary.trim() };
        const shell = {
          ...((themeJson.shell as Record<string, unknown>) ?? {}),
          ctaBg: primary.trim(),
        };
        themeJson = { ...themeJson, brand, shell };
      }
      await approveBrand({
        partnerId,
        themeJson: themeJson as any,
      });
      setNote(campaignSuccessMessage("themePublished"));
    } catch (e) {
      setNote(campaignAdminErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const onHostBlur = () => {
    const next = host.trim();
    if (!next || next === (brandView?.host ?? "")) return;
    void updateHost({ partnerId, host: next }).catch((e) => {
      setNote(campaignAdminErrorMessage(e));
    });
  };

  if (visible === 0) return null;

  const content = (
    <>
      <div className="merchant-brand-sync-row">
        <label className="merchant-field merchant-brand-sync-row__field">
          {t("brand.brandUrl")}
          <input
            value={host}
            onChange={(e) => setHost(e.target.value)}
            onBlur={onHostBlur}
            placeholder={t("brand.brandUrlPlaceholder")}
          />
        </label>
        <button
          type="button"
          className="merchant-btn merchant-brand-sync-row__btn"
          disabled={busy}
          onClick={() => void syncTheme()}
        >
          {t("brand.syncTheme")}
        </button>
      </div>
      {draftTheme ? (
        <label className="merchant-field">
          {t("brand.primaryColor")}
          <input
            value={primary}
            onChange={(e) => setPrimary(e.target.value)}
            placeholder="#2563eb"
          />
        </label>
      ) : null}
      <div className="merchant-nav">
        <button
          type="button"
          className="merchant-btn"
          disabled={!draftTheme || busy}
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
    Number.isFinite(fromData) && fromData >= 0 ? fromData : partnerIdFromLocation();

  return (
    <ConvexProvider client={ssoConvexClient}>
      <MerchantBrandSettingsInner visible={visible} partnerId={partnerId} />
    </ConvexProvider>
  );
};

export default MerchantBrandSettingsPage;
