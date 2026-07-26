import { v } from "convex/values";

import { authedQuery } from "../../custom/session";
import { getPortalAdEntryOfferCore } from "./portalAdEntryService";

export const getAdEntryOffer = authedQuery({
  args: {
    lobbyId: v.optional(v.id("portal_lobbies")),
    tournamentId: v.optional(v.string()),
  },
  handler: (ctx, args) =>
    getPortalAdEntryOfferCore(ctx, ctx.uid, {
      lobbyId: args.lobbyId ?? null,
      tournamentId: args.tournamentId ?? null,
    }),
});
