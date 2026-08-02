import { describe, expect, it } from "vitest";

import type { PortalShopSkuRow } from "@/component/lobby/portal/service/usePortalManager";
import { groupPortalShopSkus } from "@/component/lobby/portal/3d/portalShopLayout";

function sku(partial: Partial<PortalShopSkuRow> & Pick<PortalShopSkuRow, "skuId">): PortalShopSkuRow {
  return {
    title: partial.skuId,
    description: "",
    priceCoins: 100,
    grantTicketCount: 0,
    weeklyPurchaseLimit: null,
    purchasedThisWeek: 0,
    remainingThisWeek: null,
    ...partial,
  };
}

describe("groupPortalShopSkus", () => {
  const label = (id: string) => id;

  it("groups by skuKind with iap before virtual before giftcard", () => {
    const groups = groupPortalShopSkus(
      [
        sku({ skuId: "gc_1", skuKind: "giftcard", sortOrder: 20 }),
        sku({ skuId: "item_1", skuKind: "virtual", sortOrder: 10 }),
        sku({ skuId: "item_2", sortOrder: 15 }),
        sku({ skuId: "pack_1", skuKind: "iap", sortOrder: 5, priceCents: 299 }),
      ],
      label
    );

    expect(groups.map((g) => g.sectionId)).toEqual(["iap", "virtual", "giftcard"]);
    expect(groups[0]?.items.map((s) => s.skuId)).toEqual(["pack_1"]);
    expect(groups[1]?.items.map((s) => s.skuId)).toEqual(["item_1", "item_2"]);
    expect(groups[2]?.items.map((s) => s.skuId)).toEqual(["gc_1"]);
  });

  it("omits empty categories", () => {
    expect(
      groupPortalShopSkus([sku({ skuId: "item_1", skuKind: "virtual" })], label).map(
        (g) => g.sectionId
      )
    ).toEqual(["virtual"]);
  });
});
