export type PortalShopSkuOverride = {
  priceCoins?: number;
  title?: string;
  weeklyPurchaseLimit?: number | null;
  sortOrder?: number;
  active?: boolean;
  tangoUtid?: string;
};

export type PortalPartnerShopSettings = {
  partnerId: number;
  enabled: boolean;
  giftCardsEnabled: boolean;
  virtualEnabled: boolean;
  vouchersEnabled: boolean;
  adCoinEnabled: boolean;
  assortmentMode: "all_shared" | "allowlist";
  skuIds: string[];
  excludeSkuIds: string[];
  overrides: Record<string, PortalShopSkuOverride>;
  updatedAt: number;
};

export function defaultPortalPartnerShopSettings(partnerId: number): PortalPartnerShopSettings {
  return {
    partnerId,
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
  };
}

/**
 * Effective watch-ad-for-coins for a partner.
 * Missing settings default to enabled; the shop must also be enabled.
 */
export function isPartnerShopAdCoinEnabled(
  settings: PortalPartnerShopSettings | null | undefined
): boolean {
  if (!settings) return true;
  return settings.enabled !== false && settings.adCoinEnabled !== false;
}
