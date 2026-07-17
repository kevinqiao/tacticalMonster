import { v } from "convex/values";

export {
  couponActivationValidator,
  couponValidityValidator,
} from "./couponValidity";

export const campaignStatusValidator = v.union(
  v.literal("draft"),
  v.literal("scheduled"),
  v.literal("live"),
  v.literal("ended")
);

export const campaignModeValidator = v.union(v.literal("solo"), v.literal("multi"));

export const campaignRewardModelValidator = v.union(
  v.literal("pass_per_run"),
  v.literal("competitive_leaderboard")
);

/** coupons.source：单局过关发券 vs 活动期末积分榜发券 */
export const couponSourceValidator = v.union(
  v.literal("pass_run"),
  v.literal("campaign_settle")
);

export const campaignExperienceTypeValidator = v.union(
  v.literal("game"),
  v.literal("display")
);

export const displayCtaKindValidator = v.union(
  v.literal("none"),
  v.literal("external_url"),
  v.literal("tel"),
  v.literal("maps")
);

export const displayConfigValidator = v.object({
  highlightText: v.optional(v.string()),
  cta: v.optional(
    v.object({
      kind: displayCtaKindValidator,
      label: v.optional(v.string()),
      url: v.optional(v.string()),
    })
  ),
});

export const campaignSettlementStatusValidator = v.union(
  v.literal("pending"),
  v.literal("done"),
  v.literal("failed")
);

export const couponStatusValidator = v.union(
  v.literal("issued"),
  v.literal("redeemed"),
  v.literal("expired"),
  v.literal("void")
);

export const couponDefStatusValidator = v.union(
  v.literal("active"),
  v.literal("archived")
);

export const couponRewardDefValidator = v.union(
  v.object({
    type: v.literal("fixed_discount"),
    amountCents: v.number(),
    currency: v.string(),
    minSpendCents: v.optional(v.number()),
    displayText: v.optional(v.string()),
  }),
  v.object({
    type: v.literal("percent_discount"),
    percent: v.number(),
    capCents: v.optional(v.number()),
    displayText: v.optional(v.string()),
  }),
  v.object({
    type: v.literal("free_item"),
    itemLabel: v.string(),
    displayText: v.optional(v.string()),
  }),
  v.object({
    type: v.literal("bundle"),
    items: v.array(v.string()),
    displayText: v.string(),
  })
);

export const rewardRuleValidator = v.object({
  ruleId: v.string(),
  kind: v.union(
    v.literal("score_threshold"),
    v.literal("solo_p75_success"),
    v.literal("multi_rank_top_n"),
    v.literal("campaign_leaderboard_rank_top_n")
  ),
  minScore: v.optional(v.number()),
  rankFrom: v.optional(v.number()),
  rankTo: v.optional(v.number()),
  topN: v.optional(v.number()),
  couponDefId: v.optional(v.string()),
  reward: couponRewardDefValidator,
});

export const themeJsonValidator = v.object({
  version: v.number(),
  sourceUrl: v.optional(v.string()),
  mode: v.union(v.literal("light"), v.literal("dark")),
  brand: v.object({
    primary: v.string(),
    onPrimary: v.string(),
    background: v.string(),
    surface: v.string(),
    text: v.string(),
    textMuted: v.string(),
    fontFamily: v.string(),
    radiusMd: v.string(),
  }),
  shell: v.object({
    ctaBg: v.string(),
    ctaText: v.string(),
    headerBg: v.string(),
    posterFrameRadius: v.string(),
  }),
  assets: v.optional(
    v.object({
      logoUrl: v.optional(v.string()),
    })
  ),
});
