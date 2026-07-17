import type { Partner } from "../PartnerManager";
import { parsePortalPathFromPathname } from "@/host/util/portalPathParse";
import { anyEmbedCredentialSourceEligible } from "./embedSources/registry";
import type { EmbedSourceContext } from "./embedSources/types";
import { EMBED_AUTH_CHANNEL_CID } from "@/convex/sso/convex/service/auth/authChannelCatalog";

/** Grace period while waiting for Partner WebView JWT before Clerk SSO. */
export const EMBED_AUTH_GRACE_MS = 2500;

export type EmbedAuthGatePhase =
  | "pending"
  | "waiting"
  | "bootstrapping"
  | "succeeded"
  | "failed"
  | "timed_out"
  | "skipped";

export function partnerEmbedChannelEnabled(partner: Partner | null | undefined): boolean {
  const ids = partner?.authChannelIds ?? partner?.auth_channels ?? [];
  return ids.includes(EMBED_AUTH_CHANNEL_CID);
}

export function isFirstPartyPortalPath(
  pathname = typeof window !== "undefined" ? window.location.pathname : ""
): boolean {
  return parsePortalPathFromPathname(pathname).isFirstPartyPortal;
}

export function shouldSkipEmbedAuth(args: { isFirstPartyPortal?: boolean }): boolean {
  return args.isFirstPartyPortal === true;
}

export function buildEmbedSourceContext(args: {
  partnerPid: number;
  partner: Partner | null;
  partnerResolveReady: boolean;
  campaignPartnerSlug?: string | null;
  portalPartnerKey?: string | null;
  isFirstPartyPortal?: boolean;
  search?: string;
}): EmbedSourceContext {
  const pathname = typeof window !== "undefined" ? window.location.pathname : "";
  const parsed = parsePortalPathFromPathname(pathname);
  return {
    partnerPid: args.partnerPid,
    partner: args.partner,
    partnerResolveReady: args.partnerResolveReady,
    campaignPartnerSlug: args.campaignPartnerSlug ?? null,
    portalPartnerKey: args.portalPartnerKey ?? parsed.partnerKey,
    isFirstPartyPortal: args.isFirstPartyPortal ?? parsed.isFirstPartyPortal,
    search: args.search ?? (typeof window !== "undefined" ? window.location.search : ""),
  };
}

export function readInjectedPartnerEmbedToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = window.__PARTNER_AUTH__?.token;
  return typeof token === "string" && token.trim() ? token.trim() : null;
}

/** Signals that Partner embed handoff is expected (WebView / iframe / ?embed=1). */
export function isEmbedLikelyContext(
  search = typeof window !== "undefined" ? window.location.search : ""
): boolean {
  if (readInjectedPartnerEmbedToken()) return true;
  const params = new URLSearchParams(search);
  if (params.get("embed") === "1" || params.get("partner_embed") === "1") return true;
  if (typeof window === "undefined") return false;
  try {
    return window.parent !== window;
  } catch {
    return true;
  }
}

export function shouldAttemptEmbedGate(args: {
  staffConsole: boolean;
  partnerResolveReady: boolean;
  authReady: boolean;
  partner: Partner | null;
  alreadyAuthed: boolean;
  isFirstPartyPortal?: boolean;
}): boolean {
  if (args.staffConsole || !args.authReady || !args.partnerResolveReady) return false;
  if (args.alreadyAuthed) return false;
  if (args.isFirstPartyPortal) return false;
  if (!partnerEmbedChannelEnabled(args.partner)) return false;
  return anyEmbedCredentialSourceEligible(
    buildEmbedSourceContext({
      partnerPid: args.partner?.pid ?? 0,
      partner: args.partner,
      partnerResolveReady: args.partnerResolveReady,
      campaignPartnerSlug: null,
      search: typeof window !== "undefined" ? window.location.search : "",
    })
  );
}

export function deferClerkForEmbedGate(phase: EmbedAuthGatePhase): boolean {
  return phase === "pending" || phase === "waiting" || phase === "bootstrapping";
}

