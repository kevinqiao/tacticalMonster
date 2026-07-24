import { authedQuery } from "../../custom/session";
import { getPortalAdCoinOfferCore } from "./portalAdCoinService";

/** 商店「免费金币」：今日剩余 / 单次奖励额 */
export const getAdCoinOffer = authedQuery({
  args: {},
  handler: async (ctx) => getPortalAdCoinOfferCore(ctx, ctx.uid),
});
