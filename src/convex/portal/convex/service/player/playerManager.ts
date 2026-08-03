import { v } from "convex/values";
import { internalMutation } from "../../_generated/server";
import { authedQuery } from "../../custom/session";
import { getPlayerWalletBalances } from "../economy/portalWalletDao";
import { resolveEconomyScope } from "../economy/resolveEconomyScope";
import { resolvePortalShopSessionPartnerId } from "../../data/portalShopPartner";

/** Ensure portal_players row exists for platform identity uid. */
export const ensurePlayer = internalMutation({
  args: { uid: v.string() },
  handler: async (ctx, { uid }) => {
    const existing = await ctx.db
      .query("portal_players")
      .withIndex("by_uid", (q) => q.eq("uid", uid))
      .unique();
    const now = Date.now();
    if (!existing) {
      await ctx.db.insert("portal_players", {
        uid,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      const patch: { updatedAt: number; createdAt?: number } = { updatedAt: now };
      if (!existing.createdAt) {
        patch.createdAt = existing.updatedAt ?? now;
      }
      await ctx.db.patch(existing._id, patch);
    }
    return await ctx.db
      .query("portal_players")
      .withIndex("by_uid", (q) => q.eq("uid", uid))
      .unique();
  },
});

/** @deprecated Use ensurePlayer — kept as alias for internal callers during migration. */
export const authenticate = ensurePlayer;

export const getPortalPlayerWallet = authedQuery({
  args: {
    lobbyId: v.optional(v.id("portal_lobbies")),
  },
  handler: async (ctx, { lobbyId }) => {
    const partnerId = resolvePortalShopSessionPartnerId(ctx.uid) ?? 0;
    let scopeKey = "shared";
    try {
      const scope = await resolveEconomyScope(ctx, {
        partnerId,
        lobbyId: lobbyId ?? null,
      });
      scopeKey = scope.scopeKey;
    } catch {
      scopeKey = "shared";
    }
    const bal = await getPlayerWalletBalances(ctx, ctx.uid, scopeKey);
    return {
      coins: bal.coins,
      gems: bal.gems,
      tickets: bal.tickets,
      scopeKey,
    };
  },
});
