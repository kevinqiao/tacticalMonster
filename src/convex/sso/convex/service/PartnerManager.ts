

import { v } from "convex/values";

import { internalQuery, query } from "../_generated/server";

import {
  defaultSyntheticPartnerChannels,
  resolvePartnerChannels,
  sanitizeConsumerAuthChannelIds,
  sanitizeStaffAuthChannelIds,
} from "./auth/partnerChannelPolicy";
import { readPartnerGames } from "./partner/portalPartnerConfig";

function formatPartnerRow(
  partner: Record<string, unknown>,
  resolved: ReturnType<typeof resolvePartnerChannels>
) {
  return {
    ...partner,
    /** Effective allowlist from partner.games (unset → full registry). */
    games: readPartnerGames(partner as { games?: string[] | null }),
    /** Consumer channel ids — matches DB column `auth_channels`. */
    auth_channels: resolved.consumerChannelIds,
    /** Staff channel ids — matches DB column `staff_auth_channels`. */
    staff_auth_channels: resolved.staffChannelIds,
    authChannelIds: resolved.consumerChannelIds,
    staffAuthChannelIds: resolved.staffChannelIds,
    authChannelDefs: resolved.authChannelDefs,
    staffAuthChannelDefs: resolved.staffAuthChannelDefs,
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




export const findByPortalKey = query({
  args: { portalKey: v.string() },
  handler: async (ctx, { portalKey }) => {
    const key = portalKey.trim().toLowerCase();
    if (!key) return null;
    const partner = await ctx.db
      .query("partner")
      .withIndex("by_portal_key", (q) => q.eq("portal_key", key))
      .unique();
    if (!partner) return null;
    return formatPartnerRow(partner, resolvePartnerChannels(partner));
  },
});


async function loadPartner(ctx: { db: any }, pid: number) {

    const partner = await ctx.db.query("partner").withIndex("by_pid", (q: any) => q.eq("pid", pid)).unique();

    if (!partner) {
      const synthetic = defaultSyntheticPartnerChannels();
      return formatPartnerRow(
        {
          pid: 0,
          name: "Default Partner",
          host: "https://default.com",
          // First-party portal must work before Default Partner row is seeded.
          capabilities: { portalGames: true, campaignOps: false },
        },
        synthetic
      );
    }

    return formatPartnerRow(partner, resolvePartnerChannels(partner));

}

