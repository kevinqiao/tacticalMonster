import {
  ensureCrazyGamesSdkInitialized,
  isCrazyGamesSdkUsable,
  safeCrazyGamesHasModule,
} from "../../../platformAuth/embedSources/crazyGamesSdk";

export const crazyGamesBannerProvider = {
  id: "crazygames_banner",

  isSupported() {
    if (typeof window === "undefined") return false;
    // Do not touch SDK.banner before init — getters throw "not initialized yet".
    return isCrazyGamesSdkUsable() && safeCrazyGamesHasModule("banner", "requestResponsiveBanner");
  },

  async mountResponsiveBanner(containerId: string) {
    await ensureCrazyGamesSdkInitialized();
    if (!isCrazyGamesSdkUsable()) return { ok: false };
    try {
      const banner = window.CrazyGames?.SDK?.banner;
      const request = banner?.requestResponsiveBanner;
      if (!banner || typeof request !== "function") return { ok: false };
      // Keep `this` bound — unbound calls crash inside the SDK (same class as getUserToken).
      await request.call(banner, containerId);
      return { ok: true };
    } catch (error) {
      console.warn("[CrazyGames] requestResponsiveBanner failed", error);
      return { ok: false };
    }
  },

  clearAll() {
    if (!isCrazyGamesSdkUsable()) return;
    try {
      const banner = window.CrazyGames?.SDK?.banner;
      banner?.clearAllBanners?.call(banner);
    } catch {
      /* ignore */
    }
  },
};
