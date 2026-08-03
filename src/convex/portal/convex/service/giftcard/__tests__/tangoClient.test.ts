import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { isTangoConfigured, tangoCreateOrder, tangoGetOrder } from "../tangoClient";

describe("tangoClient mock mode", () => {
  const prev = { ...process.env };

  beforeEach(() => {
    process.env.TANGO_MOCK_FULFILL = "true";
    delete process.env.TANGO_PLATFORM_NAME;
    delete process.env.TANGO_API_KEY;
    delete process.env.TANGO_ACCOUNT_IDENTIFIER;
  });

  afterEach(() => {
    process.env = { ...prev };
  });

  it("is configured in mock mode without credentials", () => {
    expect(isTangoConfigured()).toBe(true);
  });

  it("creates mock orders with reward link", async () => {
    const result = await tangoCreateOrder({
      accountIdentifier: "A1",
      utid: "U163059",
      amount: 5,
      externalRefID: "gc_test_order_1",
      recipientEmail: "player@example.com",
    });
    expect(result.referenceOrderID).toBe("gc_test_order_1");
    expect(result.rewardLink).toContain("gc_test_order_1");
  });

  it("fetches mock order by reference id", async () => {
    const result = await tangoGetOrder("gc_test_order_2");
    expect(result.status).toBe("COMPLETE");
    expect(result.rewardLink).toContain("gc_test_order_2");
  });
});
