import { describe, expect, it } from "vitest";

import {
  mapPortalShopSkuRow,
  resolveGrantTicketCount,
} from "../../../data/portalShopCatalog";

describe("resolveGrantTicketCount", () => {
  it("prefers grantTicketCount over legacy grantReplayTokenCount", () => {
    expect(
      resolveGrantTicketCount({ grantTicketCount: 5, grantReplayTokenCount: 3 })
    ).toBe(5);
  });

  it("falls back to grantReplayTokenCount", () => {
    expect(resolveGrantTicketCount({ grantReplayTokenCount: 3 })).toBe(3);
  });

  it("defaults to 0", () => {
    expect(resolveGrantTicketCount({})).toBe(0);
  });
});

describe("mapPortalShopSkuRow iap + rename", () => {
  it("exposes grantTicketCount and alias grantReplayTokenCount", () => {
    const mapped = mapPortalShopSkuRow({
      skuId: "portal_shop_ticket_3",
      title: "门票 ×3",
      priceCoins: 180,
      grantTicketCount: 3,
      sortOrder: 10,
      skuKind: "virtual",
    });
    expect(mapped.grantTicketCount).toBe(3);
    expect(mapped.grantReplayTokenCount).toBe(3);
  });

  it("maps iap fiat + dual grants", () => {
    const mapped = mapPortalShopSkuRow({
      skuId: "portal_stripe_pack_t5_c100",
      title: "畅玩礼包",
      priceCoins: 0,
      skuKind: "iap",
      stripePriceId: "price_test",
      priceCents: 299,
      currency: "usd",
      grantTicketCount: 5,
      grantCoinCount: 100,
      sortOrder: 5,
    });
    expect(mapped.skuKind).toBe("iap");
    expect(mapped.priceCents).toBe(299);
    expect(mapped.grantTicketCount).toBe(5);
    expect(mapped.grantCoinCount).toBe(100);
  });
});

/**
 * Manual Stripe test-mode checklist (not automated):
 * 1. Set Portal Convex env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
 * 2. Replace price_REPLACE_ME in portal-economy.json with a real test Price id; sync + deploy
 * 3. stripe listen --forward-to <PORTAL_SITE>/stripe/webhook
 * 4. First-party host (not iframe embed): open shop → buy 畅玩礼包 → complete Checkout
 * 5. Expect wallet tickets +100 coins; weekly counter bumps; second webhook is idempotent
 * 6. purchasePortalShopSku(iap sku) still returns iap_use_payment_provider
 * 7. Old virtual ticket_3/10 coin purchase still works
 */
describe("stripe manual checklist", () => {
  it("documents test-mode steps", () => {
    expect(true).toBe(true);
  });
});
