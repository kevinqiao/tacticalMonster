import { describe, expect, it } from "vitest";
import { buildCouponIssueKey } from "../campaignRewardModel";

describe("buildCouponIssueKey", () => {
  it("builds pass_run keys with uid + run", () => {
    expect(
      buildCouponIssueKey({
        source: "pass_run",
        campaignId: "camp1",
        uid: "u1",
        runTournamentId: "run1",
        ruleId: "r1",
      })
    ).toBe("pr:camp1:u1:run1:r1");
  });

  it("builds distinct keys for different players on same run", () => {
    const a = buildCouponIssueKey({
      source: "pass_run",
      campaignId: "camp1",
      uid: "u1",
      runTournamentId: "run1",
      ruleId: "r1",
    });
    const b = buildCouponIssueKey({
      source: "pass_run",
      campaignId: "camp1",
      uid: "u2",
      runTournamentId: "run1",
      ruleId: "r1",
    });
    expect(a).not.toBe(b);
  });

  it("builds campaign_settle keys with settlementId", () => {
    expect(
      buildCouponIssueKey({
        source: "campaign_settle",
        campaignId: "camp1",
        uid: "u1",
        settlementId: "sett1",
        ruleId: "lb1",
      })
    ).toBe("cs:camp1:u1:sett1:lb1");
  });

  it("rejects missing scope ids", () => {
    expect(() =>
      buildCouponIssueKey({
        source: "pass_run",
        campaignId: "camp1",
        uid: "u1",
        ruleId: "r1",
      })
    ).toThrow("runTournamentId_required");
    expect(() =>
      buildCouponIssueKey({
        source: "campaign_settle",
        campaignId: "camp1",
        uid: "u1",
        ruleId: "r1",
      })
    ).toThrow("settlementId_required");
  });
});
