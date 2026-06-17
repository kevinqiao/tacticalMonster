import { describe, expect, it } from "vitest";
import {
  CASUAL_DAILY_SOLO_CHALLENGE_SOLITAIRE_ID,
  getTournamentDefinition,
} from "../../../data/casualTournamentConfigs";
import { resolveLeagueXpDelta } from "../casualWeeklyLeagueXp";

describe("resolveLeagueXpDelta", () => {
  it("solo daily grants low base xp", () => {
    const def = getTournamentDefinition(CASUAL_DAILY_SOLO_CHALLENGE_SOLITAIRE_ID);
    expect(def).toBeTruthy();
    const { delta } = resolveLeagueXpDelta({
      def: def!,
      seasonXpOnSettle: 12,
    });
    expect(delta).toBe(4);
  });

  it("async rank 1 grants base + bonus", () => {
    const def = getTournamentDefinition("casual_async_a_solitaire");
    expect(def).toBeTruthy();
    const { delta, lines } = resolveLeagueXpDelta({
      def: def!,
      seasonXpOnSettle: 12,
      multiplayerFinalRank: 1,
    });
    expect(delta).toBeGreaterThan(12);
    expect(lines.some((l) => l.label === "名次")).toBe(true);
  });

  it("respects daily soft cap for solo", () => {
    const def = getTournamentDefinition(CASUAL_DAILY_SOLO_CHALLENGE_SOLITAIRE_ID);
    expect(def).toBeTruthy();
    const { delta } = resolveLeagueXpDelta({
      def: def!,
      seasonXpOnSettle: 12,
      dailyLeagueXpGranted: 38,
    });
    expect(delta).toBe(2);
  });
});
