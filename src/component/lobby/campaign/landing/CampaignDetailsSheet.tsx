import React from "react";
import { useTranslation } from "react-i18next";

import {
  campaignGameTypeLabel,
  campaignLandingPath,
  campaignModeLabel,
  campaignPassConditionLabel,
  campaignRewardModelLabel,
  campaignSettlementSummary,
  campaignStatusLabel,
  campaignTimezoneLabel,
} from "../shared/campaignDetailsDisplay";
import { formatLeaderboardRankRewardLine } from "../shared/campaignRankRewardDisplay";
import type { CampaignTimeRemainingView } from "../shared/campaignActivity";
import type { CampaignPublicView } from "../service/useMerchantCampaignManager";
import { CampaignCenterModal } from "./CampaignCenterModal";

type FlowSnapshot = {
  periodLabel: string;
  timeRemaining: CampaignTimeRemainingView | null;
  authed: boolean;
  campaignEnded: boolean;
  playsToday: number;
  remainingPlaysToday: number | undefined;
  maxPlaysPerDay: number | undefined;
  maxCouponsPerPlayer: number;
  claimedCount: number;
  leaderboardTitle: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  campaignPublic: CampaignPublicView;
  merchantSlug: string;
  variant?: "game" | "display";
  flow: FlowSnapshot;
};

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === "") return null;
  return (
    <div className="campaign-details__row">
      <dt className="campaign-details__label">{label}</dt>
      <dd className="campaign-details__value">{value}</dd>
    </div>
  );
}

export const CampaignDetailsSheet: React.FC<Props> = ({
  open,
  onClose,
  campaignPublic,
  merchantSlug,
  variant = "game",
  flow,
}) => {
  const { t } = useTranslation("campaign.player");
  const { merchant, campaign } = campaignPublic;
  const isDisplay = variant === "display" || campaign.experienceType === "display";
  const {
    title,
    rulesText,
    status,
    live,
    gameType,
    mode,
    rewardModel,
    hasLeaderboard,
    playLimits,
    passReward,
    leaderboardRankRewards,
    settlement,
    displayConfig,
  } = campaign;

  const isPassMode = rewardModel === "pass_per_run";
  const rankRewards = leaderboardRankRewards ?? [];
  const showRankRewards = !isDisplay && !isPassMode && rankRewards.length > 0;
  const settlementSummary =
    !isDisplay && settlement ? campaignSettlementSummary(settlement, flow.campaignEnded) : null;
  const landingPath = campaignLandingPath(merchantSlug, campaign.slug);
  const timezoneLabel = playLimits ? campaignTimezoneLabel(playLimits.dayTimezone) : null;

  const cta = displayConfig?.cta;
  const ctaKind = cta?.kind ?? "none";
  const ctaDetailLabel =
    ctaKind !== "none"
      ? cta?.label?.trim() ||
        (ctaKind === "external_url"
          ? t("display.cta.externalUrl")
          : ctaKind === "tel"
            ? t("display.cta.tel")
            : ctaKind === "maps"
              ? t("display.cta.maps")
              : t("display.cta.learnMore"))
      : null;

  const passClaimedLabel =
    !isDisplay && isPassMode && flow.authed && playLimits
      ? t("dock.claimedCount", {
          claimed: flow.claimedCount,
          max: flow.maxCouponsPerPlayer,
        })
      : null;

  const dailyLimitLabel =
    playLimits?.maxPlaysPerDay != null
      ? t("details.maxPlaysPerDay", { count: playLimits.maxPlaysPerDay })
      : t("details.maxPlaysUnlimited");

  const progressPlaysLabel =
    !isDisplay && flow.authed && !flow.campaignEnded && flow.maxPlaysPerDay != null
      ? t("progress.playsToday", {
          playsToday: flow.playsToday,
          maxPlaysPerDay: flow.maxPlaysPerDay,
        })
      : null;

  const progressCouponsLabel =
    !isDisplay && flow.authed && !flow.campaignEnded && playLimits
      ? isPassMode
        ? passClaimedLabel
        : flow.claimedCount > 0
          ? t("progress.rankRewardClaimed", {
              claimed: flow.claimedCount,
              max: flow.maxCouponsPerPlayer,
            })
          : t("progress.rankRewardMax", { max: flow.maxCouponsPerPlayer })
      : null;

  return (
    <CampaignCenterModal
      open={open}
      title={t("details.title")}
      titleId="campaign-details-title"
      onClose={onClose}
    >
      <div className="campaign-details">
        <div className="campaign-details__merchant">
          {merchant.logoUrl ? (
            <img className="campaign-details__merchant-logo" src={merchant.logoUrl} alt="" />
          ) : null}
          <p className="campaign-details__merchant-name">{merchant.name}</p>
        </div>

        <h3 className="campaign-details__campaign-title">{title}</h3>

        <div className="campaign-details__status-row">
          <span
            className={`campaign-details__status-badge${
              live ? " campaign-details__status-badge--live" : ""
            }`}
          >
            {campaignStatusLabel(status)}
            {live ? ` · ${t("details.statusLive")}` : null}
          </span>
          {flow.timeRemaining ? (
            <p
              className={`campaign-details__countdown${
                flow.timeRemaining.kind === "ended" ? " campaign-details__countdown--ended" : ""
              }`}
            >
              {flow.timeRemaining.prefix ? (
                <span className="campaign-details__countdown-prefix">{flow.timeRemaining.prefix}</span>
              ) : null}
              <span className="campaign-details__countdown-value">{flow.timeRemaining.countdown}</span>
            </p>
          ) : null}
        </div>

        <section className="campaign-details__section">
          <h4 className="campaign-details__heading">{t("details.overviewHeading")}</h4>
          <dl className="campaign-details__meta">
            <DetailRow label={t("details.period")} value={flow.periodLabel} />
            {!isDisplay ? (
              <>
                <DetailRow label={t("details.game")} value={campaignGameTypeLabel(gameType ?? "")} />
                <DetailRow label={t("details.mode")} value={campaignModeLabel(mode ?? "solo")} />
                <DetailRow
                  label={t("details.rewardModelLabel")}
                  value={campaignRewardModelLabel(rewardModel ?? "pass_per_run")}
                />
                {hasLeaderboard ? (
                  <DetailRow label={t("details.leaderboard")} value={flow.leaderboardTitle} />
                ) : (
                  <DetailRow label={t("details.leaderboard")} value={t("details.noLeaderboard")} />
                )}
                <DetailRow
                  label={t("details.maxCoupons")}
                  value={t("details.maxCouponsValue", {
                    count: playLimits?.maxCouponsPerPlayer ?? 0,
                  })}
                />
                <DetailRow label={t("details.dailyPlays")} value={dailyLimitLabel} />
                {timezoneLabel ? (
                  <DetailRow label={t("details.dayTimezone")} value={timezoneLabel} />
                ) : null}
              </>
            ) : null}
            {isDisplay && ctaDetailLabel ? (
              <DetailRow label={t("display.detailsCta")} value={ctaDetailLabel} />
            ) : null}
            {isDisplay && cta?.url?.trim() ? (
              <DetailRow label={t("display.detailsCtaLink")} value={cta.url.trim()} />
            ) : null}
            <DetailRow label={t("details.landingUrl")} value={landingPath} />
          </dl>
        </section>

        {!isDisplay && flow.authed && !flow.campaignEnded && (progressPlaysLabel || progressCouponsLabel) ? (
          <section className="campaign-details__section">
            <h4 className="campaign-details__heading">{t("details.progressHeading")}</h4>
            <dl className="campaign-details__meta">
              {progressPlaysLabel ? (
                <DetailRow label={t("details.yourPlaysToday")} value={progressPlaysLabel} />
              ) : null}
              {progressCouponsLabel ? (
                <DetailRow label={t("details.yourCoupons")} value={progressCouponsLabel} />
              ) : null}
              {flow.remainingPlaysToday != null && flow.maxPlaysPerDay != null ? (
                <DetailRow
                  label={t("details.remainingPlaysToday")}
                  value={t("details.remainingPlaysValue", { count: flow.remainingPlaysToday })}
                />
              ) : null}
            </dl>
          </section>
        ) : null}

        {settlementSummary ? (
          <section className="campaign-details__section">
            <h4 className="campaign-details__heading">{t("details.settlementHeading")}</h4>
            <p className="campaign-details__text">{settlementSummary}</p>
          </section>
        ) : null}

        {rulesText?.trim() ? (
          <section className="campaign-details__section">
            <h4 className="campaign-details__heading">{t("details.rulesHeading")}</h4>
            <p className="campaign-details__text">{rulesText.trim()}</p>
          </section>
        ) : null}

        {!isDisplay ? (
        <section className="campaign-details__section">
          <h4 className="campaign-details__heading">{t("details.rewardRulesHeading")}</h4>
          {isPassMode ? (
            <div className="campaign-details__reward-block">
              {passReward ? (
                <dl className="campaign-details__meta">
                  <DetailRow
                    label={t("details.passCondition")}
                    value={campaignPassConditionLabel(passReward)}
                  />
                  <DetailRow label={t("details.couponReward")} value={passReward.rewardLabel} />
                  <DetailRow
                    label={t("details.maxCoupons")}
                    value={t("details.maxCouponsValue", {
                      count: playLimits?.maxCouponsPerPlayer ?? 0,
                    })}
                  />
                </dl>
              ) : (
                <p className="campaign-details__text">{t("dock.passRulesText")}</p>
              )}
              <p className="campaign-details__hint">{t("details.passHint")}</p>
              {passClaimedLabel ? (
                <p className="campaign-details__claimed">{passClaimedLabel}</p>
              ) : null}
            </div>
          ) : showRankRewards ? (
            <>
              <p className="campaign-details__hint">{t("details.competitiveHint")}</p>
              <ul className="campaign-details__reward-list">
                {rankRewards.map((reward) => (
                  <li
                    key={`${reward.rankFrom}-${reward.rankTo}-${reward.label}`}
                    className="campaign-details__reward-item"
                  >
                    {formatLeaderboardRankRewardLine(reward)}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="campaign-details__reward-block">
              <p className="campaign-details__text">{t("details.competitiveGeneric")}</p>
              <p className="campaign-details__hint">{t("details.competitiveHint")}</p>
            </div>
          )}
        </section>
        ) : null}
      </div>
    </CampaignCenterModal>
  );
};
