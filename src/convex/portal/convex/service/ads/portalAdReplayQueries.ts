import { v } from "convex/values";

import { authedQuery } from "../../custom/session";
import { PORTAL_AD_REPLAY_ENABLED } from "../../data/portalAdReplayConfig";
import { dailyPeriodKey } from "../../utils/casualTaskPeriod";
import { resolveAdReplayDailyCap } from "./partnerAdReplayConfig";
import { readAdReplayUsedToday } from "./portalAdReplayService";

/** Backpack: today's ad-replay remaining (Asia/Shanghai dayKey). Town passes scopeKey. */
export const getAdReplayDailyRemaining = authedQuery({
  args: {
    scopeKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const cap = await resolveAdReplayDailyCap(ctx, ctx.uid);
    if (!PORTAL_AD_REPLAY_ENABLED) {
      return {
        remaining: 0,
        cap,
        enabled: false as const,
      };
    }
    const dayKey = dailyPeriodKey(Date.now());
    const used = await readAdReplayUsedToday(ctx, ctx.uid, dayKey, args.scopeKey);
    return {
      remaining: Math.max(0, cap - used),
      cap,
      enabled: true as const,
    };
  },
});
