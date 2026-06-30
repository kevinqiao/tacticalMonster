import React, { useMemo } from "react";

import { useTranslation } from "react-i18next";

import { PageProp } from "host/RenderApp";

import { useUserManager } from "host/service/UserManager";

import { LazyPortalProvider } from "../service/LazyPortalProvider";
import { isValidPortalGameType } from "../../portal/service/portalGameTypeGuards";

import {
  MerchantCampaignProvider,
  useCampaignPublicLive,
  useMerchantCampaignsPublicLive,
  isDisplayCampaign,
  type CampaignPublicView,
} from "../service/useMerchantCampaignManager";

import { CampaignMerchantCarousel } from "./CampaignMerchantCarousel";

import { CampaignLandingWithFlow } from "./campaignLandingViews";

import { CampaignDisplayWithFlow } from "./CampaignDisplayWithFlow";

import "../playForCoupon.css";

import "./campaignLanding.css";

function slugsFromLocation(): { merchantSlug: string; campaignSlug: string } {
  const parts = window.location.pathname.split("/").filter(Boolean);

  if (parts[0] === "campaign" && parts[1] && parts[1] !== "merchant") {
    return { merchantSlug: parts[1], campaignSlug: parts[2] ?? "" };
  }

  return { merchantSlug: "", campaignSlug: "" };
}

const CampaignLandingSingle: React.FC<{
  merchantSlug: string;
  campaignSlug: string;
  campaignPublic: CampaignPublicView;
  loadingPublic: boolean;
  user: { uid?: string } | null | undefined;
  signOut: () => void;
}> = ({ merchantSlug, campaignSlug, campaignPublic, loadingPublic, user, signOut }) => {
  if (isDisplayCampaign(campaignPublic.campaign)) {
    return (
      <CampaignDisplayWithFlow campaignPublic={campaignPublic} merchantSlug={merchantSlug} />
    );
  }

  const gameType = isValidPortalGameType(campaignPublic.campaign.gameType ?? "")
    ? campaignPublic.campaign.gameType!
    : null;

  return (
    <LazyPortalProvider gameType={gameType}>
      <CampaignLandingWithFlow
        campaignPublic={campaignPublic}
        merchantSlug={merchantSlug}
        campaignSlug={campaignSlug}
        loadingPublic={loadingPublic}
        user={user}
        signOut={signOut}
      />
    </LazyPortalProvider>
  );
};

const CampaignLandingInner: React.FC<{
  visible: number;
  merchantSlug: string;
  campaignSlug: string;
}> = ({ visible, merchantSlug, campaignSlug }) => {
  const { t } = useTranslation("campaign.player");
  const { user, logout, cancelAuth, askAuth } = useUserManager();

  const { slides, isLoading: slidesLoading } = useMerchantCampaignsPublicLive(merchantSlug);

  const carouselInitialSlug = useMemo(() => {
    if (!slides?.length) return campaignSlug;
    if (campaignSlug && slides.some((s) => s.slug === campaignSlug)) return campaignSlug;
    return slides[0]!.slug;
  }, [slides, campaignSlug]);

  const useCarousel = Boolean(slides && slides.length >= 1);

  const { campaignPublic: fallbackPublic, isLoading: fallbackLoading } = useCampaignPublicLive(
    merchantSlug,
    useCarousel ? null : campaignSlug
  );

  const signOut = () => {
    cancelAuth();
    void logout();
  };

  if (visible === 0) return null;

  if (!merchantSlug) {
    return (
      <div className="campaign-page campaign-page--plain">
        <div className="campaign-error">{t("landing.invalidUrl")}</div>
      </div>
    );
  }

  if (slidesLoading) {
    return (
      <div className="campaign-page campaign-page--plain">
        <div className="campaign-loading">{t("landing.loading")}</div>
      </div>
    );
  }

  if (useCarousel && slides) {
    return (
      <CampaignMerchantCarousel
        merchantSlug={merchantSlug}
        slides={slides}
        initialCampaignSlug={carouselInitialSlug}
        user={user}
        signOut={signOut}
        onSignIn={() => askAuth({})}
      />
    );
  }

  if (fallbackLoading) {
    return (
      <div className="campaign-page campaign-page--plain">
        <div className="campaign-loading">{t("landing.loading")}</div>
      </div>
    );
  }

  if (fallbackPublic) {
    return (
      <CampaignLandingSingle
        merchantSlug={merchantSlug}
        campaignSlug={campaignSlug}
        campaignPublic={fallbackPublic}
        loadingPublic={false}
        user={user}
        signOut={signOut}
      />
    );
  }

  if (!slides || slides.length === 0) {
    return (
      <div className="campaign-page campaign-page--plain">
        <div className="campaign-error">{t("landing.noActiveCampaigns")}</div>
      </div>
    );
  }

  return (
    <div className="campaign-page campaign-page--plain">
      <div className="campaign-error">{t("landing.campaignNotFound")}</div>
    </div>
  );
};

const CampaignLandingPage: React.FC<PageProp> = ({ visible, data }) => {
  const fromData = useMemo(() => {
    const merchantSlug =
      (typeof data?.merchantSlug === "string" ? data.merchantSlug : "") ||
      (typeof data?.params?.merchantSlug === "string" ? data.params.merchantSlug : "");

    const campaignSlug =
      (typeof data?.campaignSlug === "string" ? data.campaignSlug : "") ||
      (typeof data?.params?.campaignSlug === "string" ? data.params.campaignSlug : "");

    return { merchantSlug, campaignSlug };
  }, [data]);

  const fromPath = slugsFromLocation();
  const merchantSlug = fromData.merchantSlug || fromPath.merchantSlug;
  const campaignSlug = fromData.campaignSlug || fromPath.campaignSlug;

  return (
    <MerchantCampaignProvider>
      <CampaignLandingInner
        visible={visible}
        merchantSlug={merchantSlug}
        campaignSlug={campaignSlug}
      />
    </MerchantCampaignProvider>
  );
};

export default CampaignLandingPage;
