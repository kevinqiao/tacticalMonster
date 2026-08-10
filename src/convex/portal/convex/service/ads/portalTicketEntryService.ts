import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { internalMutation } from "../../_generated/server";
import { v } from "convex/values";
import {
  PORTAL_TICKET_ENTRY_DEFAULTS,
  type PortalTicketEntryMode,
} from "../../data/portalTicketEntryConfig";
import { type PortalDailyPlayMode } from "../../data/portalDailyPlayLimits";
import { dailyPeriodKey } from "../../utils/casualTaskPeriod";
import { partnerIdFromUid } from "./partnerAdReplayConfig";
import { readPortalTicketBalance } from "../tournament/replay/casualReplayTokens";
import {
  getPortalTournamentDefinition,
  portalTournamentUsesPlayEntryLadder,
} from "../../data/portalTournamentConfigs";
import type { Id } from "../../_generated/dataModel";
import {
  bumpTicketEntryUsedToday,
  readTicketEntryUsedToday,
} from "./portalEntryDailyUsage";
import type { PlayEntryContext } from "./portalEntryUsageScope";
import {
  freePlayCapFromSettings,
  quotaScopeFromSettings,
  resolvePlayEntrySettings,
  ticketConfigFromSettings,
} from "./resolvePlayEntrySettings";

export type TicketEntryModeOffer = {
  enabled: boolean;
  remaining: number;
  cap: number;
  usedToday: number;
  priceTickets: number;
};

export type { PlayEntryContext };

export { readTicketEntryUsedToday };

export async function resolveTicketEntryConfig(
  ctx: QueryCtx | MutationCtx,
  uid: string,
  mode: PortalTicketEntryMode,
  entryCtx?: PlayEntryContext
) {
  const { settings } = await resolvePlayEntrySettings(ctx, {
    partnerId: partnerIdFromUid(uid),
    lobbyId: entryCtx?.lobbyId,
    tournamentId: entryCtx?.tournamentId,
  });
  return {
    ...ticketConfigFromSettings(settings, mode),
    quotaScope: quotaScopeFromSettings(settings),
  };
}

export async function resolveFreePlayDailyCap(
  ctx: QueryCtx | MutationCtx,
  uid: string,
  mode: PortalDailyPlayMode,
  entryCtx?: PlayEntryContext
): Promise<number> {
  const { settings } = await resolvePlayEntrySettings(ctx, {
    partnerId: partnerIdFromUid(uid),
    lobbyId: entryCtx?.lobbyId,
    tournamentId: entryCtx?.tournamentId,
  });
  return freePlayCapFromSettings(settings, mode);
}

export async function getPortalTicketEntryOfferCore(
  ctx: QueryCtx | MutationCtx,
  uid: string,
  entryCtx?: PlayEntryContext
): Promise<{ solo: TicketEntryModeOffer; multi: TicketEntryModeOffer }> {
  const key = dailyPeriodKey(Date.now());
  const make = async (mode: PortalTicketEntryMode) => {
    const cfg = await resolveTicketEntryConfig(ctx, uid, mode, entryCtx);
    const used = await readTicketEntryUsedToday(
      ctx,
      uid,
      key,
      mode,
      entryCtx,
      cfg.quotaScope
    );
    return {
      enabled: cfg.enabled && cfg.dailyCap > 0,
      cap: cfg.dailyCap,
      usedToday: used,
      remaining: Math.max(0, cfg.dailyCap - used),
      priceTickets: cfg.priceTickets,
    };
  };
  const [solo, multi] = await Promise.all([make("solo"), make("multi")]);
  return { solo, multi };
}

/** Atomically charge a ticket entry after the free quota is exhausted. */
export async function useTicketEntryForJoin(
  ctx: MutationCtx,
  args: {
    uid: string;
    mode: PortalTicketEntryMode;
    templateId: string;
    lobbyId?: Id<"portal_lobbies"> | null;
    now?: number;
  }
): Promise<
  { ok: true; priceTickets: number } | { ok: false; error: string }
> {
  const now = args.now ?? Date.now();
  const def = getPortalTournamentDefinition(args.templateId);
  if (def && !portalTournamentUsesPlayEntryLadder(def)) {
    return { ok: false, error: "ticket_entry_not_available" };
  }
  const entryCtx: PlayEntryContext = {
    lobbyId: args.lobbyId ?? null,
    tournamentId: args.templateId,
  };
  const cfg = await resolveTicketEntryConfig(ctx, args.uid, args.mode, entryCtx);
  if (!cfg.enabled) return { ok: false, error: "ticket_entry_not_available" };
  const key = dailyPeriodKey(now);
  const used = await readTicketEntryUsedToday(
    ctx,
    args.uid,
    key,
    args.mode,
    entryCtx,
    cfg.quotaScope
  );
  if (cfg.dailyCap <= 0 || used >= cfg.dailyCap) {
    return { ok: false, error: "ticket_entry_limit_reached" };
  }
  if ((await readPortalTicketBalance(ctx, args.uid)) < cfg.priceTickets) {
    return { ok: false, error: "insufficient_tickets" };
  }
  const charged = await ctx.runMutation(
    internal.service.reward.casualRewardRegistry.spendPortalTickets,
    {
      uid: args.uid,
      amount: cfg.priceTickets,
      reason: `ticket_entry:${args.mode}`,
    }
  );
  if (!charged.ok) return { ok: false, error: charged.error };
  await bumpTicketEntryUsedToday(ctx, {
    uid: args.uid,
    dayKey: key,
    mode: args.mode,
    now,
    entryCtx,
    quotaScope: cfg.quotaScope,
  });
  return { ok: true, priceTickets: cfg.priceTickets };
}

export { PORTAL_TICKET_ENTRY_DEFAULTS };

export const consumeTicketEntryForJoin = internalMutation({
  args: {
    uid: v.string(),
    templateId: v.string(),
    lobbyId: v.optional(v.id("portal_lobbies")),
  },
  handler: async (ctx, args) => {
    const def = getPortalTournamentDefinition(args.templateId);
    if (def && !portalTournamentUsesPlayEntryLadder(def)) {
      return { ok: false as const, error: "ticket_entry_not_available" };
    }
    const mode =
      def?.matchType === "solo_p75"
        ? "solo"
        : def?.matchType === "multi_ranked"
          ? "multi"
          : null;
    if (!mode) return { ok: false as const, error: "invalid_mode" };
    return await useTicketEntryForJoin(ctx, {
      uid: args.uid,
      mode,
      templateId: args.templateId,
      lobbyId: args.lobbyId,
    });
  },
});

const PLAY_ENTRY_CLEARABLE_NUMBER_KEYS = [
  "freePlaySoloDailyCap",
  "freePlayMultiDailyCap",
  "ticketEntrySoloPriceTickets",
  "ticketEntrySoloDailyCap",
  "ticketEntryMultiPriceTickets",
  "ticketEntryMultiDailyCap",
  "adEntrySoloDailyCap",
  "adEntryMultiDailyCap",
  "soloSuccessDailyCap",
] as const;

const PLAY_ENTRY_CLEARABLE_BOOL_KEYS = [
  "adEntryEnabled",
  "ticketEntryEnabled",
  "soloSuccessDailyEnabled",
  "soloSuccessAllowPlayAfterCap",
] as const;

/** SSO bridge write for partner free-play and ticket-entry overrides. */
export const upsertPartnerPlayEntrySettingsInternal = internalMutation({
  args: {
    partnerId: v.number(),
    quotaScope: v.optional(
      v.union(
        v.literal("mode"),
        v.literal("lobby"),
        v.literal("tournament"),
        v.null()
      )
    ),
    freePlaySoloDailyCap: v.optional(v.union(v.number(), v.null())),
    freePlayMultiDailyCap: v.optional(v.union(v.number(), v.null())),
    ticketEntryEnabled: v.optional(v.union(v.boolean(), v.null())),
    ticketEntrySoloPriceTickets: v.optional(v.union(v.number(), v.null())),
    ticketEntrySoloDailyCap: v.optional(v.union(v.number(), v.null())),
    ticketEntryMultiPriceTickets: v.optional(v.union(v.number(), v.null())),
    ticketEntryMultiDailyCap: v.optional(v.union(v.number(), v.null())),
    adEntryEnabled: v.optional(v.union(v.boolean(), v.null())),
    adEntrySoloDailyCap: v.optional(v.union(v.number(), v.null())),
    adEntryMultiDailyCap: v.optional(v.union(v.number(), v.null())),
    soloSuccessDailyEnabled: v.optional(v.union(v.boolean(), v.null())),
    soloSuccessDailyCap: v.optional(v.union(v.number(), v.null())),
    soloSuccessAfterCapMode: v.optional(
      v.union(v.literal("zero_all"), v.null())
    ),
    soloSuccessAllowPlayAfterCap: v.optional(v.union(v.boolean(), v.null())),
  },
  handler: async (ctx, args) => {
    const partnerId = Math.floor(args.partnerId);
    if (!Number.isFinite(partnerId) || partnerId < 0) {
      return { ok: false as const, error: "invalid_partner" };
    }
    const rows = await ctx.db
      .query("portal_partner_play_entry_settings")
      .withIndex("by_partnerId", (q) => q.eq("partnerId", partnerId))
      .collect();
    const baseRows = rows.filter(
      (r) => r.lobbyId == null && (r.tournamentId == null || r.tournamentId === "")
    );
    const overlayRows = rows.filter((r) => !baseRows.includes(r));
    const { partnerId: _p, quotaScope, soloSuccessAfterCapMode, ...rest } = args;
    void _p;

    const clearKeys: string[] = [];
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    for (const key of PLAY_ENTRY_CLEARABLE_NUMBER_KEYS) {
      const value = rest[key];
      if (value === undefined) continue;
      if (value === null) clearKeys.push(key);
      else patch[key] = value;
    }
    for (const key of PLAY_ENTRY_CLEARABLE_BOOL_KEYS) {
      const value = rest[key];
      if (value === undefined) continue;
      if (value === null) clearKeys.push(key);
      else patch[key] = value;
    }
    if (quotaScope === "mode" || quotaScope === "lobby" || quotaScope === "tournament") {
      patch.quotaScope = quotaScope;
    } else if (quotaScope === null) {
      clearKeys.push("quotaScope");
    }
    if (soloSuccessAfterCapMode === "zero_all") {
      patch.soloSuccessAfterCapMode = soloSuccessAfterCapMode;
    } else if (soloSuccessAfterCapMode === null) {
      clearKeys.push("soloSuccessAfterCapMode");
    }

    const needsReplace = clearKeys.length > 0;
    if (baseRows[0]) {
      if (needsReplace) {
        const prev = baseRows[0];
        const {
          _id: _idDrop,
          _creationTime: _ct,
          ...keep
        } = prev as typeof prev & Record<string, unknown>;
        void _idDrop;
        void _ct;
        for (const key of clearKeys) {
          delete (keep as Record<string, unknown>)[key];
        }
        await ctx.db.replace(prev._id, {
          ...keep,
          ...patch,
          partnerId,
          updatedAt: Date.now(),
        } as never);
      } else {
        await ctx.db.patch(baseRows[0]._id, patch);
      }
      for (const duplicate of baseRows.slice(1)) await ctx.db.delete(duplicate._id);
    } else {
      const insertDoc: Record<string, unknown> = { partnerId, ...patch };
      const meaningful = Object.keys(insertDoc).filter(
        (k) => k !== "partnerId" && k !== "updatedAt"
      );
      // Skip insert when the only intent was clearing fields on a missing row.
      if (meaningful.length > 0) {
        await ctx.db.insert("portal_partner_play_entry_settings", insertDoc as never);
      }
    }
    void overlayRows;
    return { ok: true as const };
  },
});
