import { v } from "convex/values";

import { authedQuery } from "../../custom/session";
import { getPortalAdCoinOfferCore } from "./portalAdCoinService";

/** 商店「免费金币」：今日剩余 / 单次奖励额（lobby 隔离时按当前大厅钱包） */
export const getAdCoinOffer = authedQuery({
  args: {
    lobbyId: v.optional(v.id("portal_lobbies")),
    scopeKey: v.optional(v.string()),
  },
  handler: async (ctx, args) =>
    getPortalAdCoinOfferCore(
      ctx,
      ctx.uid,
      Date.now(),
      args.lobbyId ?? null,
      args.scopeKey ?? null
    ),
});
