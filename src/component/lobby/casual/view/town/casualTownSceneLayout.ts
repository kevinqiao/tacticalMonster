import type { CasualTownAssetId } from "./assets/casualTownAssetCatalog";
import { TOWN_SCENE } from "./townSceneConstants";

export interface TownSceneSlot {
  buildingId: string;
  col: number;
  row: number;
  decorId: CasualTownAssetId;
  scale?: number;
  decorLift?: number;
}

export const TOWN_SCENE_GRID = TOWN_SCENE.grid;

/** 对称 3×3 内环 + 三角外角（仅装饰模型，无底座 tile） */
export const TOWN_SCENE_SLOTS: TownSceneSlot[] = [
  { buildingId: "season_archive", col: 1, row: 1, decorId: "purple_season_banner", scale: 0.88 },
  { buildingId: "champion_plaza", col: 3, row: 1, decorId: "golden_trophy_statue", scale: 0.9 },
  { buildingId: "visitor_log", col: 5, row: 1, decorId: "heart_social_ornament", scale: 0.86 },
  { buildingId: "honor_gallery", col: 1, row: 3, decorId: "badge_crystal_pedestal", scale: 0.88 },
  { buildingId: "town_square", col: 3, row: 3, decorId: "fountain", scale: 1.12 },
  { buildingId: "game_museum", col: 5, row: 3, decorId: "cat_statue", scale: 0.88 },
  { buildingId: "battle_board", col: 1, row: 5, decorId: "wooden_challenge_board", scale: 0.84 },
  { buildingId: "streak_monument", col: 3, row: 5, decorId: "treasure_chest", scale: 0.88 },
  { buildingId: "arena", col: 5, row: 5, decorId: "golden_trophy_statue", scale: 0.86 },
  { buildingId: "legend_hall", col: 0, row: 0, decorId: "windmill_ornament", scale: 0.9 },
  { buildingId: "skin_exhibition", col: 6, row: 0, decorId: "shop_canopy_stand", scale: 0.86 },
  { buildingId: "rival_hall", col: 0, row: 6, decorId: "dog_statue", scale: 0.84 },
];

/** 外圈点缀：填缝不抢建筑 */
export const TOWN_AMBIENT_DECOR: Array<{ col: number; row: number; decorId: CasualTownAssetId; scale?: number }> = [
  { col: 2, row: 0, decorId: "flower_bed_cluster", scale: 0.62 },
  { col: 4, row: 0, decorId: "street_lamp", scale: 0.58 },
  { col: 6, row: 6, decorId: "flower_arch", scale: 0.6 },
  { col: 2, row: 6, decorId: "park_bench", scale: 0.58 },
  { col: 4, row: 6, decorId: "flower_bed_cluster", scale: 0.6 },
  { col: 0, row: 3, decorId: "white_picket_fence", scale: 0.55 },
  { col: 6, row: 3, decorId: "white_picket_fence", scale: 0.55 },
];

export function sceneDepth(col: number, row: number): number {
  return col + row;
}
