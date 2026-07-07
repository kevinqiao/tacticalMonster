import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { useTranslation } from "react-i18next";



import { CAMPAIGN_BG_DESKTOP, CAMPAIGN_BG_MOBILE } from "../assets/campaignBackgrounds";

import CasualPlayMatchOverlay from "../../casual/view/play/CasualPlayMatchOverlay";

import { CouponRevealPanel } from "../shared/CouponRevealPanel";

import { useCampaignFlow } from "../service/useCampaignFlow";

import type { CampaignPublicView } from "../service/useMerchantCampaignManager";

import { CampaignDetailsSheet } from "./CampaignDetailsSheet";
import { CampaignHistorySheet } from "./CampaignHistorySheet";
import { CampaignLeaderboardSheet } from "./CampaignLeaderboardSheet";
import { CampaignMyCouponsSheet } from "./CampaignMyCouponsSheet";
import { useMerchantPlayerCouponsLive } from "../service/useMerchantCampaignManager";



export const CampaignLandingBackground: React.FC<{
  posterUrl?: string | null;
  posterPortraitUrl?: string | null;
  posterLandscapeUrl?: string | null;
}> = ({ posterUrl, posterPortraitUrl, posterLandscapeUrl }) => {
  const portrait = posterPortraitUrl ?? posterUrl;
  const landscape = posterLandscapeUrl ?? posterUrl ?? portrait;

  if (portrait || landscape) {
    return (
      <picture className="campaign-page__bg" aria-hidden="true">
        {landscape ? (
          <source media="(orientation: landscape)" srcSet={landscape} />
        ) : null}
        <img
          src={portrait ?? landscape ?? undefined}
          alt=""
          className="campaign-page__bg-img"
        />
      </picture>
    );
  }

  return (

    <picture className="campaign-page__bg" aria-hidden="true">

      <source media="(orientation: landscape)" srcSet={CAMPAIGN_BG_DESKTOP} />

      <img src={CAMPAIGN_BG_MOBILE} alt="" className="campaign-page__bg-img" />

    </picture>

  );

};



export const CampaignLandingSharedTopbar: React.FC<{

  merchant: CampaignPublicView["merchant"];

  authed: boolean;

  onSignIn: () => void;

  onSignOut: () => void;

  onMyCoupons?: () => void;

}> = ({ merchant, authed, onSignIn, onSignOut, onMyCoupons }) => {

  const { t } = useTranslation("campaign.player");



  return (

    <header className="campaign-topbar campaign-topbar--overlay campaign-carousel__topbar">

      <div className="campaign-brand">

        {merchant.logoUrl ? (

          <img className="campaign-brand__logo" src={merchant.logoUrl} alt="" />

        ) : null}

        <p className="campaign-brand__name">{merchant.name}</p>

      </div>

      <nav className="campaign-topbar__actions" aria-label={t("auth.navLabel")}>

        {authed && onMyCoupons ? (

          <button type="button" className="pfc-auth-btn" onClick={onMyCoupons}>

            {t("auth.myCoupons")}

          </button>

        ) : null}

        {authed ? (

          <button type="button" className="pfc-auth-btn" onClick={onSignOut}>

            {t("auth.signOut")}

          </button>

        ) : (

          <button type="button" className="pfc-auth-btn pfc-auth-btn--filled" onClick={onSignIn}>

            {t("auth.signIn")}

          </button>

        )}

      </nav>

    </header>

  );

};



export const CampaignLandingWithFlow: React.FC<{

  campaignPublic: CampaignPublicView;

  merchantSlug: string;

  campaignSlug: string;

  loadingPublic: boolean;

  user: { uid?: string } | null | undefined;

  signOut: () => void;

  hideTopbar?: boolean;

  hideBackground?: boolean;

  onInteractionLockChange?: (locked: boolean) => void;

}> = (props) => {

  const flow = useCampaignFlow({

    merchantSlug: props.merchantSlug,

    campaignSlug: props.campaignSlug,

    campaignPublic: props.campaignPublic,

    loadingPublic: props.loadingPublic,

  });

  const [bodyOverlayOpen, setBodyOverlayOpen] = useState(false);

  const flowOverlayOpen =
    flow.gameSessionActive || Boolean(flow.showCouponPanel && flow.freshCoupon);

  const notifyInteractionLock = useCallback(
    (bodyOpen: boolean) => {
      setBodyOverlayOpen(bodyOpen);
      props.onInteractionLockChange?.(flowOverlayOpen || bodyOpen);
    },
    [flowOverlayOpen, props.onInteractionLockChange]
  );

  useLayoutEffect(() => {

    props.onInteractionLockChange?.(flowOverlayOpen || bodyOverlayOpen);

  }, [flowOverlayOpen, bodyOverlayOpen, props.onInteractionLockChange]);



  return (

    <CampaignLandingBody

      campaignPublic={props.campaignPublic}

      flow={flow}

      user={props.user}

      signOut={props.signOut}

      hideTopbar={props.hideTopbar}

      hideBackground={props.hideBackground}

      onOverlayOpenChange={notifyInteractionLock}

    />

  );

};



export const CampaignLandingBody: React.FC<{

  campaignPublic: CampaignPublicView;

  flow: ReturnType<typeof useCampaignFlow>;

  user: { uid?: string } | null | undefined;

  signOut: () => void;

  hideTopbar?: boolean;

  hideBackground?: boolean;

  onOverlayOpenChange?: (open: boolean) => void;

}> = ({

  campaignPublic,

  flow,

  user,

  signOut,

  hideTopbar = false,

  hideBackground = false,

  onOverlayOpenChange,

}) => {

  const { t, i18n } = useTranslation("campaign.player");

  const [leaderboardOpen, setLeaderboardOpen] = useState(false);

  const [detailsOpen, setDetailsOpen] = useState(false);

  const [historyOpen, setHistoryOpen] = useState(false);

  const [myCouponsOpen, setMyCouponsOpen] = useState(false);

  const overlayBitsRef = useRef({ details: false, history: false, leaderboard: false, myCoupons: false });

  const syncOverlayLock = useCallback(() => {
    const bits = overlayBitsRef.current;
    onOverlayOpenChange?.(bits.details || bits.history || bits.leaderboard || bits.myCoupons);
  }, [onOverlayOpenChange]);

  const setDetailsOpenSync = useCallback(
    (open: boolean) => {
      overlayBitsRef.current.details = open;
      setDetailsOpen(open);
      syncOverlayLock();
    },
    [syncOverlayLock]
  );

  const setHistoryOpenSync = useCallback(
    (open: boolean) => {
      overlayBitsRef.current.history = open;
      setHistoryOpen(open);
      syncOverlayLock();
    },
    [syncOverlayLock]
  );

  const setLeaderboardOpenSync = useCallback(
    (open: boolean) => {
      overlayBitsRef.current.leaderboard = open;
      setLeaderboardOpen(open);
      syncOverlayLock();
    },
    [syncOverlayLock]
  );

  const setMyCouponsOpenSync = useCallback(
    (open: boolean) => {
      overlayBitsRef.current.myCoupons = open;
      setMyCouponsOpen(open);
      syncOverlayLock();
    },
    [syncOverlayLock]
  );

  const { coupons: merchantCoupons, isLoading: merchantCouponsLoading } =
    useMerchantPlayerCouponsLive(campaignPublic.merchant.merchantId);



  useEffect(() => {

    if (!leaderboardOpen) return;

    const prev = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {

      document.body.style.overflow = prev;

    };

  }, [leaderboardOpen]);



  useEffect(() => {
    if (!historyOpen) return;
    void flow.refreshPlayHistory();
  }, [historyOpen, flow.refreshPlayHistory]);



  const passMode = flow.isPassMode;

  const leaderboardTitle =

    campaignPublic.campaign.mode === "solo"

      ? t("dock.leaderboardSolo")

      : t("dock.leaderboardMulti");



  const playButtonLabel = (() => {

    if (flow.campaignEnded) return t("playButton.ended");

    if (flow.campaignNotStarted || !flow.campaignPlayable) return t("playButton.notOpen");

    if (flow.joining) return t("playButton.joining");

    if (flow.matchOverlayOpen) return t("playButton.matching");

    if (flow.settlingAfterGame) return t("playButton.settling");

    if (flow.dailyLimitReached) return t("playButton.dailyLimitReached");

    if (passMode && flow.couponLimitReached) return t("playButton.couponLimitReached");

    const hasDailyRemaining =
      flow.maxPlaysPerDay != null &&
      flow.remainingPlaysToday != null &&
      flow.remainingPlaysToday > 0;

    const isContinueSession = passMode ? flow.claimedCount > 0 : flow.hasClaimed;

    if (hasDailyRemaining) {
      return t(
        isContinueSession ? "playButton.continueWithRemaining" : "playButton.startWithRemaining",
        { remaining: flow.remainingPlaysToday }
      );
    }

    if (passMode && flow.claimedCount > 0) return t("playButton.continueChallenge");

    if (!passMode && flow.hasClaimed) return t("playButton.continueGrind");

    return passMode ? t("playButton.challengeForCoupon") : t("playButton.joinCompetitive");

  })();



  const playDisabled =

    flow.joining ||

    flow.matchOverlayOpen ||

    flow.settlingAfterGame ||

    !flow.campaignPlayable ||

    !flow.canChallenge;



  const progressHint = (() => {

    if (!flow.authed || flow.campaignEnded) return null;

    if (flow.maxPlaysPerDay != null && flow.remainingPlaysToday != null) {

      return t("progress.playsToday", {

        playsToday: flow.playsToday,

        maxPlaysPerDay: flow.maxPlaysPerDay,

      });

    }

    if (passMode) return null;

    if (flow.hasClaimed) {

      return t("progress.rankRewardClaimed", {

        claimed: flow.claimedCount,

        max: flow.maxCouponsPerPlayer,

      });

    }

    return null;

  })();



  const leaderboardRows = useMemo(

    () =>

      flow.leaderboard as Array<{

        rank?: number;

        uid: string;

        displayName?: string;

        isBot?: boolean;

        bestScore?: number;

        rankPoints?: number;

        plays?: number;

      }>,

    [flow.leaderboard]

  );



  const dock = (

    <>

      <section className="campaign-dock" aria-label={t("dock.ariaLabel")}>

        <div className="campaign-dock__scroll">

          <div className="campaign-dock__content">

            <div className="campaign-dock__main">

              <div className="campaign-dock__status-row">

                <p className="campaign-hero__period">

                  {t("dock.periodPrefix")}

                  {flow.periodLabel}

                </p>

                {flow.timeRemaining ? (

                  <div

                    className={`campaign-countdown${

                      flow.timeRemaining.kind === "ended" ? " campaign-countdown--ended" : ""

                    }`}

                    aria-live="polite"

                  >

                    {flow.timeRemaining.prefix ? (

                      <span className="campaign-countdown__prefix">{flow.timeRemaining.prefix}</span>

                    ) : null}

                    <span className="campaign-countdown__value">{flow.timeRemaining.countdown}</span>

                  </div>

                ) : null}

              </div>



              <div className="campaign-dock__content-row">

                <div className="campaign-dock__body-row">

                  <div className="campaign-dock__info-links">

                    <button

                      type="button"

                      className="campaign-btn campaign-btn-secondary campaign-dock__info-btn"

                      onClick={() => setDetailsOpenSync(true)}

                    >

                      {t("dock.detailsBtn")}

                    </button>

                    {flow.authed ? (

                      <button

                        type="button"

                        className="campaign-btn campaign-btn-secondary campaign-dock__info-btn"

                        onClick={() => setHistoryOpenSync(true)}

                      >

                        {t("dock.historyBtn")}

                      </button>

                    ) : null}

                  </div>



                  {flow.note ? <p className="campaign-note">{flow.note}</p> : null}

                </div>



                {progressHint ? (

                  <p className="campaign-progress campaign-dock__progress" aria-live="polite">

                    {progressHint}

                  </p>

                ) : null}

              </div>

            </div>



            <div className="campaign-dock__actions">

              <button

                type="button"

                className="campaign-btn campaign-btn-primary"

                disabled={playDisabled}

                onClick={() => void flow.startPlay()}

              >

                {playButtonLabel}

              </button>

              {flow.showLeaderboard ? (

                <button

                  type="button"

                  className="campaign-btn campaign-btn-secondary"

                  onClick={() => setLeaderboardOpenSync(true)}

                >

                  {t("dock.leaderboardBtn")}

                </button>

              ) : null}

            </div>

          </div>

        </div>

      </section>



      <CampaignLeaderboardSheet

        open={leaderboardOpen && flow.showLeaderboard}

        title={leaderboardTitle}

        mode={campaignPublic.campaign.mode}

        rows={leaderboardRows}

        viewerUid={user?.uid}

        onClose={() => setLeaderboardOpenSync(false)}

      />



      <CampaignDetailsSheet
        open={detailsOpen}
        onClose={() => setDetailsOpenSync(false)}
        campaignPublic={campaignPublic}
        merchantSlug={campaignPublic.merchant.slug}
        flow={{
          periodLabel: flow.periodLabel,
          timeRemaining: flow.timeRemaining,
          authed: flow.authed,
          campaignEnded: flow.campaignEnded,
          playsToday: flow.playsToday,
          remainingPlaysToday: flow.remainingPlaysToday,
          maxPlaysPerDay: flow.maxPlaysPerDay,
          maxCouponsPerPlayer: flow.maxCouponsPerPlayer,
          claimedCount: flow.claimedCount,
          leaderboardTitle,
        }}
      />



      <CampaignHistorySheet
        open={historyOpen}
        onClose={() => setHistoryOpenSync(false)}
        authed={flow.authed}
        entries={flow.playHistory}
        locale={i18n.language}
      />

      <CampaignMyCouponsSheet
        open={myCouponsOpen}
        onClose={() => setMyCouponsOpenSync(false)}
        merchantId={campaignPublic.merchant.merchantId}
        authed={flow.authed}
        coupons={merchantCoupons}
        loading={merchantCouponsLoading}
        locale={i18n.language}
      />



      {flow.showCouponPanel && flow.freshCoupon ? (

        <div className="pfc-coupon-overlay" role="presentation">

          <CouponRevealPanel coupon={flow.freshCoupon} onDismiss={flow.dismissFreshCoupon} />

        </div>

      ) : null}



      <CasualPlayMatchOverlay

        open={flow.matchOverlayOpen}

        phase={flow.matchOverlayPhase}

        waitingForPeer={flow.matchWaitingForPeer}

        tournamentTitle={campaignPublic.campaign.title}

        leaving={flow.leavingMatch}

        onLeave={() => void flow.leaveMatchQueue()}

      />

    </>

  );



  if (hideBackground) {

    return <div className="campaign-carousel__slide-ui">{dock}</div>;

  }



  return (

    <div className="campaign-page">

      <CampaignLandingBackground
        posterUrl={campaignPublic.campaign.posterUrl}
        posterPortraitUrl={campaignPublic.campaign.posterPortraitUrl}
        posterLandscapeUrl={campaignPublic.campaign.posterLandscapeUrl}
      />

      <div className="campaign-page__shade" aria-hidden="true" />



      {!hideTopbar ? (

        <CampaignLandingSharedTopbar

          merchant={campaignPublic.merchant}

          authed={flow.authed}

          onSignIn={flow.signIn}

          onSignOut={signOut}

          onMyCoupons={() => setMyCouponsOpenSync(true)}

        />

      ) : null}



      {dock}

    </div>

  );

};


