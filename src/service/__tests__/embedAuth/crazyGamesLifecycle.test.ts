import { afterEach, describe, expect, it, vi } from "vitest";

import {
  crazyGamesGameplayStart,
  crazyGamesGameplayStop,
  crazyGamesLoadingStart,
  crazyGamesLoadingStop,
  ensureCrazyGamesSdkInitialized,
  isCrazyGamesGameplayActive,
  resetCrazyGamesSdkInitForTests,
} from "@/host/service/platformAuth/embedSources/crazyGamesSdk";
import {
  beginPortalGameSessionLoad,
  endPortalGameSession,
  getPortalAdPhase,
  markPortalGameplayReady,
  setPortalAdPhase,
} from "@/host/service/ads/display/portalAdPhase";

function stubActiveSdk(game: Record<string, unknown>) {
  const sdk = {
    init: vi.fn(async () => undefined),
    environment: "local",
    game,
  };
  vi.stubGlobal("CrazyGames", { SDK: sdk });
  return sdk;
}

describe("CrazyGames game lifecycle", () => {
  afterEach(() => {
    setPortalAdPhase("lobby");
    resetCrazyGamesSdkInitForTests();
    vi.unstubAllGlobals();
  });

  it("dedupes gameplayStart/Stop and tracks active flag", async () => {
    const gameplayStart = vi.fn();
    const gameplayStop = vi.fn();
    stubActiveSdk({ gameplayStart, gameplayStop });
    await ensureCrazyGamesSdkInitialized();

    crazyGamesGameplayStart();
    crazyGamesGameplayStart();
    expect(gameplayStart).toHaveBeenCalledTimes(1);
    expect(isCrazyGamesGameplayActive()).toBe(true);

    crazyGamesGameplayStop();
    crazyGamesGameplayStop();
    expect(gameplayStop).toHaveBeenCalledTimes(1);
    expect(isCrazyGamesGameplayActive()).toBe(false);
  });

  it("bridges portal playing phase to gameplayStart/Stop", async () => {
    const gameplayStart = vi.fn();
    const gameplayStop = vi.fn();
    stubActiveSdk({ gameplayStart, gameplayStop });
    await ensureCrazyGamesSdkInitialized();

    setPortalAdPhase("playing");
    expect(gameplayStart).toHaveBeenCalledTimes(1);

    setPortalAdPhase("settle");
    expect(gameplayStop).toHaveBeenCalledTimes(1);
    expect(getPortalAdPhase()).toBe("settle");
  });

  it("markPortalGameplayReady ends load and enters playing", async () => {
    const loadingStart = vi.fn();
    const loadingStop = vi.fn();
    const gameplayStart = vi.fn();
    stubActiveSdk({ loadingStart, loadingStop, gameplayStart, gameplayStop: vi.fn() });
    await ensureCrazyGamesSdkInitialized();

    beginPortalGameSessionLoad();
    expect(loadingStart).toHaveBeenCalledTimes(1);

    markPortalGameplayReady();
    expect(loadingStop).toHaveBeenCalledTimes(1);
    expect(getPortalAdPhase()).toBe("playing");
    expect(gameplayStart).toHaveBeenCalledTimes(1);

    setPortalAdPhase("settle");
    endPortalGameSession();
    expect(getPortalAdPhase()).toBe("lobby");
  });

  it("loading helpers fall back to sdkGameLoading* names", async () => {
    const sdkGameLoadingStart = vi.fn();
    const sdkGameLoadingStop = vi.fn();
    stubActiveSdk({ sdkGameLoadingStart, sdkGameLoadingStop });
    await ensureCrazyGamesSdkInitialized();

    crazyGamesLoadingStart();
    crazyGamesLoadingStop();
    expect(sdkGameLoadingStart).toHaveBeenCalledTimes(1);
    expect(sdkGameLoadingStop).toHaveBeenCalledTimes(1);
  });
});
