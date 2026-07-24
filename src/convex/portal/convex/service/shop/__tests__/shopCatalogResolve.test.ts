import { describe, expect, it } from "vitest";

import type { PortalPartnerShopSettings } from "../../../data/portalPartnerShopSettings";
import {
  resolvePortalShopCatalog,
  type ShopCatalogMasterSku,
} from "../shopCatalogResolve";

function settings(
  patch: Partial<PortalPartnerShopSettings> & { partnerId: number }
): PortalPartnerShopSettings {
  return {
    partnerId: patch.partnerId,
    enabled: true,
    giftCardsEnabled: true,
    virtualEnabled: true,
    vouchersEnabled: true,
    adCoinEnabled: true,
    assortmentMode: "all_shared",
    skuIds: [],
    excludeSkuIds: [],
    overrides: {},
    updatedAt: 0,
    ...patch,
  };
}

function sku(partial: Partial<ShopCatalogMasterSku> & { skuId: string }): ShopCatalogMasterSku {
  return {
    skuId: partial.skuId,
    title: partial.title ?? partial.skuId,
    description: "",
    priceCoins: partial.priceCoins ?? 100,
    grantReplayTokenCount: 0,
    sortOrder: partial.sortOrder ?? 100,
    shopSection: partial.shopSection ?? "virtual",
    skuKind: partial.skuKind ?? "virtual",
    active: partial.active ?? true,
    partnerIds: partial.partnerIds,
    listInShop: partial.listInShop,
  };
}

describe("resolvePortalShopCatalog", () => {
  it("keeps partner-exclusive vouchers under allowlist without listing them in skuIds", () => {
    const voucher = sku({
      skuId: "partner_5_voucher_1",
      skuKind: "voucher",
      partnerIds: [5],
      listInShop: true,
    });
    const sharedTicket = sku({
      skuId: "ticket_x3",
      skuKind: "virtual",
    });
    const resolved = resolvePortalShopCatalog({
      partnerId: 5,
      masterSkus: [voucher, sharedTicket],
      settings: settings({
        partnerId: 5,
        assortmentMode: "allowlist",
        skuIds: ["gc_amazon_5_us"],
        virtualEnabled: false,
      }),
    });
    expect(resolved.map((row) => row.skuId)).toEqual(["partner_5_voucher_1"]);
  });

  it("still hides partner vouchers when vouchersEnabled is false", () => {
    const voucher = sku({
      skuId: "partner_5_voucher_1",
      skuKind: "voucher",
      partnerIds: [5],
      listInShop: true,
    });
    const resolved = resolvePortalShopCatalog({
      partnerId: 5,
      masterSkus: [voucher],
      settings: settings({
        partnerId: 5,
        assortmentMode: "allowlist",
        skuIds: [],
        vouchersEnabled: false,
      }),
    });
    expect(resolved).toEqual([]);
  });

  it("hides partner vouchers with listInShop false", () => {
    const voucher = sku({
      skuId: "partner_5_voucher_1",
      skuKind: "voucher",
      partnerIds: [5],
      listInShop: false,
    });
    const resolved = resolvePortalShopCatalog({
      partnerId: 5,
      masterSkus: [voucher],
      settings: settings({ partnerId: 5 }),
    });
    expect(resolved).toEqual([]);
  });
});
