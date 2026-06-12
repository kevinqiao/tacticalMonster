import { describe, expect, it } from "vitest";

import {
  botDueTimeMs,
  botFinalizeDelayMs,
  computeMaxBotDueTimeMs,
} from "../settle/async/casualAsyncBotDueTime";

describe("casualAsyncBotDueTime", () => {
  it("computeMaxBotDueTimeMs picks latest revealAt+duration", () => {
    const max = computeMaxBotDueTimeMs([
      { uid: "__vp_solitaire:1", revealAt: 1000, duration: 5000 },
      { uid: "__vp_solitaire:2", revealAt: 2000, duration: 3000 },
      { uid: "human_x", revealAt: 9999, duration: 9999 },
    ]);
    expect(max).toBe(5000);
  });

  it("botFinalizeDelayMs waits until max due", () => {
    const rows = [{ uid: "__vp_bb:1", revealAt: 1000, duration: 4000 }];
    expect(botFinalizeDelayMs(rows, 2500)).toBe(2500);
    expect(botFinalizeDelayMs(rows, 5000)).toBe(0);
  });

  it("botDueTimeMs returns null without revealAt", () => {
    expect(botDueTimeMs({ duration: 1000 })).toBeNull();
  });
});
