/** @deprecated Import from `./bootShellThemes` — re-exports portal defaults for legacy callers. */
export {
  getBootBgImageLayers,
  getBootFallbackBg,
  getBootGradient,
  isPortraitViewport,
  resolveBootShellTheme,
} from "./bootShellThemes";

/** Legacy constants (portal shell). */
export {
  BOOT_SHELL_THEMES,
  resolveBootShellIdFromPathname,
} from "./bootShellThemes";

import { BOOT_SHELL_THEMES } from "./bootShellThemes";

export const BOOT_FALLBACK_LANDSCAPE = BOOT_SHELL_THEMES.portal.fallbackLandscape;
export const BOOT_FALLBACK_PORTRAIT = BOOT_SHELL_THEMES.portal.fallbackPortrait;
export const BOOT_GRADIENT_LANDSCAPE = BOOT_SHELL_THEMES.portal.gradientLandscape;
export const BOOT_GRADIENT_PORTRAIT = BOOT_SHELL_THEMES.portal.gradientPortrait;
export const BOOT_BG_LANDSCAPE = BOOT_SHELL_THEMES.portal.bgLandscape!;
export const BOOT_BG_PORTRAIT = BOOT_SHELL_THEMES.portal.bgPortrait!;
