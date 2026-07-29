import { CAMPAIGN_URL_PREFIX, PORTAL_URL_PREFIX } from "@/host/util/appUrlSegments";

/**
 * CrazyGames CDN hosts builds under a nested path, e.g.
 *   https://solitaire-arena.game-files.crazygames.com/solitaire-arena/2/index.html
 * Our SPA expects /gc/{partnerSlug}/{lobbySlug}. Normalize the location before React boots.
 *
 * IMPORTANT: pack uses `<base href="./">`. After replaceState to `/gc/...`, a relative
 * base would re-resolve against the new path and break `./assets/*` (Vite preload / CSS).
 * Lock `<base>` to the absolute CDN directory *before* rewriting history.
 * `index.html` does the same early; it stores `window.__CG_ASSET_BASE__`.
 */

declare global {
  interface Window {
    __CG_ASSET_BASE__?: string;
  }
}

/** Partner + named lobby: /gc/{partnerSlug}/{lobbySlug}. */
const DEFAULT_ENTRY_PATH = `${PORTAL_URL_PREFIX}/crazygames/solitaire`;

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
  if (/\/index\.html$/i.test(p) && !p.startsWith(PORTAL_URL_PREFIX)) return true;
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
 * Pin `<base href>` to the directory that actually hosts `assets/` (CDN folder),
 * using an absolute URL so later history rewrites cannot retarget relative loads.
 */
export function lockCrazyGamesAssetBaseHref(): string | null {
  if (typeof document === "undefined" || typeof window === "undefined") return null;
  const baseEl = document.querySelector("base");
  if (!baseEl) return null;

  const existing = (baseEl.getAttribute("href") || "").trim();
  if (/^https?:\/\//i.test(existing) || existing.startsWith("//")) {
    window.__CG_ASSET_BASE__ = existing.endsWith("/") ? existing : `${existing}/`;
    return window.__CG_ASSET_BASE__;
  }

  const fromWindow = window.__CG_ASSET_BASE__?.trim();
  if (fromWindow && (/^https?:\/\//i.test(fromWindow) || fromWindow.startsWith("//"))) {
    const abs = fromWindow.endsWith("/") ? fromWindow : `${fromWindow}/`;
    baseEl.setAttribute("href", abs);
    window.__CG_ASSET_BASE__ = abs;
    return abs;
  }

  // Only safe while still on the CDN bundle path (before history rewrite).
  if (!isCrazyGamesCdnBundlePath(window.location.pathname) && window.location.pathname !== "/") {
    return existing || null;
  }

  const absoluteDir = new URL(existing || ".", window.location.href).href;
  baseEl.setAttribute("href", absoluteDir);
  window.__CG_ASSET_BASE__ = absoluteDir;
  return absoluteDir;
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

  // Already on a real app route — leave alone (but keep absolute asset base if set).
  if (
    pathname.startsWith(`${PORTAL_URL_PREFIX}/`) ||
    pathname.startsWith("/casual/") ||
    pathname.startsWith("/tactical/") ||
    pathname.startsWith(`${CAMPAIGN_URL_PREFIX}/`)
  ) {
    if (onCgHost) lockCrazyGamesAssetBaseHref();
    return null;
  }

  if (!onCgHost && force) {
    // Local ?crazygames=1 with a normal path — don't force redirect.
    if (!isCrazyGamesCdnBundlePath(pathname) && pathname !== "/") return null;
  }

  // Must run before replaceState so `./assets` keeps resolving to the CDN folder.
  lockCrazyGamesAssetBaseHref();

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
