import { afterEach, describe, expect, it, vi } from "vitest";

describe("resolveRewardedAdProvider mock preference", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("prefers mock over CrazyGames when VITE_AD_REPLAY_MOCK=1", async () => {
    vi.stubEnv("VITE_AD_REPLAY_MOCK", "1");
    vi.stubGlobal("window", {
      location: {
        search: "",
        hostname: "solitaire-arena.game-files.crazygames.com",
      },
    });

    const { resolveRewardedAdProvider } = await import(
      "@/host/service/ads/rewarded/registry"
    );
    const provider = resolveRewardedAdProvider();
    expect(provider?.id).toBe("dev_mock_rewarded");
    expect(provider?.channel).toBe("dev");
  });
});
