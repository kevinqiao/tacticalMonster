import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  formatCampaignPeriodLabel,
  getCampaignTimeRemainingView,
  isCampaignEnded,
} from "../shared/campaignActivity";
import type { CampaignPublicView, DisplayCtaKind } from "../service/useMerchantCampaignManager";
import { CampaignDetailsSheet } from "./CampaignDetailsSheet";

type Props = {
  campaignPublic: CampaignPublicView;
  merchantSlug: string;
  hideBackground?: boolean;
  onOverlayOpenChange?: (open: boolean) => void;
};

function resolveCtaHref(kind: DisplayCtaKind, url: string | undefined): string | null {
  const trimmed = url?.trim();
  if (!trimmed || kind === "none") return null;
  return trimmed;
}

function defaultCtaLabel(kind: DisplayCtaKind, t: (key: string) => string): string {
  switch (kind) {
    case "external_url":
      return t("display.cta.externalUrl");
    case "tel":
      return t("display.cta.tel");
    case "maps":
      return t("display.cta.maps");
    default:
      return t("display.cta.learnMore");
  }
}

export const CampaignDisplayWithFlow: React.FC<Props> = ({
  campaignPublic,
  merchantSlug,
  hideBackground = false,
  onOverlayOpenChange,
}) => {
  const { t, i18n } = useTranslation("campaign.player");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const { campaign } = campaignPublic;
  const cta = campaign.displayConfig?.cta;
  const ctaKind = cta?.kind ?? "none";
  const ctaHref = resolveCtaHref(ctaKind, cta?.url);
  const ctaLabel =
    cta?.label?.trim() || (ctaKind !== "none" ? defaultCtaLabel(ctaKind, t) : "");

  const periodLabel = useMemo(
    () => formatCampaignPeriodLabel(campaign.startsAt, campaign.endsAt, i18n.language),
    [campaign.startsAt, campaign.endsAt, i18n.language]
  );

  const timeRemaining = useMemo(
    () => getCampaignTimeRemainingView(campaign, now),
    [campaign, now]
  );

  const campaignEnded = isCampaignEnded(campaign, now);
  const summaryText =
    campaign.displayConfig?.highlightText?.trim() ||
    campaign.highlightText?.trim() ||
    campaign.title;

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const setDetailsOpenSync = useCallback(
    (open: boolean) => {
      setDetailsOpen(open);
      onOverlayOpenChange?.(open);
    },
    [onOverlayOpenChange]
  );

  const dock = (
    <>
      <section className="campaign-dock campaign-dock--display" aria-label={t("display.dockAriaLabel")}>
        <div className="campaign-dock__scroll">
          <div className="campaign-dock__content">
            <div className="campaign-dock__main">
              <h2 className="campaign-display__title">{campaign.title}</h2>
              {summaryText !== campaign.title ? (
                <p className="campaign-display__summary">{summaryText}</p>
              ) : null}

              <div className="campaign-dock__status-row">
                <p className="campaign-hero__period">
                  {t("dock.periodPrefix")}
                  {periodLabel}
                </p>
                {timeRemaining ? (
                  <div
                    className={`campaign-countdown${
                      timeRemaining.kind === "ended" ? " campaign-countdown--ended" : ""
                    }`}
                    aria-live="polite"
                  >
                    {timeRemaining.prefix ? (
                      <span className="campaign-countdown__prefix">{timeRemaining.prefix}</span>
                    ) : null}
                    <span className="campaign-countdown__value">{timeRemaining.countdown}</span>
                  </div>
                ) : null}
              </div>

              <div className="campaign-dock__info-links">
                <button
                  type="button"
                  className="campaign-btn campaign-btn-secondary campaign-dock__info-btn"
                  onClick={() => setDetailsOpenSync(true)}
                >
                  {t("dock.detailsBtn")}
                </button>
              </div>
            </div>

            <div className="campaign-dock__actions">
              {ctaHref && ctaKind !== "none" ? (
                <a
                  className="campaign-btn campaign-btn-primary campaign-display__cta"
                  href={ctaHref}
                  target={ctaKind === "external_url" ? "_blank" : undefined}
                  rel={ctaKind === "external_url" ? "noopener noreferrer" : undefined}
                >
                  {ctaLabel}
                </a>
              ) : campaignEnded ? (
                <span className="campaign-display__cta-placeholder">{t("display.ctaEnded")}</span>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <CampaignDetailsSheet
        open={detailsOpen}
        onClose={() => setDetailsOpenSync(false)}
        campaignPublic={campaignPublic}
        merchantSlug={merchantSlug}
        variant="display"
        flow={{
          periodLabel,
          timeRemaining,
          authed: false,
          campaignEnded,
          playsToday: 0,
          remainingPlaysToday: undefined,
          maxPlaysPerDay: undefined,
          maxCouponsPerPlayer: 0,
          claimedCount: 0,
          leaderboardTitle: "",
        }}
      />
    </>
  );

  if (hideBackground) {
    return <div className="campaign-carousel__slide-ui">{dock}</div>;
  }

  return <div className="campaign-page campaign-page--display">{dock}</div>;
};
