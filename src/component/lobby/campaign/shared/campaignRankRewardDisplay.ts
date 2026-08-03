import i18n from "@/i18n";

export type CampaignLeaderboardRankRewardView = {
  rankFrom: number;
  rankTo: number;
  topN: number;
  label: string;
};

export function formatLeaderboardRankRewardLine(reward: CampaignLeaderboardRankRewardView): string {
  const { rankLabel, rewardLabel } = formatLeaderboardRankRewardParts(reward);
  return `${rankLabel}：${rewardLabel}`;
}

export function formatLeaderboardRankRewardParts(reward: CampaignLeaderboardRankRewardView): {
  rankLabel: string;
  rewardLabel: string;
} {
  const rankLabel =
    reward.rankFrom === reward.rankTo
      ? reward.rankFrom === 1
        ? i18n.t("rankReward.firstPlace", { ns: "campaign.player" })
        : i18n.t("rankReward.rankExact", { ns: "campaign.player", rank: reward.rankFrom })
      : reward.rankFrom === 1
        ? i18n.t("rankReward.topN", { ns: "campaign.player", n: reward.rankTo })
        : i18n.t("rankReward.rankRange", {
            ns: "campaign.player",
            from: reward.rankFrom,
            to: reward.rankTo,
          });
  return { rankLabel, rewardLabel: reward.label };
}
