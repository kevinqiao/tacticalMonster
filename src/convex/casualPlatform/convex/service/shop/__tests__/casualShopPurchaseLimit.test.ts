import { describe, expect, it } from "vitest";

import { weeklyPurchaseLimitReached } from "../casualShopPurchaseLimit";

describe("weeklyPurchaseLimitReached", () => {
  it("allows when no limit configured", () => {
    expect(weeklyPurchaseLimitReached(99, undefined)).toBe(false);
    expect(weeklyPurchaseLimitReached(99, 0)).toBe(false);
  });

  it("blocks at limit", () => {
    expect(weeklyPurchaseLimitReached(1, 1)).toBe(true);
    expect(weeklyPurchaseLimitReached(2, 2)).toBe(true);
  });

  it("allows below limit", () => {
    expect(weeklyPurchaseLimitReached(0, 2)).toBe(false);
    expect(weeklyPurchaseLimitReached(1, 2)).toBe(false);
  });
});
