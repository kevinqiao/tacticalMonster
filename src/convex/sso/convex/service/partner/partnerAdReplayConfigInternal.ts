import { v } from "convex/values";

import { internalQuery } from "../../_generated/server";
import { getPartnerByPid } from "./partnerStaff";
import {
  DEFAULT_AD_REPLAY_DAILY_CAP,
  effectiveAdReplayDailyCap,
  readAdReplayDailyCapFromPartnerData,
} from "./partnerAdReplayConfig";

/** SSO → Portal bridge: resolve per-partner ad replay daily cap. */
export const getPartnerAdReplayConfigInternal = internalQuery({
  args: { partnerId: v.number() },
  handler: async (ctx, { partnerId }) => {
    const partner = await getPartnerByPid(ctx, partnerId);
    const data =
      partner?.data && typeof partner.data === "object"
        ? (partner.data as Record<string, unknown>)
        : null;
    const override = readAdReplayDailyCapFromPartnerData(data);
    return {
      ok: true as const,
      partnerId,
      adReplayDailyCap: effectiveAdReplayDailyCap(data),
      hasOverride: override != null,
      defaultCap: DEFAULT_AD_REPLAY_DAILY_CAP,
    };
  },
});
