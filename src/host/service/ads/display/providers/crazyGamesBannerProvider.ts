import { ensureCrazyGamesSdkInitialized } from "../../../platformAuth/embedSources/crazyGamesSdk";

declare global {
  interface Window {
    CrazyGames?: {
      SDK?: {
        banner?: {
          requestResponsiveBanner?: (containerId: string) => void | Promise<void>;
          clearAllBanners?: () => void;
        };
      };
    };
  }
}

export const crazyGamesBannerProvider = {
  id: "crazygames_banner",

  isSupported() {
    if (typeof window === "undefined") return false;
    return Boolean(window.CrazyGames?.SDK?.banner?.requestResponsiveBanner);
  },

  async mountResponsiveBanner(containerId: string) {
    const ready = await ensureCrazyGamesSdkInitialized();
    if (!ready) return { ok: false };
    const request = window.CrazyGames?.SDK?.banner?.requestResponsiveBanner;
    if (!request) return { ok: false };
    try {
      await request(containerId);
      return { ok: true };
    } catch (error) {
      console.warn("[CrazyGames] requestResponsiveBanner failed", error);
      return { ok: false };
    }
  },

  clearAll() {
    try {
      window.CrazyGames?.SDK?.banner?.clearAllBanners?.();
    } catch {
      /* ignore pre-init clear */
    }
  },
};
