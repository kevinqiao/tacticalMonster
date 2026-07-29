/**
 * Partner-scoped campaign ops navigation (embedded in Partner/Platform Admin modals).
 * Voucher SKUs → 商店; stores/staff → 团队.
 */

export type PartnerCampaignOpsView = "campaigns";

export type PartnerCampaignOpsRoute = { view: "campaigns"; partnerId: number };

export function partnerCampaignOpsRouteKey(route: PartnerCampaignOpsRoute): string {
  return `campaigns:${route.partnerId}`;
}

export function partnerCampaignOpsTitle(
  view: PartnerCampaignOpsView,
  prefix: string,
  _storeName?: string
): string {
  const labels: Record<PartnerCampaignOpsView, string> = {
    campaigns: "活动",
  };
  return `${prefix} · ${labels[view]}`;
}
