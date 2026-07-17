import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CRAZYGAMES_SDK_SPEC,
  crazyGamesSdkSource,
} from "@/host/service/platformAuth/embedSources/crazyGamesSdkSource";
import {
  collectEmbedSdkSpecs,
  loadEmbedSdk,
  resetEmbedSdkLoadCacheForTests,
  waitUntilEmbedSdkProbe,
} from "@/host/service/platformAuth/embedSources/sdkLoader";
import { buildEmbedSourceContext } from "@/host/service/platformAuth/embedAuthGate";

describe("sdkLoader", () => {
  afterEach(() => {
    resetEmbedSdkLoadCacheForTests();
    delete window.CrazyGames;
    document.querySelectorAll("script[data-embed-sdk]").forEach((el) => el.remove());
  });

  it("collects specs when shouldPreload is true", () => {
    const specs = collectEmbedSdkSpecs(
      [crazyGamesSdkSource],
      buildEmbedSourceContext({
        partnerPid: 100,
        partner: {
          pid: 100,
          authChannelIds: [2],
          data: { embed: { method: "crazygames_jwt" } },
          capabilities: { portalGames: true, campaignOps: false },
        },
        partnerResolveReady: true,
        campaignPartnerSlug: null,
        search: "?crazygames=1",
      })
    );
    expect(specs).toHaveLength(1);
    expect(specs[0]?.id).toBe("crazygames_v3");
  });

  it("dedupes loadEmbedSdk by spec id", async () => {
    window.CrazyGames = { SDK: {} };
    const spy = vi.spyOn(document, "createElement");
    await Promise.all([loadEmbedSdk(CRAZYGAMES_SDK_SPEC), loadEmbedSdk(CRAZYGAMES_SDK_SPEC)]);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("waitUntilEmbedSdkProbe resolves when probe becomes true", async () => {
    let ready = false;
    const probePromise = waitUntilEmbedSdkProbe(() => ready, { intervalMs: 10, timeoutMs: 500 });
    ready = true;
    await expect(probePromise).resolves.toBeUndefined();
  });
});
