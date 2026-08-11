export type PortalShopSkuOverride = {
  priceCoins?: number;
  title?: string;
  weeklyPurchaseLimit?: number | null;
  sortOrder?: number;
  active?: boolean;
  tangoUtid?: string;
};

/** Optional partner/lobby overrides on global dailyCheckin amounts. */
export type PortalCheckinRewardsOverride = {
  baseTickets?: number;
  streakBonusTickets?: number[];
  baseCoins?: number;
  streakBonusCoins?: number[];
};

export type PortalCheckinRewardKind = "tickets" | "coins" | "both";

export type PortalPartnerShopSettings = {
  partnerId: number;
  enabled: boolean;
  giftCardsEnabled: boolean;
  virtualEnabled: boolean;
  vouchersEnabled: boolean;
  adCoinEnabled: boolean;
  iapEnabled: boolean;
  checkinEnabled: boolean;
  /** Daily check-in payout; default tickets. */
  checkinRewardKind: PortalCheckinRewardKind;
  /** Amount overrides; omit fields inherit portal-economy dailyCheckin. */
  checkinRewards: PortalCheckinRewardsOverride;
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
    iapEnabled: true,
    checkinEnabled: true,
    checkinRewardKind: "tickets",
    checkinRewards: {},
    assortmentMode: "all_shared",
    skuIds: [],
    excludeSkuIds: [],
    overrides: {},
    updatedAt: 0,
  };
}

export function normalizeCheckinRewardKind(
  raw: unknown
): PortalCheckinRewardKind {
  if (raw === "coins" || raw === "both" || raw === "tickets") return raw;
  return "tickets";
}

/** Merge overlay checkinRewards onto base (field-level). */
export function mergeCheckinRewards(
  base?: PortalCheckinRewardsOverride | null,
  overlay?: PortalCheckinRewardsOverride | null
): PortalCheckinRewardsOverride {
  const out: PortalCheckinRewardsOverride = { ...(base ?? {}) };
  if (!overlay) return out;
  if (overlay.baseTickets != null) out.baseTickets = overlay.baseTickets;
  if (overlay.streakBonusTickets != null) {
    out.streakBonusTickets = overlay.streakBonusTickets;
  }
  if (overlay.baseCoins != null) out.baseCoins = overlay.baseCoins;
  if (overlay.streakBonusCoins != null) {
    out.streakBonusCoins = overlay.streakBonusCoins;
  }
  return out;
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

/** Daily check-in block in shop; missing settings default to enabled. */
export function isPartnerShopCheckinEnabled(
  settings: PortalPartnerShopSettings | null | undefined
): boolean {
  if (!settings) return true;
  return settings.enabled !== false && settings.checkinEnabled !== false;
}
