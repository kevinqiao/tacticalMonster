import { describe, expect, it } from "vitest";

import {
  formatCasualAdReplayButtonLabel,
  formatCasualAdReplayQuotaBadge,
  resolveCasualPostSettleReplayPresentation,
  resolveCasualScoreReportSecondaryAction,
} from "@/component/battle/games/shared/casualGameScoreReportUI";

describe("formatCasualAdReplayQuotaBadge", () => {
  it("shows used/cap when remaining and finite cap are present", () => {
    // remaining=3, cap=10 → used=7
    expect(formatCasualAdReplayQuotaBadge(3, 10)).toBe("7/10");
    expect(formatCasualAdReplayQuotaBadge(10, 10)).toBe("0/10");
  });

  it("omits badge when cap is unlimited sentinel or missing", () => {
    expect(formatCasualAdReplayQuotaBadge(3)).toBeUndefined();
    expect(formatCasualAdReplayQuotaBadge(3, 1_000_000_000)).toBeUndefined();
  });
});

describe("formatCasualAdReplayButtonLabel", () => {
  it("keeps main label free of quota digits", () => {
    expect(formatCasualAdReplayButtonLabel(3, 10)).toBe("看广告重玩");
  });
});

describe("resolveCasualScoreReportSecondaryAction", () => {
  it("shows ad replay for portal solo P75 when offered and challenge failed", () => {
    const result = resolveCasualScoreReportSecondaryAction({
      templateId: "portal_solo_p75_solitaire",
      replayOffered: true,
      canReplay: true,
      replayMode: "ad",
      challengeSuccess: false,
      adReplayDailyRemaining: 3,
      adReplayDailyCap: 10,
    });
    expect(result.soloChallengeFinalStep).toBe(true);
    expect(result.showReplaySecondary).toBe(true);
    expect(result.secondaryLabel).toBe("看广告重玩");
    expect(result.adReplayDailyRemaining).toBe(3);
    expect(result.adReplayDailyCap).toBe(10);
  });

  it("hides replay when canReplay is false", () => {
    const result = resolveCasualScoreReportSecondaryAction({
      templateId: "portal_solo_p75_solitaire",
      replayOffered: true,
      canReplay: false,
      replayMode: "ad",
      challengeSuccess: false,
      adReplayDailyRemaining: 0,
    });
    expect(result.showReplaySecondary).toBe(false);
  });

  it("hides replay when challenge success is undefined", () => {
    const result = resolveCasualScoreReportSecondaryAction({
      templateId: "portal_solo_p75_solitaire",
      replayOffered: true,
      canReplay: true,
      replayMode: "ad",
      challengeSuccess: undefined,
    });
    expect(result.showReplaySecondary).toBe(false);
  });

  it("hides replay when challenge succeeded", () => {
    const result = resolveCasualScoreReportSecondaryAction({
      templateId: "portal_solo_p75_solitaire",
      replayOffered: true,
      canReplay: true,
      replayMode: "ad",
      challengeSuccess: true,
    });
    expect(result.showReplaySecondary).toBe(false);
  });
});

describe("resolveCasualPostSettleReplayPresentation", () => {
  it("shows ad replay with remaining/cap data for multiplayer", () => {
    const result = resolveCasualPostSettleReplayPresentation({
      replayOffered: true,
      canReplay: true,
      replayMode: "ad",
      adReplayDailyRemaining: 4,
      adReplayDailyCap: 10,
    });
    expect(result.showReplay).toBe(true);
    expect(result.replayLabel).toBe("看广告重玩");
    expect(result.adReplayDailyRemaining).toBe(4);
    expect(result.adReplayDailyCap).toBe(10);
  });

  it("falls back to plain ad label when cap is missing", () => {
    const result = resolveCasualPostSettleReplayPresentation({
      replayOffered: true,
      canReplay: true,
      replayMode: "ad",
      adReplayDailyRemaining: 4,
    });
    expect(result.showReplay).toBe(true);
    expect(result.replayLabel).toBe("看广告重玩");
  });

  it("hides replay when canReplay is false", () => {
    const result = resolveCasualPostSettleReplayPresentation({
      replayOffered: true,
      canReplay: false,
      replayMode: "ad",
      adReplayDailyRemaining: 0,
    });
    expect(result.showReplay).toBe(false);
    expect(result.replayLabel).toBe("");
  });

  it("hides replay when replay window has closed", () => {
    const result = resolveCasualPostSettleReplayPresentation({
      replayOffered: true,
      canReplay: true,
      replayMode: "ad",
      adReplayDailyRemaining: 3,
      replayWindowEndsAt: Date.now() - 1000,
    });
    expect(result.showReplay).toBe(false);
  });

  it("uses custom label when provided", () => {
    const result = resolveCasualPostSettleReplayPresentation({
      replayOffered: true,
      canReplay: true,
      replayMode: "token",
      customLabel: "三局再战",
    });
    expect(result.showReplay).toBe(true);
    expect(result.replayLabel).toBe("三局再战");
  });

  it("falls back to token replay label", () => {
    const result = resolveCasualPostSettleReplayPresentation({
      replayOffered: true,
      canReplay: true,
      replayMode: "token",
    });
    expect(result.showReplay).toBe(true);
    expect(result.replayLabel).toBe("门票再战");
  });
});
