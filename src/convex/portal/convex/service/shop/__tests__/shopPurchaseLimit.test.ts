import { describe, expect, it } from "vitest";

import { dailyPeriodKey, weeklyPeriodKey } from "../../../utils/casualTaskPeriod";
import {
  resolveShopPurchaseLimit,
  shopPurchaseLimitError,
  shopPurchasePeriodKey,
} from "../shopPurchaseLimit";

describe("resolveShopPurchaseLimit", () => {
  it("prefers a daily limit when both are set", () => {
    expect(
      resolveShopPurchaseLimit({ dailyPurchaseLimit: 1, weeklyPurchaseLimit: 5 })
    ).toEqual({ kind: "daily", limit: 1 });
  });

  it("uses weekly when daily is absent", () => {
    expect(resolveShopPurchaseLimit({ weeklyPurchaseLimit: 3 })).toEqual({
      kind: "weekly",
      limit: 3,
    });
  });

  it("returns null when no limit is set", () => {
    expect(resolveShopPurchaseLimit({})).toBeNull();
  });
});

describe("shopPurchasePeriodKey", () => {
  const now = Date.UTC(2026, 7, 17, 12, 0, 0);

  it("uses the ops daily key for daily SKUs", () => {
    expect(shopPurchasePeriodKey("daily", now)).toBe(dailyPeriodKey(now));
  });

  it("uses the ops weekly key for weekly SKUs", () => {
    expect(shopPurchasePeriodKey("weekly", now)).toBe(weeklyPeriodKey(now));
  });
});

describe("shopPurchaseLimitError", () => {
  it("maps daily and weekly kinds", () => {
    expect(shopPurchaseLimitError("daily")).toBe("daily_limit_reached");
    expect(shopPurchaseLimitError("weekly")).toBe("weekly_limit_reached");
  });
});
