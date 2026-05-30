/**

 * 方案 A：单张村景原画 + 热区 + 主题分层（env → accent → facade → full）

 */

import type { TownBpLayer } from "./casualTownThemeCatalog";
import {
  TOWN_S1_BUILDING_OVERLAYS,
  type TownBuildingOverlayDef,
  type TownBuildingOverlayLayout,
} from "./townBuildingOverlays";



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

  /** 建筑解锁后叠放的透明 PNG */
  buildingOverlays: readonly TownBuildingOverlayDef[];

  /**
   * fullCanvas：与母图同尺寸差分增量（base 已有建筑，解锁叠装饰）
   * hotspot：热区矩形内显示整栋建筑 PNG（base 该处须为空地/工地）
   */
  buildingOverlayLayout?: TownBuildingOverlayLayout;

}



/** 校准模式下优先显示的建筑（与 S1 母图地标一一对应） */
export const TOWN_MAP_CALIBRATION_ANCHORS = [
  "town_square",
  "champion_plaza",
  "honor_gallery",
  "streak_monument",
  "battle_board",
  "legend_hall",
  "season_archive",
  "rival_hall",
  "game_museum",
  "arena",
] as const;



const S1_BASE = new URL("./assets/illustration/casual_village_s1.png", import.meta.url).href;



/** S1 默认村景 */

export const TOWN_ILLUSTRATION_S1: TownIllustrationConfig = {

  id: "casual_village_s1",

  baseSrc: S1_BASE,

  src: S1_BASE,

  aspectRatio: 1376 / 944,

  previewAllUnlocked: false,

  calibrationBuildingIds: [...TOWN_MAP_CALIBRATION_ANCHORS],

  buildingOverlays: TOWN_S1_BUILDING_OVERLAYS,

  /** 空地 base + 解锁盖房时用 hotspot；当前民房 base 用 fullCanvas + 仅增量 overlay */
  buildingOverlayLayout: "fullCanvas",

  fxLayers: [

    { layer: "accent", cssFx: "accent", opacity: 1 },

    { layer: "facade", cssFx: "facade", opacity: 1 },

    { layer: "full", cssFx: "full", opacity: 1 },

  ],

  // S1 母图地标映射（casual_village_s1.png，比例 0–1，左上为原点）
  // 喷泉 | 奖杯 | 荣誉通道 | 风车 | 公告牌 | 紫晶殿 | 宝箱档案 | 左下路径 | 招财猫 | 竞技场
  hotspots: [
    { buildingId: "town_square", x: 0.35, y: 0.29, w: 0.3, h: 0.25, onMap: true },
    { buildingId: "champion_plaza", x: 0.39, y: 0.06, w: 0.22, h: 0.2, onMap: true },
    { buildingId: "honor_gallery", x: 0.33, y: 0.1, w: 0.34, h: 0.14, onMap: true },
    { buildingId: "streak_monument", x: 0.04, y: 0.04, w: 0.15, h: 0.19, onMap: true },
    { buildingId: "battle_board", x: 0.2, y: 0.14, w: 0.13, h: 0.17, onMap: true },
    { buildingId: "legend_hall", x: 0.06, y: 0.36, w: 0.19, h: 0.21, onMap: true },
    { buildingId: "season_archive", x: 0.14, y: 0.58, w: 0.22, h: 0.24, onMap: true },
    { buildingId: "rival_hall", x: 0.2, y: 0.5, w: 0.14, h: 0.14, onMap: true },
    { buildingId: "game_museum", x: 0.55, y: 0.3, w: 0.24, h: 0.28, onMap: true },
    { buildingId: "arena", x: 0.62, y: 0.52, w: 0.34, h: 0.38, onMap: true },
    { buildingId: "visitor_log", x: 0.72, y: 0.15, w: 0.12, h: 0.1, onMap: false },
    { buildingId: "skin_exhibition", x: 0.58, y: 0.38, w: 0.14, h: 0.12, onMap: false },
  ],

};



export function getTownIllustrationConfig(seasonId?: string): TownIllustrationConfig {

  void seasonId;

  return TOWN_ILLUSTRATION_S1;

}


