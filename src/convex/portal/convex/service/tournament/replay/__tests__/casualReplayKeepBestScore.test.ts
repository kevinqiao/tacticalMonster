import { describe, expect, it } from "vitest";

import { resolveReplayKeepBestScore } from "../casualReplayKeepBestScore";

describe("resolveReplayKeepBestScore", () => {
  it("uses raw score when no baseline (first play)", () => {
    expect(resolveReplayKeepBestScore({ rawScore: 1200 })).toEqual({
      score: 1200,
      keptBaseline: false,
    });
  });

  it("keeps higher replay score", () => {
    expect(
      resolveReplayKeepBestScore({ rawScore: 1500, replayBaselineScore: 1200 })
    ).toEqual({ score: 1500, keptBaseline: false });
  });

  it("discards lower or equal replay score", () => {
    expect(
      resolveReplayKeepBestScore({ rawScore: 900, replayBaselineScore: 1200 })
    ).toEqual({ score: 1200, keptBaseline: true });
    expect(
      resolveReplayKeepBestScore({ rawScore: 1200, replayBaselineScore: 1200 })
    ).toEqual({ score: 1200, keptBaseline: true });
  });
});
