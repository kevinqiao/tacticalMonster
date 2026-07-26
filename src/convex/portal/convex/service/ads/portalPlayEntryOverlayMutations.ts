import { v } from "convex/values";

import { mutation } from "../../_generated/server";

/**
 * Upsert lobby or tournament overlay on portal_partner_play_entry_settings.
 * Partner base rows continue to be written by SSO bridge
 * (`upsertPartnerPlayEntrySettingsInternal`).
 */
export const upsertPlayEntryOverlay = mutation({
  args: {
    partnerId: v.number(),
    lobbyId: v.id("portal_lobbies"),
    tournamentId: v.optional(v.string()),
    quotaScope: v.optional(
      v.union(v.literal("mode"), v.literal("lobby"), v.literal("tournament"))
    ),
    freePlaySoloDailyCap: v.optional(v.number()),
    freePlayMultiDailyCap: v.optional(v.number()),
    ticketEntryEnabled: v.optional(v.boolean()),
    ticketEntrySoloPriceTickets: v.optional(v.number()),
    ticketEntrySoloDailyCap: v.optional(v.number()),
    ticketEntryMultiPriceTickets: v.optional(v.number()),
    ticketEntryMultiDailyCap: v.optional(v.number()),
    adEntryEnabled: v.optional(v.boolean()),
    adEntrySoloDailyCap: v.optional(v.number()),
    adEntryMultiDailyCap: v.optional(v.number()),
    coinEntryEnabled: v.optional(v.boolean()),
    coinEntrySoloPriceCoins: v.optional(v.number()),
    coinEntrySoloDailyCap: v.optional(v.number()),
    coinEntryMultiPriceCoins: v.optional(v.number()),
    coinEntryMultiDailyCap: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const partnerId = Math.floor(args.partnerId);
    const lobby = await ctx.db.get(args.lobbyId);
    if (!lobby || lobby.partnerId !== partnerId) {
      throw new Error("lobby_not_found");
    }
    const tournamentId = args.tournamentId?.trim() || undefined;
    const rows = await ctx.db
      .query("portal_partner_play_entry_settings")
      .withIndex("by_partner_lobby", (q) =>
        q.eq("partnerId", partnerId).eq("lobbyId", args.lobbyId)
      )
      .collect();
    const match = rows.find((r) =>
      tournamentId
        ? r.tournamentId === tournamentId
        : r.tournamentId == null || r.tournamentId === ""
    );
    const candidates: Array<[string, unknown]> = [
      ["quotaScope", args.quotaScope],
      ["freePlaySoloDailyCap", args.freePlaySoloDailyCap],
      ["freePlayMultiDailyCap", args.freePlayMultiDailyCap],
      ["ticketEntryEnabled", args.ticketEntryEnabled],
      ["ticketEntrySoloPriceTickets", args.ticketEntrySoloPriceTickets],
      ["ticketEntrySoloDailyCap", args.ticketEntrySoloDailyCap],
      ["ticketEntryMultiPriceTickets", args.ticketEntryMultiPriceTickets],
      ["ticketEntryMultiDailyCap", args.ticketEntryMultiDailyCap],
      ["adEntryEnabled", args.adEntryEnabled],
      ["adEntrySoloDailyCap", args.adEntrySoloDailyCap],
      ["adEntryMultiDailyCap", args.adEntryMultiDailyCap],
      ["coinEntryEnabled", args.coinEntryEnabled],
      ["coinEntrySoloPriceCoins", args.coinEntrySoloPriceCoins],
      ["coinEntrySoloDailyCap", args.coinEntrySoloDailyCap],
      ["coinEntryMultiPriceCoins", args.coinEntryMultiPriceCoins],
      ["coinEntryMultiDailyCap", args.coinEntryMultiDailyCap],
    ];
    const data: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [k, val] of candidates) {
      if (val !== undefined) data[k] = val;
    }
    if (match) {
      await ctx.db.patch(match._id, data);
      return { ok: true as const, id: match._id };
    }
    const id = await ctx.db.insert("portal_partner_play_entry_settings", {
      partnerId,
      lobbyId: args.lobbyId,
      ...(tournamentId ? { tournamentId } : {}),
      ...data,
      updatedAt: Date.now(),
    });
    return { ok: true as const, id };
  },
});

export const clearPlayEntryOverlay = mutation({
  args: {
    partnerId: v.number(),
    lobbyId: v.id("portal_lobbies"),
    tournamentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tournamentId = args.tournamentId?.trim() || undefined;
    const rows = await ctx.db
      .query("portal_partner_play_entry_settings")
      .withIndex("by_partner_lobby", (q) =>
        q.eq("partnerId", args.partnerId).eq("lobbyId", args.lobbyId)
      )
      .collect();
    const match = rows.find((r) =>
      tournamentId
        ? r.tournamentId === tournamentId
        : r.tournamentId == null || r.tournamentId === ""
    );
    if (match) await ctx.db.delete(match._id);
    return { ok: true as const };
  },
});
