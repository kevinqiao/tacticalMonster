import { describe, expect, it } from "vitest";
import {
  CASUAL_SOLO_P75_CHALLENGE_SOLITAIRE_ID,
  getTournamentDefinition,
} from "../../../data/casualTournamentConfigs";
import { isP75ChallengeSuccess, resolveLeagueXpDelta } from "../casualWeeklyLeagueXp";

describe("resolveLeagueXpDelta", () => {
  it("solo p75 grants league xp only on success", () => {
    const def = getTournamentDefinition(CASUAL_SOLO_P75_CHALLENGE_SOLITAIRE_ID);
    expect(def).toBeTruthy();
    const fail = resolveLeagueXpDelta({
      def: def!,
      seasonXpOnSettle: 8,
      p75ChallengeSuccess: false,
    });
    expect(fail.delta).toBe(0);

    const ok = resolveLeagueXpDelta({
      def: def!,
      seasonXpOnSettle: 8,
      p75ChallengeSuccess: true,
    });
    expect(ok.delta).toBe(4);
    expect(ok.lines.some((l) => l.label === "达标")).toBe(true);
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

  it("respects daily soft cap for p75 success", () => {
    const def = getTournamentDefinition(CASUAL_SOLO_P75_CHALLENGE_SOLITAIRE_ID);
    expect(def).toBeTruthy();
    const { delta } = resolveLeagueXpDelta({
      def: def!,
      seasonXpOnSettle: 8,
      p75ChallengeSuccess: true,
      dailyLeagueXpGranted: 38,
    });
    expect(delta).toBe(2);
  });
});

describe("isP75ChallengeSuccess", () => {
  it("requires threshold and score", () => {
    const def = getTournamentDefinition(CASUAL_SOLO_P75_CHALLENGE_SOLITAIRE_ID);
    expect(def).toBeTruthy();
    expect(isP75ChallengeSuccess(def!, 1000, 900)).toBe(true);
    expect(isP75ChallengeSuccess(def!, 800, 900)).toBe(false);
    expect(isP75ChallengeSuccess(def!, 1000, undefined)).toBe(false);
  });
});
