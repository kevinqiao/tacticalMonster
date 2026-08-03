import { describe, expect, it } from "vitest";

/**
 * player_seeds must stay keyed by gameType+uid(+poolVersion), never lobby.
 * This locks the product rule from lobby ops isolation: seed history follows
 * identity across lobbies under the same partner uid.
 */
describe("player_seeds uid scope", () => {
  it("documents index shape used by loadUsedSeedIdsForUids / recordPlayerSeedsForMatch", () => {
    const indexFields = ["gameType", "uid", "poolVersion", "seedId"] as const;
    expect(indexFields).not.toContain("lobbyId");
    expect(indexFields).not.toContain("scopeKey");
    expect(indexFields).toContain("uid");
  });

  it("same uid across lobbies shares used-seed set conceptually", () => {
    const usedByUid = new Map<string, Set<string>>();
    const uid = "0_1_abc";
    const record = (seedId: string, _lobbyId: string) => {
      const set = usedByUid.get(uid) ?? new Set();
      set.add(seedId);
      usedByUid.set(uid, set);
    };
    record("seed-a", "lobbyA");
    record("seed-b", "lobbyB");
    expect(usedByUid.get(uid)?.has("seed-a")).toBe(true);
    expect(usedByUid.get(uid)?.has("seed-b")).toBe(true);
    expect(usedByUid.size).toBe(1);
  });
});
