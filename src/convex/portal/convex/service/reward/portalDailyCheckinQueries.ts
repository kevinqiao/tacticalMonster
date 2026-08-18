import { v } from "convex/values";

import { authedQuery } from "../../custom/session";
import { getPortalDailyCheckinStatusCore } from "./portalDailyCheckinService";

/** 商店「每日签到」状态：今日是否已领、连签、奖励预览。 */
export const getDailyCheckinStatus = authedQuery({
  args: {
    lobbyId: v.optional(v.id("portal_lobbies")),
    scopeKey: v.optional(v.string()),
  },
  handler: async (ctx, args) =>
    getPortalDailyCheckinStatusCore(
      ctx,
      ctx.uid,
      Date.now(),
      args.lobbyId ?? null,
      args.scopeKey ?? null
    ),
});
