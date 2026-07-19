"use node";

import { v } from "convex/values";

import { internal } from "../../_generated/api";
import { internalAction } from "../../_generated/server";
import { authedAction } from "../../custom/session";
import { buildAppleWalletPassBuffer } from "./applePassBuilder";
import { getPasskitSigningConfig } from "./passkitEnv";

async function loadLogoPng(
  ctx: { storage: { getUrl: (id: any) => Promise<string | null> } },
  logoStorageId: string | undefined
): Promise<Buffer | null> {
  if (!logoStorageId) return null;
  try {
    const url = await ctx.storage.getUrl(logoStorageId as any);
    if (!url) return null;
    const res = await fetch(url);
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  } catch {
    return null;
  }
}

async function buildPassForCoupon(
  ctx: {
    runQuery: typeof internalAction extends never ? never : any;
    storage: { getUrl: (id: any) => Promise<string | null> };
  },
  couponId: string
): Promise<{ ok: true; buffer: Buffer } | { ok: false; error: string }> {
  const config = getPasskitSigningConfig();
  if (!config) return { ok: false, error: "passkit_not_configured" };

  const coupon = await ctx.runQuery(
    internal.service.wallet.applePassMutations.getCouponForPassInternal,
    { couponId }
  );
  if (!coupon?.passAuthToken) return { ok: false, error: "not_found" };

  const brand = await ctx.runQuery(
    internal.service.merchant.merchantCampaigns.getPartnerBrandInternal,
    { partnerId: coupon.partnerId }
  );
  const logoPng = await loadLogoPng(ctx, brand?.logoStorageId);
  const theme = brand?.themeJson?.brand;
  const organizationName = brand?.slug || "PlayMint";

  const buffer = await buildAppleWalletPassBuffer({
    coupon,
    authToken: coupon.passAuthToken,
    organizationName,
    brandPrimary: theme?.primary,
    brandBackground: theme?.background,
    brandText: theme?.text,
    logoPng,
    config,
  });
  return { ok: true, buffer };
}

export const createAppleWalletPass = authedAction({
  args: { couponId: v.string() },
  handler: async (ctx, { couponId }) => {
    const config = getPasskitSigningConfig();
    if (!config) {
      return { ok: false as const, error: "passkit_not_configured" as const };
    }

    const ensured = await ctx.runMutation(
      internal.service.wallet.applePassMutations.ensurePassAuthToken,
      { couponId, uid: ctx.uid }
    );
    if (!ensured.ok) {
      return { ok: false as const, error: ensured.error };
    }

    const coupon = await ctx.runQuery(
      internal.service.wallet.applePassMutations.getCouponForPassInternal,
      { couponId }
    );
    if (!coupon || coupon.uid !== ctx.uid) {
      return { ok: false as const, error: "not_found" as const };
    }

    const built = await buildPassForCoupon(ctx, couponId);
    if (!built.ok) {
      return { ok: false as const, error: built.error as "passkit_not_configured" };
    }

    const blob = new Blob([new Uint8Array(built.buffer)], {
      type: "application/vnd.apple.pkpass",
    });
    const storageId = await ctx.storage.store(blob);
    const downloadUrl = await ctx.storage.getUrl(storageId);
    if (!downloadUrl) {
      return { ok: false as const, error: "storage_failed" as const };
    }

    return {
      ok: true as const,
      downloadUrl,
      provider: "apple" as const,
    };
  },
});

/** Apple web service: return base64 pkpass for a registered serial. */
export const buildPassBase64ForWebService = internalAction({
  args: {
    serialNumber: v.string(),
    passTypeIdentifier: v.string(),
    authToken: v.string(),
  },
  handler: async (ctx, args) => {
    const config = getPasskitSigningConfig();
    if (!config || config.passTypeIdentifier !== args.passTypeIdentifier) {
      return { ok: false as const, error: "passkit_not_configured" as const };
    }

    const coupon = await ctx.runQuery(
      internal.service.wallet.applePassMutations.getCouponBySerialForPass,
      {
        serialNumber: args.serialNumber,
        passTypeIdentifier: args.passTypeIdentifier,
        authToken: args.authToken,
      }
    );
    if (!coupon) {
      return { ok: false as const, error: "unauthorized" as const };
    }

    const built = await buildPassForCoupon(ctx, coupon.couponId);
    if (!built.ok) {
      return { ok: false as const, error: built.error as "passkit_not_configured" };
    }

    return {
      ok: true as const,
      base64: built.buffer.toString("base64"),
      lastModified: new Date(coupon.passUpdatedAt ?? coupon.issuedAt).toUTCString(),
    };
  },
});
