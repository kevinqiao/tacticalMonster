import { describe, expect, it } from "vitest";

import { resolveAsyncLeaderboardRowState } from "../../../data/casualAsyncLeaderboardRowState";

describe("resolveAsyncLeaderboardRowState", () => {
  it("human open → playing, finished → scored", () => {
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
        2000
      )
    ).toBe("playing");
    expect(
      resolveAsyncLeaderboardRowState(
        { kind: "bot", revealAt: 1000, duration: 5000 },
        7000
      )
    ).toBe("scored");
  });

  it("uses stored rollout duration as-is", () => {
    const revealAt = 1_000;
    const rolloutMs = 300_000;
    expect(
      resolveAsyncLeaderboardRowState(
        { kind: "bot", revealAt, duration: rolloutMs },
        revealAt + 299_000
      )
    ).toBe("playing");
    expect(
      resolveAsyncLeaderboardRowState(
        { kind: "bot", revealAt, duration: rolloutMs },
        revealAt + rolloutMs
      )
    ).toBe("scored");
  });
});
