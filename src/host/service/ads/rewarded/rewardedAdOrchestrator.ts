import { resolveRewardedAdProvider } from "./registry";
import type { RewardedAdShowResult } from "./types";

export type RewardedAdLifecycleHooks = {
  onAdStarted?: () => void;
  onAdFinished?: () => void;
};

/** 播放激励广告；仅 `ok:true` 时方可发放再战奖励。 */
export async function showRewardedAdForReplay(
  hooks?: RewardedAdLifecycleHooks
): Promise<RewardedAdShowResult> {
  const provider = resolveRewardedAdProvider();
  if (!provider) {
    return { ok: false, reason: "unsupported" };
  }
  hooks?.onAdStarted?.();
  try {
    const result = await provider.showRewardedAd();
    if (result.ok) {
      hooks?.onAdFinished?.();
    }
    return result;
  } catch {
    return { ok: false, reason: "sdk_error" };
  }
}
