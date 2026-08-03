import i18n from "@/i18n";

/** Player/staff-facing label for Route A text-only coupon rewards. */
export type CampaignRewardSnapshotView = {
  type?: string;
  displayText?: string;
  itemLabel?: string;
};

export function formatCampaignRewardLabel(
  reward?: CampaignRewardSnapshotView | null
): string {
  const fallback = i18n.t("coupon.defaultRewardLabel", { ns: "campaign.player" });
  if (!reward) return fallback;
  const text = reward.displayText?.trim() || reward.itemLabel?.trim();
  return text || fallback;
}

export function campaignRewardLabelPlaceholder(): string {
  return i18n.t("rewardLabel.placeholder", { ns: "campaign.merchant" });
}

export function campaignRewardLabelHint(): string {
  return i18n.t("rewardLabel.hint", { ns: "campaign.merchant" });
}

/** @deprecated use campaignRewardLabelPlaceholder() */
export const CAMPAIGN_REWARD_LABEL_PLACEHOLDER = "例：中杯美式兑换券";

/** @deprecated use campaignRewardLabelHint() */
export const CAMPAIGN_REWARD_LABEL_HINT =
  "请写清楚到店可兑换的内容（含适用条件时可写在文案里，如「满50元减10元·堂食」）。店员核销时按此文案人工兑现。";
