import { authedQuery } from "../../custom/session";
import {
  PORTAL_AD_REPLAY_DAILY_CAP,
  PORTAL_AD_REPLAY_ENABLED,
} from "../../data/portalAdReplayConfig";
import { dailyPeriodKey } from "../../utils/casualTaskPeriod";
import { countAdReplayClaimsForDay } from "./portalAdReplayService";

/** Lobby backpack: today's ad-replay remaining (Asia/Shanghai dayKey). */
export const getAdReplayDailyRemaining = authedQuery({
  args: {},
  handler: async (ctx) => {
    if (!PORTAL_AD_REPLAY_ENABLED) {
      return {
        remaining: 0,
        cap: PORTAL_AD_REPLAY_DAILY_CAP,
        enabled: false as const,
      };
    }
    const dayKey = dailyPeriodKey(Date.now());
    const used = await countAdReplayClaimsForDay(ctx, ctx.uid, dayKey);
    return {
      remaining: Math.max(0, PORTAL_AD_REPLAY_DAILY_CAP - used),
      cap: PORTAL_AD_REPLAY_DAILY_CAP,
      enabled: true as const,
    };
  },
});
