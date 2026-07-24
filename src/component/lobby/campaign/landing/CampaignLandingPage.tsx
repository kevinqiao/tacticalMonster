import React, { useMemo } from "react";

import { useTranslation } from "react-i18next";

import { CAMPAIGN_URL_SEGMENT } from "@/host/util/appUrlSegments";

import { PageProp } from "host/RenderApp";

import { useUserManager } from "host/service/UserManager";

import { LazyPortalProvider } from "../service/LazyPortalProvider";
import { isValidPortalGameType } from "../../portal/service/portalGameTypeGuards";

import {
  MerchantCampaignProvider,
  useCampaignPublicLive,
  usePartnerCampaignsPublicLive,
  isDisplayCampaign,
  type CampaignPublicView,
} from "../service/useMerchantCampaignManager";

import { CampaignMerchantCarousel } from "./CampaignMerchantCarousel";

import { CampaignLandingWithFlow } from "./campaignLandingViews";

import { CampaignDisplayWithFlow } from "./CampaignDisplayWithFlow";

import "../playForCoupon.css";

import "./campaignLanding.css";

function slugsFromLocation(): { partnerSlug: string; campaignSlug: string } {
  const parts = window.location.pathname.split("/").filter(Boolean);

  if (parts[0] === CAMPAIGN_URL_SEGMENT && parts[1] && parts[1] !== "merchant") {
    return { partnerSlug: parts[1], campaignSlug: parts[2] ?? "" };
  }

  return { partnerSlug: "", campaignSlug: "" };
}

const CampaignLandingSingle: React.FC<{
  partnerSlug: string;
  campaignSlug: string;
  campaignPublic: CampaignPublicView;
  loadingPublic: boolean;
  user: { uid?: string } | null | undefined;
  signOut: () => void;
}> = ({ partnerSlug, campaignSlug, campaignPublic, loadingPublic, user, signOut }) => {
  const gameType = isValidPortalGameType(campaignPublic.campaign.gameType ?? "")
    ? campaignPublic.campaign.gameType!
    : null;

  return (
    <LazyPortalProvider gameType={gameType}>
      {isDisplayCampaign(campaignPublic.campaign) ? (
        <CampaignDisplayWithFlow campaignPublic={campaignPublic} partnerSlug={partnerSlug} />
      ) : (
        <CampaignLandingWithFlow
          campaignPublic={campaignPublic}
          partnerSlug={partnerSlug}
          campaignSlug={campaignSlug}
          loadingPublic={loadingPublic}
          user={user}
          signOut={signOut}
        />
      )}
    </LazyPortalProvider>
  );
};

const CampaignLandingInner: React.FC<{
  visible: number;
  partnerSlug: string;
  campaignSlug: string;
}> = ({ visible, partnerSlug, campaignSlug }) => {
  const { t } = useTranslation("campaign.player");
  const { user, logout, cancelAuth, askAuth } = useUserManager();

  const { slides, isLoading: slidesLoading } = usePartnerCampaignsPublicLive(partnerSlug);

  const carouselInitialSlug = useMemo(() => {
    if (!slides?.length) return campaignSlug;
    if (campaignSlug && slides.some((s) => s.slug === campaignSlug)) return campaignSlug;
    return slides[0]!.slug;
  }, [slides, campaignSlug]);

  const useCarousel = Boolean(slides && slides.length >= 1);

  const { campaignPublic: fallbackPublic, isLoading: fallbackLoading } = useCampaignPublicLive(
    partnerSlug,
    useCarousel ? null : campaignSlug
  );

  const signOut = () => {
    cancelAuth();
    void logout();
  };

  if (visible === 0) return null;

  if (!partnerSlug) {
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
        partnerSlug={partnerSlug}
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
        partnerSlug={partnerSlug}
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
    const partnerSlug =
      (typeof data?.partnerSlug === "string" ? data.partnerSlug : "") ||
      (typeof data?.params?.partnerSlug === "string" ? data.params.partnerSlug : "");

    const campaignSlug =
      (typeof data?.campaignSlug === "string" ? data.campaignSlug : "") ||
      (typeof data?.params?.campaignSlug === "string" ? data.params.campaignSlug : "");

    return { partnerSlug, campaignSlug };
  }, [data]);

  const fromPath = slugsFromLocation();
  const partnerSlug = fromData.partnerSlug || fromPath.partnerSlug;
  const campaignSlug = fromData.campaignSlug || fromPath.campaignSlug;

  return (
    <MerchantCampaignProvider>
      <CampaignLandingInner
        visible={visible}
        partnerSlug={partnerSlug}
        campaignSlug={campaignSlug}
      />
    </MerchantCampaignProvider>
  );
};

export default CampaignLandingPage;
