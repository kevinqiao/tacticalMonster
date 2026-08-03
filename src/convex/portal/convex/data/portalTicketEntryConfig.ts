/** Portal ticket entry: after free plays and ad entry. Defaults ← portalEconomyGenerated. */

import {
  PORTAL_TICKET_ENTRY_DEFAULTS,
  PORTAL_TICKET_ENTRY_PRICE_MIN,
  PORTAL_TICKET_ENTRY_PRICE_MAX,
  PORTAL_TICKET_ENTRY_DAILY_CAP_MAX,
} from "./portalEconomyGenerated";

export type PortalTicketEntryMode = "solo" | "multi";

export type PortalTicketEntryModeConfig = {
  enabled: boolean;
  priceTickets: number;
  dailyCap: number;
};

export {
  PORTAL_TICKET_ENTRY_DEFAULTS,
  PORTAL_TICKET_ENTRY_PRICE_MIN,
  PORTAL_TICKET_ENTRY_PRICE_MAX,
  PORTAL_TICKET_ENTRY_DAILY_CAP_MAX,
};

export function clampTicketEntryPrice(
  value: unknown,
  mode: PortalTicketEntryMode
): number {
  const fallback = PORTAL_TICKET_ENTRY_DEFAULTS[mode].priceTickets;
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  const result = Math.floor(value);
  return result >= PORTAL_TICKET_ENTRY_PRICE_MIN &&
    result <= PORTAL_TICKET_ENTRY_PRICE_MAX
    ? result
    : fallback;
}

/** Zero disables ticket entry for the mode. */
export function clampTicketEntryDailyCap(
  value: unknown,
  mode: PortalTicketEntryMode
): number {
  const fallback = PORTAL_TICKET_ENTRY_DEFAULTS[mode].dailyCap;
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  const result = Math.floor(value);
  return result >= 0 && result <= PORTAL_TICKET_ENTRY_DAILY_CAP_MAX
    ? result
    : fallback;
}

export function resolveTicketEntryEnabled(
  value: unknown,
  mode: PortalTicketEntryMode
): boolean {
  if (typeof value === "boolean") return value;
  return PORTAL_TICKET_ENTRY_DEFAULTS[mode].enabled;
}
