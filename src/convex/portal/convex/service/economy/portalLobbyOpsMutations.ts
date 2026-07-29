import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";
import { normalizeLobbyOpsMode } from "../../data/portalLobbyOpsMode";

/** SSO bridge → cache partner lobbyOpsMode. */
export const upsertPartnerLobbyOpsModeInternal = internalMutation({
  args: {
    partnerId: v.number(),
    lobbyOpsMode: v.union(v.literal("isolated"), v.literal("shared")),
  },
  handler: async (ctx, { partnerId, lobbyOpsMode }) => {
    const mode = normalizeLobbyOpsMode(lobbyOpsMode);
    if (!mode) return { ok: false as const, error: "invalid_mode" as const };
    const existing = await ctx.db
      .query("portal_partner_lobby_ops_settings")
      .withIndex("by_partnerId", (q) => q.eq("partnerId", partnerId))
      .unique();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { lobbyOpsMode: mode, updatedAt: now });
    } else {
      await ctx.db.insert("portal_partner_lobby_ops_settings", {
        partnerId,
        lobbyOpsMode: mode,
        updatedAt: now,
      });
    }
    return { ok: true as const };
  },
});
