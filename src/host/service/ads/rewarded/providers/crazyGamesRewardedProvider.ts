import { isCrazyGamesDevFlag } from "../../../platformAuth/embedSources/runtimeContext";
import {
  isCrazyGamesEmbedEnvironment,
  isCrazyGamesSdkUsable,
  requestCrazyGamesRewardedAd,
  safeCrazyGamesHasModule,
} from "../../../platformAuth/embedSources/crazyGamesSdk";
import type { RewardedAdProvider, RewardedAdShowResult } from "./types";

export const crazyGamesRewardedProvider: RewardedAdProvider = {
  id: "crazygames_rewarded",
  channel: "crazygames",
  priority: 0,

  isSupported() {
    if (typeof window === "undefined") return false;
    if (isCrazyGamesDevFlag(window.location.search)) return true;
    // Do not touch SDK.ad before init — getters throw "not initialized yet".
    return isCrazyGamesSdkUsable() && safeCrazyGamesHasModule("ad", "requestAd");
  },

  async showRewardedAd(): Promise<RewardedAdShowResult> {
    const active = await isCrazyGamesEmbedEnvironment();
    if (!active && !isCrazyGamesDevFlag(window.location.search)) {
      return { ok: false, reason: "unsupported" };
    }
    const result = await requestCrazyGamesRewardedAd();
    if (result.ok) {
      return { ok: true, channel: "crazygames", clientProof: result.clientProof };
    }
    if (result.reason === "unfilled") {
      return { ok: false, reason: "unfilled" };
    }
    return { ok: false, reason: result.reason === "unsupported" ? "unsupported" : "sdk_error" };
  },
};
