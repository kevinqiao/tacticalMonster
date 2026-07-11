function isDevMockBannerEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (import.meta.env.VITE_AD_DISPLAY_MOCK === "1") return true;
  return new URLSearchParams(window.location.search).get("adDisplay") === "mock";
}

export const devMockBannerProvider = {
  id: "dev_mock_banner",

  isSupported() {
    return isDevMockBannerEnabled();
  },

  async mountResponsiveBanner(containerId: string) {
    const el = document.getElementById(containerId);
    if (el) {
      el.textContent = "Ad Mock";
    }
    return { ok: true };
  },

  clearAll() {
    /* noop */
  },
};
