import { describe, expect, it } from "vitest";

import type { PortalShopSkuRow } from "@/component/lobby/portal/service/usePortalManager";
import {
  isPortalShopSkuVisibleForPartner,
  localizePortalShopSku,
  portalShopHasVisibleSkus,
  resolvePortalShopSkus,
} from "@/component/lobby/portal/3d/portalShopCatalogFallback";
import i18n from "@/i18n";

describe("portalShopCatalogFallback partner filtering", () => {
  const serverSkus: PortalShopSkuRow[] = [
    {
      skuId: "partner_only",
      title: "Partner SKU",
      description: "",
      priceCoins: 100,
      grantTicketCount: 0,
      weeklyPurchaseLimit: null,
      purchasedThisWeek: 0,
      remainingThisWeek: null,
    },
  ];

  it("returns server catalog once loaded (custom SKUs keep API copy)", () => {
    expect(resolvePortalShopSkus(serverSkus, 0)).toEqual(serverSkus);
    expect(resolvePortalShopSkus([], 0)).toEqual([]);
  });

  it("localizes shared catalog SKUs by skuId", async () => {
    await i18n.changeLanguage("en-US");
    const localized = localizePortalShopSku({
      skuId: "portal_shop_ticket_3",
      title: "门票 ×3",
      description: "获得 3 张门票，可用于继续游戏。",
      priceCoins: 180,
      grantTicketCount: 3,
      weeklyPurchaseLimit: 5,
      purchasedThisWeek: 0,
      remainingThisWeek: 5,
    });
    expect(localized.title).toBe("Tickets ×3");
    expect(localized.description).toContain("3 tickets");

    await i18n.changeLanguage("zh-CN");
    const zh = localizePortalShopSku({
      skuId: "portal_shop_ticket_3",
      title: "Tickets ×3",
      description: "Get 3 tickets to keep playing.",
      priceCoins: 180,
      grantTicketCount: 3,
      weeklyPurchaseLimit: 5,
      purchasedThisWeek: 0,
      remainingThisWeek: 5,
    });
    expect(zh.title).toBe("门票 ×3");
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
