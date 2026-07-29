/**
 * Partner Game Center ops SoT (replay / play-entry / lobbyOps).
 * Platform admin reads/writes here via SSO bridge; SSO partner.gameCenter is not SoT.
 */

import { v } from "convex/values";

import { PORTAL_AD_REPLAY_DAILY_CAP } from "../../data/portalAdReplayConfig";
import {
  defaultPortalReplaySettings,
  sparseMergeReplaySettings,
} from "../../data/portalPartnerReplaySettings";
import { normalizeLobbyOpsMode } from "../../data/portalLobbyOpsMode";
import { internal } from "../../_generated/api";
import { internalMutation, internalQuery } from "../../_generated/server";

const AD_REPLAY_DAILY_CAP_OVERRIDE_MAX = 100;

function isFiniteOverrideCap(n: number): boolean {
  return Number.isFinite(n) && n >= 0 && n <= AD_REPLAY_DAILY_CAP_OVERRIDE_MAX;
}

/** Partner-base play-entry row (no lobby / tournament). */
export const getPartnerGcOpsInternal = internalQuery({
  args: { partnerId: v.number() },
  handler: async (ctx, { partnerId }) => {
    const pid = Math.floor(partnerId);
    if (!Number.isFinite(pid) || pid < 0) {
      return { ok: false as const, error: "invalid_partner" as const };
    }

    const replayRow = await ctx.db
      .query("portal_partner_replay_settings")
      .withIndex("by_partnerId", (q) => q.eq("partnerId", pid))
      .first();
    const base = defaultPortalReplaySettings(PORTAL_AD_REPLAY_DAILY_CAP);
    const replay = replayRow
      ? sparseMergeReplaySettings(base, {
          maxReplaysPerMatch: replayRow.maxReplaysPerMatch,
          adReplayEnabled: replayRow.adReplayEnabled,
          adReplayDailyCap: replayRow.adReplayDailyCap,
          ticketReplayEnabled: replayRow.ticketReplayEnabled,
          ticketReplayPriceTickets: replayRow.ticketReplayPriceTickets,
          coinReplayEnabled: replayRow.coinReplayEnabled,
          coinReplayPriceCoins: replayRow.coinReplayPriceCoins,
          coinReplayDailyCap: replayRow.coinReplayDailyCap,
        })
      : base;

    const playRows = await ctx.db
      .query("portal_partner_play_entry_settings")
      .withIndex("by_partnerId", (q) => q.eq("partnerId", pid))
      .collect();
    const play = playRows.find(
      (r) => r.lobbyId == null && (r.tournamentId == null || r.tournamentId === "")
    );

    const lobbyOpsRow = await ctx.db
      .query("portal_partner_lobby_ops_settings")
      .withIndex("by_partnerId", (q) => q.eq("partnerId", pid))
      .unique();
    const lobbyOpsMode =
      normalizeLobbyOpsMode(lobbyOpsRow?.lobbyOpsMode) ?? ("shared" as const);

    const capRaw = replay.adReplayDailyCap;
    const adReplayDailyCap =
      typeof capRaw === "number" && isFiniteOverrideCap(capRaw) ? Math.floor(capRaw) : null;

    return {
      ok: true as const,
      partnerId: pid,
      adReplayDailyCap,
      adReplayDailyCapEffective: replay.adReplayDailyCap,
      maxReplaysPerMatch:
        typeof replayRow?.maxReplaysPerMatch === "number"
          ? replayRow.maxReplaysPerMatch
          : null,
      maxReplaysPerMatchEffective: replay.maxReplaysPerMatch,
      adReplayEnabled: replay.adReplayEnabled,
      ticketReplayEnabled: replay.ticketReplayEnabled,
      ticketReplayPriceTickets:
        typeof replayRow?.ticketReplayPriceTickets === "number"
          ? replayRow.ticketReplayPriceTickets
          : null,
      ticketReplayPriceTicketsEffective: replay.ticketReplayPriceTickets,
      freePlaySoloDailyCap: play?.freePlaySoloDailyCap ?? null,
      freePlayMultiDailyCap: play?.freePlayMultiDailyCap ?? null,
      quotaScope:
        play?.quotaScope === "mode" ||
        play?.quotaScope === "lobby" ||
        play?.quotaScope === "tournament"
          ? play.quotaScope
          : null,
      adEntryEnabled:
        typeof play?.adEntryEnabled === "boolean" ? play.adEntryEnabled : null,
      adEntrySoloDailyCap: play?.adEntrySoloDailyCap ?? null,
      adEntryMultiDailyCap: play?.adEntryMultiDailyCap ?? null,
      ticketEntryEnabled:
        typeof play?.ticketEntryEnabled === "boolean" ? play.ticketEntryEnabled : null,
      ticketEntrySoloPriceTickets: play?.ticketEntrySoloPriceTickets ?? null,
      ticketEntrySoloDailyCap: play?.ticketEntrySoloDailyCap ?? null,
      ticketEntryMultiPriceTickets: play?.ticketEntryMultiPriceTickets ?? null,
      ticketEntryMultiDailyCap: play?.ticketEntryMultiDailyCap ?? null,
      lobbyOpsMode: lobbyOpsRow ? lobbyOpsMode : null,
      lobbyOpsModeEffective: lobbyOpsMode,
    };
  },
});

/**
 * Upsert partner-base GC ops. `adReplayDailyCap: null` → unlimited sentinel.
 * Other nulls clear Portal overrides (code defaults apply).
 */
export const upsertPartnerGcOpsInternal = internalMutation({
  args: {
    partnerId: v.number(),
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
    lobbyOpsMode: v.optional(
      v.union(v.literal("isolated"), v.literal("shared"), v.null())
    ),
  },
  handler: async (ctx, args) => {
    const partnerId = Math.floor(args.partnerId);
    if (!Number.isFinite(partnerId) || partnerId < 0) {
      return { ok: false as const, error: "invalid_partner" as const };
    }

    if (args.adReplayDailyCap !== undefined) {
      const cap =
        args.adReplayDailyCap === null
          ? PORTAL_AD_REPLAY_DAILY_CAP
          : Math.floor(args.adReplayDailyCap);
      if (
        args.adReplayDailyCap !== null &&
        (!Number.isFinite(cap) || !isFiniteOverrideCap(cap))
      ) {
        return { ok: false as const, error: "ad_replay_daily_cap_invalid" as const };
      }
      const maxReplays =
        args.maxReplaysPerMatch === null
          ? 1
          : typeof args.maxReplaysPerMatch === "number"
            ? args.maxReplaysPerMatch
            : undefined;
      const ticketPrice =
        args.ticketReplayPriceTickets === null
          ? 1
          : typeof args.ticketReplayPriceTickets === "number"
            ? args.ticketReplayPriceTickets
            : undefined;
      await ctx.runMutation(
        internal.service.ads.partnerAdReplayConfig.upsertPartnerAdReplayCapInternal,
        {
          partnerId,
          adReplayDailyCap: cap,
          ...(maxReplays !== undefined ? { maxReplaysPerMatch: maxReplays } : {}),
          ...(args.adReplayEnabled !== undefined
            ? { adReplayEnabled: args.adReplayEnabled }
            : {}),
          ...(args.ticketReplayEnabled !== undefined
            ? { ticketReplayEnabled: args.ticketReplayEnabled }
            : {}),
          ...(ticketPrice !== undefined
            ? { ticketReplayPriceTickets: ticketPrice }
            : {}),
        }
      );
    } else if (
      args.maxReplaysPerMatch !== undefined ||
      args.adReplayEnabled !== undefined ||
      args.ticketReplayEnabled !== undefined ||
      args.ticketReplayPriceTickets !== undefined
    ) {
      const existing = await ctx.db
        .query("portal_partner_replay_settings")
        .withIndex("by_partnerId", (q) => q.eq("partnerId", partnerId))
        .first();
      const cap = existing?.adReplayDailyCap ?? PORTAL_AD_REPLAY_DAILY_CAP;
      await ctx.runMutation(
        internal.service.ads.partnerAdReplayConfig.upsertPartnerAdReplayCapInternal,
        {
          partnerId,
          adReplayDailyCap: cap,
          ...(args.maxReplaysPerMatch === null
            ? { maxReplaysPerMatch: 1 }
            : typeof args.maxReplaysPerMatch === "number"
              ? { maxReplaysPerMatch: args.maxReplaysPerMatch }
              : {}),
          ...(args.adReplayEnabled !== undefined
            ? { adReplayEnabled: args.adReplayEnabled }
            : {}),
          ...(args.ticketReplayEnabled !== undefined
            ? { ticketReplayEnabled: args.ticketReplayEnabled }
            : {}),
          ...(args.ticketReplayPriceTickets === null
            ? { ticketReplayPriceTickets: 1 }
            : typeof args.ticketReplayPriceTickets === "number"
              ? { ticketReplayPriceTickets: args.ticketReplayPriceTickets }
              : {}),
        }
      );
    }

    await ctx.runMutation(
      internal.service.ads.portalTicketEntryService.upsertPartnerPlayEntrySettingsInternal,
      {
        partnerId,
        ...(args.quotaScope !== undefined ? { quotaScope: args.quotaScope } : {}),
        ...(args.freePlaySoloDailyCap !== undefined
          ? { freePlaySoloDailyCap: args.freePlaySoloDailyCap }
          : {}),
        ...(args.freePlayMultiDailyCap !== undefined
          ? { freePlayMultiDailyCap: args.freePlayMultiDailyCap }
          : {}),
        ...(args.adEntryEnabled !== undefined
          ? { adEntryEnabled: args.adEntryEnabled }
          : {}),
        ...(args.adEntrySoloDailyCap !== undefined
          ? { adEntrySoloDailyCap: args.adEntrySoloDailyCap }
          : {}),
        ...(args.adEntryMultiDailyCap !== undefined
          ? { adEntryMultiDailyCap: args.adEntryMultiDailyCap }
          : {}),
        ...(args.ticketEntryEnabled !== undefined
          ? { ticketEntryEnabled: args.ticketEntryEnabled }
          : {}),
        ...(args.ticketEntrySoloPriceTickets !== undefined
          ? { ticketEntrySoloPriceTickets: args.ticketEntrySoloPriceTickets }
          : {}),
        ...(args.ticketEntrySoloDailyCap !== undefined
          ? { ticketEntrySoloDailyCap: args.ticketEntrySoloDailyCap }
          : {}),
        ...(args.ticketEntryMultiPriceTickets !== undefined
          ? { ticketEntryMultiPriceTickets: args.ticketEntryMultiPriceTickets }
          : {}),
        ...(args.ticketEntryMultiDailyCap !== undefined
          ? { ticketEntryMultiDailyCap: args.ticketEntryMultiDailyCap }
          : {}),
      }
    );

    if (args.lobbyOpsMode !== undefined && args.lobbyOpsMode !== null) {
      await ctx.runMutation(
        internal.service.economy.portalLobbyOpsMutations.upsertPartnerLobbyOpsModeInternal,
        { partnerId, lobbyOpsMode: args.lobbyOpsMode }
      );
    } else if (args.lobbyOpsMode === null) {
      const row = await ctx.db
        .query("portal_partner_lobby_ops_settings")
        .withIndex("by_partnerId", (q) => q.eq("partnerId", partnerId))
        .unique();
      if (row) await ctx.db.delete(row._id);
    }

    return { ok: true as const, partnerId };
  },
});
