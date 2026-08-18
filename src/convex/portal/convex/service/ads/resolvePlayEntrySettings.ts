import type { Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import {
  clampTicketEntryDailyCap,
  clampTicketEntryPrice,
  PORTAL_TICKET_ENTRY_DEFAULTS,
  resolveTicketEntryEnabled,
  type PortalTicketEntryMode,
} from "../../data/portalTicketEntryConfig";
import {
  clampFreePlayDailyCap,
  type PortalDailyPlayMode,
} from "../../data/portalDailyPlayLimits";
import {
  resolvePortalQuotaScope,
  type PortalQuotaScope,
} from "../../data/portalQuotaScope";
import {
  soloSuccessConfigFromFields,
  type PortalSoloSuccessAfterCapMode,
  type PortalSoloSuccessDailyConfig,
} from "../../data/portalSoloSuccessConfig";
import { TOWN_PLAY_ENTRY } from "../../data/townEconomyGenerated";
import { isTownLeagueScopeKey } from "../../data/portalLeagueScope";
import type { PlayEntryContext } from "./portalEntryUsageScope";

export type PlayEntrySettingsFields = {
  /** mode | lobby | tournament — how free/ad/ticket pools are shared. */
  quotaScope?: PortalQuotaScope;
  freePlaySoloDailyCap?: number;
  freePlayMultiDailyCap?: number;
  ticketEntryEnabled?: boolean;
  ticketEntrySoloPriceTickets?: number;
  ticketEntrySoloDailyCap?: number;
  ticketEntryMultiPriceTickets?: number;
  ticketEntryMultiDailyCap?: number;
  adEntryEnabled?: boolean;
  adEntrySoloDailyCap?: number;
  adEntryMultiDailyCap?: number;
  coinEntryEnabled?: boolean;
  coinEntrySoloPriceCoins?: number;
  coinEntrySoloDailyCap?: number;
  coinEntryMultiPriceCoins?: number;
  coinEntryMultiDailyCap?: number;
  soloSuccessDailyEnabled?: boolean;
  soloSuccessDailyCap?: number;
  soloSuccessAfterCapMode?: PortalSoloSuccessAfterCapMode;
  soloSuccessAllowPlayAfterCap?: boolean;
};

export type PlayEntryResolveScope =
  | { kind: "partner" }
  | { kind: "lobby"; lobbyId: Id<"portal_lobbies"> }
  | {
      kind: "tournament";
      lobbyId: Id<"portal_lobbies">;
      tournamentId: string;
    };

const OVERLAY_KEYS: (keyof PlayEntrySettingsFields)[] = [
  "quotaScope",
  "freePlaySoloDailyCap",
  "freePlayMultiDailyCap",
  "ticketEntryEnabled",
  "ticketEntrySoloPriceTickets",
  "ticketEntrySoloDailyCap",
  "ticketEntryMultiPriceTickets",
  "ticketEntryMultiDailyCap",
  "adEntryEnabled",
  "adEntrySoloDailyCap",
  "adEntryMultiDailyCap",
  "coinEntryEnabled",
  "coinEntrySoloPriceCoins",
  "coinEntrySoloDailyCap",
  "coinEntryMultiPriceCoins",
  "coinEntryMultiDailyCap",
  "soloSuccessDailyEnabled",
  "soloSuccessDailyCap",
  "soloSuccessAfterCapMode",
  "soloSuccessAllowPlayAfterCap",
];

function fieldOverlay(
  base: PlayEntrySettingsFields,
  overlay: PlayEntrySettingsFields | null | undefined
): PlayEntrySettingsFields {
  if (!overlay) return base;
  const out: PlayEntrySettingsFields = { ...base };
  for (const key of OVERLAY_KEYS) {
    const value = overlay[key];
    if (value !== undefined) {
      (out as Record<string, unknown>)[key] = value;
    }
  }
  return out;
}

function isPartnerBaseRow(row: {
  lobbyId?: Id<"portal_lobbies">;
  tournamentId?: string;
}): boolean {
  return row.lobbyId == null && (row.tournamentId == null || row.tournamentId === "");
}

/**
 * Resolve effective play-entry settings:
 * partner base → lobby overlay → tournament overlay.
 */
export function townPlayEntryOverlay(): PlayEntrySettingsFields {
  return { ...TOWN_PLAY_ENTRY };
}

export function applyTownPlayEntryOverlay(
  settings: PlayEntrySettingsFields,
  scopeKey?: string | null
): PlayEntrySettingsFields {
  if (!isTownLeagueScopeKey(scopeKey)) return settings;
  return fieldOverlay(settings, townPlayEntryOverlay());
}

export function playEntryResolveArgs(entryCtx?: PlayEntryContext | null): {
  lobbyId?: Id<"portal_lobbies"> | null;
  tournamentId?: string | null;
  scopeKey?: string | null;
} {
  return {
    lobbyId: entryCtx?.lobbyId ?? null,
    tournamentId: entryCtx?.tournamentId ?? null,
    scopeKey: entryCtx?.scopeKey ?? null,
  };
}

export async function resolvePlayEntrySettings(
  ctx: QueryCtx | MutationCtx,
  args: {
    partnerId: number;
    lobbyId?: Id<"portal_lobbies"> | null;
    tournamentId?: string | null;
    scopeKey?: string | null;
  }
): Promise<{ settings: PlayEntrySettingsFields; scope: PlayEntryResolveScope }> {
  const partnerId = Math.floor(args.partnerId);
  const rows = await ctx.db
    .query("portal_partner_play_entry_settings")
    .withIndex("by_partnerId", (q) => q.eq("partnerId", partnerId))
    .collect();

  const partnerRow = rows.find(isPartnerBaseRow) ?? null;
  let settings: PlayEntrySettingsFields = partnerRow
    ? fieldOverlay({}, partnerRow)
    : {};
  let scope: PlayEntryResolveScope = { kind: "partner" };

  const lobbyId = args.lobbyId ?? null;
  if (lobbyId) {
    const lobbyRow = rows.find(
      (r) =>
        r.lobbyId === lobbyId &&
        (r.tournamentId == null || r.tournamentId === "")
    );
    if (lobbyRow) {
      settings = fieldOverlay(settings, lobbyRow);
      scope = { kind: "lobby", lobbyId };
    }

    const tournamentId = args.tournamentId?.trim() || null;
    if (tournamentId) {
      const tournamentRow = rows.find(
        (r) => r.lobbyId === lobbyId && r.tournamentId === tournamentId
      );
      if (tournamentRow) {
        settings = fieldOverlay(settings, tournamentRow);
        scope = { kind: "tournament", lobbyId, tournamentId };
      }
    }
  }

  return { settings: applyTownPlayEntryOverlay(settings, args.scopeKey), scope };
}

export function ticketConfigFromSettings(
  settings: PlayEntrySettingsFields,
  mode: PortalTicketEntryMode
) {
  const enabled = resolveTicketEntryEnabled(settings.ticketEntryEnabled, mode);
  return mode === "solo"
    ? {
        enabled,
        priceTickets: clampTicketEntryPrice(settings.ticketEntrySoloPriceTickets, mode),
        dailyCap: clampTicketEntryDailyCap(settings.ticketEntrySoloDailyCap, mode),
      }
    : {
        enabled,
        priceTickets: clampTicketEntryPrice(settings.ticketEntryMultiPriceTickets, mode),
        dailyCap: clampTicketEntryDailyCap(settings.ticketEntryMultiDailyCap, mode),
      };
}

export function freePlayCapFromSettings(
  settings: PlayEntrySettingsFields,
  mode: PortalDailyPlayMode
): number {
  return clampFreePlayDailyCap(
    mode === "solo" ? settings.freePlaySoloDailyCap : settings.freePlayMultiDailyCap,
    mode
  );
}

export function quotaScopeFromSettings(
  settings: PlayEntrySettingsFields
): PortalQuotaScope {
  return resolvePortalQuotaScope(settings.quotaScope);
}

export function soloSuccessConfigFromSettings(
  settings: PlayEntrySettingsFields
): PortalSoloSuccessDailyConfig {
  return soloSuccessConfigFromFields(settings);
}

export { PORTAL_TICKET_ENTRY_DEFAULTS };
