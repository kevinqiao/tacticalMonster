import { v } from "convex/values";

import { internalQuery, query } from "../_generated/server";

import {
  DEFAULT_PLAYER_AUTH,
  DEFAULT_STAFF_AUTH,
  resolvePlayerAuth,
  resolveStaffAuth,
  type PlayerAuth,
  type StaffAuth,
} from "./auth/partnerAuth";
import { readPartnerGames } from "./partner/portalPartnerConfig";

function formatPartnerRow(partner: Record<string, unknown>) {
  const playerAuth = resolvePlayerAuth(partner as { playerAuth?: PlayerAuth; data?: unknown });
  const staffAuth = resolveStaffAuth(partner as { staffAuth?: StaffAuth });
  // Drop legacy portal_key if still present on old documents.
  const { portal_key: _legacyPortalKey, ...rest } = partner;
  return {
    ...rest,
    /** Full static catalog (partners are not gated by a games allowlist). */
    games: readPartnerGames(),
    playerAuth,
    staffAuth,
  };
}

export const find = query({
  args: { pid: v.number() },
  handler: async (ctx, { pid = 0 }) => {
    return loadPartner(ctx, pid);
  },
});

export const findInternal = internalQuery({
  args: { pid: v.number() },
  handler: async (ctx, { pid }) => {
    return loadPartner(ctx, pid);
  },
});

/** Resolve partner by public partnerSlug (`partner.slug`). */
export const findByPartnerSlug = query({
  args: { partnerSlug: v.string() },
  handler: async (ctx, { partnerSlug }) => {
    const key = partnerSlug.trim().toLowerCase();
    if (!key) return null;
    const bySlug = await ctx.db
      .query("partner")
      .withIndex("by_slug", (q) => q.eq("slug", key))
      .unique();
    if (!bySlug) return null;
    return formatPartnerRow(bySlug);
  },
});

async function loadPartner(ctx: { db: any }, pid: number) {
  const partner = await ctx.db
    .query("partner")
    .withIndex("by_pid", (q: any) => q.eq("pid", pid))
    .unique();

  if (!partner) {
    return formatPartnerRow({
      pid: 0,
      name: "Default Partner",
      host: "https://default.com",
      // First-party portal must work before Default Partner row is seeded.
      capabilities: { portalGames: true, campaignOps: false },
      playerAuth: DEFAULT_PLAYER_AUTH,
      staffAuth: DEFAULT_STAFF_AUTH,
    });
  }

  return formatPartnerRow(partner);
}
