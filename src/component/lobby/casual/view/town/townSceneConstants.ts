/** 城镇场景共享参数（对齐推荐示意图 v6） */
export const TOWN_SCENE = {
  sceneW: 480,
  sceneH: 340,
  grid: 7,
  tileW: 52,
  tileH: 30,
  originX: 480 / 2,
  originY: 44,
  /** 建筑主体（仅 decor）缩放 */
  buildingBaseScale: 0.58,
  /** 预览：全部建筑视为已解锁 */
  previewAllUnlocked: true,
} as const;
