import { describe, expect, it } from "vitest";
import { CASUAL_MISSION_TEMPLATES } from "../../../data/casualMissionTemplates";
import { deltaForMissionObjective } from "../casualMissionObjectiveDelta";

describe("deltaForMissionObjective", () => {
  const spotlightTask = CASUAL_MISSION_TEMPLATES.find((t) => t.taskId === "season_spotlight_6");
  const asyncTask = CASUAL_MISSION_TEMPLATES.find((t) => t.taskId === "daily_platform_async_1");

  it("counts season_challenge for season_spotlight_6", () => {
    expect(spotlightTask).toBeTruthy();
    expect(
      deltaForMissionObjective(spotlightTask!, {
        matchType: "season_challenge",
        platformGameType: "block_blast",
        primaryGameType: "block_blast",
        spotlightGameType: "block_blast",
      })
    ).toBe(1);
    expect(
      deltaForMissionObjective(spotlightTask!, {
        matchType: "tournament_a",
        platformGameType: "block_blast",
        primaryGameType: "block_blast",
        spotlightGameType: "block_blast",
      })
    ).toBe(0);
  });

  it("counts async modes for daily_platform_async_1", () => {
    expect(asyncTask).toBeTruthy();
    expect(
      deltaForMissionObjective(asyncTask!, {
        matchType: "tournament_b",
        platformGameType: "solitaire",
        primaryGameType: "block_blast",
        spotlightGameType: "block_blast",
      })
    ).toBe(1);
    expect(
      deltaForMissionObjective(asyncTask!, {
        matchType: "season_challenge",
        platformGameType: "block_blast",
        primaryGameType: "block_blast",
        spotlightGameType: "block_blast",
      })
    ).toBe(0);
  });
});
