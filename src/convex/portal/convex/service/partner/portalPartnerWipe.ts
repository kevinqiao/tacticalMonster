/**
 * Secret-gated wipe of partner-scoped Portal *config* (not seed pools / player runtime).
 * Used by operation scripts for clean test relaunch.
 */

import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";

/**
 * Wipe partner config SoT for relaunch:
 * lobbies (incl. default), shop settings, partner-owned SKUs,
 * lobbyOps / replay / play-entry settings.
 * Does NOT touch seed pools or player economy tables.
 */
export const wipePartnerConfigInternal = internalMutation({
  args: { partnerId: v.number() },
  handler: async (ctx, { partnerId }) => {
    const pid = Math.floor(partnerId);
    if (!Number.isFinite(pid) || pid < 0) {
      throw new Error("invalid_partner");
    }
    // First-party / platform namespace — never wipe via this path.
    if (pid === 0) {
      throw new Error("default_partner_protected");
    }

    const shopSettings = await ctx.db
      .query("portal_partner_shop_settings")
      .withIndex("by_partnerId", (q) => q.eq("partnerId", pid))
      .collect();
    for (const row of shopSettings) await ctx.db.delete(row._id);

    const playEntries = await ctx.db
      .query("portal_partner_play_entry_settings")
      .withIndex("by_partnerId", (q) => q.eq("partnerId", pid))
      .collect();
    for (const row of playEntries) await ctx.db.delete(row._id);

    const lobbies = await ctx.db
      .query("portal_lobbies")
      .withIndex("by_partnerId", (q) => q.eq("partnerId", pid))
      .collect();
    for (const row of lobbies) await ctx.db.delete(row._id);

    const lobbyOps = await ctx.db
      .query("portal_partner_lobby_ops_settings")
      .withIndex("by_partnerId", (q) => q.eq("partnerId", pid))
      .collect();
    for (const row of lobbyOps) await ctx.db.delete(row._id);

    const replay = await ctx.db
      .query("portal_partner_replay_settings")
      .withIndex("by_partnerId", (q) => q.eq("partnerId", pid))
      .collect();
    for (const row of replay) await ctx.db.delete(row._id);

    // Partner-owned SKUs: delete if solely owned; else drop this partnerId.
    const allSkus = await ctx.db.query("portal_shop_skus").collect();
    let shopSkusDeleted = 0;
    let shopSkusUnlinked = 0;
    for (const row of allSkus) {
      const ids = Array.isArray(row.partnerIds) ? row.partnerIds : [];
      if (!ids.includes(pid)) continue;
      if (ids.length <= 1) {
        await ctx.db.delete(row._id);
        shopSkusDeleted += 1;
      } else {
        await ctx.db.patch(row._id, {
          partnerIds: ids.filter((id) => id !== pid),
        });
        shopSkusUnlinked += 1;
      }
    }

    return {
      ok: true as const,
      partnerId: pid,
      deleted: {
        portal_lobbies: lobbies.length,
        portal_partner_shop_settings: shopSettings.length,
        portal_partner_play_entry_settings: playEntries.length,
        portal_partner_lobby_ops_settings: lobbyOps.length,
        portal_partner_replay_settings: replay.length,
        portal_shop_skus: shopSkusDeleted,
        portal_shop_skus_unlinked: shopSkusUnlinked,
      },
    };
  },
});
