import React, { useCallback, useRef, useState } from "react";

import { useTranslation } from "react-i18next";

import { isPlatformAuthed } from "host/service/platformAuth/platformAccessToken";

import { LazyPortalProvider } from "../service/LazyPortalProvider";
import { isValidPortalGameType } from "../../portal/service/portalGameTypeGuards";

import {
  useCampaignPublicLive,
  usePartnerPlayerCouponsLive,
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
import { CampaignMyCouponsSheet } from "./CampaignMyCouponsSheet";

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
  const { t, i18n } = useTranslation("campaign.player");
  const [myCouponsOpen, setMyCouponsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const switchBlockedRef = useRef(false);

  const isSwitchBlocked = useCallback(
    () => switchBlockedRef.current || myCouponsOpen || accountOpen,
    [accountOpen, myCouponsOpen]
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

  const { coupons: partnerCoupons, isLoading: partnerCouponsLoading } =
    usePartnerPlayerCouponsLive(partnerHeader?.partnerId);

  const authed = isPlatformAuthed(user);

  return (
    <div className="campaign-page campaign-carousel">
      {partnerHeader ? (
        <CampaignLandingSharedTopbar
          partner={partnerHeader}
          authed={authed}
          onSignIn={onSignIn}
          onSignOut={signOut}
          onMyAccount={() => setAccountOpen(true)}
          onMyCoupons={() => setMyCouponsOpen(true)}
        />
      ) : null}

      <CampaignAccountSheet open={accountOpen} onClose={() => setAccountOpen(false)} />

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
                  />
                ) : activePublic && isValidPortalGameType(activePublic.campaign.gameType ?? "") ? (
                  <LazyPortalProvider gameType={activePublic.campaign.gameType!}>
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
                  </LazyPortalProvider>
                ) : (
                  <div className="campaign-carousel__slide-loading">{t("landing.campaignNotFound")}</div>
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

      <CampaignMyCouponsSheet
        open={myCouponsOpen}
        onClose={() => setMyCouponsOpen(false)}
        partnerId={partnerHeader?.partnerId ?? 0}
        authed={authed}
        coupons={partnerCoupons}
        loading={partnerCouponsLoading}
        locale={i18n.language}
      />
    </div>
  );
};
