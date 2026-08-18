import { describe, expect, it } from "vitest";

import {
  collectTownTicketGrantTargets,
  isTownPlayScopeKey,
} from "../townTicketGrant";

describe("townWalletAdmin", () => {
  it("isTownPlayScopeKey accepts town document scopes only", () => {
    expect(isTownPlayScopeKey("town:abc")).toBe(true);
    expect(isTownPlayScopeKey("shared")).toBe(false);
    expect(isTownPlayScopeKey("town:")).toBe(false);
    expect(isTownPlayScopeKey("lobby:1")).toBe(false);
  });

  it("collectTownTicketGrantTargets unions wallets and progress, skips lobby", () => {
    const targets = collectTownTicketGrantTargets({
      wallets: [
        { uid: "u1", scopeKey: "shared" },
        { uid: "u1", scopeKey: "town:t1" },
        { uid: "u2", scopeKey: "town:t2" },
      ],
      progress: [
        { uid: "u1", townId: "t1" },
        { uid: "u3", townId: "t3" },
      ],
    });
    expect(targets).toEqual(
      expect.arrayContaining([
        { uid: "u1", scopeKey: "town:t1" },
        { uid: "u2", scopeKey: "town:t2" },
        { uid: "u3", scopeKey: "town:t3" },
      ])
    );
    expect(targets).toHaveLength(3);
  });
});
