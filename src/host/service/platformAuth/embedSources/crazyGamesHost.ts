/**
 * CrazyGames CDN hosts builds under a nested path, e.g.
 *   https://solitaire-arena.game-files.crazygames.com/solitaire-arena/2/index.html
 * Our SPA expects /portal/{portal_key}/{game}. Normalize the location before React boots.
 */

const DEFAULT_ENTRY_PATH = "/portal/crazygames/solitaire";

export function isCrazyGamesFileHost(hostname = window.location.hostname): boolean {
  const h = hostname.toLowerCase();
  return (
    h === "crazygames.com" ||
    h.endsWith(".crazygames.com") ||
    h.includes("game-files.crazygames.com")
  );
}

/** True when pathname is a CDN build folder, not an app shell route. */
export function isCrazyGamesCdnBundlePath(pathname: string): boolean {
  const p = pathname.replace(/\/+$/, "") || "/";
  if (p === "/" || p === "/index.html") return true;
  // /solitaire-arena/2 or /solitaire-arena/2/index.html
  if (/^\/[^/]+\/\d+(\/index\.html)?$/i.test(p)) return true;
  if (/\/index\.html$/i.test(p) && !p.startsWith("/portal")) return true;
  return false;
}

export function crazyGamesEntryPath(): string {
  const raw = import.meta.env.VITE_CRAZYGAMES_ENTRY_PATH?.trim();
  if (raw && raw.startsWith("/")) {
    return raw.replace(/\/+$/, "") || DEFAULT_ENTRY_PATH;
  }
  return DEFAULT_ENTRY_PATH;
}

/**
 * If we're on CrazyGames file CDN (or force flag) without a portal route, rewrite
 * history to the configured portal entry so Partner + shell resolve correctly.
 * Call once before React render. Safe no-op elsewhere.
 */
export function normalizeCrazyGamesEntryLocation(): string | null {
  if (typeof window === "undefined") return null;

  const { pathname, search, hash } = window.location;
  const force = new URLSearchParams(search).get("crazygames") === "1";
  const onCgHost = isCrazyGamesFileHost();
  if (!onCgHost && !force) return null;

  // Already on a real app route — leave alone.
  if (
    pathname.startsWith("/portal/") ||
    pathname.startsWith("/casual/") ||
    pathname.startsWith("/tactical/") ||
    pathname.startsWith("/campaign/")
  ) {
    return null;
  }

  if (!onCgHost && force) {
    // Local ?crazygames=1 with a normal path — don't force redirect.
    if (!isCrazyGamesCdnBundlePath(pathname) && pathname !== "/") return null;
  }

  if (onCgHost && !isCrazyGamesCdnBundlePath(pathname) && pathname !== "/") {
    // Unknown path on CG host — still send to portal entry.
  }

  const entry = crazyGamesEntryPath();
  const next = `${entry}${search}${hash}`;
  if (`${pathname}${search}${hash}` === next) return null;

  window.history.replaceState(window.history.state, "", next);
  return entry;
}

/** Skip first-party Clerk on CrazyGames hosts (domain keys reject CG origins). */
export function shouldSkipClerkOnCrazyGamesHost(): boolean {
  if (typeof window === "undefined") return false;
  if (isCrazyGamesFileHost()) return true;
  return new URLSearchParams(window.location.search).get("crazygames") === "1";
}
