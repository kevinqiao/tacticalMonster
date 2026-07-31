/** Partner + campaign replay ladder settings (defaults / sanitize). */

import {
  PORTAL_MAX_REPLAYS_PER_MATCH_DEFAULT,
  PORTAL_TICKET_REPLAY_PRICE_DEFAULT,
} from "./portalEconomyGenerated";

export {
  PORTAL_MAX_REPLAYS_PER_MATCH_DEFAULT,
  PORTAL_TICKET_REPLAY_PRICE_DEFAULT,
};

export const PORTAL_MAX_REPLAYS_PER_MATCH_MAX = 20;
/** Explicit override max; unlimited sentinel lives in portalAdReplayConfig. */
export const PORTAL_AD_REPLAY_DAILY_CAP_OVERRIDE_MAX = 100;

export type PortalReplaySettings = {
  maxReplaysPerMatch: number;
  adReplayEnabled: boolean;
  adReplayDailyCap: number;
  ticketReplayEnabled: boolean;
  ticketReplayPriceTickets: number;
  coinReplayEnabled: boolean;
  coinReplayPriceCoins: number;
  coinReplayDailyCap: number | null;
};

/** Sparse overlay (campaign stamp / SSO partial). */
export type PortalReplaySettingsPartial = {
  maxReplaysPerMatch?: number;
  adReplayEnabled?: boolean;
  adReplayDailyCap?: number;
  ticketReplayEnabled?: boolean;
  ticketReplayPriceTickets?: number;
  coinReplayEnabled?: boolean;
  coinReplayPriceCoins?: number;
  coinReplayDailyCap?: number | null;
};

export function defaultPortalReplaySettings(
  adReplayDailyCapDefault: number
): PortalReplaySettings {
  return {
    maxReplaysPerMatch: PORTAL_MAX_REPLAYS_PER_MATCH_DEFAULT,
    adReplayEnabled: true,
    adReplayDailyCap: adReplayDailyCapDefault,
    ticketReplayEnabled: true,
    ticketReplayPriceTickets: PORTAL_TICKET_REPLAY_PRICE_DEFAULT,
    coinReplayEnabled: false,
    coinReplayPriceCoins: 0,
    coinReplayDailyCap: null,
  };
}

export function sanitizeMaxReplaysPerMatch(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  const n = Math.floor(value);
  if (n < 0 || n > PORTAL_MAX_REPLAYS_PER_MATCH_MAX) return fallback;
  return n;
}

export function sanitizeTicketReplayPrice(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  const n = Math.floor(value);
  if (n < 1 || n > 100) return fallback;
  return n;
}

/** Sparse merge: only defined keys on overlay win. */
export function sparseMergeReplaySettings(
  base: PortalReplaySettings,
  overlay: PortalReplaySettingsPartial | null | undefined
): PortalReplaySettings {
  if (!overlay) return base;
  return {
    maxReplaysPerMatch:
      overlay.maxReplaysPerMatch !== undefined
        ? sanitizeMaxReplaysPerMatch(overlay.maxReplaysPerMatch, base.maxReplaysPerMatch)
        : base.maxReplaysPerMatch,
    adReplayEnabled:
      overlay.adReplayEnabled !== undefined
        ? Boolean(overlay.adReplayEnabled)
        : base.adReplayEnabled,
    adReplayDailyCap:
      overlay.adReplayDailyCap !== undefined &&
      typeof overlay.adReplayDailyCap === "number" &&
      Number.isFinite(overlay.adReplayDailyCap)
        ? (() => {
            const n = Math.floor(overlay.adReplayDailyCap);
            // Preserve unlimited sentinel from partner cache / defaults.
            if (n > PORTAL_AD_REPLAY_DAILY_CAP_OVERRIDE_MAX) return n;
            return Math.max(0, Math.min(PORTAL_AD_REPLAY_DAILY_CAP_OVERRIDE_MAX, n));
          })()
        : base.adReplayDailyCap,
    ticketReplayEnabled:
      overlay.ticketReplayEnabled !== undefined
        ? Boolean(overlay.ticketReplayEnabled)
        : base.ticketReplayEnabled,
    ticketReplayPriceTickets:
      overlay.ticketReplayPriceTickets !== undefined
        ? sanitizeTicketReplayPrice(
            overlay.ticketReplayPriceTickets,
            base.ticketReplayPriceTickets
          )
        : base.ticketReplayPriceTickets,
    coinReplayEnabled:
      overlay.coinReplayEnabled !== undefined
        ? Boolean(overlay.coinReplayEnabled)
        : base.coinReplayEnabled,
    coinReplayPriceCoins:
      overlay.coinReplayPriceCoins !== undefined &&
      typeof overlay.coinReplayPriceCoins === "number" &&
      Number.isFinite(overlay.coinReplayPriceCoins)
        ? Math.max(0, Math.floor(overlay.coinReplayPriceCoins))
        : base.coinReplayPriceCoins,
    coinReplayDailyCap:
      overlay.coinReplayDailyCap !== undefined
        ? overlay.coinReplayDailyCap === null
          ? null
          : typeof overlay.coinReplayDailyCap === "number" &&
              Number.isFinite(overlay.coinReplayDailyCap)
            ? Math.max(0, Math.floor(overlay.coinReplayDailyCap))
            : base.coinReplayDailyCap
        : base.coinReplayDailyCap,
  };
}

/** Pick only defined keys from a loose object (campaign / HTTP body). */
export function pickReplaySettingsPartial(
  raw: Record<string, unknown> | null | undefined
): PortalReplaySettingsPartial | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const out: PortalReplaySettingsPartial = {};
  let any = false;
  const assign = <K extends keyof PortalReplaySettingsPartial>(
    key: K,
    value: PortalReplaySettingsPartial[K]
  ) => {
    out[key] = value;
    any = true;
  };
  if (typeof raw.maxReplaysPerMatch === "number") {
    assign("maxReplaysPerMatch", Math.floor(raw.maxReplaysPerMatch));
  }
  if (typeof raw.adReplayEnabled === "boolean") {
    assign("adReplayEnabled", raw.adReplayEnabled);
  }
  if (typeof raw.adReplayDailyCap === "number") {
    assign("adReplayDailyCap", Math.floor(raw.adReplayDailyCap));
  }
  if (typeof raw.ticketReplayEnabled === "boolean") {
    assign("ticketReplayEnabled", raw.ticketReplayEnabled);
  }
  if (typeof raw.ticketReplayPriceTickets === "number") {
    assign("ticketReplayPriceTickets", Math.floor(raw.ticketReplayPriceTickets));
  }
  if (typeof raw.coinReplayEnabled === "boolean") {
    assign("coinReplayEnabled", raw.coinReplayEnabled);
  }
  if (typeof raw.coinReplayPriceCoins === "number") {
    assign("coinReplayPriceCoins", Math.floor(raw.coinReplayPriceCoins));
  }
  if (raw.coinReplayDailyCap === null) {
    assign("coinReplayDailyCap", null);
  } else if (typeof raw.coinReplayDailyCap === "number") {
    assign("coinReplayDailyCap", Math.floor(raw.coinReplayDailyCap));
  }
  return any ? out : undefined;
}

export const portalReplaySettingsPartialValidatorFields = {
  maxReplaysPerMatch: true,
  adReplayEnabled: true,
  adReplayDailyCap: true,
  ticketReplayEnabled: true,
  ticketReplayPriceTickets: true,
  coinReplayEnabled: true,
  coinReplayPriceCoins: true,
  coinReplayDailyCap: true,
} as const;
