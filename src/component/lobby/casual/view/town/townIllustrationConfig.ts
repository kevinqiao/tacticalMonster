/**

 * 方案 A：单张村景原画 + 热区 + 主题分层（env → accent → facade → full）

 */

import type { TownBpLayer } from "./casualTownThemeCatalog";



export interface TownIllustrationHotspot {

  buildingId: string;

  x: number;

  y: number;

  w: number;

  h: number;

  /** 主图上有明确地标；false 时仅在下方建筑条中可选 */

  onMap?: boolean;

}



/** 叠层配置：有 src 时用 PNG；否则用 cssFx 演示（正式资源后替换 src） */

export interface TownIllustrationFxLayer {

  layer: TownBpLayer;

  src?: string;

  deluxeSrc?: string;

  cssFx?: TownBpLayer;

  opacity?: number;

  /** full 演示：同底图强化叠一层 */

  useBaseImageBoost?: boolean;

}



export interface TownIllustrationConfig {

  id: string;

  baseSrc: string;

  /** @deprecated 使用 baseSrc */

  src: string;

  aspectRatio: number;

  previewAllUnlocked: boolean;

  hotspots: TownIllustrationHotspot[];

  fxLayers: TownIllustrationFxLayer[];

  calibrationBuildingIds: readonly string[] | null;

}



export const TOWN_MAP_CALIBRATION_ANCHORS = [

  "champion_plaza",

  "streak_monument",

  "arena",

  "game_museum",

  "rival_hall",

  "legend_hall",

  "season_archive",

] as const;



const S1_BASE = new URL("./assets/illustration/casual_village_s1.png", import.meta.url).href;



/** S1 默认村景 */

export const TOWN_ILLUSTRATION_S1: TownIllustrationConfig = {

  id: "casual_village_s1",

  baseSrc: S1_BASE,

  src: S1_BASE,

  aspectRatio: 1376 / 944,

  previewAllUnlocked: true,

  calibrationBuildingIds: [...TOWN_MAP_CALIBRATION_ANCHORS],

  fxLayers: [

    { layer: "accent", cssFx: "accent", opacity: 1 },

    { layer: "facade", cssFx: "facade", opacity: 1 },

    { layer: "full", cssFx: "full", opacity: 1 },

  ],

  hotspots: [

    { buildingId: "town_square", x: 0.3, y: 0.38, w: 0.28, h: 0.22, onMap: true },

    { buildingId: "champion_plaza", x: 0.4, y: 0.44, w: 0.2, h: 0.16, onMap: true },

    { buildingId: "legend_hall", x: 0.08, y: 0.11, w: 0.16, h: 0.16, onMap: true },

    { buildingId: "season_archive", x: 0.05, y: 0.44, w: 0.18, h: 0.16, onMap: true },

    { buildingId: "honor_gallery", x: 0.73, y: 0.57, w: 0.2, h: 0.18, onMap: true },

    { buildingId: "game_museum", x: 0.7, y: 0.35, w: 0.16, h: 0.14, onMap: true },

    { buildingId: "arena", x: 0.66, y: 0.67, w: 0.18, h: 0.18, onMap: true },

    { buildingId: "streak_monument", x: 0.46, y: 0.16, w: 0.18, h: 0.2, onMap: true },

    { buildingId: "visitor_log", x: 0.78, y: 0.14, w: 0.12, h: 0.1, onMap: false },

    { buildingId: "skin_exhibition", x: 0.82, y: 0.28, w: 0.12, h: 0.1, onMap: false },

    { buildingId: "rival_hall", x: 0.29, y: 0.72, w: 0.18, h: 0.16, onMap: true },

    { buildingId: "battle_board", x: 0.22, y: 0.72, w: 0.12, h: 0.1, onMap: false },

  ],

};



export function getTownIllustrationConfig(seasonId?: string): TownIllustrationConfig {

  void seasonId;

  return TOWN_ILLUSTRATION_S1;

}


