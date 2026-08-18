/**
 * chessArena Boss 目录。数值固定；禁止按 teamPower 缩放。
 */

export type ChessBossConfig = {
  bossId: string;
  monsterId: string;
  name: string;
  tags: string[];
  hp: number;
  damage: number;
  defense: number;
  speed: number;
  assetPath: string;
  position: { q: number; r: number };
};

export const CHESS_BOSS_CATALOG: ChessBossConfig[] = [
  {
    bossId: "boss_warden",
    monsterId: "monster_warden",
    name: "典狱官",
    tags: ["高防", "召唤"],
    hp: 2400,
    damage: 90,
    defense: 70,
    speed: 10,
    assetPath: "/chess/bosses/warden",
    position: { q: 6, r: 3 },
  },
  {
    bossId: "boss_ember",
    monsterId: "monster_ember",
    name: "烬核",
    tags: ["爆发", "火焰"],
    hp: 1800,
    damage: 130,
    defense: 32,
    speed: 14,
    assetPath: "/chess/bosses/ember",
    position: { q: 6, r: 4 },
  },
  {
    bossId: "boss_tide",
    monsterId: "monster_tide",
    name: "潮汐兽",
    tags: ["控制", "范围"],
    hp: 2200,
    damage: 80,
    defense: 48,
    speed: 9,
    assetPath: "/chess/bosses/tide",
    position: { q: 7, r: 3 },
  },
  {
    bossId: "boss_shade",
    monsterId: "monster_shade",
    name: "影织者",
    tags: ["刺客", "隐匿"],
    hp: 1600,
    damage: 150,
    defense: 24,
    speed: 18,
    assetPath: "/chess/bosses/shade",
    position: { q: 6, r: 2 },
  },
];

export const CHESS_BOSS_MAP: Record<string, ChessBossConfig> = Object.fromEntries(
  CHESS_BOSS_CATALOG.map((boss) => [boss.bossId, boss]),
);

export function getBossConfig(bossId: string): ChessBossConfig | undefined {
  return CHESS_BOSS_MAP[bossId];
}
