import { v } from "convex/values";
import { internalQuery } from "../../_generated/server";
import { getCampaignByPartnerIdAndSlug, isCampaignLive } from "./merchantStaff";
import { resolveExperienceType } from "./campaignExperienceType";
import { resolveRewardModel, usesLeaderboard } from "./campaignLeaderboardSettlement";
import { playLimitsDayTimezone } from "./campaignTimeZone";
import { assertCampaignPartnerSession } from "./campaignPartnerSession";
import { resolveCampaignTournament } from "./campaignTournament";

/**
 * Portal join 时校验活动是否可入局。
 * partnerId comes from the platform uid session (and must match campaign.partnerId).
 */
export const authorizeCampaignJoinInternal = internalQuery({
  args: {
    uid: v.string(),
    partnerId: v.number(),
    campaignSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const campaign = await getCampaignByPartnerIdAndSlug(ctx, args.partnerId, args.campaignSlug);
    if (!campaign) {
      return { ok: false as const, error: "not_found" as const };
    }

    const partnerCheck = assertCampaignPartnerSession({
      uid: args.uid,
      partnerId: campaign.partnerId,
    });
    if (!partnerCheck.ok) {
      return { ok: false as const, error: partnerCheck.error };
    }

    if (resolveExperienceType(campaign) === "display") {
      return { ok: false as const, error: "display_campaign_not_playable" as const };
    }
    if (!isCampaignLive(campaign)) {
      return { ok: false as const, error: "campaign_not_live" as const };
    }

    const play = resolveCampaignTournament(campaign);
    if (!play) {
      return { ok: false as const, error: "unknown_tournament" as const };
    }

    const rewardModel = resolveRewardModel(campaign);

    // Coupon-limit enforcement now lives on Portal (backpack owns the vouchers):
    // see casualTournamentActions.joinTournament's countCampaignVouchersForUid check
    // for pass_per_run, and grantCampaignVoucher's own maxCouponsPerPlayer guard.

    const replaySettings = campaign.replaySettings;
    return {
      ok: true as const,
      campaignId: campaign.campaignId,
      partnerId: campaign.partnerId,
      tournamentId: play.tournamentId,
      gameType: play.gameType,
      mode: play.mode,
      rewardMode: rewardModel,
      dueTime: usesLeaderboard(rewardModel) ? campaign.endsAt : 0,
      playLimits: {
        maxCouponsPerPlayer: campaign.playLimits.maxCouponsPerPlayer,
        dayTimezone: playLimitsDayTimezone(campaign.playLimits),
        ...(campaign.playLimits.maxPlaysPerDay != null
          ? { maxPlaysPerDay: campaign.playLimits.maxPlaysPerDay }
          : {}),
      },
      ...(replaySettings && typeof replaySettings === "object"
        ? { replaySettings }
        : {}),
    };
  },
});
