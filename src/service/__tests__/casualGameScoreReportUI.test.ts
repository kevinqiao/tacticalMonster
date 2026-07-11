import { describe, expect, it } from "vitest";



import {
  resolveCasualPostSettleReplayPresentation,
  resolveCasualScoreReportSecondaryAction,
} from "@/component/battle/games/shared/casualGameScoreReportUI";



describe("resolveCasualScoreReportSecondaryAction", () => {

  it("shows ad replay for portal solo P75 when offered and challenge failed", () => {

    const result = resolveCasualScoreReportSecondaryAction({

      templateId: "portal_solo_p75_solitaire",

      replayOffered: true,

      canReplay: true,

      replayMode: "ad",

      challengeSuccess: false,

      adReplayDailyRemaining: 3,

    });

    expect(result.soloChallengeFinalStep).toBe(true);

    expect(result.showReplaySecondary).toBe(true);

    expect(result.secondaryLabel).toBe("🎬 看广告再战（今日剩 3 次）");

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

  it("shows ad replay label with daily remaining for multiplayer", () => {

    const result = resolveCasualPostSettleReplayPresentation({

      replayOffered: true,

      canReplay: true,

      replayMode: "ad",

      adReplayDailyRemaining: 4,

    });

    expect(result.showReplay).toBe(true);

    expect(result.replayLabel).toBe("🎬 看广告再战（今日剩 4 次）");

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

    expect(result.replayLabel).toBe("再战");

  });

});


