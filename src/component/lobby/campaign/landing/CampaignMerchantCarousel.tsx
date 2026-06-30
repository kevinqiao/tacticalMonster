import React, { useCallback, useRef, useState } from "react";

import { useTranslation } from "react-i18next";

import { isPlatformAuthed } from "host/service/platformAuth/platformAccessToken";

import { LazyPortalProvider } from "../service/LazyPortalProvider";
import { isValidPortalGameType } from "../../portal/service/portalGameTypeGuards";

import {
  useCampaignPublicLive,
  useMerchantPlayerCouponsLive,
  isDisplayCampaign,
  type CampaignPublicView,
  type MerchantCampaignCarouselItem,
} from "../service/useMerchantCampaignManager";

import { useCampaignCarousel } from "../service/useCampaignCarousel";

import {

  CampaignLandingBackground,

  CampaignLandingSharedTopbar,

  CampaignLandingWithFlow,

} from "./campaignLandingViews";

import { CampaignDisplayWithFlow } from "./CampaignDisplayWithFlow";

import { CampaignMyCouponsSheet } from "./CampaignMyCouponsSheet";



type CampaignMerchantCarouselProps = {

  merchantSlug: string;

  slides: MerchantCampaignCarouselItem[];

  initialCampaignSlug: string;

  user: { uid?: string } | null | undefined;

  signOut: () => void;

  onSignIn: () => void;

};



export const CampaignMerchantCarousel: React.FC<CampaignMerchantCarouselProps> = ({

  merchantSlug,

  slides,

  initialCampaignSlug,

  user,

  signOut,

  onSignIn,

}) => {

  const { t, i18n } = useTranslation("campaign.player");

  const [myCouponsOpen, setMyCouponsOpen] = useState(false);

  const switchBlockedRef = useRef(false);

  const isSwitchBlocked = useCallback(
    () => switchBlockedRef.current || myCouponsOpen,
    [myCouponsOpen]
  );

  const onInteractionLockChange = useCallback((locked: boolean) => {
    switchBlockedRef.current = locked;
  }, []);

  const carousel = useCampaignCarousel({
    merchantSlug,
    slideSlugs: slides.map((s) => s.slug),
    initialCampaignSlug,
    enabled: slides.length > 1,
    isSwitchBlocked,
  });

  const { campaignPublic: activePublic, isLoading: loadingActive } = useCampaignPublicLive(
    merchantSlug,
    carousel.activeSlug
  );

  const merchantHeader = activePublic?.merchant;

  const { coupons: merchantCoupons, isLoading: merchantCouponsLoading } =
    useMerchantPlayerCouponsLive(merchantHeader?.merchantId);

  return (

    <div className="campaign-page campaign-carousel">

      {merchantHeader ? (

        <CampaignLandingSharedTopbar

          merchant={merchantHeader}

          authed={isPlatformAuthed(user)}

          onSignIn={onSignIn}

          onSignOut={signOut}

          onMyCoupons={() => setMyCouponsOpen(true)}

        />

      ) : null}



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

                    merchantSlug={merchantSlug}

                    hideBackground

                  />

                ) : activePublic && isValidPortalGameType(activePublic.campaign.gameType ?? "") ? (

                  <LazyPortalProvider gameType={activePublic.campaign.gameType!}>

                    <CampaignLandingWithFlow

                      campaignPublic={activePublic}

                      merchantSlug={merchantSlug}

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
        merchantId={merchantHeader?.merchantId ?? ""}
        authed={isPlatformAuthed(user)}
        coupons={merchantCoupons}
        loading={merchantCouponsLoading}
        locale={i18n.language}
      />

    </div>

  );

};


