import { describe, expect, it } from "vitest";

import {
  PORTAL_BADGE_TEMPLATES,
  PORTAL_LEGACY_BADGE_IDS,
  buildSeasonMarkTemplates,
  portalLeagueTierOrder,
  seasonMarkBadgeId,
} from "../portalBadgeTemplates";
import {
  PORTAL_SEASON_DAILY_PLAY_XP_CAP,
  PORTAL_SEASON_DAILY_WIN_XP_CAP,
  PORTAL_SEASON_EPOCH_WEEK_KEY,
  PORTAL_SEASON_XP_PLAY,
  PORTAL_SEASON_XP_WIN,
  calendarDateFromPortalWeekKey,
  portalNextSeasonStartWeekKey,
  portalSeasonIdFromWeekKey,
  portalSeasonLevelFromXp,
  portalSeasonStartWeekKey,
  portalSeasonWeekOf,
  portalWeekKeyAtOrAfter,
  portalWeekKeyFromCalendarDate,
  portalSeasonXpProgress,
} from "../portalSeasonHonorConfig";
import {
  portalBadgeTemplateMet,
  portalBadgesUnlockedByEvent,
  portalMatchWinDeltas,
} from "../../service/badge/portalBadgeUnlockLogic";

describe("portalBadgeTemplates", () => {
  it("orders league tiers", () => {
    expect(portalLeagueTierOrder("bronze")).toBe(0);
    expect(portalLeagueTierOrder("diamond")).toBe(4);
  });

  it("has 13 legacy badges before collector", () => {
    expect(PORTAL_LEGACY_BADGE_IDS).toHaveLength(13);
    expect(PORTAL_BADGE_TEMPLATES.some((t) => t.badgeId === "legacy_collector")).toBe(
      true
    );
  });

  it("builds season mark ids", () => {
    expect(seasonMarkBadgeId("S3", 20)).toBe("season_S3_lv20");
    const tmpls = buildSeasonMarkTemplates("S3", 3);
    expect(tmpls).toHaveLength(3);
    expect(tmpls[2]!.title).toContain("Max");
  });
});

describe("portalSeasonHonorConfig", () => {
  const epoch = PORTAL_SEASON_EPOCH_WEEK_KEY;

  it("maps week keys into seasons of 5 weeks from launch epoch", () => {
    expect(portalSeasonIdFromWeekKey("w:2026-07-27", epoch)).toBe("S1");
    expect(portalSeasonIdFromWeekKey("w:2026-08-24", epoch)).toBe("S1");
    expect(portalSeasonIdFromWeekKey("w:2026-08-31", epoch)).toBe("S2");
  });

  it("reports week-of-season as W1…W5", () => {
    expect(portalSeasonWeekOf("w:2026-07-27", epoch)).toEqual({
      weekOf: 1,
      weeks: 5,
    });
    expect(portalSeasonWeekOf("w:2026-08-03", epoch)).toEqual({
      weekOf: 2,
      weeks: 5,
    });
    expect(portalSeasonWeekOf("w:2026-08-24", epoch)).toEqual({
      weekOf: 5,
      weeks: 5,
    });
    expect(portalSeasonWeekOf("w:2026-08-31", epoch)).toEqual({
      weekOf: 1,
      weeks: 5,
    });
  });

  it("supports partner-specific epoch calendars", () => {
    const partnerEpoch = "w:2026-10-05";
    expect(portalSeasonIdFromWeekKey("w:2026-10-05", partnerEpoch)).toBe("S1");
    expect(portalSeasonIdFromWeekKey("w:2026-11-02", partnerEpoch)).toBe("S1");
    expect(portalSeasonIdFromWeekKey("w:2026-11-09", partnerEpoch)).toBe("S2");
  });

  it("computes next-season start for late lobby gate", () => {
    expect(portalNextSeasonStartWeekKey("w:2026-07-27", epoch)).toBe(
      "w:2026-08-31"
    );
    expect(portalSeasonStartWeekKey(2, epoch)).toBe("w:2026-08-31");
    expect(portalWeekKeyAtOrAfter("w:2026-08-24", "w:2026-08-31")).toBe(false);
    expect(portalWeekKeyAtOrAfter("w:2026-08-31", "w:2026-08-31")).toBe(true);
  });

  it("snaps calendar dates to ops Monday weekKey", () => {
    expect(portalWeekKeyFromCalendarDate("2026-07-30")).toBe("w:2026-07-27");
    expect(portalWeekKeyFromCalendarDate("2026-07-27")).toBe("w:2026-07-27");
    expect(calendarDateFromPortalWeekKey("w:2026-07-27")).toBe("2026-07-27");
  });

  it("levels from xp curve", () => {
    expect(portalSeasonLevelFromXp(0)).toBe(1);
    expect(portalSeasonLevelFromXp(8)).toBe(2);
    expect(portalSeasonLevelFromXp(1574)).toBe(30);
    const p = portalSeasonXpProgress(2, 10);
    expect(p.xpIntoLevel).toBe(2);
    expect(p.xpForLevel).toBe(10);
  });

  it("caps daily win/play xp soft ceilings", () => {
    expect(PORTAL_SEASON_XP_WIN).toBe(4);
    expect(PORTAL_SEASON_XP_PLAY).toBe(1);
    expect(PORTAL_SEASON_DAILY_WIN_XP_CAP).toBe(24);
    expect(PORTAL_SEASON_DAILY_PLAY_XP_CAP).toBe(10);
  });
});

describe("portalMatchWinDeltas", () => {
  it("counts multi #1 as match win and crown", () => {
    expect(portalMatchWinDeltas({ mode: "multi", rank: 1 })).toEqual({
      matchWin: true,
      multiWin: true,
    });
  });

  it("does not count multi non-first", () => {
    expect(portalMatchWinDeltas({ mode: "multi", rank: 2 })).toEqual({
      matchWin: false,
      multiWin: false,
    });
  });

  it("counts solo P75 success as match win only", () => {
    expect(
      portalMatchWinDeltas({ mode: "solo", p75Success: true })
    ).toEqual({ matchWin: true, multiWin: false });
  });

  it("ignores solo P75 fail", () => {
    expect(
      portalMatchWinDeltas({ mode: "solo", p75Success: false })
    ).toEqual({ matchWin: false, multiWin: false });
  });
});

describe("portalBadge unlock thresholds", () => {
  it("unlocks peak silver+ on week close and skips bronze", () => {
    const ids = portalBadgesUnlockedByEvent({
      kind: "week_close",
      peakLeagueTier: "gold",
      weeklyPromoteCount: 1,
    });
    expect(ids).toContain("peak_league_silver");
    expect(ids).toContain("peak_league_gold");
    expect(ids).not.toContain("peak_league_platinum");
    expect(ids).toContain("weekly_promote_1");
    expect(ids.every((id) => !id.includes("bronze"))).toBe(true);
  });

  it("dedupes already unlocked badges", () => {
    const ids = portalBadgesUnlockedByEvent(
      {
        kind: "week_close",
        peakLeagueTier: "gold",
        weeklyPromoteCount: 5,
      },
      new Set(["peak_league_silver", "peak_league_gold", "weekly_promote_1"])
    );
    expect(ids).toContain("weekly_promote_5");
    expect(ids).not.toContain("peak_league_gold");
    expect(ids).not.toContain("weekly_promote_1");
  });

  it("unlocks crowns and wins on match settle", () => {
    const ids = portalBadgesUnlockedByEvent({
      kind: "match_settled",
      peakLeagueTier: "bronze",
      totalMatchWins: 100,
      totalMultiplayerWins: 10,
    });
    expect(ids).toContain("multiplayer_win_10");
    expect(ids).toContain("total_wins_25");
    expect(ids).toContain("total_wins_100");
    expect(ids).not.toContain("total_wins_500");
  });

  it("grants collector only when A–D set is complete", () => {
    const almost = new Set(PORTAL_LEGACY_BADGE_IDS.slice(0, -1));
    const without = portalBadgesUnlockedByEvent(
      {
        kind: "match_settled",
        peakLeagueTier: "diamond",
        totalMatchWins: 500,
        totalMultiplayerWins: 200,
      },
      almost
    );
    const full = new Set(PORTAL_LEGACY_BADGE_IDS);
    const withFull = portalBadgesUnlockedByEvent(
      {
        kind: "match_settled",
        peakLeagueTier: "diamond",
        totalMatchWins: 500,
        totalMultiplayerWins: 200,
      },
      full
    );
    expect(withFull).toContain("legacy_collector");
    expect(withFull.filter((id) => id === "legacy_collector")).toHaveLength(1);

    const already = portalBadgesUnlockedByEvent(
      {
        kind: "match_settled",
        peakLeagueTier: "diamond",
        totalMatchWins: 500,
        totalMultiplayerWins: 200,
      },
      new Set([...PORTAL_LEGACY_BADGE_IDS, "legacy_collector"])
    );
    expect(already).not.toContain("legacy_collector");
    expect(without).toBeDefined();
  });

  it("matches season mark thresholds at finalize", () => {
    const tmpl = buildSeasonMarkTemplates("S2", 2)[1]!;
    expect(
      portalBadgeTemplateMet(tmpl, {
        kind: "season_finalized",
        seasonId: "S2",
        seasonLevel: 20,
      })
    ).toBe(true);
    expect(
      portalBadgeTemplateMet(tmpl, {
        kind: "season_finalized",
        seasonId: "S2",
        seasonLevel: 19,
      })
    ).toBe(false);
    expect(
      portalBadgeTemplateMet(tmpl, {
        kind: "season_finalized",
        seasonId: "S1",
        seasonLevel: 30,
      })
    ).toBe(false);
  });
});
