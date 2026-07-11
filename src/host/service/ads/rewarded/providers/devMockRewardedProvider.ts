import {
  getDevMockRewardedAdDurationMs,
  isDevMockRewardedAdEnabled,
} from "../devMockRewardedAdConfig";
import { runMockRewardedAdPlayback } from "../mockRewardedAdPlayback";
import type { RewardedAdProvider, RewardedAdShowResult } from "../types";

export const devMockRewardedProvider: RewardedAdProvider = {
  id: "dev_mock_rewarded",
  channel: "dev",
  priority: 100,

  isSupported() {
    return isDevMockRewardedAdEnabled();
  },

  async showRewardedAd(): Promise<RewardedAdShowResult> {
    if (!isDevMockRewardedAdEnabled()) {
      return { ok: false, reason: "unsupported" };
    }
    return runMockRewardedAdPlayback(getDevMockRewardedAdDurationMs());
  },
};