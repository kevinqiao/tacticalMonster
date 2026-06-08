import { describe, expect, it } from "vitest";

import {
  pickDurationFallbackMs,
  pickInitialBotRevealCount,
  planBotRevealSchedule,
  resolveAsyncLeaderboardRowState,
} from "../../../data/casualBotFillStaggerConfig";

describe("pickInitialBotRevealCount", () => {
  it("returns full count when target is 1", () => {
    expect(pickInitialBotRevealCount(1, 42)).toBe(1);
  });

  it("returns between 1 and target-1 when target > 1", () => {
    const n = pickInitialBotRevealCount(4, 999);
    expect(n).toBeGreaterThanOrEqual(1);
    expect(n).toBeLessThanOrEqual(3);
  });
});

describe("planBotRevealSchedule", () => {
  it("assigns distinct revealAt for delayed bots", () => {
    const now = 1_000_000;
    const schedule = planBotRevealSchedule({
      virtualUids: ["a", "b", "c", "d"],
      sessionSeed: 12345,
      now,
    });
    expect(schedule).toHaveLength(4);
    const times = schedule.map((e) => e.revealAt);
    expect(new Set(times).size).toBe(times.length);
    expect(schedule.some((e) => e.revealAt === now)).toBe(true);
    expect(schedule.some((e) => e.revealAt > now)).toBe(true);
  });
});

describe("resolveAsyncLeaderboardRowState", () => {
  it("human playing vs scored", () => {
    expect(resolveAsyncLeaderboardRowState({ kind: "human", status: "open" }, 0)).toBe(
      "playing"
    );
    expect(resolveAsyncLeaderboardRowState({ kind: "human", status: "finished" }, 0)).toBe(
      "scored"
    );
  });

  it("bot matching / playing / scored by revealAt + duration", () => {
    expect(
      resolveAsyncLeaderboardRowState(
        { kind: "bot", revealAt: 1000, duration: 5000 },
        500
      )
    ).toBe("matching");
    expect(
      resolveAsyncLeaderboardRowState(
        { kind: "bot", revealAt: 1000, duration: 5000 },
        4000
      )
    ).toBe("playing");
    expect(
      resolveAsyncLeaderboardRowState(
        { kind: "bot", revealAt: 1000, duration: 5000 },
        7000
      )
    ).toBe("scored");
  });
});

describe("pickDurationFallbackMs", () => {
  it("returns value in configured range", () => {
    const d = pickDurationFallbackMs(77, 2);
    expect(d).toBeGreaterThanOrEqual(2_000);
    expect(d).toBeLessThanOrEqual(8_000);
  });
});

describe("buildAsyncBotRevealPlanSeedKey", () => {
  it("varies with replay epoch and submit anchor", async () => {
    const { buildAsyncBotRevealPlanSeedKey } = await import(
      "../casualRunSettlementFill"
    );
    const a = buildAsyncBotRevealPlanSeedKey({
      templateId: "casual_async_b_solitaire",
      sessionExternalId: "casual_sess:m1",
      replayEpoch: 0,
      anchorAt: 1000,
    });
    const b = buildAsyncBotRevealPlanSeedKey({
      templateId: "casual_async_b_solitaire",
      sessionExternalId: "casual_sess:m1",
      replayEpoch: 1,
      anchorAt: 1000,
    });
    const c = buildAsyncBotRevealPlanSeedKey({
      templateId: "casual_async_b_solitaire",
      sessionExternalId: "casual_sess:m1",
      replayEpoch: 0,
      anchorAt: 2000,
    });
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
  });
});
