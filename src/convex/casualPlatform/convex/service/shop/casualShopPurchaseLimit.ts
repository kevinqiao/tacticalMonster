import type { MutationCtx } from "../../_generated/server";
import { weeklyPeriodKey } from "../../utils/casualTaskPeriod";

export function weeklyPurchaseLimitReached(
  purchaseCount: number,
  weeklyPurchaseLimit: number | undefined
): boolean {
  if (weeklyPurchaseLimit == null || weeklyPurchaseLimit <= 0) return false;
  return purchaseCount >= weeklyPurchaseLimit;
}

/** 校验并占用本周购买次数（须在扣款前调用）。 */
export async function reserveWeeklyShopPurchase(
  ctx: MutationCtx,
  uid: string,
  skuId: string,
  weeklyPurchaseLimit: number | undefined,
  nowMs: number
): Promise<{ ok: true } | { ok: false; error: "weekly_purchase_limit" }> {
  if (weeklyPurchaseLimit == null || weeklyPurchaseLimit <= 0) {
    return { ok: true };
  }

  const periodKey = weeklyPeriodKey(nowMs);
  const existing = await ctx.db
    .query("casual_shop_weekly_purchase_counters")
    .withIndex("by_uid_period_sku", (q) =>
      q.eq("uid", uid).eq("periodKey", periodKey).eq("skuId", skuId)
    )
    .unique();

  const purchaseCount = existing?.purchaseCount ?? 0;
  if (weeklyPurchaseLimitReached(purchaseCount, weeklyPurchaseLimit)) {
    return { ok: false, error: "weekly_purchase_limit" };
  }

  if (existing) {
    await ctx.db.patch(existing._id, {
      purchaseCount: purchaseCount + 1,
      updatedAt: nowMs,
    });
  } else {
    await ctx.db.insert("casual_shop_weekly_purchase_counters", {
      uid,
      periodKey,
      skuId,
      purchaseCount: 1,
      updatedAt: nowMs,
    });
  }

  return { ok: true };
}
