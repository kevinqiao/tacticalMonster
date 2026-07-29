import { useMemo, useSyncExternalStore } from "react";

import { isValidPortalGameType } from "./portalGameTypeGuards";
import type { RegisteredPartnerGameType } from "@/convex/portal/convex/data/partnerGameRegistry";

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
): RegisteredPartnerGameType | null {
  if (typeof dataGameType === "string" && isValidPortalGameType(dataGameType)) {
    return dataGameType;
  }
  // Portal URLs are lobby-only; game type is not taken from the path.
  void pathname;
  return null;
}

export function isSolitairePortalPath(pathname: string): boolean {
  return pathname.toLowerCase().includes("/solitaire");
}

export function usePortalRouteGameType(dataGameType?: unknown): RegisteredPartnerGameType | null {
  const pathname = useSyncExternalStore(subscribePathname, readPathname, () => "");
  return useMemo(
    () => resolvePortalRouteGameType(pathname, dataGameType),
    [pathname, dataGameType]
  );
}
