import { v } from "convex/values";
import { internalQuery } from "../../../_generated/server";
import { authedQuery } from "../../../custom/session";
import { assertJoinEntryEligible } from "./casualTournamentJoinCore";

/** Pre-join entry preview (internal). */
export const previewJoinEntryChargeInternal = internalQuery({
  args: {
    uid: v.string(),
    tournamentId: v.string(),
    partnerId: v.optional(v.number()),
    lobbyId: v.optional(v.id("portal_lobbies")),
  },
  handler: async (ctx, { uid, tournamentId, partnerId, lobbyId }) => {
    return await assertJoinEntryEligible(ctx, uid, tournamentId, Date.now(), {
      partnerId,
      lobbyId,
    });
  },
});

export const previewJoinEntryCharge = authedQuery({
  args: {
    tournamentId: v.string(),
    lobbyId: v.optional(v.id("portal_lobbies")),
  },
  handler: async (ctx, { tournamentId, lobbyId }) => {
    return await assertJoinEntryEligible(
      ctx,
      ctx.uid,
      tournamentId,
      Date.now(),
      { lobbyId }
    );
  },
});
