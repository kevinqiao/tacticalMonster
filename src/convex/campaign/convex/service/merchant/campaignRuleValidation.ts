import type { Doc } from "../../_generated/dataModel";
import type { Id } from "../../_generated/dataModel";
import { resolveExperienceType } from "./campaignExperienceType";
import { resolveRewardModel } from "./campaignRewardModel";
import { assertDisplayCampaignConfig, assertCampaignPosterRequired } from "./displayCampaignValidation";
import {
  assertNonOverlappingRankTiers,
  rankRuleBounds,
} from "./campaignRankRewardTiers";

export function assertCampaignConfig(args: {
  experienceType?: Doc<"campaigns">["experienceType"];
  gameType: string;
  mode: "solo" | "multi";
  rewardModel?: Doc<"campaigns">["rewardModel"];
  startsAt: number;
  endsAt: number;
  rewardRules: Doc<"campaigns">["rewardRules"];
  posterStorageId?: Id<"_storage"> | null;
  posterPortraitStorageId?: Id<"_storage"> | null;
  posterLandscapeStorageId?: Id<"_storage"> | null;
  displayConfig?: Doc<"campaigns">["displayConfig"];
  requirePoster?: boolean;
}): void {
  if (args.startsAt >= args.endsAt) {
    throw new Error("invalid_period");
  }

  const experienceType = resolveExperienceType(args);
  if (experienceType === "display") {
    assertDisplayCampaignConfig({
      startsAt: args.startsAt,
      endsAt: args.endsAt,
      posterStorageId: args.posterStorageId,
      posterPortraitStorageId: args.posterPortraitStorageId,
      posterLandscapeStorageId: args.posterLandscapeStorageId,
      displayConfig: args.displayConfig,
      requirePoster: args.requirePoster,
    });
    return;
  }

  assertCampaignPosterRequired({
    posterStorageId: args.posterStorageId,
    posterPortraitStorageId: args.posterPortraitStorageId,
    posterLandscapeStorageId: args.posterLandscapeStorageId,
    requirePoster: args.requirePoster,
  });

  if (!PARTNER_GAME_TYPES.includes(args.gameType as PartnerCampaignGameType)) {
    throw new Error("unsupported_game_type");
  }
  if (args.rewardRules.length === 0) {
    throw new Error("reward_rules_required");
  }
  assertFreeItemRewardsOnly(args.rewardRules);

  const rewardModel = resolveRewardModel({
    rewardModel: args.rewardModel,
    mode: args.mode,
    rewardRules: args.rewardRules,
  });

  if (rewardModel === "pass_per_run") {
    if (args.mode === "solo") {
      for (const rule of args.rewardRules) {
        if (
          rule.kind !== "solo_p75_success" &&
          rule.kind !== "score_threshold"
        ) {
          throw new Error("reward_rule_model_mismatch");
        }
        if (rule.kind === "score_threshold" && typeof rule.minScore !== "number") {
          throw new Error("score_threshold_requires_minScore");
        }
      }
      return;
    }
    // pass_per_run + multi: per-match place rewards
    for (const rule of args.rewardRules) {
      if (rule.kind !== "multi_rank_top_n") {
        throw new Error("reward_rule_model_mismatch");
      }
      const { from, to } = rankRuleBounds(rule);
      if (from < 1 || to > 5 || from > to) {
        throw new Error("invalid_rank_tier");
      }
    }
    assertNonOverlappingRankTiers(args.rewardRules);
    return;
  }

  for (const rule of args.rewardRules) {
    if (rule.kind !== "campaign_leaderboard_rank_top_n") {
      throw new Error("reward_rule_model_mismatch");
    }
    const { from, to } = rankRuleBounds(rule);
    if (from < 1 || to > 20 || from > to) {
      throw new Error("invalid_rank_tier");
    }
  }
  assertNonOverlappingRankTiers(args.rewardRules);
}

/** Must stay aligned with partnerGameRegistry PARTNER_GAME_TYPES. */
export const PARTNER_GAME_TYPES = [
  "block_blast",
  "match_3",
  "solitaire",
  "tower_arena",
  "yatz",
] as const;

export type PartnerCampaignGameType = (typeof PARTNER_GAME_TYPES)[number];

/** @deprecated use PARTNER_GAME_TYPES */
export const PORTAL_CAMPAIGN_GAME_TYPES = PARTNER_GAME_TYPES;
/** @deprecated use PartnerCampaignGameType */
export type PortalCampaignGameType = PartnerCampaignGameType;

export function portalTemplateIdForCampaign(
  gameType: string,
  mode: "solo" | "multi"
): string {
  return mode === "solo" ? `portal_solo_p75_${gameType}` : `portal_multi_${gameType}`;
}

/** Staff-created campaigns must reference an active coupon def (legacy rows may omit). */
export function assertStaffCouponDefRefs(
  rewardRules: Doc<"campaigns">["rewardRules"]
): void {
  for (const rule of rewardRules) {
    if (!rule.couponDefId?.trim()) {
      throw new Error("coupon_def_required");
    }
  }
}

/** Route A: staff-configured campaigns use text-only free_item rewards (manual in-store redeem). */
export function assertFreeItemRewardsOnly(
  rewardRules: Doc<"campaigns">["rewardRules"]
): void {
  for (const rule of rewardRules) {
    if (rule.reward.type !== "free_item") {
      throw new Error("reward_must_be_free_item");
    }
    const label = rule.reward.itemLabel.trim() || rule.reward.displayText?.trim();
    if (!label) {
      throw new Error("reward_label_required");
    }
  }
}
