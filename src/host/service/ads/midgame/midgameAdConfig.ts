/**
 * CrazyGames midgame (interstitial) break ads.
 *
 * Disable:
 * - URL: `?midgameAd=0` / `?midgameAd=off` / `?midgameAd=false`
 * - Build: `VITE_AD_MIDGAME=0`
 *
 * Force enable (incl. SDK `local` placeholder):
 * - `?midgameAd=1` / `VITE_AD_MIDGAME=1`
 *
 * Default: on for `crazygames` env; skipped on SDK `local` (placeholder overlay only).
 */
export type CrazyGamesMidgameAdPolicy = "force_on" | "force_off" | "default";

function parseFlag(raw: string | null | undefined): CrazyGamesMidgameAdPolicy | null {
  const v = raw?.trim().toLowerCase();
  if (v === "0" || v === "off" || v === "false" || v === "no") return "force_off";
  if (v === "1" || v === "on" || v === "true" || v === "yes") return "force_on";
  return null;
}

export function resolveCrazyGamesMidgameAdPolicy(
  search: string = typeof window !== "undefined" ? window.location.search : ""
): CrazyGamesMidgameAdPolicy {
  const fromQuery = parseFlag(new URLSearchParams(search).get("midgameAd"));
  if (fromQuery) return fromQuery;

  const fromEnv = parseFlag(import.meta.env.VITE_AD_MIDGAME);
  if (fromEnv) return fromEnv;

  return "default";
}

/** Sync gate: false only when explicitly disabled. */
export function isCrazyGamesMidgameAdEnabled(
  search: string = typeof window !== "undefined" ? window.location.search : ""
): boolean {
  return resolveCrazyGamesMidgameAdPolicy(search) !== "force_off";
}
