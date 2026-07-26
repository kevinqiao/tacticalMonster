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
): Promise<{ ok: true } | { ok: false; error: string }> {
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
  return { ok: true };
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
    freePlaySoloDailyCap: v.optional(v.number()),
    freePlayMultiDailyCap: v.optional(v.number()),
    ticketEntryEnabled: v.optional(v.boolean()),
    ticketEntrySoloPriceTickets: v.optional(v.number()),
    ticketEntrySoloDailyCap: v.optional(v.number()),
    ticketEntryMultiPriceTickets: v.optional(v.number()),
    ticketEntryMultiDailyCap: v.optional(v.number()),
    adEntryEnabled: v.optional(v.boolean()),
    adEntrySoloDailyCap: v.optional(v.number()),
    adEntryMultiDailyCap: v.optional(v.number()),
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
    const { partnerId: _p, quotaScope, ...rest } = args;
    void _p;
    const patch: Record<string, unknown> = { ...rest, updatedAt: Date.now() };
    if (quotaScope === "mode" || quotaScope === "lobby" || quotaScope === "tournament") {
      patch.quotaScope = quotaScope;
    }
    if (baseRows[0]) {
      if (quotaScope === null) {
        const prev = baseRows[0];
        const {
          _id: _idDrop,
          _creationTime: _ct,
          quotaScope: _qs,
          ...keep
        } = prev as typeof prev & { quotaScope?: string };
        void _idDrop;
        void _ct;
        void _qs;
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
      await ctx.db.insert("portal_partner_play_entry_settings", {
        partnerId,
        ...patch,
      } as never);
    }
    void overlayRows;
    return { ok: true as const };
  },
});
