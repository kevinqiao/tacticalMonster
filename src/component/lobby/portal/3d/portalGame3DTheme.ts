import {
  PARTNER_GAME_TYPES,
  type RegisteredPartnerGameType,
} from "@/convex/portal/convex/data/partnerGameRegistry";
import i18n from "@/i18n";

/** 全游戏共用 3D 大厅背景（canonical，待 art 就绪） */
export const PORTAL_3D_SHARED_BG = {
  landscape: "/assets/portal/3d/backgrounds/bg-16x9.png",
  portrait: "/assets/portal/3d/backgrounds/bg-9x16.png",
} as const;

/** 资源未就绪时回退（与现 solitaire 资产兼容） */
export const PORTAL_3D_SHARED_BG_FALLBACK = {
  landscape: "/assets/portal/solitaire/backgrounds/bg-16x9.png",
  portrait: "/assets/portal/portal_bg_9x16.png",
} as const;

/**
 * 按 gameType 的 3D 大厅背景（当前均映射到已有 fallback，canonical 路径见 PORTAL_3D_SHARED_BG）。
 */
export const PORTAL_3D_GAME_BG: Record<
  RegisteredPartnerGameType,
  { landscape: string; portrait: string }
> = {
  solitaire: {
    landscape: "/assets/portal/solitaire/backgrounds/bg-16x9.png",
    portrait: "/assets/portal/portal_bg_9x16.png",
  },
  block_blast: { ...PORTAL_3D_SHARED_BG_FALLBACK },
  match_3: { ...PORTAL_3D_SHARED_BG_FALLBACK },
  tower_arena: { ...PORTAL_3D_SHARED_BG_FALLBACK },
  yatz: { ...PORTAL_3D_SHARED_BG_FALLBACK },
};

const DEFAULT_HERO_LOGO = "/assets/portal/solitaire/hero/hero-title.svg";

const HERO_LOGO_FALLBACK = DEFAULT_HERO_LOGO;

/** 仅 Hero Logo 按 gameType 区分（canonical: public/assets/portal/3d/logos/） */
export const PORTAL_3D_HERO_LOGO: Record<RegisteredPartnerGameType, string> = {
  solitaire: "/assets/portal/solitaire/hero/hero-title.svg",
  block_blast: "/assets/portal/3d/logos/block_blast-hero.svg",
  match_3: "/assets/portal/3d/logos/match_3-hero.svg",
  tower_arena: "/assets/portal/3d/logos/tower_arena-hero.svg",
  yatz: "/assets/portal/3d/logos/yatz-hero.svg",
};

export function resolvePortal3DHeroLogo(
  gameType: RegisteredPartnerGameType | null | undefined
): string {
  if (!gameType) return DEFAULT_HERO_LOGO;
  return PORTAL_3D_HERO_LOGO[gameType] ?? HERO_LOGO_FALLBACK;
}

export function resolvePortal3DSharedBg(
  orientation: "landscape" | "portrait",
  gameType?: RegisteredPartnerGameType | null
): string {
  if (gameType && PORTAL_3D_GAME_BG[gameType]) {
    return PORTAL_3D_GAME_BG[gameType][orientation];
  }
  return PORTAL_3D_SHARED_BG_FALLBACK[orientation];
}

/** 段位徽章底图（盾面无数字，罗马数字由 CSS 叠加） */
export type PortalTierId = "bronze" | "silver" | "gold" | "platinum" | "diamond";

export const PORTAL_3D_TIER_BADGES: Record<PortalTierId, string> = {
  bronze: "/assets/portal/3d/ui/badge-tier-bronze.png",
  silver: "/assets/portal/3d/ui/badge-tier-silver-plain.png",
  gold: "/assets/portal/3d/ui/badge-tier-gold.png",
  platinum: "/assets/portal/3d/ui/badge-tier-platinum.png",
  diamond: "/assets/portal/3d/ui/badge-tier-diamond.png",
};

export function resolvePortal3DTierBadge(tierId: PortalTierId | null | undefined): string {
  return PORTAL_3D_TIER_BADGES[tierId ?? "bronze"] ?? PORTAL_3D_TIER_BADGES.bronze;
}

const PORTAL_TIER_BASE_LABELS: Record<PortalTierId, string> = {
  bronze: "bronze",
  silver: "silver",
  gold: "gold",
  platinum: "platinum",
  diamond: "diamond",
};

/** 段位展示文案（Phase 2：大段 + 默认罗马数字 I） */
export function portalTierDisplayLabel(tierId: PortalTierId): {
  tierLabel: string;
  division: string;
} {
  const division = "I";
  const tier = i18n.t(`tiers.${PORTAL_TIER_BASE_LABELS[tierId] ?? "bronze"}`, {
    ns: "portal.player",
  });
  return {
    tierLabel: i18n.t("tiers.divisionSuffix", { ns: "portal.player", tier, division }),
    division,
  };
}

/** 供开发期校验：已注册的 gameType 均有 logo 配置 */
export function assertPortal3DLogoRegistry(): void {
  for (const gt of PARTNER_GAME_TYPES) {
    if (!PORTAL_3D_HERO_LOGO[gt]) {
      console.warn("[portal-3d] missing hero logo for", gt);
    }
  }
}

export { HERO_LOGO_FALLBACK };
