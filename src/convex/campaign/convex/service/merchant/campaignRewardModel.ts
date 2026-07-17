import type { Doc } from "../../_generated/dataModel";

import { rankRuleBounds } from "./campaignRankRewardTiers";

export type CampaignRewardModel = "pass_per_run" | "competitive_leaderboard";

export type CouponSource = "pass_run" | "campaign_settle";

/** 发券幂等键（含 uid，避免 multi / topN 互相挡） */
export function buildCouponIssueKey(args: {
  source: CouponSource;
  campaignId: string;
  uid: string;
  ruleId: string;
  runTournamentId?: string;
  settlementId?: string;
}): string {
  if (args.source === "pass_run") {
    const runTournamentId = args.runTournamentId?.trim();
    if (!runTournamentId) {
      throw new Error("runTournamentId_required");
    }
    return `pr:${args.campaignId}:${args.uid}:${runTournamentId}:${args.ruleId}`;
  }
  const settlementId = args.settlementId?.trim();
  if (!settlementId) {
    throw new Error("settlementId_required");
  }
  return `cs:${args.campaignId}:${args.uid}:${settlementId}:${args.ruleId}`;
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
  const hasLeaderboardRule = rewardRules.some(
    (r) => r.kind === "campaign_leaderboard_rank_top_n"
  );
  if (hasLeaderboardRule) {
    return "competitive_leaderboard";
  }
  // Per-match multi place rewards (pass_per_run + multi).
  if (rewardRules.some((r) => r.kind === "multi_rank_top_n")) {
    return "pass_per_run";
  }
  // Legacy: multi without explicit model/rules defaulted to competitive.
  if (mode === "multi") {
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
  reward: Doc<"campaigns">["rewardRules"][number]["reward"]
): string {
  if (reward.type === "free_item") {
    return reward.displayText?.trim() || reward.itemLabel.trim() || "活动兑换券";
  }
  return reward.displayText?.trim() || "活动兑换券";
}

/** 活动页公开展示：榜名次 / 局内名次 → 兑换券文案 */
export function listPublicLeaderboardRankRewards(
  campaign: Doc<"campaigns">
): Array<{ rankFrom: number; rankTo: number; topN: number; label: string }> {
  return campaign.rewardRules
    .filter(
      (r) =>
        r.kind === "campaign_leaderboard_rank_top_n" || r.kind === "multi_rank_top_n"
    )
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
  campaign: Doc<"campaigns">
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
