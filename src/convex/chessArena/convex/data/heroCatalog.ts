/**
 * chessArena 精简英雄目录（文件目录，不走 TM 缩放）。
 * 段位路基础 4 人必须能通关本段小时题，且不可分解。
 */

export type ChessHeroRarity = "common" | "rare" | "epic" | "legendary";
export type ChessHeroRole = "tank" | "guard" | "assassin" | "healer" | "mage";

export type ChessHeroConfig = {
  heroId: string;
  name: string;
  role: ChessHeroRole;
  rarity: ChessHeroRarity;
  baseHp: number;
  baseDamage: number;
  baseDefense: number;
  baseSpeed: number;
  assetPath: string;
  rankRoad: boolean;
};

export const CHESS_HERO_CATALOG: ChessHeroConfig[] = [
  {
    heroId: "hero_guard",
    name: "守卫",
    role: "guard",
    rarity: "common",
    baseHp: 420,
    baseDamage: 48,
    baseDefense: 36,
    baseSpeed: 10,
    assetPath: "/chess/heroes/guard",
    rankRoad: true,
  },
  {
    heroId: "hero_assassin",
    name: "刺客",
    role: "assassin",
    rarity: "common",
    baseHp: 280,
    baseDamage: 72,
    baseDefense: 18,
    baseSpeed: 16,
    assetPath: "/chess/heroes/assassin",
    rankRoad: true,
  },
  {
    heroId: "hero_healer",
    name: "治疗",
    role: "healer",
    rarity: "common",
    baseHp: 300,
    baseDamage: 32,
    baseDefense: 22,
    baseSpeed: 12,
    assetPath: "/chess/heroes/healer",
    rankRoad: true,
  },
  {
    heroId: "hero_tank",
    name: "坦克",
    role: "tank",
    rarity: "common",
    baseHp: 560,
    baseDamage: 28,
    baseDefense: 52,
    baseSpeed: 8,
    assetPath: "/chess/heroes/tank",
    rankRoad: true,
  },
  {
    heroId: "hero_mage",
    name: "法师",
    role: "mage",
    rarity: "rare",
    baseHp: 260,
    baseDamage: 88,
    baseDefense: 14,
    baseSpeed: 11,
    assetPath: "/chess/heroes/mage",
    rankRoad: false,
  },
  {
    heroId: "hero_warden",
    name: "典狱副手",
    role: "guard",
    rarity: "epic",
    baseHp: 480,
    baseDamage: 60,
    baseDefense: 44,
    baseSpeed: 11,
    assetPath: "/chess/heroes/warden",
    rankRoad: false,
  },
];

export const CHESS_HERO_MAP: Record<string, ChessHeroConfig> = Object.fromEntries(
  CHESS_HERO_CATALOG.map((hero) => [hero.heroId, hero]),
);

export const RANK_ROAD_HERO_IDS = CHESS_HERO_CATALOG.filter((hero) => hero.rankRoad).map(
  (hero) => hero.heroId,
);

export const CHESS_LOADOUT_SLOTS = 4;

export function getHeroConfig(heroId: string): ChessHeroConfig | undefined {
  return CHESS_HERO_MAP[heroId];
}
