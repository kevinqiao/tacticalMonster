import { describe, expect, it } from "vitest";

import { mergePartnerShopSettingsRows } from "../partnerShopSettings";

describe("mergePartnerShopSettingsRows", () => {
  it("all_shared overlay shows shared mode even when base was empty allowlist", () => {
    const merged = mergePartnerShopSettingsRows(
      1,
      {
        enabled: true,
        giftCardsEnabled: true,
        virtualEnabled: true,
        assortmentMode: "allowlist",
        skuIds: [],
        excludeSkuIds: [],
        overrides: {},
        updatedAt: 1,
      },
      {
        enabled: true,
        giftCardsEnabled: true,
        virtualEnabled: true,
        assortmentMode: "all_shared",
        skuIds: [],
        excludeSkuIds: [],
        overrides: {},
        updatedAt: 2,
      }
    );
    expect(merged?.assortmentMode).toBe("all_shared");
    expect(merged?.enabled).toBe(true);
    expect(merged?.virtualEnabled).toBe(true);
  });

  it("does not let empty overlay skuIds erase base allowlist when overlay has no assortmentMode win via all_shared path", () => {
    const merged = mergePartnerShopSettingsRows(
      1,
      {
        enabled: true,
        giftCardsEnabled: true,
        virtualEnabled: true,
        assortmentMode: "allowlist",
        skuIds: ["portal_shop_ticket_3"],
        excludeSkuIds: [],
        overrides: {},
        updatedAt: 1,
      },
      null
    );
    expect(merged?.assortmentMode).toBe("allowlist");
    expect(merged?.skuIds).toEqual(["portal_shop_ticket_3"]);
  });

  it("defaults missing toggles to enabled instead of false", () => {
    const merged = mergePartnerShopSettingsRows(1, null, {
      enabled: true,
      giftCardsEnabled: true,
      virtualEnabled: true,
      assortmentMode: "all_shared",
      skuIds: [],
      excludeSkuIds: [],
      overrides: {},
      updatedAt: 1,
    });
    expect(merged?.giftCardsEnabled).toBe(true);
    expect(merged?.virtualEnabled).toBe(true);
  });
});
