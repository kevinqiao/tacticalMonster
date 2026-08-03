import { describe, expect, it } from "vitest";

import {
  finishMockRewardedAdPlayback,
  getActiveMockRewardedAdPlayback,
  runMockRewardedAdPlayback,
} from "@/host/service/ads/rewarded/mockRewardedAdPlayback";

describe("mockRewardedAdPlayback", () => {
  it("resolves success when playback finishes", async () => {
    const promise = runMockRewardedAdPlayback(1000);
    expect(getActiveMockRewardedAdPlayback()?.durationMs).toBe(1000);
    finishMockRewardedAdPlayback(true);
    await expect(promise).resolves.toEqual({
      ok: true,
      channel: "dev",
      clientProof: "mock",
    });
    expect(getActiveMockRewardedAdPlayback()).toBeNull();
  });

  it("resolves dismissed when user cancels", async () => {
    const promise = runMockRewardedAdPlayback(1000);
    finishMockRewardedAdPlayback(false);
    await expect(promise).resolves.toEqual({
      ok: false,
      reason: "user_dismissed",
    });
  });

  it("rejects concurrent playback", async () => {
    void runMockRewardedAdPlayback(1000);
    await expect(runMockRewardedAdPlayback(1000)).resolves.toEqual({
      ok: false,
      reason: "sdk_error",
    });
    finishMockRewardedAdPlayback(true);
  });
});
