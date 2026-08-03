import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ensureCrazyGamesSdkInitialized,
  requestCrazyGamesMidgameAd,
  requestCrazyGamesRewardedAd,
  resetCrazyGamesSdkInitForTests,
} from "@/host/service/platformAuth/embedSources/crazyGamesSdk";

describe("CrazyGames video ads", () => {
  afterEach(() => {
    resetCrazyGamesSdkInitForTests();
    vi.unstubAllGlobals();
  });

  it("calls requestAd with SDK.ad as this for rewarded", async () => {
    const requestAd = vi.fn(function requestAd(
      this: unknown,
      type: string,
      callbacks: { adFinished?: () => void }
    ) {
      expect(this).toBe(ad);
      expect(type).toBe("rewarded");
      callbacks.adFinished?.();
    });
    const ad = { requestAd };
    const sdk = {
      init: vi.fn(async () => undefined),
      environment: "local",
      ad,
    };
    vi.stubGlobal("CrazyGames", { SDK: sdk });
    await ensureCrazyGamesSdkInitialized();

    const result = await requestCrazyGamesRewardedAd();
    expect(result).toEqual({
      ok: true,
      type: "rewarded",
      clientProof: "crazygames_rewarded",
    });
    expect(requestAd).toHaveBeenCalledTimes(1);
  });

  it("calls requestAd with SDK.ad as this for midgame", async () => {
    const requestAd = vi.fn(function requestAd(
      this: unknown,
      type: string,
      callbacks: { adFinished?: () => void }
    ) {
      expect(this).toBe(ad);
      expect(type).toBe("midgame");
      callbacks.adFinished?.();
    });
    const ad = { requestAd };
    vi.stubGlobal("CrazyGames", {
      SDK: {
        init: vi.fn(async () => undefined),
        environment: "crazygames",
        ad,
      },
    });
    await ensureCrazyGamesSdkInitialized();

    const result = await requestCrazyGamesMidgameAd();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.type).toBe("midgame");
  });

  it("treats adError as unfilled so gameplay can continue", async () => {
    const requestAd = vi.fn(function requestAd(
      _type: string,
      callbacks: { adError?: () => void }
    ) {
      callbacks.adError?.();
    });
    vi.stubGlobal("CrazyGames", {
      SDK: {
        init: vi.fn(async () => undefined),
        environment: "local",
        ad: { requestAd },
      },
    });
    await ensureCrazyGamesSdkInitialized();

    const result = await requestCrazyGamesMidgameAd();
    expect(result).toEqual({ ok: false, reason: "unfilled" });
  });
});
