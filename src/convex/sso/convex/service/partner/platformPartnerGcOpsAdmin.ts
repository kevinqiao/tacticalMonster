"use node";

/**
 * Platform admin GC ops: Portal is SoT.
 * SSO only authorizes + stores partnerSlug / capabilities.
 */

import { v } from "convex/values";

import { internal } from "../../_generated/api";
import { authedAction } from "../../custom/session";
import { requestPortalGcOps } from "../bridge/portalGcOpsBridge";

async function authorizePlatformStaff(
  ctx: {
    runQuery: (
      ref: typeof internal.service.partner.platformAdmin.assertPlatformStaffInternal,
      args: { uid: string; minRole: "viewer" | "admin" | "owner" }
    ) => Promise<{ ok: boolean; error?: string }>;
    identity: { subject: string };
  },
  minRole: "viewer" | "admin" | "owner"
) {
  const result = await ctx.runQuery(
    internal.service.partner.platformAdmin.assertPlatformStaffInternal,
    { uid: ctx.identity.subject, minRole }
  );
  if (!result.ok) throw new Error(result.error ?? "forbidden");
}

/** Full partner portal config for admin UI: SSO identity + Portal GC ops SoT. */
export const getPartnerPortalConfig = authedAction({
  args: { partnerId: v.number() },
  handler: async (ctx, { partnerId }) => {
    await authorizePlatformStaff(ctx, "viewer");
    const identity = await ctx.runQuery(
      internal.service.partner.platformAdmin.getPartnerPortalIdentityInternal,
      { partnerId }
    );
    if (!identity) return null;
    const gc = await requestPortalGcOps({ operation: "get", partnerId });
    return {
      ...identity,
      adReplayDailyCap: gc.adReplayDailyCap ?? null,
      adReplayDailyCapEffective: gc.adReplayDailyCapEffective ?? null,
      adReplayDailyCapDefault: null as number | null,
      maxReplaysPerMatch: gc.maxReplaysPerMatch ?? null,
      maxReplaysPerMatchEffective: gc.maxReplaysPerMatchEffective ?? 1,
      maxReplaysPerMatchDefault: 1,
      adReplayEnabled: gc.adReplayEnabled !== false,
      ticketReplayEnabled: gc.ticketReplayEnabled !== false,
      ticketReplayPriceTickets: gc.ticketReplayPriceTickets ?? null,
      ticketReplayPriceTicketsEffective: gc.ticketReplayPriceTicketsEffective ?? 1,
      freePlaySoloDailyCap: gc.freePlaySoloDailyCap ?? null,
      freePlayMultiDailyCap: gc.freePlayMultiDailyCap ?? null,
      quotaScope: gc.quotaScope ?? null,
      adEntryEnabled: gc.adEntryEnabled ?? null,
      adEntrySoloDailyCap: gc.adEntrySoloDailyCap ?? null,
      adEntryMultiDailyCap: gc.adEntryMultiDailyCap ?? null,
      ticketEntryEnabled: gc.ticketEntryEnabled ?? null,
      ticketEntrySoloPriceTickets: gc.ticketEntrySoloPriceTickets ?? null,
      ticketEntrySoloDailyCap: gc.ticketEntrySoloDailyCap ?? null,
      ticketEntryMultiPriceTickets: gc.ticketEntryMultiPriceTickets ?? null,
      ticketEntryMultiDailyCap: gc.ticketEntryMultiDailyCap ?? null,
      soloSuccessDailyEnabled: gc.soloSuccessDailyEnabled ?? null,
      soloSuccessDailyCap: gc.soloSuccessDailyCap ?? null,
      soloSuccessAfterCapMode: gc.soloSuccessAfterCapMode ?? null,
      soloSuccessAllowPlayAfterCap: gc.soloSuccessAllowPlayAfterCap ?? null,
      lobbyOpsMode: gc.lobbyOpsMode ?? null,
      lobbyOpsModeEffective: gc.lobbyOpsModeEffective ?? "shared",
      seasonEpochWeekKey: gc.seasonEpochWeekKey ?? null,
      seasonEpochWeekKeyEffective:
        gc.seasonEpochWeekKeyEffective ?? gc.seasonEpochWeekKey ?? null,
    };
  },
});

export const updatePartnerPortalConfig = authedAction({
  args: {
    partnerId: v.number(),
    partnerSlug: v.optional(v.string()),
    adReplayDailyCap: v.optional(v.union(v.number(), v.null())),
    maxReplaysPerMatch: v.optional(v.union(v.number(), v.null())),
    adReplayEnabled: v.optional(v.boolean()),
    ticketReplayEnabled: v.optional(v.boolean()),
    ticketReplayPriceTickets: v.optional(v.union(v.number(), v.null())),
    freePlaySoloDailyCap: v.optional(v.union(v.number(), v.null())),
    freePlayMultiDailyCap: v.optional(v.union(v.number(), v.null())),
    quotaScope: v.optional(
      v.union(
        v.literal("mode"),
        v.literal("lobby"),
        v.literal("tournament"),
        v.null()
      )
    ),
    adEntryEnabled: v.optional(v.union(v.boolean(), v.null())),
    adEntrySoloDailyCap: v.optional(v.union(v.number(), v.null())),
    adEntryMultiDailyCap: v.optional(v.union(v.number(), v.null())),
    ticketEntryEnabled: v.optional(v.union(v.boolean(), v.null())),
    ticketEntrySoloPriceTickets: v.optional(v.union(v.number(), v.null())),
    ticketEntrySoloDailyCap: v.optional(v.union(v.number(), v.null())),
    ticketEntryMultiPriceTickets: v.optional(v.union(v.number(), v.null())),
    ticketEntryMultiDailyCap: v.optional(v.union(v.number(), v.null())),
    soloSuccessDailyEnabled: v.optional(v.union(v.boolean(), v.null())),
    soloSuccessDailyCap: v.optional(v.union(v.number(), v.null())),
    soloSuccessAfterCapMode: v.optional(v.union(v.literal("zero_all"), v.null())),
    soloSuccessAllowPlayAfterCap: v.optional(v.union(v.boolean(), v.null())),
    lobbyOpsMode: v.optional(
      v.union(v.literal("isolated"), v.literal("shared"), v.null())
    ),
    seasonEpochWeekKey: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    await authorizePlatformStaff(ctx, "admin");

    // 1) Portal SoT for GC ops
    await requestPortalGcOps({
      operation: "upsert",
      partnerId: args.partnerId,
      adReplayDailyCap: args.adReplayDailyCap,
      maxReplaysPerMatch: args.maxReplaysPerMatch,
      adReplayEnabled: args.adReplayEnabled,
      ticketReplayEnabled: args.ticketReplayEnabled,
      ticketReplayPriceTickets: args.ticketReplayPriceTickets,
      freePlaySoloDailyCap: args.freePlaySoloDailyCap,
      freePlayMultiDailyCap: args.freePlayMultiDailyCap,
      quotaScope: args.quotaScope,
      adEntryEnabled: args.adEntryEnabled,
      adEntrySoloDailyCap: args.adEntrySoloDailyCap,
      adEntryMultiDailyCap: args.adEntryMultiDailyCap,
      ticketEntryEnabled: args.ticketEntryEnabled,
      ticketEntrySoloPriceTickets: args.ticketEntrySoloPriceTickets,
      ticketEntrySoloDailyCap: args.ticketEntrySoloDailyCap,
      ticketEntryMultiPriceTickets: args.ticketEntryMultiPriceTickets,
      ticketEntryMultiDailyCap: args.ticketEntryMultiDailyCap,
      soloSuccessDailyEnabled: args.soloSuccessDailyEnabled,
      soloSuccessDailyCap: args.soloSuccessDailyCap,
      soloSuccessAfterCapMode: args.soloSuccessAfterCapMode,
      soloSuccessAllowPlayAfterCap: args.soloSuccessAllowPlayAfterCap,
      lobbyOpsMode: args.lobbyOpsMode,
      seasonEpochWeekKey: args.seasonEpochWeekKey,
    });

    // 2) SSO identity only (slug / capabilities).
    const saved = await ctx.runMutation(
      internal.service.partner.platformAdmin.patchPartnerPortalIdentityInternal,
      {
        partnerId: args.partnerId,
        partnerSlug: args.partnerSlug,
      }
    );
    return saved;
  },
});
