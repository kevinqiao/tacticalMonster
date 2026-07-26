import {
  crazyGamesGameplayStart,
  crazyGamesGameplayStop,
  isCrazyGamesEmbedEnvironment,
  isCrazyGamesGameplayActive,
  isCrazyGamesSdkUsable,
  requestCrazyGamesMidgameAd,
  safeCrazyGamesHasModule,
} from "../../platformAuth/embedSources/crazyGamesSdk";
import { AudioBus } from "../../audio/AudioBus";

export type MidgameAdLifecycleHooks = {
  onAdStarted?: () => void;
  onAdFinished?: () => void;
};

/**
 * Request a CrazyGames midgame ad at a natural break (settle / between legs).
 * No-ops off CrazyGames. Always resolves so gameplay can continue on unfilled/cooldown.
 */
export async function showMidgameAdAtBreak(
  hooks?: MidgameAdLifecycleHooks
): Promise<{ shown: boolean }> {
  if (typeof window === "undefined") return { shown: false };
  if (!isCrazyGamesSdkUsable() || !safeCrazyGamesHasModule("ad", "requestAd")) {
    return { shown: false };
  }
  const active = await isCrazyGamesEmbedEnvironment();
  if (!active) return { shown: false };

  const resumeGameplay = isCrazyGamesGameplayActive();
  // Block gameplay for the whole request window (auction can take time before adStarted).
  crazyGamesGameplayStop();
  AudioBus.setDucked(true);
  try {
    const result = await requestCrazyGamesMidgameAd({
      onAdStarted: hooks?.onAdStarted,
    });
    if (result.ok) {
      hooks?.onAdFinished?.();
      return { shown: true };
    }
    return { shown: false };
  } catch (error) {
    console.warn("[CrazyGames] midgame ad failed", error);
    return { shown: false };
  } finally {
    AudioBus.setDucked(false);
    if (resumeGameplay) {
      crazyGamesGameplayStart();
    }
  }
}
