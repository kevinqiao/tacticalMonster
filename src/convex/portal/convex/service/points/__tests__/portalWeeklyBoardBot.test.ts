import { describe, expect, it } from "vitest";

import {
  computePortalWeeklyBoardBotWeekEndPoints,
  portalWeeklyBoardBotPersonaFactor,
  resolvePortalWeeklyBoardBotPoints,
} from "../portalWeeklyBoardBotPoints";
import {
  isPortalWeeklyBoardBotRevealed,
  planPortalWeeklyBoardBotRevealSchedule,
} from "../portalWeeklyBoardBotReveal";
import { pickBotPersonaId } from "../../botPersona/portalBotPersonaService";

describe("portalWeeklyBoardBotReveal", () => {
  it("plans reveal times for all pool slots", () => {
    const startsAt = 1_000_000;
    const humanAnchorAt = startsAt + 3600_000;
    const plans = planPortalWeeklyBoardBotRevealSchedule({
      cohortKey: "block_blast|solo|w:2026-06-16",
      startsAt,
      humanAnchorAt,
    });
    expect(plans).toHaveLength(15);
    for (const p of plans) {
      expect(p.revealAt).toBeGreaterThanOrEqual(startsAt);
    }
  });

  it("hides bot before revealAt", () => {
    expect(isPortalWeeklyBoardBotRevealed(5000, 4999)).toBe(false);
    expect(isPortalWeeklyBoardBotRevealed(5000, 5000)).toBe(true);
  });
});

describe("portalWeeklyBoardBotPoints", () => {
  const cohort = {
    _id: "cohort1",
    mode: "solo" as const,
    startsAt: 0,
    endsAt: 10_000,
    status: "open" as const,
  };

  it("returns null before reveal", () => {
    const pts = resolvePortalWeeklyBoardBotPoints(
      { slot: 0, revealAt: 5000, weekEndPoints: 50 },
      cohort,
      1000
    );
    expect(pts).toBeNull();
  });

  it("increases points after reveal toward weekEndPoints", () => {
    const member = { slot: 0, revealAt: 1000, weekEndPoints: 64 };
    const early = resolvePortalWeeklyBoardBotPoints(member, cohort, 2000)!;
    const late = resolvePortalWeeklyBoardBotPoints(member, cohort, 9000)!;
    expect(early).toBeGreaterThan(0);
    expect(late).toBeGreaterThanOrEqual(early);
    expect(late).toBeLessThanOrEqual(64);
  });

  it("persona factor varies by slot", () => {
    const a = portalWeeklyBoardBotPersonaFactor("k", 0);
    const b = portalWeeklyBoardBotPersonaFactor("k", 1);
    expect(a).toBeGreaterThanOrEqual(0.25);
    expect(a).toBeLessThanOrEqual(1);
    expect(a).not.toBe(b);
  });

  it("weekEndPoints stays in band", () => {
    const pts = computePortalWeeklyBoardBotWeekEndPoints({
      mode: "multi",
      cohortKey: "k",
      slot: 3,
    });
    expect(pts).toBeGreaterThanOrEqual(18);
    expect(pts).toBeLessThanOrEqual(95);
  });
});

describe("portalBotPersona pick", () => {
  it("is deterministic per anchor and slot", () => {
    expect(pickBotPersonaId("match-1", 2)).toBe(pickBotPersonaId("match-1", 2));
    expect(pickBotPersonaId("match-1", 2)).not.toBe(pickBotPersonaId("match-1", 3));
  });

  it("match and board anchors can pick same persona id independently", () => {
    const matchPersona = pickBotPersonaId("match-abc", 1);
    const boardPersona = pickBotPersonaId("block_blast|solo|w:2026-06-16", 1);
    expect(typeof matchPersona).toBe("string");
    expect(typeof boardPersona).toBe("string");
  });
});
