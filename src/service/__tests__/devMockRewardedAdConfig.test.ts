import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("isDevMockRewardedAdEnabled", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_AD_REPLAY_MOCK", "");
    vi.stubGlobal("import", { meta: { env: { DEV: false, VITE_AD_REPLAY_MOCK: "" } } });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("enables mock on localhost without query params", async () => {
    vi.stubGlobal("window", {
      location: { search: "", hostname: "localhost" },
    });
    const { isDevMockRewardedAdEnabled } = await import(
      "@/host/service/ads/rewarded/devMockRewardedAdConfig"
    );
    expect(isDevMockRewardedAdEnabled()).toBe(true);
  });

  it("respects explicit VITE_AD_REPLAY_MOCK=0", async () => {
    vi.stubEnv("VITE_AD_REPLAY_MOCK", "0");
    vi.stubGlobal("window", {
      location: { search: "?adReplay=mock", hostname: "localhost" },
    });
    const { isDevMockRewardedAdEnabled } = await import(
      "@/host/service/ads/rewarded/devMockRewardedAdConfig"
    );
    expect(isDevMockRewardedAdEnabled()).toBe(false);
  });
});
