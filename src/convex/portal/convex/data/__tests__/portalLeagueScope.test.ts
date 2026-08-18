import { describe, expect, it } from "vitest";

import {
  gameLeagueScopeKey,
  isLobbyLeagueScope,
  isTownLeagueScopeKey,
  lobbyLeagueScopeKey,
  parseLeagueScopeKey,
  resolveLeagueScope,
  townLeagueScopeKey,
} from "../portalLeagueScope";

describe("portalLeagueScope", () => {
  it("builds town / lobby / game keys", () => {
    expect(townLeagueScopeKey("mayfield")).toBe("town:mayfield");
    expect(lobbyLeagueScopeKey("lobby123")).toBe("lobby:lobby123");
    expect(gameLeagueScopeKey("solitaire")).toBe("game:solitaire");
  });

  it("resolves lobbyId to lobby:{id}", () => {
    const scope = resolveLeagueScope({ lobbyId: "abc" as never });
    expect(scope).toEqual({
      leagueScopeKey: "lobby:abc",
      kind: "lobby",
      lobbyId: "abc",
    });
    expect(isLobbyLeagueScope(scope!)).toBe(true);
    expect(isTownLeagueScopeKey(scope!.leagueScopeKey)).toBe(false);
  });

  it("prefers an explicit leagueScopeKey over lobbyId", () => {
    const scope = resolveLeagueScope({
      leagueScopeKey: "town:mayfield",
      lobbyId: "abc" as never,
    });
    expect(scope?.leagueScopeKey).toBe("town:mayfield");
    expect(scope?.kind).toBe("town");
  });

  it("parses town / lobby / game keys", () => {
    expect(parseLeagueScopeKey("lobby:xyz")).toMatchObject({
      kind: "lobby",
      lobbyId: "xyz",
    });
    expect(parseLeagueScopeKey("game:solitaire")).toMatchObject({
      kind: "game",
      gameType: "solitaire",
    });
  });
});
