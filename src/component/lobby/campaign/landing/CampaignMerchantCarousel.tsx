import React, { useCallback, useMemo, useRef, useState } from "react";

import { useTranslation } from "react-i18next";

import { isPlatformAuthed } from "host/service/platformAuth/platformAccessToken";
import { portalLaunchPath } from "@/host/util/portalPathParse";

import { LazyPortalProvider } from "../service/LazyPortalProvider";
import { isValidPortalGameType } from "../../portal/service/portalGameTypeGuards";

import {
  useCampaignPublicLive,
  isDisplayCampaign,
  type MerchantCampaignCarouselItem,
} from "../service/useMerchantCampaignManager";

import { useCampaignCarousel } from "../service/useCampaignCarousel";

import {
  CampaignLandingBackground,
  CampaignLandingSharedTopbar,
  CampaignLandingWithFlow,
} from "./campaignLandingViews";

import { CampaignAccountSheet } from "./CampaignAccountSheet";
import { CampaignDisplayWithFlow } from "./CampaignDisplayWithFlow";

type CampaignMerchantCarouselProps = {
  partnerSlug: string;
  slides: MerchantCampaignCarouselItem[];
  initialCampaignSlug: string;
  user: { uid?: string } | null | undefined;
  signOut: () => void;
  onSignIn: () => void;
};

export const CampaignMerchantCarousel: React.FC<CampaignMerchantCarouselProps> = ({
  partnerSlug,
  slides,
  initialCampaignSlug,
  user,
  signOut,
  onSignIn,
}) => {
  const { t } = useTranslation("campaign.player");
  const [accountOpen, setAccountOpen] = useState(false);
  const switchBlockedRef = useRef(false);

  const isSwitchBlocked = useCallback(
    () => switchBlockedRef.current || accountOpen,
    [accountOpen]
  );

  const onInteractionLockChange = useCallback((locked: boolean) => {
    switchBlockedRef.current = locked;
  }, []);

  const carousel = useCampaignCarousel({
    partnerSlug,
    slideSlugs: slides.map((s) => s.slug),
    initialCampaignSlug,
    enabled: slides.length > 1,
    isSwitchBlocked,
  });

  const { campaignPublic: activePublic, isLoading: loadingActive } = useCampaignPublicLive(
    partnerSlug,
    carousel.activeSlug
  );

  const partnerHeader = activePublic?.partner;

  const activeGameType = useMemo(() => {
    const gt = activePublic?.campaign.gameType;
    if (!gt || isDisplayCampaign(activePublic.campaign)) return null;
    return isValidPortalGameType(gt) ? gt : null;
  }, [activePublic]);

  const gameCenterHref = useMemo(() => {
    if (!partnerHeader) return null;
    const gt =
      activeGameType ??
      slides
        .map((s) => s.gameType)
        .find((g): g is string => typeof g === "string" && isValidPortalGameType(g));
    if (!gt || !isValidPortalGameType(gt)) return null;
    return portalLaunchPath(partnerHeader.slug || partnerSlug, gt);
  }, [activeGameType, partnerHeader, partnerSlug, slides]);

  const authed = isPlatformAuthed(user);

  return (
    <LazyPortalProvider gameType={activeGameType}>
      <div className="campaign-page campaign-carousel">
        {partnerHeader ? (
          <CampaignLandingSharedTopbar
            partner={partnerHeader}
            authed={authed}
            onSignIn={onSignIn}
            onMyAccount={() => setAccountOpen(true)}
            gameCenterHref={gameCenterHref}
          />
        ) : null}

        <CampaignAccountSheet
          open={accountOpen}
          onClose={() => setAccountOpen(false)}
          onSignOut={signOut}
        />

        <div
          ref={carousel.trackRef}
          className="campaign-carousel__track"
          onScroll={carousel.onTrackScroll}
          aria-label={t("landing.carouselLabel")}
        >
          {slides.map((slide, index) => {
            const isActive = index === carousel.activeIndex;

            return (
              <div
                key={slide.slug}
                className={`campaign-carousel__slide${isActive ? " campaign-carousel__slide--active" : ""}`}
                aria-hidden={!isActive}
              >
                <CampaignLandingBackground
                  posterUrl={slide.posterUrl}
                  posterPortraitUrl={slide.posterPortraitUrl}
                  posterLandscapeUrl={slide.posterLandscapeUrl}
                />

                <div className="campaign-page__shade" aria-hidden="true" />

                {isActive ? (
                  loadingActive || activePublic === undefined ? (
                    <div className="campaign-carousel__slide-loading">{t("landing.loading")}</div>
                  ) : activePublic && isDisplayCampaign(activePublic.campaign) ? (
                    <CampaignDisplayWithFlow
                      campaignPublic={activePublic}
                      partnerSlug={partnerSlug}
                      hideBackground
                      onOverlayOpenChange={onInteractionLockChange}
                    />
                  ) : activePublic && isValidPortalGameType(activePublic.campaign.gameType ?? "") ? (
                    <CampaignLandingWithFlow
                      campaignPublic={activePublic}
                      partnerSlug={partnerSlug}
                      campaignSlug={slide.slug}
                      loadingPublic={loadingActive}
                      user={user}
                      signOut={signOut}
                      hideTopbar
                      hideBackground
                      onInteractionLockChange={onInteractionLockChange}
                    />
                  ) : (
                    <div className="campaign-carousel__slide-loading">
                      {t("landing.campaignNotFound")}
                    </div>
                  )
                ) : null}
              </div>
            );
          })}
        </div>

        {carousel.carouselEnabled ? (
          <div className="campaign-carousel__dots" aria-label={t("landing.carouselSwitchLabel")}>
            {slides.map((slide, index) => (
              <button
                key={slide.slug}
                type="button"
                className={`campaign-carousel__dot${
                  index === carousel.activeIndex ? " campaign-carousel__dot--active" : ""
                }`}
                aria-label={`${slide.title}${index === carousel.activeIndex ? t("landing.carouselCurrentSuffix") : ""}`}
                aria-current={index === carousel.activeIndex ? "true" : undefined}
                onClick={() => carousel.goTo(index, { userInitiated: true })}
              />
            ))}
          </div>
        ) : null}
      </div>
    </LazyPortalProvider>
  );
};
