import { useMemo, useSyncExternalStore } from "react";

import { parsePortalPathFromPathname } from "@/host/util/portalPathParse";

import { isValidPortalGameType } from "./portalGameTypeGuards";
import type { RegisteredPortalGameType } from "@/convex/portal/convex/data/portalGameRegistry";

function subscribePathname(onStoreChange: () => void) {
  window.addEventListener("popstate", onStoreChange);
  window.addEventListener("portal-path-changed", onStoreChange);
  return () => {
    window.removeEventListener("popstate", onStoreChange);
    window.removeEventListener("portal-path-changed", onStoreChange);
  };
}

function readPathname() {
  return window.location.pathname;
}

export function resolvePortalRouteGameType(
  pathname: string,
  dataGameType?: unknown
): RegisteredPortalGameType | null {
  if (typeof dataGameType === "string" && isValidPortalGameType(dataGameType)) {
    return dataGameType;
  }

  const parsed = parsePortalPathFromPathname(pathname).gameType;
  if (parsed) return parsed;

  const segments = pathname.split("/").filter(Boolean);
  const last = segments[segments.length - 1]?.toLowerCase();
  if (last && isValidPortalGameType(last)) return last;

  return null;
}

export function isSolitairePortalPath(pathname: string): boolean {
  return pathname.toLowerCase().includes("/solitaire");
}

export function usePortalRouteGameType(dataGameType?: unknown): RegisteredPortalGameType | null {
  const pathname = useSyncExternalStore(subscribePathname, readPathname, () => "");
  return useMemo(
    () => resolvePortalRouteGameType(pathname, dataGameType),
    [pathname, dataGameType]
  );
}
