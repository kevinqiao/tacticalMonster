import { v } from "convex/values";
import { query } from "../_generated/server";
import { TournamentService } from "../service/tournament/tournamentService";
import { requireAuth } from "./auth";

/** List tournaments available for a player. */
export const listAvailableTournaments = query({
  args: {
    apiKey: v.string(),
    uid: v.string(),
    gameType: v.optional(v.string()),
  },
  handler: async (ctx, { apiKey, uid, gameType }) => {
    await requireAuth(ctx, apiKey, "read");
    try {
      return await TournamentService.getAvailableTournaments(ctx, { uid, gameType });
    } catch (error) {
      console.error("mcp.listAvailableTournaments failed:", error);
      return null;
    }
  },
});

/** Get tournament details by id. */
export const getTournamentDetails = query({
  args: {
    apiKey: v.string(),
    tournamentId: v.id("tournaments"),
  },
  handler: async (ctx, { apiKey, tournamentId }) => {
    await requireAuth(ctx, apiKey, "read");
    return await TournamentService.getTournamentDetails(ctx, tournamentId);
  },
});

/** Lightweight whoami for the calling API key. */
export const whoami = query({
  args: { apiKey: v.string() },
  handler: async (ctx, { apiKey }) => {
    const auth = await requireAuth(ctx, apiKey, "read");
    return {
      name: auth.name,
      tenantId: auth.tenantId,
      scopes: auth.scopes,
    };
  },
});

/** Player tournament status / inventory snapshot. */
export const getPlayerSnapshot = query({
  args: {
    apiKey: v.string(),
    uid: v.string(),
  },
  handler: async (ctx, { apiKey, uid }) => {
    await requireAuth(ctx, apiKey, "read");

    const player = await ctx.db
      .query("players")
      .withIndex("by_uid", (q) => q.eq("uid", uid))
      .unique();

    const inventory = await ctx.db
      .query("player_inventory")
      .withIndex("by_uid", (q) => q.eq("uid", uid))
      .unique();

    return {
      player: player
        ? {
            uid: player.uid,
            displayName: player.displayName,
            level: player.level,
            exp: player.exp,
            isActive: player.isActive,
          }
        : null,
      inventory: inventory
        ? {
            coins: inventory.coins,
            props: inventory.props,
            tickets: inventory.tickets,
          }
        : null,
    };
  },
});
