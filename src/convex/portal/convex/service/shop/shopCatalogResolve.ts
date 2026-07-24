import type { PortalShopSkuSeed } from "../../data/portalShopCatalog";
import {
  defaultPortalPartnerShopSettings,
  type PortalPartnerShopSettings,
  type PortalShopSkuOverride,
} from "../../data/portalPartnerShopSettings";

export type ShopCatalogMasterSku = PortalShopSkuSeed & {
  active: boolean;
};

export type ResolvedShopSku = ShopCatalogMasterSku;

function applyOverride(
  sku: ShopCatalogMasterSku,
  override: PortalShopSkuOverride | undefined
): ResolvedShopSku | null {
  if (override?.active === false) return null;
  return {
    ...sku,
    ...(override?.priceCoins !== undefined ? { priceCoins: override.priceCoins } : {}),
    ...(override?.title?.trim() ? { title: override.title.trim() } : {}),
    ...(override?.weeklyPurchaseLimit !== undefined
      ? { weeklyPurchaseLimit: override.weeklyPurchaseLimit ?? undefined }
      : {}),
    ...(override?.sortOrder !== undefined ? { sortOrder: override.sortOrder } : {}),
    ...(override?.tangoUtid?.trim() ? { tangoUtid: override.tangoUtid.trim() } : {}),
  };
}

export function resolvePortalShopCatalog(args: {
  partnerId: number | null;
  masterSkus: ShopCatalogMasterSku[];
  settings?: PortalPartnerShopSettings | null;
}): ResolvedShopSku[] {
  const partnerId = args.partnerId;
  const settings =
    partnerId == null
      ? defaultPortalPartnerShopSettings(-1)
      : args.settings ?? defaultPortalPartnerShopSettings(partnerId);
  if (!settings.enabled) return [];

  const allowlisted = new Set(settings.skuIds);
  const excluded = new Set(settings.excludeSkuIds);
  return args.masterSkus
    .filter((sku) => {
      if (!sku.active) return false;
      const isPartnerExclusive = Boolean(sku.partnerIds?.length);
      if (isPartnerExclusive && (partnerId == null || !sku.partnerIds!.includes(partnerId))) {
        return false;
      }
      // Allowlist only gates shared catalog SKUs. Partner-exclusive SKUs are managed
      // via Partner Admin CRUD + kind toggles (vouchersEnabled / listInShop / active).
      if (
        settings.assortmentMode === "allowlist" &&
        !isPartnerExclusive &&
        !allowlisted.has(sku.skuId)
      ) {
        return false;
      }
      if (excluded.has(sku.skuId)) return false;
      const kind = sku.skuKind ?? "virtual";
      if (kind === "giftcard" && !settings.giftCardsEnabled) return false;
      if (kind === "virtual" && !settings.virtualEnabled) return false;
      if (kind === "voucher" && !settings.vouchersEnabled) return false;
      if (kind === "voucher" && sku.listInShop === false) return false;
      return true;
    })
    .map((sku) => applyOverride(sku, settings.overrides[sku.skuId]))
    .filter((sku): sku is ResolvedShopSku => sku !== null)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.skuId.localeCompare(b.skuId));
}

export function findResolvedShopSku(
  skus: ResolvedShopSku[],
  skuId: string
): ResolvedShopSku | undefined {
  return skus.find((sku) => sku.skuId === skuId);
}
