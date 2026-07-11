declare global {
  interface Window {
    CrazyGames?: {
      SDK?: {
        banner?: {
          requestResponsiveBanner?: (containerId: string) => void;
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
    const request = window.CrazyGames?.SDK?.banner?.requestResponsiveBanner;
    if (!request) return { ok: false };
    try {
      request(containerId);
      return { ok: true };
    } catch {
      return { ok: false };
    }
  },

  clearAll() {
    window.CrazyGames?.SDK?.banner?.clearAllBanners?.();
  },
};
