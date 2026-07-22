import { authedQuery } from "../../custom/session";
import { getPortalTicketEntryOfferCore } from "./portalTicketEntryService";

export const getTicketEntryOffer = authedQuery({
  args: {},
  handler: (ctx) => getPortalTicketEntryOfferCore(ctx, ctx.uid),
});
