import { v } from "convex/values";

import { internalMutation, internalQuery } from "../../_generated/server";

/**
 * Apple Wallet passes were backed by the local `coupons` / `wallet_pass_devices`
 * tables, which no longer exist now that Portal's backpack owns the
 * player-facing voucher state. These handlers are stubbed to keep the
 * PassKit HTTP routes (`http.ts`) from crashing; wallet pass issuance is
 * effectively disabled until it is rebuilt against Portal vouchers.
 */

export const getCouponForPassInternal = internalQuery({
  args: { couponId: v.string() },
  handler: async () => {
    return null;
  },
});

export const ensurePassAuthToken = internalMutation({
  args: { couponId: v.string(), uid: v.string() },
  handler: async () => {
    return { ok: false as const, error: "not_supported" as const };
  },
});

export const bumpPassUpdatedAt = internalMutation({
  args: { couponId: v.string() },
  handler: async () => {
    return { ok: false as const };
  },
});

export const registerDevice = internalMutation({
  args: {
    deviceLibraryIdentifier: v.string(),
    pushToken: v.string(),
    passTypeIdentifier: v.string(),
    serialNumber: v.string(),
  },
  handler: async () => {
    return { ok: true as const, created: false as const };
  },
});

export const unregisterDevice = internalMutation({
  args: {
    deviceLibraryIdentifier: v.string(),
    passTypeIdentifier: v.string(),
    serialNumber: v.string(),
  },
  handler: async () => {
    return { ok: true as const };
  },
});

export const listUpdatedSerialsForDevice = internalQuery({
  args: {
    deviceLibraryIdentifier: v.string(),
    passTypeIdentifier: v.string(),
    passesUpdatedSince: v.optional(v.string()),
  },
  handler: async () => {
    return { serialNumbers: [] as string[], lastUpdated: String(Date.now()) };
  },
});

export const listPushTokensForSerial = internalQuery({
  args: { serialNumber: v.string() },
  handler: async () => {
    return [] as string[];
  },
});

export const getCouponBySerialForPass = internalQuery({
  args: {
    serialNumber: v.string(),
    passTypeIdentifier: v.string(),
    authToken: v.string(),
  },
  handler: async () => {
    return null;
  },
});
