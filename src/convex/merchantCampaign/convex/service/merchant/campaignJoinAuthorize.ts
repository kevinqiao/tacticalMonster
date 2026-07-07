import { v } from "convex/values";
import { internalQuery } from "../../_generated/server";
import { getCampaignBySlugs, isCampaignLive, merchantPartnerId } from "./merchantStaff";
import { resolveExperienceType } from "./campaignExperienceType";
import { resolveRewardModel, usesLeaderboard } from "./campaignLeaderboardSettlement";
import { playLimitsDayTimezone } from "./campaignTimeZone";
import { assertCampaignPartnerSession } from "./campaignPartnerSession";

/** Portal join 时校验活动是否可入局（替代 playToken issue+validate）。 */
export const authorizeCampaignJoinInternal = internalQuery({
  args: {
    uid: v.string(),
    merchantSlug: v.string(),
    campaignSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const bundle = await getCampaignBySlugs(ctx, args.merchantSlug, args.campaignSlug);
    if (!bundle) {
      return { ok: false as const, error: "not_found" as const };
    }
    const { merchant, campaign } = bundle;

    const partnerCheck = assertCampaignPartnerSession({ uid: args.uid, merchant });
    if (!partnerCheck.ok) {
      return { ok: false as const, error: partnerCheck.error };
    }

    const expectedPartnerId = merchantPartnerId(merchant);

    if (resolveExperienceType(campaign) === "display") {
      return { ok: false as const, error: "display_campaign_not_playable" as const };
    }
    if (!isCampaignLive(campaign)) {
      return { ok: false as const, error: "campaign_not_live" as const };
    }

    const existingCoupons = await ctx.db
      .query("merchant_coupons")
      .withIndex("by_campaign_uid", (q) =>
        q.eq("campaignId", campaign.campaignId).eq("uid", args.uid)
      )
      .collect();
    const rewardModel = resolveRewardModel(campaign);
    if (!usesLeaderboard(rewardModel)) {
      const activeIssued = existingCoupons.filter(
        (c) => c.status === "issued" || c.status === "redeemed"
      );
      if (activeIssued.length >= campaign.playLimits.maxCouponsPerPlayer) {
        return { ok: false as const, error: "coupon_limit_reached" as const };
      }
    }

    return {
      ok: true as const,
      campaignId: campaign.campaignId,
      merchantId: merchant.merchantId,
      partnerId: expectedPartnerId,
      gameType: campaign.gameType,
      mode: campaign.mode,
      playLimits: {
        maxCouponsPerPlayer: campaign.playLimits.maxCouponsPerPlayer,
        dayTimezone: playLimitsDayTimezone(campaign.playLimits),
        ...(campaign.playLimits.maxPlaysPerDay != null
          ? { maxPlaysPerDay: campaign.playLimits.maxPlaysPerDay }
          : {}),
      },
    };
  },
});
