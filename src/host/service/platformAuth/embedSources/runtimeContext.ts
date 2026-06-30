import { resolveEmbedMethod } from "@/convex/sso/convex/service/embed/partnerEmbedConfig";

import type { Partner } from "../../PartnerManager";

export type AppEmbedContext = "portal" | "campaign" | "casual" | "tactical";

export function resolveAppEmbedContext(pathname: string): AppEmbedContext | null {
  if (pathname.startsWith("/portal/") || pathname === "/portal") return "portal";
  if (pathname.startsWith("/campaign/") || pathname === "/campaign") return "campaign";
  if (pathname.startsWith("/casual/") || pathname === "/casual") return "casual";
  if (pathname.startsWith("/tactical/") || pathname === "/tactical") return "tactical";
  return null;
}

export function partnerAllowsContext(
  partner: Partner | null | undefined,
  ctx: AppEmbedContext
): boolean {
  if (!partner) return false;
  const enabled = readPartnerEnabledContexts(partner);
  if (!enabled || enabled.length === 0) return true;
  return enabled.includes(ctx);
}

export function readPartnerEnabledContexts(partner: Partner): string[] | undefined {
  const data = partner.data;
  if (!data || typeof data !== "object") return undefined;
  const contexts = (data as { enabledContexts?: unknown }).enabledContexts;
  if (!Array.isArray(contexts)) return undefined;
  return contexts.filter((c): c is string => typeof c === "string");
}

export function partnerEmbedMethod(partner: Partner | null | undefined) {
  if (!partner?.data) return resolveEmbedMethod(undefined);
  return resolveEmbedMethod(partner.data);
}

export function isCrazyGamesDevFlag(search: string): boolean {
  return new URLSearchParams(search).get("crazygames") === "1";
}
