/**
 * Partner-scoped campaign ops navigation (embedded in Partner Admin modals).
 * Uses partnerId — not merchantId — for the long-term clean model.
 */

export type PartnerCampaignOpsView =
  | "campaigns"
  | "coupon-defs"
  | "coupons"
  | "brand"
  | "stores"
  | "store-team";

export type PartnerCampaignOpsRoute =
  | { view: "campaigns"; partnerId: number }
  | { view: "coupon-defs"; partnerId: number }
  | { view: "coupons"; partnerId: number; campaignId?: string }
  | { view: "brand"; partnerId: number }
  | { view: "stores"; partnerId: number }
  | { view: "store-team"; partnerId: number; storeId: string; storeName?: string };

export function partnerCampaignOpsRouteKey(route: PartnerCampaignOpsRoute): string {
  switch (route.view) {
    case "campaigns":
      return `campaigns:${route.partnerId}`;
    case "coupon-defs":
      return `coupon-defs:${route.partnerId}`;
    case "coupons":
      return `coupons:${route.partnerId}:${route.campaignId ?? ""}`;
    case "brand":
      return `brand:${route.partnerId}`;
    case "stores":
      return `stores:${route.partnerId}`;
    case "store-team":
      return `store-team:${route.partnerId}:${route.storeId}`;
  }
}

export function partnerCampaignOpsTitle(
  view: PartnerCampaignOpsView,
  prefix: string,
  storeName?: string
): string {
  const labels: Record<PartnerCampaignOpsView, string> = {
    campaigns: "活动",
    "coupon-defs": "券定义",
    coupons: "券实例",
    brand: "品牌",
    stores: "门店",
    "store-team": storeName ? `门店员工 · ${storeName}` : "门店员工",
  };
  return `${prefix} · ${labels[view]}`;
}
