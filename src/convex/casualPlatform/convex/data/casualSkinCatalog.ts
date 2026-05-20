/**
 * 皮肤静态配表（见 docs/skin/SKIN_DESIGN.md §10）。
 * 运行时拥有/装备在 `casual_player_skins` / `casual_player_skin_equip`。
 */

export type CasualSkinType =
  | "card_skin"
  | "game_visual_bundle"
  | "season_theme"
  | "ui_skin"
  | "decoration";

export type CasualSkinAvailability = "permanent" | "season" | "festival" | "achievement";
export type CasualSkinBpTier = "free" | "standard" | "deluxe" | null;

export interface CasualSkinGameComponents {
  card_face?: string;
  card_back?: string;
  table_bg?: string;
  win_animation?: string;
  piece_set?: string;
  board_bg?: string;
  board_grid?: string;
}

export interface CasualSkinCatalogEntry {
  skinId: string;
  name: string;
  type: CasualSkinType;
  availability: CasualSkinAvailability;
  seasonId?: string;
  bpTier?: CasualSkinBpTier;
  bpUnlockLevel?: number;
  /** Town / UI 分层：env | accent | facade | full */
  townLayer?: "env" | "accent" | "facade" | "full";
  cssThemeKey?: string;
  appliesToGameIds?: string[];
  componentsByGame?: Record<string, CasualSkinGameComponents>;
  priceGems?: number;
  shopSkuId?: string;
}

export const CASUAL_SKIN_CATALOG: CasualSkinCatalogEntry[] = [
  {
    skinId: "classic_card",
    name: "经典纸牌",
    type: "card_skin",
    availability: "permanent",
    appliesToGameIds: ["solitaire"],
    componentsByGame: {
      solitaire: {
        card_face: "classic",
        card_back: "classic",
        table_bg: "classic",
      },
    },
  },
  {
    skinId: "shop_steam_punk",
    name: "蒸汽朋克",
    type: "card_skin",
    availability: "permanent",
    priceGems: 280,
    shopSkuId: "shop_skin_steam_punk",
    appliesToGameIds: ["solitaire"],
    componentsByGame: {
      solitaire: {
        card_face: "steam_punk",
        card_back: "steam_punk",
        table_bg: "steam_punk",
      },
    },
  },
  // --- S1 UI ---
  {
    skinId: "ui_s1_env",
    name: "S1 深夜星空·环境 UI",
    type: "ui_skin",
    availability: "season",
    seasonId: "casual_s1",
    bpTier: "free",
    bpUnlockLevel: 1,
    cssThemeKey: "s1-midnight-sky",
    townLayer: "env",
  },
  {
    skinId: "ui_s1_standard",
    name: "S1 深夜星空·标准 UI",
    type: "ui_skin",
    availability: "season",
    seasonId: "casual_s1",
    bpTier: "standard",
    bpUnlockLevel: 25,
    cssThemeKey: "s1-midnight-sky",
  },
  {
    skinId: "ui_s1_deluxe",
    name: "S1 深夜星空·豪华 UI",
    type: "ui_skin",
    availability: "season",
    seasonId: "casual_s1",
    bpTier: "deluxe",
    bpUnlockLevel: 25,
    cssThemeKey: "s1-midnight-sky",
  },
  // --- S2 UI ---
  {
    skinId: "ui_s2_env",
    name: "S2 江户樱花·环境 UI",
    type: "ui_skin",
    availability: "season",
    seasonId: "casual_s2",
    bpTier: "free",
    bpUnlockLevel: 1,
    cssThemeKey: "s2-edo-sakura",
    townLayer: "env",
  },
  {
    skinId: "ui_s2_standard",
    name: "S2 江户樱花·标准 UI",
    type: "ui_skin",
    availability: "season",
    seasonId: "casual_s2",
    bpTier: "standard",
    bpUnlockLevel: 25,
    cssThemeKey: "s2-edo-sakura",
  },
  {
    skinId: "ui_s2_deluxe",
    name: "S2 江户樱花·豪华 UI",
    type: "ui_skin",
    availability: "season",
    seasonId: "casual_s2",
    bpTier: "deluxe",
    bpUnlockLevel: 25,
    cssThemeKey: "s2-edo-sakura",
  },
  // --- S1 game visual ---
  {
    skinId: "s1_visual_bundle_std",
    name: "S1 深夜星空·标准玩法外观",
    type: "game_visual_bundle",
    availability: "season",
    seasonId: "casual_s1",
    bpTier: "standard",
    bpUnlockLevel: 20,
    appliesToGameIds: ["solitaire", "block_blast"],
    componentsByGame: {
      solitaire: {
        card_face: "s1_midnight",
        card_back: "s1_midnight",
        table_bg: "s1_midnight",
      },
      block_blast: {
        board_bg: "s1_midnight",
        piece_set: "s1_midnight",
      },
    },
  },
  {
    skinId: "s1_visual_bundle_deluxe",
    name: "S1 深夜星空·豪华玩法外观",
    type: "game_visual_bundle",
    availability: "season",
    seasonId: "casual_s1",
    bpTier: "deluxe",
    bpUnlockLevel: 1,
    appliesToGameIds: ["solitaire", "block_blast"],
    componentsByGame: {
      solitaire: {
        card_face: "s1_midnight_deluxe",
        card_back: "s1_midnight_deluxe",
        table_bg: "s1_midnight_deluxe",
      },
      block_blast: {
        board_bg: "s1_midnight_deluxe",
        piece_set: "s1_midnight_deluxe",
      },
    },
  },
  // --- S2 game visual ---
  {
    skinId: "s2_visual_bundle_std",
    name: "S2 江户樱花·标准玩法外观",
    type: "game_visual_bundle",
    availability: "season",
    seasonId: "casual_s2",
    bpTier: "standard",
    bpUnlockLevel: 20,
    appliesToGameIds: ["solitaire", "block_blast"],
    componentsByGame: {
      solitaire: {
        card_face: "s2_edo",
        card_back: "s2_edo",
        table_bg: "s2_edo",
      },
      block_blast: {
        board_bg: "s2_edo",
        piece_set: "s2_edo",
      },
    },
  },
  {
    skinId: "s2_visual_bundle_deluxe",
    name: "S2 江户樱花·豪华玩法外观",
    type: "game_visual_bundle",
    availability: "season",
    seasonId: "casual_s2",
    bpTier: "deluxe",
    bpUnlockLevel: 1,
    appliesToGameIds: ["solitaire", "block_blast"],
    componentsByGame: {
      solitaire: {
        card_face: "s2_edo_deluxe",
        card_back: "s2_edo_deluxe",
        table_bg: "s2_edo_deluxe",
      },
      block_blast: {
        board_bg: "s2_edo_deluxe",
        piece_set: "s2_edo_deluxe",
      },
    },
  },
  // --- S1 Town ---
  {
    skinId: "s1_town_theme_env",
    name: "S1 深夜星空·环境层",
    type: "season_theme",
    availability: "season",
    seasonId: "casual_s1",
    bpTier: "free",
    bpUnlockLevel: 1,
    townLayer: "env",
    cssThemeKey: "s1-midnight-sky",
  },
  {
    skinId: "s1_town_theme_accent_std",
    name: "S1 标准点缀层",
    type: "season_theme",
    availability: "season",
    seasonId: "casual_s1",
    bpTier: "standard",
    bpUnlockLevel: 10,
    townLayer: "accent",
    cssThemeKey: "s1-midnight-sky",
  },
  {
    skinId: "s1_town_theme_accent_deluxe",
    name: "S1 豪华点缀层",
    type: "season_theme",
    availability: "season",
    seasonId: "casual_s1",
    bpTier: "deluxe",
    bpUnlockLevel: 10,
    townLayer: "accent",
    cssThemeKey: "s1-midnight-sky",
  },
  {
    skinId: "s1_town_theme_facade_std",
    name: "S1 标准外墙层",
    type: "season_theme",
    availability: "season",
    seasonId: "casual_s1",
    bpTier: "standard",
    bpUnlockLevel: 25,
    townLayer: "facade",
    cssThemeKey: "s1-midnight-sky",
  },
  {
    skinId: "s1_town_theme_facade_deluxe",
    name: "S1 豪华外墙层",
    type: "season_theme",
    availability: "season",
    seasonId: "casual_s1",
    bpTier: "deluxe",
    bpUnlockLevel: 25,
    townLayer: "facade",
    cssThemeKey: "s1-midnight-sky",
  },
  {
    skinId: "s1_town_theme_full_std",
    name: "S1 标准完整主题层",
    type: "season_theme",
    availability: "season",
    seasonId: "casual_s1",
    bpTier: "standard",
    bpUnlockLevel: 40,
    townLayer: "full",
    cssThemeKey: "s1-midnight-sky",
  },
  {
    skinId: "s1_town_theme_full_deluxe",
    name: "S1 豪华完整主题层",
    type: "season_theme",
    availability: "season",
    seasonId: "casual_s1",
    bpTier: "deluxe",
    bpUnlockLevel: 40,
    townLayer: "full",
    cssThemeKey: "s1-midnight-sky",
  },
  // --- S2 Town ---
  {
    skinId: "s2_town_theme_env",
    name: "S2 江户樱花·环境层",
    type: "season_theme",
    availability: "season",
    seasonId: "casual_s2",
    bpTier: "free",
    bpUnlockLevel: 1,
    townLayer: "env",
    cssThemeKey: "s2-edo-sakura",
  },
  {
    skinId: "s2_town_theme_accent_std",
    name: "S2 标准点缀层",
    type: "season_theme",
    availability: "season",
    seasonId: "casual_s2",
    bpTier: "standard",
    bpUnlockLevel: 10,
    townLayer: "accent",
    cssThemeKey: "s2-edo-sakura",
  },
  {
    skinId: "s2_town_theme_accent_deluxe",
    name: "S2 豪华点缀层",
    type: "season_theme",
    availability: "season",
    seasonId: "casual_s2",
    bpTier: "deluxe",
    bpUnlockLevel: 10,
    townLayer: "accent",
    cssThemeKey: "s2-edo-sakura",
  },
  {
    skinId: "s2_town_theme_facade_std",
    name: "S2 标准外墙层",
    type: "season_theme",
    availability: "season",
    seasonId: "casual_s2",
    bpTier: "standard",
    bpUnlockLevel: 25,
    townLayer: "facade",
    cssThemeKey: "s2-edo-sakura",
  },
  {
    skinId: "s2_town_theme_facade_deluxe",
    name: "S2 豪华外墙层",
    type: "season_theme",
    availability: "season",
    seasonId: "casual_s2",
    bpTier: "deluxe",
    bpUnlockLevel: 25,
    townLayer: "facade",
    cssThemeKey: "s2-edo-sakura",
  },
  {
    skinId: "s2_town_theme_full_std",
    name: "S2 标准完整主题层",
    type: "season_theme",
    availability: "season",
    seasonId: "casual_s2",
    bpTier: "standard",
    bpUnlockLevel: 40,
    townLayer: "full",
    cssThemeKey: "s2-edo-sakura",
  },
  {
    skinId: "s2_town_theme_full_deluxe",
    name: "S2 豪华完整主题层",
    type: "season_theme",
    availability: "season",
    seasonId: "casual_s2",
    bpTier: "deluxe",
    bpUnlockLevel: 40,
    townLayer: "full",
    cssThemeKey: "s2-edo-sakura",
  },
  {
    skinId: "deco_demo_bench",
    name: "公园长椅（演示）",
    type: "decoration",
    availability: "permanent",
    priceGems: 50,
  },
];

const catalogById = new Map(CASUAL_SKIN_CATALOG.map((s) => [s.skinId, s]));

export function getSkinCatalogEntry(skinId: string): CasualSkinCatalogEntry | undefined {
  return catalogById.get(skinId);
}

export function listPublicSkinCatalog() {
  return CASUAL_SKIN_CATALOG.map((s) => ({
    skinId: s.skinId,
    name: s.name,
    type: s.type,
    availability: s.availability,
    seasonId: s.seasonId,
    bpTier: s.bpTier ?? null,
    bpUnlockLevel: s.bpUnlockLevel ?? null,
    townLayer: s.townLayer,
    cssThemeKey: s.cssThemeKey,
    appliesToGameIds: s.appliesToGameIds ?? [],
    priceGems: s.priceGems,
    shopSkuId: s.shopSkuId,
  }));
}

/** Pass 领取时按赛季解析皮肤奖励 token */
export function resolveSeasonPassSkinId(
  seasonId: string,
  token:
    | "visual_bundle_standard"
    | "visual_bundle_deluxe"
    | "town_accent_standard"
    | "town_accent_deluxe"
    | "town_facade_standard"
    | "town_facade_deluxe"
    | "ui_standard"
    | "ui_deluxe"
    | "town_full_standard"
    | "town_full_deluxe"
): string | null {
  const n = seasonId.trim().toLowerCase();
  const isS2 = n === "casual_s2" || n.endsWith("_s2") || n.startsWith("casual_s2_");
  const prefix = isS2 ? "s2" : "s1";
  const map: Record<string, string> = {
    visual_bundle_standard: `${prefix}_visual_bundle_std`,
    visual_bundle_deluxe: `${prefix}_visual_bundle_deluxe`,
    town_accent_standard: `${prefix}_town_theme_accent_std`,
    town_accent_deluxe: `${prefix}_town_theme_accent_deluxe`,
    town_facade_standard: `${prefix}_town_theme_facade_std`,
    town_facade_deluxe: `${prefix}_town_theme_facade_deluxe`,
    ui_standard: `ui_${prefix}_standard`,
    ui_deluxe: `ui_${prefix}_deluxe`,
    town_full_standard: `${prefix}_town_theme_full_std`,
    town_full_deluxe: `${prefix}_town_theme_full_deluxe`,
  };
  return map[token] ?? null;
}

export function seasonEnvSkinIds(seasonId: string): string[] {
  const n = seasonId.trim().toLowerCase();
  const isS2 = n === "casual_s2" || n.endsWith("_s2") || n.startsWith("casual_s2_");
  if (isS2) return ["ui_s2_env", "s2_town_theme_env"];
  return ["ui_s1_env", "s1_town_theme_env"];
}

export function deluxeInstantSkinIds(seasonId: string): string[] {
  const n = seasonId.trim().toLowerCase();
  const isS2 = n === "casual_s2" || n.endsWith("_s2") || n.startsWith("casual_s2_");
  if (isS2) return ["s2_visual_bundle_deluxe", "ui_s2_deluxe"];
  return ["s1_visual_bundle_deluxe", "ui_s1_deluxe"];
}
