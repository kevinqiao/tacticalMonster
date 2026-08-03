import { describe, expect, it } from "vitest";

import {
  PORTAL_DAILY_PLAY_LIMITS,
  type PortalDailyPlayLimits,
} from "../../../data/portalDailyPlayLimits";
import { portalWeeklyLeagueBotTierPressure } from "../../../data/portalWeeklyLeagueConfig";
import {
  computePortalWeeklyLeagueBotStartPoints,
  computePortalWeeklyLeagueBotWeekEndPoints,
  planPortalWeeklyLeagueBotMatchRollout,
  portalWeeklyLeagueBotPersonaFactor,
  PORTAL_WEEKLY_LEAGUE_BOT_PLAY_DAY_MS,
  resolvePortalWeeklyLeagueBotPoints,
} from "../portalWeeklyLeagueBotPoints";

describe("portalWeeklyLeagueBotPoints stepwise rollout", () => {
  const cohortKey = "w|solitaire|bronze|cohort1";
  const slot = 3;
  const revealAt = 1_000_000;
  const endsAt = revealAt + 3 * PORTAL_WEEKLY_LEAGUE_BOT_PLAY_DAY_MS;

  it("same seed yields stable trajectory", () => {
    const a = planPortalWeeklyLeagueBotMatchRollout({
      cohortKey,
      slot,
      revealAt,
      endsAt,
    });
    const b = planPortalWeeklyLeagueBotMatchRollout({
      cohortKey,
      slot,
      revealAt,
      endsAt,
    });
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThan(0);
  });

  it("respects daily solo/multi caps", () => {
    const limits: PortalDailyPlayLimits = { solo: 3, multi: 10 };
    const steps = planPortalWeeklyLeagueBotMatchRollout({
      cohortKey,
      slot,
      revealAt,
      endsAt,
      limits,
    });

    const byDay = new Map<number, { solo: number; multi: number }>();
    for (const s of steps) {
      const day = Math.floor((s.atMs - revealAt) / PORTAL_WEEKLY_LEAGUE_BOT_PLAY_DAY_MS);
      const row = byDay.get(day) ?? { solo: 0, multi: 0 };
      if (s.mode === "solo") row.solo += 1;
      else row.multi += 1;
      byDay.set(day, row);
    }
    for (const row of byDay.values()) {
      expect(row.solo).toBeLessThanOrEqual(limits.solo);
      expect(row.multi).toBeLessThanOrEqual(limits.multi);
    }
    expect([...byDay.values()].some((r) => r.solo > 0)).toBe(true);
    expect([...byDay.values()].some((r) => r.multi > 0)).toBe(true);
  });

  it("changing limits changes trajectory caps", () => {
    const tight = planPortalWeeklyLeagueBotMatchRollout({
      cohortKey,
      slot,
      revealAt,
      endsAt,
      limits: { solo: 1, multi: 2 },
    });
    const loose = planPortalWeeklyLeagueBotMatchRollout({
      cohortKey,
      slot,
      revealAt,
      endsAt,
      limits: { solo: 3, multi: 10 },
    });
    expect(tight.length).toBeLessThan(loose.length);

    const day0Tight = tight.filter(
      (s) => Math.floor((s.atMs - revealAt) / PORTAL_WEEKLY_LEAGUE_BOT_PLAY_DAY_MS) === 0
    );
    expect(day0Tight.filter((s) => s.mode === "solo").length).toBeLessThanOrEqual(1);
    expect(day0Tight.filter((s) => s.mode === "multi").length).toBeLessThanOrEqual(2);
  });

  it("includes both solo and multi deltas", () => {
    const steps = planPortalWeeklyLeagueBotMatchRollout({
      cohortKey,
      slot,
      revealAt,
      endsAt,
      limits: PORTAL_DAILY_PLAY_LIMITS,
    });
    const modes = new Set(steps.map((s) => s.mode));
    expect(modes.has("solo")).toBe(true);
    expect(modes.has("multi")).toBe(true);
    const deltas = new Set(steps.map((s) => s.delta));
    // solo ±3/±1 and multi ranks should appear across a multi-day window
    expect([...deltas].some((d) => d === 3 || d === -1)).toBe(true);
    expect([...deltas].some((d) => d === 5 || d === 1 || d === -2 || d === 3)).toBe(true);
  });

  it("resolve: hidden before reveal, start at reveal, steps after matches", () => {
    const start = computePortalWeeklyLeagueBotStartPoints({ cohortKey, slot });
    const steps = planPortalWeeklyLeagueBotMatchRollout({
      cohortKey,
      slot,
      revealAt,
      endsAt,
    });
    const cohort = {
      _id: "cohort1",
      weekKey: "w",
      gameType: "solitaire",
      leagueTierId: "bronze",
      startsAt: revealAt - 1000,
      endsAt,
      status: "open" as const,
    };
    const member = {
      uid: `pwl_bot_cohort1_${slot}`,
      revealAt,
      botStartPoints: start,
      weeklyPoints: start,
    };

    expect(resolvePortalWeeklyLeagueBotPoints(member, cohort, revealAt - 1)).toBe(0);
    expect(resolvePortalWeeklyLeagueBotPoints(member, cohort, revealAt)).toBe(start);

    const first = steps[0]!;
    const beforeFirst = resolvePortalWeeklyLeagueBotPoints(
      member,
      cohort,
      first.atMs - 1
    );
    const afterFirst = resolvePortalWeeklyLeagueBotPoints(member, cohort, first.atMs);
    expect(beforeFirst).toBe(start);
    expect(afterFirst).toBe(Math.max(0, start + first.delta));
    expect(afterFirst).not.toBe(beforeFirst);
  });

  it("week-end points equals start + full rollout sum", () => {
    const start = computePortalWeeklyLeagueBotStartPoints({ cohortKey, slot });
    const weekEnd = computePortalWeeklyLeagueBotWeekEndPoints({
      cohortKey,
      slot,
      revealAt,
      endsAt,
      startPoints: start,
    });
    const steps = planPortalWeeklyLeagueBotMatchRollout({
      cohortKey,
      slot,
      revealAt,
      endsAt,
    });
    const expected = Math.max(
      0,
      start + steps.reduce((s, st) => s + st.delta, 0)
    );
    expect(weekEnd).toBe(expected);

    const atEnd = resolvePortalWeeklyLeagueBotPoints(
      {
        uid: `pwl_bot_cohort1_${slot}`,
        revealAt,
        botStartPoints: start,
        botWeekEndPoints: weekEnd,
        weeklyPoints: start,
      },
      {
        _id: "cohort1",
        weekKey: "w",
        gameType: "solitaire",
        leagueTierId: "bronze",
        startsAt: revealAt,
        endsAt,
        status: "open",
      },
      endsAt
    );
    expect(atEnd).toBe(weekEnd);
  });
});

describe("portalWeeklyLeagueBotPoints tier curve pressure", () => {
  const slot = 3;
  const revealAt = 1_000_000;
  const endsAt = revealAt + 5 * PORTAL_WEEKLY_LEAGUE_BOT_PLAY_DAY_MS;
  const tiers = ["bronze", "silver", "gold", "platinum", "diamond"] as const;

  function weekEndFor(tier: string): number {
    const cohortKey = `w|solitaire|${tier}|cohort1`;
    return computePortalWeeklyLeagueBotWeekEndPoints({
      cohortKey,
      slot,
      revealAt,
      endsAt,
    });
  }

  it("week-end points rise with tier", () => {
    const scores = tiers.map(weekEndFor);
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]!).toBeGreaterThanOrEqual(scores[i - 1]!);
    }
    expect(scores[4]!).toBeGreaterThan(scores[0]!);
  });

  it("ease-in: pressure curve accelerates; multi-slot week-end gaps follow", () => {
    const pSilver = portalWeeklyLeagueBotTierPressure("silver");
    const pGold = portalWeeklyLeagueBotTierPressure("gold");
    const pPlat = portalWeeklyLeagueBotTierPressure("platinum");
    const pDia = portalWeeklyLeagueBotTierPressure("diamond");
    expect(pGold - pSilver).toBeLessThan(pDia - pPlat);

    let earlyGap = 0;
    let lateGap = 0;
    for (let s = 0; s < 12; s++) {
      const scores = tiers.map((tier) =>
        computePortalWeeklyLeagueBotWeekEndPoints({
          cohortKey: `w|solitaire|${tier}|cohort1`,
          slot: s,
          revealAt,
          endsAt,
        })
      );
      earlyGap += scores[2]! - scores[0]!; // gold - bronze
      lateGap += scores[4]! - scores[3]!; // diamond - platinum
    }
    expect(lateGap).toBeGreaterThanOrEqual(earlyGap * 0.5);
  });

  it("diamond persona floor is above bronze", () => {
    const bronzeP = portalWeeklyLeagueBotPersonaFactor("w|solitaire|bronze|c", slot);
    const diamondP = portalWeeklyLeagueBotPersonaFactor("w|solitaire|diamond|c", slot);
    expect(diamondP).toBeGreaterThan(bronzeP);
  });

  it("replay recovery can turn solo fails into success on high tiers", () => {
    // Force many solo rolls; diamond should have more +3 than bronze for same slot window
    const bronzeSteps = planPortalWeeklyLeagueBotMatchRollout({
      cohortKey: "w|solitaire|bronze|cohort1",
      slot,
      revealAt,
      endsAt,
    }).filter((s) => s.mode === "solo");
    const diamondSteps = planPortalWeeklyLeagueBotMatchRollout({
      cohortKey: "w|solitaire|diamond|cohort1",
      slot,
      revealAt,
      endsAt,
    }).filter((s) => s.mode === "solo");
    const bronzeWins = bronzeSteps.filter((s) => s.delta === 3).length;
    const diamondWins = diamondSteps.filter((s) => s.delta === 3).length;
    expect(diamondWins).toBeGreaterThanOrEqual(bronzeWins);
  });
});
