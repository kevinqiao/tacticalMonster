import {
  crazyGamesGameplayStart,
  crazyGamesGameplayStop,
  getCrazyGamesEnvironment,
  isCrazyGamesEmbedEnvironment,
  isCrazyGamesGameplayActive,
  isCrazyGamesSdkUsable,
  requestCrazyGamesMidgameAd,
  safeCrazyGamesHasModule,
} from "../../platformAuth/embedSources/crazyGamesSdk";
import { AudioBus } from "../../audio/AudioBus";
import { resolveCrazyGamesMidgameAdPolicy } from "./midgameAdConfig";

export type MidgameAdLifecycleHooks = {
  onAdStarted?: () => void;
  onAdFinished?: () => void;
};

/**
 * Request a CrazyGames midgame ad at a natural break (settle / between legs).
 * - Off: `?midgameAd=0` / `VITE_AD_MIDGAME=0`
 * - SDK `local`: skipped by default (only shows “ad would appear here”); use `?midgameAd=1` to force
 * Always resolves so gameplay can continue on unfilled/cooldown.
 */
export async function showMidgameAdAtBreak(
  hooks?: MidgameAdLifecycleHooks
): Promise<{ shown: boolean }> {
  if (typeof window === "undefined") return { shown: false };
  const policy = resolveCrazyGamesMidgameAdPolicy();
  if (policy === "force_off") return { shown: false };
  if (!isCrazyGamesSdkUsable() || !safeCrazyGamesHasModule("ad", "requestAd")) {
    return { shown: false };
  }
  const active = await isCrazyGamesEmbedEnvironment();
  if (!active) return { shown: false };

  // Local SDK only paints a placeholder overlay — skip unless explicitly forced.
  const env = await getCrazyGamesEnvironment();
  if (env === "local" && policy !== "force_on") {
    return { shown: false };
  }

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
