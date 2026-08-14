import { describe, expect, it } from "vitest";

import {
  buildCampaignPlayContext,
  buildLobbyPlayContext,
  buildSharedPlayContext,
  buildTownPlayContext,
  campaignIdFromRun,
  isCampaignRun,
  playScopeKeyFor,
  townPlayScopeKey,
} from "../portalPlayContext";

describe("portalPlayContext", () => {
  it("playScopeKeyFor encodes kind and id", () => {
    expect(playScopeKeyFor("town", "mayfield")).toBe("town:mayfield");
    expect(playScopeKeyFor("lobby", "abc123")).toBe("lobby:abc123");
    expect(playScopeKeyFor("campaign", "camp_1")).toBe("campaign:camp_1");
    expect(playScopeKeyFor("shared", "shared")).toBe("shared");
  });

  it("buildTownPlayContext uses town scope", () => {
    const ctx = buildTownPlayContext({
      townId: "town_doc_1",
      gate: { buildingId: "saloon", tierId: "multi_free", hallKind: "showdown" },
    });
    expect(ctx.contextKind).toBe("town");
    expect(ctx.playScopeKey).toBe(townPlayScopeKey("town_doc_1"));
    expect(ctx.contextSnapshot?.gate?.buildingId).toBe("saloon");
  });

  it("buildCampaignPlayContext stores snapshot fields", () => {
    const ctx = buildCampaignPlayContext({
      campaignId: "c1",
      partnerId: 42,
      rewardMode: "pass_per_run",
      maxPlaysPerDay: 3,
    });
    expect(isCampaignRun(ctx)).toBe(true);
    expect(campaignIdFromRun(ctx)).toBe("c1");
    expect(ctx.contextSnapshot?.maxPlaysPerDay).toBe(3);
  });

  it("buildLobbyPlayContext stores lobby id in scope key", () => {
    const ctx = buildLobbyPlayContext({
      lobbyId: "lobby_doc_id",
      partnerId: 1,
    });
    expect(ctx.playScopeKey).toBe("lobby:lobby_doc_id");
  });

  it("buildSharedPlayContext defaults to shared scope", () => {
    expect(buildSharedPlayContext().playScopeKey).toBe("shared");
  });
});
