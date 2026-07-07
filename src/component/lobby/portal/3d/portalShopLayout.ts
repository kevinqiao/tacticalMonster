import type { PortalShopSkuRow } from "../service/usePortalManager";

export type PortalShopSkuGroup = {
  sectionId: string | null;
  label: string | null;
  items: PortalShopSkuRow[];
};

/** Fixed shop category order derived from skuKind. */
export const PORTAL_SHOP_CATEGORY_ORDER = ["virtual", "giftcard"] as const;

export type PortalShopCategoryId = (typeof PORTAL_SHOP_CATEGORY_ORDER)[number];

function skuSortOrder(sku: PortalShopSkuRow): number {
  return sku.sortOrder ?? 0;
}

export function sortPortalShopSkus(skus: PortalShopSkuRow[]): PortalShopSkuRow[] {
  return [...skus].sort(
    (a, b) => skuSortOrder(a) - skuSortOrder(b) || a.skuId.localeCompare(b.skuId)
  );
}

export function portalShopCategoryId(sku: PortalShopSkuRow): PortalShopCategoryId {
  return sku.skuKind === "giftcard" ? "giftcard" : "virtual";
}

/** Groups SKUs under skuKind categories (道具 / 礼品卡). Empty categories are omitted. */
export function groupPortalShopSkus(
  skus: PortalShopSkuRow[],
  sectionLabel: (sectionId: string) => string
): PortalShopSkuGroup[] {
  const sorted = sortPortalShopSkus(skus);
  if (sorted.length === 0) return [];

  const buckets = new Map<PortalShopCategoryId, PortalShopSkuRow[]>();
  for (const sku of sorted) {
    const key = portalShopCategoryId(sku);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(sku);
    else buckets.set(key, [sku]);
  }

  return PORTAL_SHOP_CATEGORY_ORDER.filter((id) => (buckets.get(id)?.length ?? 0) > 0).map(
    (id) => ({
      sectionId: id,
      label: sectionLabel(id),
      items: buckets.get(id)!,
    })
  );
}
