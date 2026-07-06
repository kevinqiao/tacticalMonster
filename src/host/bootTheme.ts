/** 冷启动加载屏：肉眼可辨的暗青/暗绿底色（勿用近黑 #12181a） */
export const BOOT_FALLBACK_LANDSCAPE = "#3a6f63";
export const BOOT_FALLBACK_PORTRAIT = "#345c4a";

export const BOOT_GRADIENT_LANDSCAPE =
  "linear-gradient(165deg, #5a8f9a 0%, #3a6f63 38%, #2a5248 100%)";
export const BOOT_GRADIENT_PORTRAIT =
  "linear-gradient(165deg, #4f7d6a 0%, #345c4a 40%, #264a3a 100%)";

export const BOOT_BG_LANDSCAPE = "/assets/portal/solitaire/backgrounds/bg-16x9.png";
export const BOOT_BG_PORTRAIT = "/assets/portal/portal_bg_9x16.png";

export const isPortraitViewport = () =>
  typeof window !== "undefined" && window.innerHeight > window.innerWidth;

export const getBootFallbackBg = () =>
  isPortraitViewport() ? BOOT_FALLBACK_PORTRAIT : BOOT_FALLBACK_LANDSCAPE;

export const getBootGradient = () =>
  isPortraitViewport() ? BOOT_GRADIENT_PORTRAIT : BOOT_GRADIENT_LANDSCAPE;

/** 冷启动：背景图在上、渐变在下；不加 45% 黑遮罩，避免把底色压成近黑 */
export const getBootBgImageLayers = () => {
  const photo = isPortraitViewport() ? BOOT_BG_PORTRAIT : BOOT_BG_LANDSCAPE;
  return `url("${photo}"), ${getBootGradient()}`;
};
