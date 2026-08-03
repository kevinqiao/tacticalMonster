"use node";

import { v } from "convex/values";
import Stripe from "stripe";

import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { internalAction } from "../../_generated/server";

function stripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  return new Stripe(key);
}

/**
 * Verify Stripe signature and fulfill iap shop purchase on checkout.session.completed.
 */
export const handleStripeWebhook = internalAction({
  args: {
    body: v.string(),
    signature: v.string(),
  },
  handler: async (ctx, { body, signature }) => {
    const stripe = stripeClient();
    const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    if (!stripe || !secret) {
      return { ok: false as const, error: "stripe_not_configured" as const, status: 503 };
    }
    if (!signature.trim()) {
      return { ok: false as const, error: "missing_signature" as const, status: 400 };
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, secret);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "invalid_signature";
      console.error("[Portal] stripe webhook verify failed", msg);
      return { ok: false as const, error: "invalid_signature" as const, status: 400 };
    }

    if (event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;
      await ctx.runMutation(
        internal.service.shop.portalShopService.expirePendingStripeCheckout,
        { paymentRef: session.id }
      );
      return { ok: true as const, expired: true as const };
    }

    if (event.type !== "checkout.session.completed") {
      return { ok: true as const, ignored: true as const, type: event.type };
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const paymentRef = session.id;
    const meta = session.metadata ?? {};
    const uid = (meta.uid || session.client_reference_id || "").trim();
    const skuId = (meta.skuId || "").trim();
    const scopeKey = (meta.scopeKey || "shared").trim() || "shared";
    const lobbyIdRaw = meta.lobbyId?.trim();

    if (!uid || !skuId) {
      console.error("[Portal] stripe webhook missing uid/skuId", paymentRef);
      return { ok: false as const, error: "missing_metadata" as const, status: 400 };
    }

    const result = await ctx.runMutation(
      internal.service.shop.portalShopService.fulfillStripeShopPurchase,
      {
        paymentRef,
        uid,
        skuId,
        scopeKey,
        ...(lobbyIdRaw ? { lobbyId: lobbyIdRaw as Id<"portal_lobbies"> } : {}),
      }
    );

    if (!result.ok) {
      console.error("[Portal] stripe fulfill failed", paymentRef, result.error);
      return { ok: false as const, error: result.error, status: 500 };
    }

    return {
      ok: true as const,
      duplicate: result.duplicate,
      ticketsGranted: result.ticketsGranted,
      coinsGranted: result.coinsGranted,
    };
  },
});
