import {
  CHESS_HERO_CATALOG,
  CHESS_LOADOUT_SLOTS,
  RANK_ROAD_HERO_IDS,
} from "../data/heroCatalog";
import { freezeLoadout } from "./createGame";

export type OwnedHero = {
  uid: string;
  heroId: string;
  copies: number;
  source: "rank_road" | "craft" | "match_drop";
  disenchantable: boolean;
};

export function grantRankRoadRoster(uid: string, existing: OwnedHero[]): OwnedHero[] {
  const ownedIds = new Set(existing.map((row) => row.heroId));
  const granted = [...existing];
  for (const heroId of RANK_ROAD_HERO_IDS) {
    if (ownedIds.has(heroId)) continue;
    granted.push({
      uid,
      heroId,
      copies: 1,
      source: "rank_road",
      disenchantable: false,
    });
  }
  return granted;
}

export function assertOwnedLoadout(owned: OwnedHero[], loadout: string[]): string[] {
  const frozen = freezeLoadout(loadout);
  const ownedIds = new Set(owned.filter((row) => row.copies > 0).map((row) => row.heroId));
  for (const heroId of frozen) {
    if (!ownedIds.has(heroId)) {
      throw new Error(`未拥有英雄: ${heroId}`);
    }
  }
  return frozen;
}

export function catalogAlbum(owned: OwnedHero[]) {
  const ownedMap = new Map(owned.map((row) => [row.heroId, row]));
  return CHESS_HERO_CATALOG.map((hero) => {
    const row = ownedMap.get(hero.heroId);
    return {
      arenaId: "chessArena" as const,
      cardId: hero.heroId,
      artId: hero.assetPath,
      name: hero.name,
      cost: 0,
      type: "hero" as const,
      rarity: hero.rarity,
      ownedCopies: row?.copies ?? 0,
      playableCap: 1,
      source: row?.source ?? "craft",
      newUntilSeen: false,
      role: hero.role,
      rankRoad: hero.rankRoad,
    };
  });
}

export { CHESS_LOADOUT_SLOTS };
