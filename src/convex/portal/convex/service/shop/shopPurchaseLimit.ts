import { dailyPeriodKey, weeklyPeriodKey } from "../../utils/casualTaskPeriod";

export type ShopPurchaseLimitKind = "daily" | "weekly";

export type ShopPurchaseLimit = {
  kind: ShopPurchaseLimitKind;
  limit: number;
};

export function resolveShopPurchaseLimit(sku: {
  dailyPurchaseLimit?: number | null;
  weeklyPurchaseLimit?: number | null;
}): ShopPurchaseLimit | null {
  const daily = sku.dailyPurchaseLimit;
  if (daily != null && Number.isFinite(daily) && daily > 0) {
    return { kind: "daily", limit: Math.floor(daily) };
  }
  const weekly = sku.weeklyPurchaseLimit;
  if (weekly != null && Number.isFinite(weekly) && weekly > 0) {
    return { kind: "weekly", limit: Math.floor(weekly) };
  }
  return null;
}

export function shopPurchasePeriodKey(
  kind: ShopPurchaseLimitKind,
  nowMs: number
): string {
  return kind === "daily" ? dailyPeriodKey(nowMs) : weeklyPeriodKey(nowMs);
}

export function shopPurchaseLimitError(
  kind: ShopPurchaseLimitKind
): "daily_limit_reached" | "weekly_limit_reached" {
  return kind === "daily" ? "daily_limit_reached" : "weekly_limit_reached";
}
