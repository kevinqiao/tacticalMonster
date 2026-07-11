import { describe, expect, it } from "vitest";

import {
  formatFaceValueDisplay,
  giftCardPriceCoins,
  PORTAL_COINS_PER_USD,
} from "../../../data/portalGiftCardEconomy";
import {
  mapPortalShopSkuRow,
  PORTAL_SHOP_SKU_CATALOG,
} from "../../../data/portalShopCatalog";

describe("portalGiftCardEconomy", () => {
  it("uses 150 coins per USD baseline", () => {
    expect(PORTAL_COINS_PER_USD).toBe(150);
    expect(giftCardPriceCoins(5)).toBe(750);
    expect(giftCardPriceCoins(10)).toBe(1500);
  });

  it("applies scarcity multiplier", () => {
    expect(giftCardPriceCoins(3.7, 1.05)).toBe(583);
  });

  it("formats face values by currency", () => {
    expect(formatFaceValueDisplay(5, "USD")).toBe("$5");
    expect(formatFaceValueDisplay(5, "CAD")).toBe("CA$5");
    expect(formatFaceValueDisplay(5, "GBP")).toBe("£5");
    expect(formatFaceValueDisplay(5, "EUR")).toBe("€5");
  });
});

describe("portalShopCatalog giftcard SKUs", () => {
  const giftcards = PORTAL_SHOP_SKU_CATALOG.filter((s) => s.skuKind === "giftcard");

  it("includes US and CA Amazon $5 cards", () => {
    expect(giftcards.map((g) => g.skuId)).toEqual(
      expect.arrayContaining(["gc_amazon_5_us", "gc_amazon_5_ca"])
    );
  });

  it("maps giftcard rows with display fields", () => {
    const us = giftcards.find((g) => g.skuId === "gc_amazon_5_us")!;
    const row = mapPortalShopSkuRow(us);
    expect(row.skuKind).toBe("giftcard");
    expect(row.faceValueDisplay).toBe("$5");
    expect(row.priceCoins).toBe(750);
    expect(row.weeklyPurchaseLimit).toBe(1);
    expect(row.requiresVerifiedContact).toBe(true);
  });

  it("has no virtual replay SKUs in catalog", () => {
    const virtual = PORTAL_SHOP_SKU_CATALOG.filter((s) => s.skuKind === "virtual");
    expect(virtual).toHaveLength(0);
  });
});
