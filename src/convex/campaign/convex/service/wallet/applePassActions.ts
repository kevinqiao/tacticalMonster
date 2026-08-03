"use node";

import { v } from "convex/values";

import { internalAction } from "../../_generated/server";
import { authedAction } from "../../custom/session";

/**
 * Apple Wallet pass generation was built on the local `coupons` table
 * (`Doc<"coupons">`), which no longer exists — Portal's backpack owns the
 * player-facing voucher state now. These are stubbed to `not_supported` so
 * the PassKit HTTP routes and FE `createAppleWalletPass` caller keep
 * compiling/working (the FE already hides the "Add to Wallet" button via
 * `passkitAvailability` and treats `passkit_not_configured` as a soft error).
 */

export const createAppleWalletPass = authedAction({
  args: { couponId: v.string() },
  handler: async () => {
    return { ok: false as const, error: "passkit_not_configured" as const };
  },
});

/** Apple web service: return base64 pkpass for a registered serial. */
export const buildPassBase64ForWebService = internalAction({
  args: {
    serialNumber: v.string(),
    passTypeIdentifier: v.string(),
    authToken: v.string(),
  },
  handler: async () => {
    return { ok: false as const, error: "passkit_not_configured" as const };
  },
});
