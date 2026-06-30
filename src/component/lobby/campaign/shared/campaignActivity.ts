import i18n from "@/i18n";

export type CampaignActivityWindow = {
  status: string;
  startsAt: number;
  endsAt: number;
};

export function isCampaignEnded(
  campaign: CampaignActivityWindow,
  now: number = Date.now()
): boolean {
  return now >= campaign.endsAt || campaign.status === "ended";
}

export function isCampaignNotStarted(
  campaign: CampaignActivityWindow,
  now: number = Date.now()
): boolean {
  if (campaign.status === "ended") return false;
  if (campaign.status !== "live") return true;
  return now < campaign.startsAt;
}

/** 与 Merchant `isCampaignLive` 一致，但可在前端用当前时间实时计算 */
export function isCampaignPlayable(
  campaign: CampaignActivityWindow,
  now: number = Date.now()
): boolean {
  return (
    campaign.status === "live" &&
    now >= campaign.startsAt &&
    now <= campaign.endsAt
  );
}

export function formatCampaignPeriodLabel(
  startsAt: number,
  endsAt: number,
  locale?: string
): string {
  const lang = locale ?? i18n.language;
  const fmt = (ms: number) =>
    new Date(ms).toLocaleDateString(lang, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  return `${fmt(startsAt)} – ${fmt(endsAt)}`;
}

export function campaignTimeUntilEndMs(
  campaign: CampaignActivityWindow,
  now: number = Date.now()
): number {
  return Math.max(0, campaign.endsAt - now);
}

export function formatCampaignCountdown(remainingMs: number): string {
  if (remainingMs <= 0) return "00:00:00";

  const totalSec = Math.ceil(remainingMs / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  const pad2 = (n: number) => String(n).padStart(2, "0");

  if (days > 0) {
    return i18n.t("countdown.daysHoursMinutes", {
      ns: "campaign.player",
      days,
      hours,
      minutes,
    });
  }
  return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
}

export type CampaignTimeRemainingView =
  | { kind: "ended"; prefix: string; countdown: string }
  | { kind: "until_start"; prefix: string; countdown: string }
  | { kind: "until_end"; prefix: string; countdown: string };

export function getCampaignTimeRemainingView(
  campaign: CampaignActivityWindow,
  now: number = Date.now()
): CampaignTimeRemainingView {
  if (isCampaignEnded(campaign, now)) {
    return {
      kind: "ended",
      prefix: "",
      countdown: i18n.t("countdown.ended", { ns: "campaign.player" }),
    };
  }
  if (isCampaignNotStarted(campaign, now)) {
    const ms = Math.max(0, campaign.startsAt - now);
    return {
      kind: "until_start",
      prefix: i18n.t("countdown.untilStart", { ns: "campaign.player" }),
      countdown: formatCampaignCountdown(ms),
    };
  }
  const ms = campaignTimeUntilEndMs(campaign, now);
  return {
    kind: "until_end",
    prefix: i18n.t("countdown.untilEnd", { ns: "campaign.player" }),
    countdown: formatCampaignCountdown(ms),
  };
}
