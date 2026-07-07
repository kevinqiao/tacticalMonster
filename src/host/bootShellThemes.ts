/** Per-app cold-boot visuals (background + copy). Keep index.html boot script in sync. */

export type BootShellId =
  | "portal"
  | "tactical"
  | "casual"
  | "campaign"
  | "campaignMerchant"
  | "platform"
  | "partner";

export type BootShellTheme = {
  id: BootShellId;
  fallbackLandscape: string;
  fallbackPortrait: string;
  gradientLandscape: string;
  gradientPortrait: string;
  bgLandscape?: string;
  bgPortrait?: string;
  /** `host.shell` → `boot.{messageKey}` */
  messageKey: string;
};

const PORTAL_BG_L = "/assets/portal/solitaire/backgrounds/bg-16x9.png";
const PORTAL_BG_P = "/assets/portal/portal_bg_9x16.png";

export const BOOT_SHELL_THEMES: Record<BootShellId, BootShellTheme> = {
  portal: {
    id: "portal",
    fallbackLandscape: "#3a6f63",
    fallbackPortrait: "#345c4a",
    gradientLandscape: "linear-gradient(165deg, #5a8f9a 0%, #3a6f63 38%, #2a5248 100%)",
    gradientPortrait: "linear-gradient(165deg, #4f7d6a 0%, #345c4a 40%, #264a3a 100%)",
    bgLandscape: PORTAL_BG_L,
    bgPortrait: PORTAL_BG_P,
    messageKey: "enteringPortal",
  },
  tactical: {
    id: "tactical",
    fallbackLandscape: "#1a2433",
    fallbackPortrait: "#141c28",
    gradientLandscape: "linear-gradient(165deg, #2c3e58 0%, #1a2433 45%, #0f1520 100%)",
    gradientPortrait: "linear-gradient(165deg, #243044 0%, #141c28 50%, #0c1018 100%)",
    messageKey: "enteringTacticalLobby",
  },
  casual: {
    id: "casual",
    fallbackLandscape: "#2a2848",
    fallbackPortrait: "#221f3d",
    gradientLandscape: "linear-gradient(165deg, #4a4580 0%, #2a2848 42%, #18152c 100%)",
    gradientPortrait: "linear-gradient(165deg, #3d3868 0%, #221f3d 48%, #12101f 100%)",
    messageKey: "enteringCasualLobby",
  },
  campaign: {
    id: "campaign",
    fallbackLandscape: "#4a3020",
    fallbackPortrait: "#3d2818",
    gradientLandscape: "linear-gradient(165deg, #8b5a3c 0%, #4a3020 40%, #2a1810 100%)",
    gradientPortrait: "linear-gradient(165deg, #735040 0%, #3d2818 45%, #241610 100%)",
    messageKey: "enteringCampaign",
  },
  campaignMerchant: {
    id: "campaignMerchant",
    fallbackLandscape: "#2f3440",
    fallbackPortrait: "#252932",
    gradientLandscape: "linear-gradient(165deg, #525a6a 0%, #2f3440 42%, #1a1e26 100%)",
    gradientPortrait: "linear-gradient(165deg, #454c5a 0%, #252932 48%, #14171d 100%)",
    messageKey: "enteringCampaignMerchant",
  },
  platform: {
    id: "platform",
    fallbackLandscape: "#1e2936",
    fallbackPortrait: "#172028",
    gradientLandscape: "linear-gradient(165deg, #334155 0%, #1e2936 45%, #0f1419 100%)",
    gradientPortrait: "linear-gradient(165deg, #2a3542 0%, #172028 50%, #0a0e12 100%)",
    messageKey: "enteringPlatformAdmin",
  },
  partner: {
    id: "partner",
    fallbackLandscape: "#1a2f42",
    fallbackPortrait: "#142636",
    gradientLandscape: "linear-gradient(165deg, #2d5570 0%, #1a2f42 45%, #0d1822 100%)",
    gradientPortrait: "linear-gradient(165deg, #244760 0%, #142636 50%, #081018 100%)",
    messageKey: "enteringPartnerAdmin",
  },
};

export function resolveBootShellIdFromPathname(pathname: string): BootShellId {
  if (pathname.startsWith("/platform")) return "platform";
  if (pathname.startsWith("/partner")) return "partner";
  if (pathname.startsWith("/campaign/merchant")) return "campaignMerchant";
  if (pathname.startsWith("/campaign")) return "campaign";
  if (pathname.startsWith("/portal")) return "portal";
  if (pathname.startsWith("/tactical")) return "tactical";
  if (pathname.startsWith("/casual")) return "casual";
  return "portal";
}

export function resolveBootShellTheme(
  pathname = typeof window !== "undefined" ? window.location.pathname : ""
): BootShellTheme {
  return BOOT_SHELL_THEMES[resolveBootShellIdFromPathname(pathname)];
}

export const isPortraitViewport = () =>
  typeof window !== "undefined" && window.innerHeight > window.innerWidth;

export function getBootFallbackBg(theme = resolveBootShellTheme()): string {
  return isPortraitViewport() ? theme.fallbackPortrait : theme.fallbackLandscape;
}

export function getBootGradient(theme = resolveBootShellTheme()): string {
  return isPortraitViewport() ? theme.gradientPortrait : theme.gradientLandscape;
}

export function getBootBgImageLayers(theme = resolveBootShellTheme()): string {
  const photo = isPortraitViewport() ? theme.bgPortrait : theme.bgLandscape;
  const gradient = getBootGradient(theme);
  if (photo) return `url("${photo}"), ${gradient}`;
  return gradient;
}

export function getBootPhotoUrl(theme = resolveBootShellTheme()): string | undefined {
  return isPortraitViewport() ? theme.bgPortrait : theme.bgLandscape;
}
