/** Partner-scoped Portal ad-replay daily cap (stored on `partner.data`). */

export const DEFAULT_AD_REPLAY_DAILY_CAP = 5;
export const AD_REPLAY_DAILY_CAP_MAX = 100;

export function readAdReplayDailyCapFromPartnerData(
  data: Record<string, unknown> | null | undefined
): number | null {
  if (!data || typeof data !== "object") return null;
  const raw = data.adReplayDailyCap;
  if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
  const n = Math.floor(raw);
  if (n < 0 || n > AD_REPLAY_DAILY_CAP_MAX) return null;
  return n;
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

export function applyAdReplayDailyCapToPartnerData(
  prevData: Record<string, unknown>,
  cap: number | null | undefined
): Record<string, unknown> {
  const next = { ...prevData };
  if (cap === undefined) return next;
  if (cap === null) {
    delete next.adReplayDailyCap;
    return next;
  }
  next.adReplayDailyCap = cap;
  return next;
}

export function effectiveAdReplayDailyCap(
  data: Record<string, unknown> | null | undefined
): number {
  return readAdReplayDailyCapFromPartnerData(data) ?? DEFAULT_AD_REPLAY_DAILY_CAP;
}
