import { v } from "convex/values";

import { authedMutation } from "../../custom/session";
import { claimPortalDailyCheckinCore } from "./portalDailyCheckinService";

/** 领取今日签到门票（幂等：同日重复调用返回 alreadyClaimed）。 */
export const claimDailyCheckin = authedMutation({
  args: {
    lobbyId: v.optional(v.id("portal_lobbies")),
  },
  handler: async (ctx, args) =>
    claimPortalDailyCheckinCore(ctx, {
      uid: ctx.uid,
      lobbyId: args.lobbyId ?? null,
    }),
});
