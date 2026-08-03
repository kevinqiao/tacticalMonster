import type { WebSignInStaffGate } from "./webSignInHelpers";
import {
  isPartnerOperationPath,
} from "../partner/partnerPaths";

export type WebSignInLocationContext = {
  staffGate: WebSignInStaffGate;
  partnerId?: number;
  defaultAccountId?: string;
  defaultPassword?: string;
};

const PLATFORM_DEFAULT_ACCOUNT = "admin";
const PLATFORM_DEFAULT_PASSWORD = "admin";

export function resolveWebSignInFromLocation(
  pathname = typeof window !== "undefined" ? window.location.pathname : "",
  search = typeof window !== "undefined" ? window.location.search : ""
): WebSignInLocationContext {
  if (pathname.startsWith("/platform/")) {
    return {
      staffGate: "platform",
      defaultAccountId: PLATFORM_DEFAULT_ACCOUNT,
      defaultPassword: PLATFORM_DEFAULT_PASSWORD,
    };
  }

  // Store console before generic /partner/ (admin uses partner_staff).
  if (isPartnerOperationPath(pathname)) {
    return { staffGate: "merchant" };
  }

  if (pathname.startsWith("/partner/")) {
    const raw = new URLSearchParams(search).get("partnerId");
    const partnerId = raw ? Number(raw) : NaN;
    return {
      staffGate: "partner",
      ...(Number.isFinite(partnerId) && partnerId > 0 ? { partnerId } : {}),
    };
  }

  return { staffGate: "none" };
}

/** Staff consoles: Platform / Partner / Merchant admin (`staffAuth.mode=web`, no Clerk). */
export function isStaffWebSignInContext(
  ctx: WebSignInLocationContext = resolveWebSignInFromLocation()
): boolean {
  return (
    ctx.staffGate === "platform" ||
    ctx.staffGate === "partner" ||
    ctx.staffGate === "merchant"
  );
}
