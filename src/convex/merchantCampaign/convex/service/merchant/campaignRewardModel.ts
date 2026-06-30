import type { Doc } from "../../_generated/dataModel";

import { rankRuleBounds } from "./campaignRankRewardTiers";

export type CampaignRewardModel = "pass_per_run" | "competitive_leaderboard";

export const CAMPAIGN_SETTLEMENT_MATCH_PREFIX = "campaign_settle:";

export function settlementMatchId(campaignId: string): string {
  return `${CAMPAIGN_SETTLEMENT_MATCH_PREFIX}${campaignId}`;
}

/** Infer legacy rows missing `rewardModel`. */
export function resolveRewardModel(campaign: {
  rewardModel?: CampaignRewardModel | string;
  mode?: "solo" | "multi";
  rewardRules?: Array<{ kind: string }>;
}): CampaignRewardModel {
  const mode = campaign.mode ?? "solo";
  const rewardRules = campaign.rewardRules ?? [];
  if (campaign.rewardModel === "pass_per_run" || campaign.rewardModel === "competitive_leaderboard") {
    return campaign.rewardModel;
  }
  const hasLegacyMulti = rewardRules.some((r) => r.kind === "multi_rank_top_n");
  const hasLeaderboardRule = rewardRules.some(
    (r) => r.kind === "campaign_leaderboard_rank_top_n"
  );
  if (hasLeaderboardRule || mode === "multi" || hasLegacyMulti) {
    return "competitive_leaderboard";
  }
  return "pass_per_run";
}

export function usesLeaderboard(rewardModel: CampaignRewardModel): boolean {
  return rewardModel === "competitive_leaderboard";
}

export function issuesCouponsOnRunSettle(rewardModel: CampaignRewardModel): boolean {
  return rewardModel === "pass_per_run";
}

export function publicCouponRewardLabel(
  reward: Doc<"merchant_campaigns">["rewardRules"][number]["reward"]
): string {
  if (reward.type === "free_item") {
    return reward.displayText?.trim() || reward.itemLabel.trim() || "活动兑换券";
  }
  return reward.displayText?.trim() || "活动兑换券";
}

/** 活动页公开展示：榜名次 → 兑换券文案 */
export function listPublicLeaderboardRankRewards(
  campaign: Doc<"merchant_campaigns">
): Array<{ rankFrom: number; rankTo: number; topN: number; label: string }> {
  return campaign.rewardRules
    .filter((r) => r.kind === "campaign_leaderboard_rank_top_n")
    .map((r) => {
      const bounds = rankRuleBounds(r);
      return {
        rankFrom: bounds.from,
        rankTo: bounds.to,
        topN: bounds.to,
        label: publicCouponRewardLabel(r.reward),
      };
    })
    .sort((a, b) => a.rankFrom - b.rankFrom || a.rankTo - b.rankTo);
}

/** 过关模式公开展示：达标条件 + 兑换券文案 */
export function getPublicPassReward(
  campaign: Doc<"merchant_campaigns">
): {
  kind: "solo_p75_success" | "score_threshold";
  minScore?: number;
  rewardLabel: string;
} | null {
  if (resolveRewardModel(campaign) !== "pass_per_run") return null;
  const rule = campaign.rewardRules.find(
    (r) => r.kind === "solo_p75_success" || r.kind === "score_threshold"
  );
  if (!rule) return null;
  return {
    kind: rule.kind,
    minScore: rule.minScore,
    rewardLabel: publicCouponRewardLabel(rule.reward),
  };
}
