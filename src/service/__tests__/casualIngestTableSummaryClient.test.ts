import { describe, expect, it } from "vitest";

import { casualTableSummaryFromParsed } from "../../convex/shared/casualIngestTableSummaryClient";

describe("casualTableSummaryFromParsed", () => {
  it("preserves portal ad replay fields from ingest payload", () => {
    const parsed = casualTableSummaryFromParsed({
      maxPlayers: 1,
      rows: [{ rank: 1, score: 1200, displayLabel: "你", isYou: true }],
      replayOffered: true,
      replayMode: "ad",
      canReplay: true,
      adReplayDailyRemaining: 5,
      adReplayDailyCap: 10,
      replayWindowEndsAt: Date.now() + 180_000,
    });
    expect(parsed?.replayOffered).toBe(true);
    expect(parsed?.replayMode).toBe("ad");
    expect(parsed?.canReplay).toBe(true);
    expect(parsed?.adReplayDailyRemaining).toBe(5);
    expect(parsed?.adReplayDailyCap).toBe(10);
    expect(parsed?.replayWindowEndsAt).toBeGreaterThan(Date.now());
  });
});
