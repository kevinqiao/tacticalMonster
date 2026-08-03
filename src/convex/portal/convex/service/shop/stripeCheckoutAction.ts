"use node";

import { v } from "convex/values";
import Stripe from "stripe";

import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { authedAction } from "../../custom/session";

function stripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  return new Stripe(key);
}

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Create a Stripe Checkout Session for an iap shop SKU (tickets + coins pack).
 * Amount comes from Stripe Price; metadata carries uid/sku/scope for webhook fulfill.
 */
export const createStripeCheckout = authedAction({
  args: {
    skuId: v.string(),
    lobbyId: v.optional(v.id("portal_lobbies")),
    successUrl: v.string(),
    cancelUrl: v.string(),
  },
  handler: async (ctx, { skuId, lobbyId, successUrl, cancelUrl }) => {
    if (!isHttpUrl(successUrl) || !isHttpUrl(cancelUrl)) {
      return { ok: false as const, error: "invalid_return_url" as const };
    }
    const stripe = stripeClient();
    if (!stripe) {
      return { ok: false as const, error: "stripe_not_configured" as const };
    }

    const resolved = await ctx.runQuery(
      internal.service.shop.portalShopService.resolveIapCheckoutSkuInternal,
      {
        uid: ctx.uid,
        skuId,
        ...(lobbyId ? { lobbyId } : {}),
      }
    );
    if (!resolved.ok) {
      return resolved;
    }

    try {
      // Ensure success URL can carry the session id for client-side reconcile
      // when local webhooks (stripe listen) were not running.
      const successWithSession = successUrl.includes("{CHECKOUT_SESSION_ID}")
        ? successUrl
        : `${successUrl}${successUrl.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`;

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [{ price: resolved.stripePriceId, quantity: 1 }],
        success_url: successWithSession,
        cancel_url: cancelUrl,
        client_reference_id: ctx.uid,
        // Digital pack: skip Managed Payments (requires product tax_code when enabled).
        managed_payments: { enabled: false },
        metadata: {
          uid: ctx.uid,
          skuId: resolved.skuId,
          scopeKey: resolved.scopeKey,
          partnerId: String(resolved.partnerId),
          ...(resolved.lobbyId ? { lobbyId: resolved.lobbyId } : {}),
        },
      } as Stripe.Checkout.SessionCreateParams);
      if (!session.url) {
        return { ok: false as const, error: "checkout_url_missing" as const };
      }

      // Intent row for funnel stats / 我的订单 (pending → fulfilled on webhook).
      await ctx.runMutation(
        internal.service.shop.portalShopService.recordPendingStripeCheckout,
        {
          paymentRef: session.id,
          uid: ctx.uid,
          skuId: resolved.skuId,
          scopeKey: resolved.scopeKey,
          ...(resolved.lobbyId ? { lobbyId: resolved.lobbyId } : {}),
          ticketsGranted: resolved.grantTicketCount,
          coinsGranted: resolved.grantCoinCount,
        }
      );

      return {
        ok: true as const,
        url: session.url,
        sessionId: session.id,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "stripe_checkout_failed";
      console.error("[Portal] createStripeCheckout", msg);
      return { ok: false as const, error: "stripe_checkout_failed" as const };
    }
  },
});

/**
 * Recover fulfill when webhook was missed (common with local stripe listen).
 * Verifies the Checkout Session is paid in Stripe, then grants idempotently.
 */
export const reconcileStripeCheckout = authedAction({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, { sessionId }) => {
    const stripe = stripeClient();
    if (!stripe) {
      return { ok: false as const, error: "stripe_not_configured" as const };
    }
    const id = sessionId.trim();
    if (!id.startsWith("cs_")) {
      return { ok: false as const, error: "invalid_session" as const };
    }

    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.retrieve(id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "session_fetch_failed";
      console.error("[Portal] reconcileStripeCheckout retrieve", msg);
      return { ok: false as const, error: "session_not_found" as const };
    }

    if (session.status !== "complete" || session.payment_status !== "paid") {
      return { ok: false as const, error: "not_paid" as const };
    }

    const meta = session.metadata ?? {};
    const uid = (meta.uid || session.client_reference_id || "").trim();
    const skuId = (meta.skuId || "").trim();
    const scopeKey = (meta.scopeKey || "shared").trim() || "shared";
    const lobbyIdRaw = meta.lobbyId?.trim();

    if (!uid || uid !== ctx.uid) {
      return { ok: false as const, error: "forbidden" as const };
    }
    if (!skuId) {
      return { ok: false as const, error: "missing_metadata" as const };
    }

    const result = await ctx.runMutation(
      internal.service.shop.portalShopService.fulfillStripeShopPurchase,
      {
        paymentRef: session.id,
        uid,
        skuId,
        scopeKey,
        ...(lobbyIdRaw ? { lobbyId: lobbyIdRaw as Id<"portal_lobbies"> } : {}),
      }
    );

    if (!result.ok) {
      return { ok: false as const, error: result.error };
    }
    return {
      ok: true as const,
      duplicate: result.duplicate,
      ticketsGranted: result.ticketsGranted,
      coinsGranted: result.coinsGranted,
    };
  },
});
