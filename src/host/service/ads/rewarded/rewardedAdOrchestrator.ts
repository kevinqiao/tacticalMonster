import {
  crazyGamesGameplayStart,
  crazyGamesGameplayStop,
  isCrazyGamesGameplayActive,
} from "../../platformAuth/embedSources/crazyGamesSdk";
import { AudioBus } from "../../audio/AudioBus";
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
  const resumeGameplay = isCrazyGamesGameplayActive();
  // Pause immediately — ad auction is not instantaneous; UI must stay blocked.
  crazyGamesGameplayStop();
  AudioBus.setDucked(true);
  hooks?.onAdStarted?.();
  try {
    const result = await provider.showRewardedAd();
    if (result.ok) {
      hooks?.onAdFinished?.();
    }
    return result;
  } catch {
    return { ok: false, reason: "sdk_error" };
  } finally {
    AudioBus.setDucked(false);
    if (resumeGameplay) {
      crazyGamesGameplayStart();
    }
  }
}
