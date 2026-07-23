/** Partner-scoped Portal replay settings (stored on `partner.data`). */

/** Sentinel matching Portal PORTAL_AD_REPLAY_DAILY_CAP_UNLIMITED — default = no daily cap. */
export const DEFAULT_AD_REPLAY_DAILY_CAP = 1_000_000_000;
/** Max for explicit Partner overrides (0 = off). Default unlimited is the sentinel above. */
export const AD_REPLAY_DAILY_CAP_MAX = 100;

export function isUnlimitedAdReplayDailyCap(cap: number): boolean {
  return cap >= DEFAULT_AD_REPLAY_DAILY_CAP;
}
export const DEFAULT_MAX_REPLAYS_PER_MATCH = 1;
export const MAX_REPLAYS_PER_MATCH_MAX = 20;
export const DEFAULT_TICKET_REPLAY_PRICE = 1;

export type PartnerReplaySettings = {
  maxReplaysPerMatch: number;
  adReplayEnabled: boolean;
  adReplayDailyCap: number;
  ticketReplayEnabled: boolean;
  ticketReplayPriceTickets: number;
  coinReplayEnabled: boolean;
  coinReplayPriceCoins: number;
  coinReplayDailyCap: number | null;
};

export type PartnerReplaySettingsPartial = {
  maxReplaysPerMatch?: number | null;
  adReplayEnabled?: boolean | null;
  adReplayDailyCap?: number | null;
  ticketReplayEnabled?: boolean | null;
  ticketReplayPriceTickets?: number | null;
  coinReplayEnabled?: boolean | null;
  coinReplayPriceCoins?: number | null;
  coinReplayDailyCap?: number | null;
};

function replayBag(data: Record<string, unknown> | null | undefined): Record<string, unknown> {
  if (!data || typeof data !== "object") return {};
  const nested = data.replay;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    return nested as Record<string, unknown>;
  }
  return {};
}

export function readAdReplayDailyCapFromPartnerData(
  data: Record<string, unknown> | null | undefined
): number | null {
  const bag = replayBag(data);
  const raw = bag.adReplayDailyCap ?? data?.adReplayDailyCap;
  if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
  const n = Math.floor(raw);
  if (n < 0 || n > AD_REPLAY_DAILY_CAP_MAX) return null;
  return n;
}

export function readPartnerReplaySettingsFromPartnerData(
  data: Record<string, unknown> | null | undefined
): PartnerReplaySettings {
  const bag = replayBag(data);
  const flat = data && typeof data === "object" ? data : {};
  const getNum = (key: string): number | null => {
    const raw = bag[key] ?? flat[key];
    if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
    return Math.floor(raw);
  };
  const getBool = (key: string, fallback: boolean): boolean => {
    const raw = bag[key] ?? flat[key];
    return typeof raw === "boolean" ? raw : fallback;
  };

  const maxRaw = getNum("maxReplaysPerMatch");
  const maxReplaysPerMatch =
    maxRaw != null && maxRaw >= 0 && maxRaw <= MAX_REPLAYS_PER_MATCH_MAX
      ? maxRaw
      : DEFAULT_MAX_REPLAYS_PER_MATCH;

  const cap = readAdReplayDailyCapFromPartnerData(data) ?? DEFAULT_AD_REPLAY_DAILY_CAP;
  const ticketPrice = getNum("ticketReplayPriceTickets");
  const coinPrice = getNum("coinReplayPriceCoins");
  const coinCap = bag.coinReplayDailyCap ?? flat.coinReplayDailyCap;

  return {
    maxReplaysPerMatch,
    adReplayEnabled: getBool("adReplayEnabled", true),
    adReplayDailyCap: cap,
    ticketReplayEnabled: getBool("ticketReplayEnabled", true),
    ticketReplayPriceTickets:
      ticketPrice != null && ticketPrice >= 1 && ticketPrice <= 100
        ? ticketPrice
        : DEFAULT_TICKET_REPLAY_PRICE,
    coinReplayEnabled: getBool("coinReplayEnabled", false),
    coinReplayPriceCoins:
      coinPrice != null && coinPrice >= 0 ? coinPrice : 0,
    coinReplayDailyCap:
      coinCap === null
        ? null
        : typeof coinCap === "number" && Number.isFinite(coinCap)
          ? Math.max(0, Math.floor(coinCap))
          : null,
  };
}

/** Validate admin/bootstrap input. `null`/`undefined` clears override (use default). */
export function sanitizeAdReplayDailyCapInput(
  value: unknown
): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("ad_replay_daily_cap_invalid");
  }
  const n = Math.floor(value);
  if (n < 0 || n > AD_REPLAY_DAILY_CAP_MAX) {
    throw new Error("ad_replay_daily_cap_invalid");
  }
  return n;
}

export function sanitizeMaxReplaysPerMatchInput(
  value: unknown
): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("max_replays_per_match_invalid");
  }
  const n = Math.floor(value);
  if (n < 0 || n > MAX_REPLAYS_PER_MATCH_MAX) {
    throw new Error("max_replays_per_match_invalid");
  }
  return n;
}

export function sanitizeTicketReplayPriceInput(
  value: unknown
): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("ticket_replay_price_invalid");
  }
  const n = Math.floor(value);
  if (n < 1 || n > 100) {
    throw new Error("ticket_replay_price_invalid");
  }
  return n;
}

export function applyAdReplayDailyCapToPartnerData(
  prevData: Record<string, unknown>,
  cap: number | null | undefined
): Record<string, unknown> {
  return applyPartnerReplayPartialToPartnerData(prevData, {
    adReplayDailyCap: cap,
  });
}

/** Write sparse replay overrides under `partner.data.replay`; keep legacy flat adReplayDailyCap in sync. */
export function applyPartnerReplayPartialToPartnerData(
  prevData: Record<string, unknown>,
  partial: PartnerReplaySettingsPartial
): Record<string, unknown> {
  const next = { ...prevData };
  const prevBag =
    next.replay && typeof next.replay === "object" && !Array.isArray(next.replay)
      ? { ...(next.replay as Record<string, unknown>) }
      : {};

  const setOrClear = (key: string, value: unknown) => {
    if (value === undefined) return;
    if (value === null) {
      delete prevBag[key];
      return;
    }
    prevBag[key] = value;
  };

  setOrClear("maxReplaysPerMatch", partial.maxReplaysPerMatch);
  setOrClear("adReplayEnabled", partial.adReplayEnabled);
  setOrClear("adReplayDailyCap", partial.adReplayDailyCap);
  setOrClear("ticketReplayEnabled", partial.ticketReplayEnabled);
  setOrClear("ticketReplayPriceTickets", partial.ticketReplayPriceTickets);
  setOrClear("coinReplayEnabled", partial.coinReplayEnabled);
  setOrClear("coinReplayPriceCoins", partial.coinReplayPriceCoins);
  setOrClear("coinReplayDailyCap", partial.coinReplayDailyCap);

  if (Object.keys(prevBag).length === 0) {
    delete next.replay;
  } else {
    next.replay = prevBag;
  }

  // Legacy flat key for older readers / bootstrap scripts.
  if (partial.adReplayDailyCap !== undefined) {
    if (partial.adReplayDailyCap === null) {
      delete next.adReplayDailyCap;
    } else {
      next.adReplayDailyCap = partial.adReplayDailyCap;
    }
  } else if (typeof prevBag.adReplayDailyCap === "number") {
    next.adReplayDailyCap = prevBag.adReplayDailyCap;
  }

  return next;
}

export function effectiveAdReplayDailyCap(
  data: Record<string, unknown> | null | undefined
): number {
  return readAdReplayDailyCapFromPartnerData(data) ?? DEFAULT_AD_REPLAY_DAILY_CAP;
}

export function effectivePartnerReplaySettings(
  data: Record<string, unknown> | null | undefined
): PartnerReplaySettings {
  return readPartnerReplaySettingsFromPartnerData(data);
}
