import i18n from "@/i18n";
import { CAMPAIGN_URL_PREFIX } from "@/host/util/appUrlSegments";

import { partnerGameLabel } from "../merchant/campaignFormHelpers";
import type {
  CampaignPassRewardView,
  CampaignPublicView,
  CampaignSettlementView,
} from "../service/useMerchantCampaignManager";

export function campaignGameTypeLabel(gameType: string): string {
  return partnerGameLabel(gameType);
}

export function campaignStatusLabel(status: string): string {
  return i18n.t(`details.status.${status}`, {
    ns: "campaign.player",
    defaultValue: status,
  });
}

export function campaignRewardModelLabel(rewardModel: CampaignPublicView["campaign"]["rewardModel"]): string {
  return i18n.t(`details.rewardModel.${rewardModel}`, { ns: "campaign.player" });
}

export function campaignModeLabel(mode: "solo" | "multi"): string {
  return i18n.t(`details.mode.${mode}`, { ns: "campaign.player" });
}

export function campaignPassConditionLabel(passReward: CampaignPassRewardView): string {
  if (passReward.kind === "score_threshold" && passReward.minScore != null) {
    return i18n.t("details.passConditionScore", {
      ns: "campaign.player",
      minScore: passReward.minScore,
    });
  }
  return i18n.t("details.passConditionP75", { ns: "campaign.player" });
}

export function campaignTimezoneLabel(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  return i18n.t(`timezone.${value}`, {
    ns: "campaign.merchant",
    defaultValue: value,
  });
}

export function campaignSettlementSummary(
  settlement: CampaignSettlementView,
  ended: boolean
): string | null {
  if (!ended) return null;
  if (settlement.status === "done") {
    const parts: string[] = [
      i18n.t("details.settlement.done", { ns: "campaign.player" }),
    ];
    if (settlement.couponsIssued != null) {
      parts.push(
        i18n.t("details.settlement.couponsIssued", {
          ns: "campaign.player",
          count: settlement.couponsIssued,
        })
      );
    }
    if (settlement.winnerCount != null) {
      parts.push(
        i18n.t("details.settlement.winnerCount", {
          ns: "campaign.player",
          count: settlement.winnerCount,
        })
      );
    }
    return parts.join(" · ");
  }
  if (settlement.status === "failed") {
    return i18n.t("details.settlement.failed", { ns: "campaign.player" });
  }
  return i18n.t("details.settlement.pending", { ns: "campaign.player" });
}

export function campaignLandingPath(partnerSlug: string, campaignSlug: string): string {
  return `${CAMPAIGN_URL_PREFIX}/${partnerSlug}/${campaignSlug}`;
}
