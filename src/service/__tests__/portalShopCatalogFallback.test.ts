import { describe, expect, it } from "vitest";

import type { PortalShopSkuRow } from "@/component/lobby/portal/service/usePortalManager";
import {
  isPortalShopSkuVisibleForPartner,
  portalShopHasVisibleSkus,
  resolvePortalShopSkus,
} from "@/component/lobby/portal/3d/portalShopCatalogFallback";

describe("portalShopCatalogFallback partner filtering", () => {
  const serverSkus: PortalShopSkuRow[] = [
    {
      skuId: "partner_only",
      title: "Partner SKU",
      description: "",
      priceCoins: 100,
      grantReplayTokenCount: 0,
      weeklyPurchaseLimit: null,
      purchasedThisWeek: 0,
      remainingThisWeek: null,
    },
  ];

  it("returns server catalog as-is once loaded", () => {
    expect(resolvePortalShopSkus(serverSkus, 0)).toEqual(serverSkus);
    expect(resolvePortalShopSkus([], 0)).toEqual([]);
  });

  it("uses fallback only before catalog loads", () => {
    const fallback = resolvePortalShopSkus(undefined, 0);
    expect(fallback.length).toBeGreaterThan(0);
  });

  it("shows shop entry optimistically before catalog loads", () => {
    expect(portalShopHasVisibleSkus(undefined, 0, false)).toBe(true);
  });

  it("hides shop entry after catalog loads with no skus", () => {
    expect(portalShopHasVisibleSkus([], 0, true)).toBe(false);
    expect(portalShopHasVisibleSkus(serverSkus, 0, true)).toBe(true);
  });

  it("filters fallback SKUs by partnerPid", () => {
    expect(isPortalShopSkuVisibleForPartner([101], 101)).toBe(true);
    expect(isPortalShopSkuVisibleForPartner([101], 0)).toBe(false);
  });
});
