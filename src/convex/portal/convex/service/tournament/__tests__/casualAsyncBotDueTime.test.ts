import { describe, expect, it } from "vitest";

import {
  asyncMatchFinalizeDelayMs,
  botDueTimeMs,
  botFinalizeDelayMs,
  computeAsyncMatchSettleDueTimeMs,
  computeMaxBotDueTimeMs,
  humanDueTimeMs,
} from "../settle/async/casualAsyncBotDueTime";

describe("casualAsyncBotDueTime", () => {
  it("computeMaxBotDueTimeMs picks latest revealAt+duration", () => {
    const max = computeMaxBotDueTimeMs([
      { uid: "__vp_solitaire:1", revealAt: 1000, duration: 5000 },
      { uid: "__vp_solitaire:2", revealAt: 2000, duration: 3000 },
      { uid: "human_x", revealAt: 9999, duration: 9999 },
    ]);
    expect(max).toBe(6000);
  });

  it("botFinalizeDelayMs waits until max bot due", () => {
    const rows = [{ uid: "__vp_bb:1", revealAt: 1000, duration: 4000 }];
    expect(botFinalizeDelayMs(rows, 2500)).toBe(2500);
    expect(botFinalizeDelayMs(rows, 5000)).toBe(0);
  });

  it("computeAsyncMatchSettleDueTimeMs uses max of human and bot end", () => {
    const due = computeAsyncMatchSettleDueTimeMs({
      humanRows: [{ uid: "u1", finishedAt: 8000, updatedAt: 8000 }],
      botRows: [{ uid: "__vp_bb:1", revealAt: 1000, duration: 4000 }],
    });
    expect(due).toBe(8000);
  });

  it("asyncMatchFinalizeDelayMs waits until table settle due", () => {
    const delay = asyncMatchFinalizeDelayMs({
      humanRows: [{ uid: "u1", finishedAt: 1000, updatedAt: 1000 }],
      botRows: [{ uid: "__vp_bb:1", revealAt: 2000, duration: 5000 }],
      now: 3000,
    });
    expect(delay).toBe(4000);
  });

  it("botDueTimeMs returns null without revealAt", () => {
    expect(botDueTimeMs({ duration: 1000 })).toBeNull();
  });

  it("humanDueTimeMs prefers finishedAt", () => {
    expect(humanDueTimeMs({ finishedAt: 42, updatedAt: 99 })).toBe(42);
  });
});
