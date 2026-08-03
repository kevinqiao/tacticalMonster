import {
  partnerHasCampaignOps,
  partnerHasPortalGames,
  readPartnerCapabilities,
} from "@/convex/sso/convex/service/partner/partnerCapabilities";
import { resolveEmbedMethod } from "@/convex/sso/convex/service/embed/partnerEmbedConfig";

import { CAMPAIGN_URL_PREFIX, PORTAL_URL_PREFIX } from "@/host/util/appUrlSegments";

import type { Partner } from "../../PartnerManager";

export type AppEmbedContext = "portal" | "campaign" | "casual" | "tactical";

export function resolveAppEmbedContext(pathname: string): AppEmbedContext | null {
  if (pathname.startsWith(`${PORTAL_URL_PREFIX}/`) || pathname === PORTAL_URL_PREFIX) {
    return "portal";
  }
  if (pathname.startsWith(`${CAMPAIGN_URL_PREFIX}/`) || pathname === CAMPAIGN_URL_PREFIX) {
    return "campaign";
  }
  if (pathname.startsWith("/casual/") || pathname === "/casual") return "casual";
  if (pathname.startsWith("/tactical/") || pathname === "/tactical") return "tactical";
  return null;
}

/**
 * portal/campaign → partner.capabilities only.
 * casual/tactical are first-party shells — not Partner-gated.
 */
export function partnerAllowsContext(
  partner: Partner | null | undefined,
  ctx: AppEmbedContext
): boolean {
  if (!partner) return false;
  if (ctx === "portal") return partnerHasPortalGames(partner);
  if (ctx === "campaign") return partnerHasCampaignOps(partner);
  return true;
}

export function partnerEmbedMethod(partner: Partner | null | undefined) {
  const fromPlayer = partner?.playerAuth?.embed?.method;
  if (
    fromPlayer === "jwt_local" ||
    fromPlayer === "crazygames_jwt" ||
    fromPlayer === "code_exchange" ||
    fromPlayer === "session_introspect"
  ) {
    return fromPlayer;
  }
  if (!partner) return resolveEmbedMethod(undefined);
  return resolveEmbedMethod(partner);
}

export function isCrazyGamesDevFlag(search: string): boolean {
  return new URLSearchParams(search).get("crazygames") === "1";
}

export { readPartnerCapabilities };
