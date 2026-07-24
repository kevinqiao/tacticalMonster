import { authedQuery } from "../../custom/session";
import { getPortalAdEntryOfferCore } from "./portalAdEntryService";

export const getAdEntryOffer = authedQuery({
  args: {},
  handler: (ctx) => getPortalAdEntryOfferCore(ctx, ctx.uid),
});
