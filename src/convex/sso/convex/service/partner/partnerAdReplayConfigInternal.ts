import { v } from "convex/values";

import { internalQuery } from "../../_generated/server";
import { getPartnerByPid } from "./partnerStaff";
import {
  DEFAULT_AD_REPLAY_DAILY_CAP,
  effectivePartnerReplaySettings,
  readAdReplayDailyCapFromPartnerData,
} from "./partnerAdReplayConfig";

/** SSO → Portal bridge: resolve per-partner replay settings. */
export const getPartnerAdReplayConfigInternal = internalQuery({
  args: { partnerId: v.number() },
  handler: async (ctx, { partnerId }) => {
    const partner = await getPartnerByPid(ctx, partnerId);
    const data =
      partner?.data && typeof partner.data === "object"
        ? (partner.data as Record<string, unknown>)
        : null;
    const settings = effectivePartnerReplaySettings(data);
    const override = readAdReplayDailyCapFromPartnerData(data);
    return {
      ok: true as const,
      partnerId,
      adReplayDailyCap: settings.adReplayDailyCap,
      hasOverride: override != null,
      defaultCap: DEFAULT_AD_REPLAY_DAILY_CAP,
      maxReplaysPerMatch: settings.maxReplaysPerMatch,
      adReplayEnabled: settings.adReplayEnabled,
      ticketReplayEnabled: settings.ticketReplayEnabled,
      ticketReplayPriceTickets: settings.ticketReplayPriceTickets,
      coinReplayEnabled: settings.coinReplayEnabled,
      coinReplayPriceCoins: settings.coinReplayPriceCoins,
      coinReplayDailyCap: settings.coinReplayDailyCap,
      settings,
    };
  },
});
