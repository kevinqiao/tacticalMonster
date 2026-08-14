import { v } from "convex/values";

import { mutation, query } from "../../_generated/server";
import {
  ensureDefaultTown,
  getTownByPartnerAndSlug,
  listPartnerTowns,
  serializeTown,
} from "./portalTownService";
import { DEFAULT_TOWN_SLUG } from "../../data/portalTownConfig";

/** Player: resolve town for current partner (+ optional slug). Auto-creates default if missing. */
export const resolvePortalTown = mutation({
  args: {
    partnerId: v.number(),
    townSlug: v.optional(v.string()),
  },
  handler: async (ctx, { partnerId, townSlug }) => {
    let row = await getTownByPartnerAndSlug(ctx, partnerId, townSlug);
    if (!row && (!townSlug || townSlug === DEFAULT_TOWN_SLUG)) {
      await ensureDefaultTown(ctx, partnerId);
      row = await getTownByPartnerAndSlug(ctx, partnerId, townSlug);
    }
    if (!row || row.enabled === false) return null;
    return serializeTown(row);
  },
});

export const getPortalTown = query({
  args: {
    partnerId: v.number(),
    townSlug: v.optional(v.string()),
  },
  handler: async (ctx, { partnerId, townSlug }) => {
    const row = await getTownByPartnerAndSlug(ctx, partnerId, townSlug);
    if (!row || row.enabled === false) return null;
    return serializeTown(row);
  },
});

export const listPortalTowns = query({
  args: { partnerId: v.number() },
  handler: async (ctx, { partnerId }) => listPartnerTowns(ctx, partnerId),
});
