import { describe, expect, it } from "vitest";

import {
  humanSeatBlocksAsyncJoin,
  isAsyncMatchJoinable,
  resolveAsyncMatchEffectiveHumans,
} from "../casualAsyncMatchJoinCore";
import {
  isPortalAsyncMultiTemplate,
  isPortalSyncMultiTemplate,
  getPortalTournamentDefinition,
} from "../../../../data/portalTournamentConfigs";

describe("resolveAsyncMatchEffectiveHumans", () => {
  it("clamps to at least 2", () => {
    expect(resolveAsyncMatchEffectiveHumans(1)).toBe(2);
    expect(resolveAsyncMatchEffectiveHumans(0)).toBe(2);
    expect(resolveAsyncMatchEffectiveHumans(3)).toBe(3);
  });
});

describe("isAsyncMatchJoinable", () => {
  const baseMatch = {
    templateId: "portal_multi_solitaire",
    completed: false,
    openPhase: "ready" as const,
    joinOpen: true,
    humanPlayerCount: 1,
    maxPlayers: 5,
    botsSeeded: false as boolean | undefined,
  };

  it("allows join when under maxPlayers and no human finished", () => {
    expect(
      isAsyncMatchJoinable({
        match: baseMatch,
        humanSeats: [{ uid: "u1", status: "open" }],
        templateId: "portal_multi_solitaire",
      })
    ).toBe(true);
  });

  it("blocks when any human has submitted/finished", () => {
    expect(
      isAsyncMatchJoinable({
        match: baseMatch,
        humanSeats: [
          { uid: "u1", status: "finished" },
          { uid: "u2", status: "open" },
        ],
        templateId: "portal_multi_solitaire",
      })
    ).toBe(false);
  });

  it("blocks when humanPlayerCount reaches maxPlayers", () => {
    expect(
      isAsyncMatchJoinable({
        match: { ...baseMatch, humanPlayerCount: 5 },
        humanSeats: [
          { uid: "u1", status: "open" },
          { uid: "u2", status: "open" },
          { uid: "u3", status: "open" },
          { uid: "u4", status: "open" },
          { uid: "u5", status: "open" },
        ],
        templateId: "portal_multi_solitaire",
      })
    ).toBe(false);
  });

  it("blocks when joinOpen is false", () => {
    expect(
      isAsyncMatchJoinable({
        match: { ...baseMatch, joinOpen: false },
        humanSeats: [{ uid: "u1", status: "open" }],
        templateId: "portal_multi_solitaire",
      })
    ).toBe(false);
  });
});

describe("humanSeatBlocksAsyncJoin", () => {
  it("treats finished/confirmed/settled as closed", () => {
    expect(humanSeatBlocksAsyncJoin("finished")).toBe(true);
    expect(humanSeatBlocksAsyncJoin("confirmed")).toBe(true);
    expect(humanSeatBlocksAsyncJoin("settled")).toBe(true);
    expect(humanSeatBlocksAsyncJoin("open")).toBe(false);
  });
});

describe("portal multi timingMode defaults", () => {
  it("marks free/coin multi as async", () => {
    const free = getPortalTournamentDefinition("portal_multi_solitaire");
    const coin = getPortalTournamentDefinition("portal_multi_coin_solitaire");
    expect(free && isPortalAsyncMultiTemplate(free)).toBe(true);
    expect(coin && isPortalAsyncMultiTemplate(coin)).toBe(true);
    expect(free && isPortalSyncMultiTemplate(free)).toBe(false);
  });

  it("solo is not async multi", () => {
    const solo = getPortalTournamentDefinition("portal_solo_p75_solitaire");
    expect(solo && isPortalAsyncMultiTemplate(solo)).toBe(false);
  });
});
