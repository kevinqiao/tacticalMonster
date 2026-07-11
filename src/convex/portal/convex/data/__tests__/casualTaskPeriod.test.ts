import { describe, expect, it } from "vitest";

import { dailyWindowMsForOpsZone } from "../../utils/casualTaskPeriod";

describe("dailyWindowMsForOpsZone", () => {
  it("anchors startsAt to ops-day reset, not wall-clock now", () => {
    // 2026-07-10 21:29:21 UTC ≈ Asia/Shanghai 05:29 on Jul 11 (just after 05:00 reset)
    const nowMs = Date.parse("2026-07-10T21:29:21.530Z");
    const w = dailyWindowMsForOpsZone(nowMs, "Asia/Shanghai");

    expect(w.instanceKey).toBe("d:Asia/Shanghai:2026-07-11");
    // Reset is 05:00 Shanghai = 21:00 UTC previous calendar day
    expect(w.startsAt).toBe(Date.parse("2026-07-10T21:00:00.000Z"));
    expect(w.endsAt).toBe(Date.parse("2026-07-11T20:59:59.999Z"));

    // A play a few minutes before "now" but after reset must count
    const playAt = Date.parse("2026-07-10T21:26:21.163Z");
    expect(playAt >= w.startsAt && playAt <= w.endsAt).toBe(true);
  });

  it("keeps a full ~24h window mid-day", () => {
    const nowMs = Date.parse("2026-07-11T08:00:00.000Z"); // 16:00 Shanghai
    const w = dailyWindowMsForOpsZone(nowMs, "Asia/Shanghai");
    expect(w.startsAt).toBe(Date.parse("2026-07-10T21:00:00.000Z"));
    expect(w.endsAt).toBe(Date.parse("2026-07-11T20:59:59.999Z"));
    expect(w.endsAt - w.startsAt).toBeGreaterThan(23 * 3600 * 1000);
  });
});
