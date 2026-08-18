/**
 * 对局快照。Boss 只来自 seed；loadout 只写入队伍，不回写 Boss。
 */

import {
  CHESS_HERO_MAP,
  CHESS_LOADOUT_SLOTS,
  ChessHeroConfig,
  RANK_ROAD_HERO_IDS,
} from "../data/heroCatalog";
import { expandHourlySeed, FixedBossSnapshot, HourlySeedPreview } from "./seedBoss";

export type ChessHeroSnapshot = {
  uid: string;
  monsterId: string;
  heroId: string;
  name: string;
  rarity: ChessHeroConfig["rarity"];
  class: ChessHeroConfig["role"];
  assetPath: string;
  level: number;
  stars: number;
  stats: {
    hp: { current: number; max: number };
    attack: number;
    defense: number;
    speed: number;
  };
  q: number;
  r: number;
  status: "normal";
};

export type ChessGameBoss = FixedBossSnapshot & {
  uid: "boss";
  rarity: "legendary";
  class: "boss";
  level: 1;
  stars: 1;
  stats: {
    hp: { current: number; max: number };
    attack: number;
    defense: number;
    speed: number;
  };
  q: number;
  r: number;
  status: "normal";
};

export type ChessGameState = {
  gameId: string;
  matchId?: string;
  stageId: string;
  uid: string;
  seedId: string;
  /** 仅展示/结算参考，禁止作为 Boss 输入。 */
  teamPower: number;
  team: ChessHeroSnapshot[];
  boss: ChessGameBoss;
  map: HourlySeedPreview["map"];
  loadout: string[];
  status: 0 | 1 | 2 | 3;
  score: number;
  lastUpdate: string;
  createdAt: string;
  round: number;
};

export type CreateChessGameInput = {
  gameId: string;
  seed: string;
  loadout: string[];
  uid?: string;
  matchId?: string;
};

const TEAM_SLOTS: Array<{ q: number; r: number }> = [
  { q: 1, r: 2 },
  { q: 1, r: 3 },
  { q: 1, r: 4 },
  { q: 2, r: 3 },
];

export function snapshotHero(
  heroId: string,
  uid: string,
  slot: number,
): ChessHeroSnapshot {
  const config = CHESS_HERO_MAP[heroId];
  if (!config) {
    throw new Error(`未知英雄: ${heroId}`);
  }
  const pos = TEAM_SLOTS[slot] ?? TEAM_SLOTS[0];
  return {
    uid,
    monsterId: config.heroId,
    heroId: config.heroId,
    name: config.name,
    rarity: config.rarity,
    class: config.role,
    assetPath: config.assetPath,
    level: 1,
    stars: 1,
    stats: {
      hp: { current: config.baseHp, max: config.baseHp },
      attack: config.baseDamage,
      defense: config.baseDefense,
      speed: config.baseSpeed,
    },
    q: pos.q,
    r: pos.r,
    status: "normal",
  };
}

export function freezeLoadout(heroIds: string[]): string[] {
  if (heroIds.length !== CHESS_LOADOUT_SLOTS) {
    throw new Error(`负荷必须是 ${CHESS_LOADOUT_SLOTS} 槽`);
  }
  const unique = new Set(heroIds);
  if (unique.size !== heroIds.length) {
    throw new Error("负荷英雄不可重复");
  }
  for (const heroId of heroIds) {
    if (!CHESS_HERO_MAP[heroId]) {
      throw new Error(`未知英雄: ${heroId}`);
    }
  }
  return [...heroIds];
}

export function defaultRankRoadLoadout(): string[] {
  return [...RANK_ROAD_HERO_IDS];
}

export function computeDisplayTeamPower(team: ChessHeroSnapshot[]): number {
  return team.reduce((sum, hero) => {
    return sum + hero.stats.hp.max + hero.stats.attack * 2 + hero.stats.defense * 1.5;
  }, 0);
}

function bakeBoss(preview: HourlySeedPreview): ChessGameBoss {
  const { boss } = preview;
  return {
    ...boss,
    uid: "boss",
    rarity: "legendary",
    class: "boss",
    level: 1,
    stars: 1,
    stats: {
      hp: { current: boss.hp, max: boss.hp },
      attack: boss.damage,
      defense: boss.defense,
      speed: boss.speed,
    },
    q: boss.position.q,
    r: boss.position.r,
    status: "normal",
  };
}

/**
 * 创建对局。Boss 只由 seed 决定；不同 loadout 不得改变 Boss HP。
 */
export function createGameState(input: CreateChessGameInput): ChessGameState {
  const uid = input.uid ?? "player";
  const loadout = freezeLoadout(input.loadout);
  const preview = expandHourlySeed(input.seed);
  const team = loadout.map((heroId, index) => snapshotHero(heroId, uid, index));
  const now = new Date().toISOString();
  return {
    gameId: input.gameId,
    matchId: input.matchId,
    stageId: preview.map.mapId,
    uid,
    seedId: input.seed,
    teamPower: computeDisplayTeamPower(team),
    team,
    boss: bakeBoss(preview),
    map: preview.map,
    loadout,
    status: 0,
    score: 0,
    lastUpdate: now,
    createdAt: now,
    round: 1,
  };
}

/** 交卷分数：克制只加分，不改 Boss 数值。 */
export function scoreFinishedGame(game: ChessGameState, rounds = 4): number {
  const teamAttack = game.team.reduce((sum, hero) => sum + hero.stats.attack, 0);
  const bossHp = game.boss.stats.hp.max;
  const pressure = Math.max(0, teamAttack * 4 - game.boss.stats.defense * 2);
  const cleared = pressure >= bossHp;
  const base = cleared ? 1200 : Math.floor((pressure / bossHp) * 800);
  return base + rounds * 40;
}
