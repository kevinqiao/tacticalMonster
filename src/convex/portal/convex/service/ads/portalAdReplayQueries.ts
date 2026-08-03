import { authedQuery } from "../../custom/session";
import { PORTAL_AD_REPLAY_ENABLED } from "../../data/portalAdReplayConfig";
import { dailyPeriodKey } from "../../utils/casualTaskPeriod";
import { resolveAdReplayDailyCap } from "./partnerAdReplayConfig";
import { readAdReplayUsedToday } from "./portalAdReplayService";

/** Lobby backpack: today's ad-replay remaining (Asia/Shanghai dayKey). */
export const getAdReplayDailyRemaining = authedQuery({
  args: {},
  handler: async (ctx) => {
    const cap = await resolveAdReplayDailyCap(ctx, ctx.uid);
    if (!PORTAL_AD_REPLAY_ENABLED) {
      return {
        remaining: 0,
        cap,
        enabled: false as const,
      };
    }
    const dayKey = dailyPeriodKey(Date.now());
    const used = await readAdReplayUsedToday(ctx, ctx.uid, dayKey);
    return {
      remaining: Math.max(0, cap - used),
      cap,
      enabled: true as const,
    };
  },
});
