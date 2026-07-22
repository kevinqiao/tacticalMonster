/** Portal ticket entry: after free plays, before advertising and coins. */
export type PortalTicketEntryMode = "solo" | "multi";

export type PortalTicketEntryModeConfig = {
  priceTickets: number;
  dailyCap: number;
};

/** Missing partner overrides use these values. */
export const PORTAL_TICKET_ENTRY_DEFAULTS: Record<
  PortalTicketEntryMode,
  PortalTicketEntryModeConfig
> = {
  solo: { priceTickets: 1, dailyCap: 3 },
  multi: { priceTickets: 2, dailyCap: 5 },
};

export const PORTAL_TICKET_ENTRY_PRICE_MIN = 1;
export const PORTAL_TICKET_ENTRY_PRICE_MAX = 100;
export const PORTAL_TICKET_ENTRY_DAILY_CAP_MAX = 100;

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
