import { afterEach, describe, expect, it, vi } from "vitest";

import {
  isCrazyGamesMidgameAdEnabled,
  resolveCrazyGamesMidgameAdPolicy,
} from "@/host/service/ads/midgame/midgameAdConfig";

describe("crazyGames midgame ad policy", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to default policy / enabled sync gate", () => {
    vi.stubEnv("VITE_AD_MIDGAME", "");
    expect(resolveCrazyGamesMidgameAdPolicy("")).toBe("default");
    expect(isCrazyGamesMidgameAdEnabled("")).toBe(true);
  });

  it("disables via query", () => {
    vi.stubEnv("VITE_AD_MIDGAME", "");
    expect(resolveCrazyGamesMidgameAdPolicy("?midgameAd=0")).toBe("force_off");
    expect(isCrazyGamesMidgameAdEnabled("?midgameAd=0")).toBe(false);
  });

  it("disables via env", () => {
    vi.stubEnv("VITE_AD_MIDGAME", "0");
    expect(resolveCrazyGamesMidgameAdPolicy("")).toBe("force_off");
  });

  it("query wins over env", () => {
    vi.stubEnv("VITE_AD_MIDGAME", "1");
    expect(resolveCrazyGamesMidgameAdPolicy("?midgameAd=0")).toBe("force_off");
    vi.stubEnv("VITE_AD_MIDGAME", "0");
    expect(resolveCrazyGamesMidgameAdPolicy("?midgameAd=1")).toBe("force_on");
  });
});
