import { describe, expect, it } from "vitest";

import {
  BOT_REVEAL_POST_SUBMIT_WINDOW_MS,
  planBotRevealSchedule,
} from "../botRevealSchedule";

describe("planBotRevealSchedule", () => {
  const matchStartedAt = 1_000_000;
  const humanFinishedAt = 1_100_000;

  it("spreads reveals within start through submit + 3min", () => {
    const end = humanFinishedAt + BOT_REVEAL_POST_SUBMIT_WINDOW_MS;
    const schedule = planBotRevealSchedule({
      slotKeys: ["r1", "r2", "r3"],
      sessionSeed: 42,
      matchStartedAt,
      humanFinishedAt,
    });
    expect(schedule).toHaveLength(3);
    for (const row of schedule) {
      expect(row.revealAt).toBeGreaterThanOrEqual(matchStartedAt);
      expect(row.revealAt).toBeLessThanOrEqual(end);
    }
  });

  it("ensures at least one bot before human submit", () => {
    const schedule = planBotRevealSchedule({
      slotKeys: ["r1", "r2", "r3"],
      sessionSeed: 7,
      matchStartedAt,
      humanFinishedAt,
    });
    expect(schedule.some((r) => r.revealAt < humanFinishedAt)).toBe(true);
  });

  it("forces pre-submit bot when all random draws land after submit", () => {
    const schedule = planBotRevealSchedule({
      slotKeys: ["r1"],
      sessionSeed: 999_999,
      matchStartedAt,
      humanFinishedAt: matchStartedAt + 60_000,
    });
    expect(schedule[0]!.revealAt).toBeLessThan(matchStartedAt + 60_000);
  });
});
