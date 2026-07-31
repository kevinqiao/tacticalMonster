import { v } from "convex/values";

import { isValidPortalWeekKey } from "../../data/portalSeasonHonorConfig";
import { normalizeLobbyOpsMode } from "../../data/portalLobbyOpsMode";
import { internalMutation } from "../../_generated/server";

/** SSO bridge → cache partner lobbyOpsMode / season epoch. */
export const upsertPartnerLobbyOpsModeInternal = internalMutation({
  args: {
    partnerId: v.number(),
    lobbyOpsMode: v.union(v.literal("isolated"), v.literal("shared")),
    seasonEpochWeekKey: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, { partnerId, lobbyOpsMode, seasonEpochWeekKey }) => {
    const mode = normalizeLobbyOpsMode(lobbyOpsMode);
    if (!mode) return { ok: false as const, error: "invalid_mode" as const };
    if (
      seasonEpochWeekKey !== undefined &&
      seasonEpochWeekKey !== null &&
      !isValidPortalWeekKey(seasonEpochWeekKey)
    ) {
      return { ok: false as const, error: "season_epoch_week_key_invalid" as const };
    }
    const existing = await ctx.db
      .query("portal_partner_lobby_ops_settings")
      .withIndex("by_partnerId", (q) => q.eq("partnerId", partnerId))
      .unique();
    const now = Date.now();

    const next: {
      partnerId: number;
      lobbyOpsMode: "isolated" | "shared";
      seasonEpochWeekKey?: string;
      updatedAt: number;
    } = {
      partnerId,
      lobbyOpsMode: mode,
      updatedAt: now,
    };

    if (seasonEpochWeekKey === undefined) {
      if (existing?.seasonEpochWeekKey) {
        next.seasonEpochWeekKey = existing.seasonEpochWeekKey;
      }
    } else if (seasonEpochWeekKey !== null) {
      next.seasonEpochWeekKey = seasonEpochWeekKey;
    }
    // null → omit seasonEpochWeekKey (clear override)

    if (existing) {
      await ctx.db.replace(existing._id, next);
    } else {
      await ctx.db.insert("portal_partner_lobby_ops_settings", next);
    }
    return { ok: true as const };
  },
});
