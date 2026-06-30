import { describe, expect, it } from "vitest";

import {
  CAMPAIGN_BOARD_BOT_DAILY_PLAYS_MAX,
  CAMPAIGN_BOARD_BOT_DAILY_PLAYS_MIN,
  CAMPAIGN_BOARD_BOT_PLAY_DAY_MS,
  CAMPAIGN_BOARD_BOT_SESSION_MS,
} from "../../../data/campaignBoardBotConfig";
import {
  CAMPAIGN_MULTI_RANK_POINTS,
  campaignMultiRankPointsForPlace,
} from "../../../data/campaignMultiRankPoints";
import {
  campaignBoardBotDailyPlays,
  campaignBoardBotMultiStartRankPoints,
  campaignBoardBotPersonaFactor,
  campaignBoardBotSessionWindow,
  campaignBoardBotTargetMultiplier,
  computeCampaignBoardBotEffectiveTarget,
  computeCampaignBoardBotPeriodEndValue,
  countCampaignBoardBotMatchesPlayed,
  pickCampaignBoardBotMatchRank,
  resolveCampaignBoardBotValue,
  simulateCampaignBoardBotMultiRankPoints,
} from "../campaignBoardBotPoints";
import { planCampaignBoardBotRevealSchedule } from "../campaignBoardBotReveal";

const PORTAL_DELTAS = Object.values(CAMPAIGN_MULTI_RANK_POINTS);
const HOUR_MS = 3600 * 1000;

function multiCohort(revealAt: number, days: number) {
  return {
    startsAt: revealAt - HOUR_MS,
    endsAt: revealAt + days * CAMPAIGN_BOARD_BOT_PLAY_DAY_MS,
    status: "open" as const,
  };
}

describe("campaignBoardBotReveal", () => {
  it("plans reveal times for all pool slots", () => {
    const startsAt = 1_000_000;
    const humanAnchorAt = startsAt + 3_600_000;
    const plans = planCampaignBoardBotRevealSchedule({
      cohortKey: "camp_test|cohort1",
      startsAt,
      humanAnchorAt,
    });
    expect(plans.length).toBeGreaterThan(0);
    for (const p of plans) {
      expect(p.revealAt).toBeGreaterThanOrEqual(startsAt);
    }
  });

  it("anchors early reveals at campaign open when humanAnchorAt equals startsAt", () => {
    const startsAt = 1_000_000;
    const plans = planCampaignBoardBotRevealSchedule({
      cohortKey: "camp_open|cohort1",
      startsAt,
      humanAnchorAt: startsAt,
    });
    expect(plans.length).toBeGreaterThan(0);
    for (const p of plans) {
      expect(p.revealAt).toBeGreaterThanOrEqual(startsAt);
    }
    expect(plans.some((p) => p.revealAt === startsAt)).toBe(true);
  });
});

describe("campaignBoardBotPoints", () => {
  const revealAt = 1_000_000;
  const cohortKey = "camp|cohort";
  const cohort = multiCohort(revealAt, 7);

  it("returns null before reveal", () => {
    const pts = resolveCampaignBoardBotValue(
      { slot: 0, revealAt, periodEndValue: 50 },
      cohort,
      revealAt - 1000
    );
    expect(pts).toBeNull();
  });

  it("multi bots have 1-15 start rankPoints baseline", () => {
    const starts = Array.from({ length: 15 }, (_, slot) =>
      campaignBoardBotMultiStartRankPoints(cohortKey, slot)
    );
    for (const start of starts) {
      expect(start).toBeGreaterThanOrEqual(1);
      expect(start).toBeLessThanOrEqual(15);
    }
    expect(new Set(starts).size).toBeGreaterThan(3);

    const atReveal = resolveCampaignBoardBotValue(
      {
        slot: 0,
        revealAt,
        periodEndValue: 50,
      },
      cohort,
      revealAt,
      { mode: "multi", cohortKey, humanTop: 0 }
    );
    expect(atReveal).toBeGreaterThanOrEqual(starts[0]!);
  });

  it("differentiates bots at reveal with human anchor", () => {
    const humanTop = 12;
    const values = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((slot) =>
      resolveCampaignBoardBotValue(
        {
          slot,
          revealAt,
          periodEndValue: computeCampaignBoardBotPeriodEndValue({
            mode: "multi",
            cohortKey,
            slot,
          }),
        },
        cohort,
        revealAt + 2 * HOUR_MS,
        { mode: "multi", cohortKey, humanTop }
      )
    );
    const defined = values.filter((v): v is number => v != null);
    expect(defined.length).toBe(10);
    expect(new Set(defined).size).toBeGreaterThan(3);
    expect(Math.max(...defined) - Math.min(...defined)).toBeGreaterThanOrEqual(2);
  });

  it("some elite bots exceed human top at sufficient progress", () => {
    const humanTop = 10;
    const lateValues = Array.from({ length: 15 }, (_, slot) =>
      resolveCampaignBoardBotValue(
        {
          slot,
          revealAt,
          periodEndValue: computeCampaignBoardBotPeriodEndValue({
            mode: "multi",
            cohortKey,
            slot,
          }),
        },
        cohort,
        revealAt + 5 * CAMPAIGN_BOARD_BOT_PLAY_DAY_MS,
        { mode: "multi", cohortKey, humanTop }
      )
    ).filter((v): v is number => v != null);

    expect(lateValues.some((v) => v > humanTop)).toBe(true);
    expect(lateValues.some((v) => v < humanTop)).toBe(true);
  });

  it("increases points over time toward effective target", () => {
    const member = { slot: 0, revealAt, periodEndValue: 64 };
    const early = resolveCampaignBoardBotValue(member, cohort, revealAt + 2 * HOUR_MS, {
      mode: "multi",
      cohortKey,
      humanTop: 8,
    })!;
    const late = resolveCampaignBoardBotValue(member, cohort, revealAt + 4 * CAMPAIGN_BOARD_BOT_PLAY_DAY_MS, {
      mode: "multi",
      cohortKey,
      humanTop: 8,
    })!;
    expect(early).toBeGreaterThan(0);
    expect(late).toBeGreaterThanOrEqual(early);
  });

  it("daily plays stay near 10 games per sim day", () => {
    const plays = campaignBoardBotDailyPlays(cohortKey, 3, 0);
    expect(plays).toBeGreaterThanOrEqual(CAMPAIGN_BOARD_BOT_DAILY_PLAYS_MIN);
    expect(plays).toBeLessThanOrEqual(CAMPAIGN_BOARD_BOT_DAILY_PLAYS_MAX);
  });

  it("matches cluster within 5 hour session, not spread across 24h idle", () => {
    const simDayStart = revealAt;
    const window = campaignBoardBotSessionWindow(cohortKey, 2, simDayStart, revealAt);
    expect(window.endMs - window.startMs).toBe(CAMPAIGN_BOARD_BOT_SESSION_MS);

    const afterSession = countCampaignBoardBotMatchesPlayed({
      cohortKey,
      slot: 2,
      revealAt,
      now: window.endMs + 12 * HOUR_MS,
      endsAt: cohort.endsAt,
      maxMatches: 100,
    });
    const nextDayEarly = countCampaignBoardBotMatchesPlayed({
      cohortKey,
      slot: 2,
      revealAt,
      now: simDayStart + CAMPAIGN_BOARD_BOT_PLAY_DAY_MS + 2 * HOUR_MS,
      endsAt: cohort.endsAt,
      maxMatches: 100,
    });
    expect(afterSession).toBeGreaterThanOrEqual(CAMPAIGN_BOARD_BOT_DAILY_PLAYS_MIN);
    expect(nextDayEarly - afterSession).toBeGreaterThanOrEqual(CAMPAIGN_BOARD_BOT_DAILY_PLAYS_MIN);
  });

  it("target multiplier tiers spread by persona", () => {
    const mults = [0, 3, 7, 11, 14].map((slot) =>
      campaignBoardBotTargetMultiplier(cohortKey, slot)
    );
    expect(Math.min(...mults)).toBeLessThan(0.85);
    expect(Math.max(...mults)).toBeGreaterThan(1.05);
  });

  it("effective target follows human leader", () => {
    const low = computeCampaignBoardBotEffectiveTarget({
      mode: "multi",
      cohortKey,
      slot: 0,
      humanTop: 5,
      storedPeriodEndValue: 40,
    });
    const high = computeCampaignBoardBotEffectiveTarget({
      mode: "multi",
      cohortKey,
      slot: 0,
      humanTop: 30,
      storedPeriodEndValue: 40,
    });
    expect(high).toBeGreaterThan(low);
  });

  it("persona factor varies by slot", () => {
    const a = campaignBoardBotPersonaFactor("k", 0);
    const b = campaignBoardBotPersonaFactor("k", 1);
    expect(a).toBeGreaterThanOrEqual(0.25);
    expect(a).toBeLessThanOrEqual(1);
    expect(a).not.toBe(b);
  });

  it("periodEndValue stays in multi band", () => {
    const pts = computeCampaignBoardBotPeriodEndValue({
      mode: "multi",
      cohortKey: "k",
      slot: 3,
    });
    expect(pts).toBeGreaterThanOrEqual(8);
    expect(pts).toBeLessThanOrEqual(120);
  });

  it("match ranks use portal point table only", () => {
    const ranks = Array.from({ length: 50 }, (_, matchIndex) =>
      pickCampaignBoardBotMatchRank("camp|cohort", 2, matchIndex)
    );
    for (const rank of ranks) {
      expect(rank).toBeGreaterThanOrEqual(1);
      expect(rank).toBeLessThanOrEqual(5);
      expect(PORTAL_DELTAS).toContain(campaignMultiRankPointsForPlace(rank));
    }
  });

  it("simulated rankPoints are sums of portal deltas", () => {
    const sim = simulateCampaignBoardBotMultiRankPoints({
      cohortKey,
      slot: 4,
      revealAt,
      now: revealAt + 2 * CAMPAIGN_BOARD_BOT_PLAY_DAY_MS,
      cohort,
      effectivePeriodEnd: 60,
    });
    let manual = campaignBoardBotMultiStartRankPoints(cohortKey, 4);
    for (let m = 0; m < sim.plays; m += 1) {
      const rank = pickCampaignBoardBotMatchRank(cohortKey, 4, m);
      manual += campaignMultiRankPointsForPlace(rank);
    }
    expect(sim.rankPoints).toBe(Math.max(1, Math.min(60, manual)));
    expect(sim.plays).toBeGreaterThan(0);
  });

  it("time step delta is sum of portal match deltas", () => {
    const member = {
      slot: 4,
      revealAt,
      periodEndValue: 50,
    };
    const opts = { mode: "multi" as const, cohortKey, humanTop: 14 };
    const t1 = resolveCampaignBoardBotValue(
      member,
      cohort,
      revealAt + CAMPAIGN_BOARD_BOT_PLAY_DAY_MS + 3 * HOUR_MS,
      opts
    )!;
    const t2 = resolveCampaignBoardBotValue(
      member,
      cohort,
      revealAt + 2 * CAMPAIGN_BOARD_BOT_PLAY_DAY_MS + 3 * HOUR_MS,
      opts
    )!;
    const diff = t2 - t1;
    expect(PORTAL_DELTAS.some((d) => d === diff) || Math.abs(diff) <= 15).toBe(true);
  });
});
