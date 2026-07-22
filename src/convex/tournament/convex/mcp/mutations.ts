import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { requireAuth } from "./auth";
import { TournamentService } from "../service/tournament/tournamentService";

/** Join a tournament on behalf of a player (requires write scope). */
export const joinTournament = mutation({
  args: {
    apiKey: v.string(),
    uid: v.string(),
    typeId: v.string(),
    tournamentId: v.optional(v.string()),
  },
  handler: async (ctx, { apiKey, uid, typeId, tournamentId }) => {
    await requireAuth(ctx, apiKey, "write");
    return await TournamentService.join(ctx, { uid, tournamentId, typeId });
  },
});

/** Collect tournament rewards (requires write scope). */
export const collectTournament = mutation({
  args: {
    apiKey: v.string(),
    uid: v.string(),
    tournamentId: v.string(),
  },
  handler: async (ctx, { apiKey, uid, tournamentId }) => {
    await requireAuth(ctx, apiKey, "write");

    const playerTournament = await ctx.db
      .query("player_tournaments")
      .withIndex("by_tournament_uid", (q: any) =>
        q.eq("tournamentId", tournamentId).eq("uid", uid),
      )
      .unique();

    if (!playerTournament) {
      throw new Error("Tournament participation not found");
    }

    return await TournamentService.collect(ctx, playerTournament);
  },
});
