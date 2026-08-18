import { v } from "convex/values";

import { authedQuery } from "../../custom/session";
import { getPortalTicketEntryOfferCore } from "./portalTicketEntryService";

export const getTicketEntryOffer = authedQuery({
  args: {
    lobbyId: v.optional(v.id("portal_lobbies")),
    tournamentId: v.optional(v.string()),
    scopeKey: v.optional(v.string()),
  },
  handler: (ctx, args) =>
    getPortalTicketEntryOfferCore(ctx, ctx.uid, {
      lobbyId: args.lobbyId ?? null,
      tournamentId: args.tournamentId ?? null,
      scopeKey: args.scopeKey ?? null,
    }),
});
