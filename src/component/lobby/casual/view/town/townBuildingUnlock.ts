import { getTownBuilding } from "./casualTownBuildingCatalog";

/** Casual Town 插图原型 — 非 Portal Mayfield（League-first）主路径。 */
export interface TownBuildingUnlockContext {
  townLevel: number;
  previewAllUnlocked: boolean;
  /** 服务端成就解锁的建筑 id（有则优先） */
  unlockedBuildingIds?: ReadonlySet<string>;
}

/** 建筑是否已在 Town 中解锁（叠层 / 热区共用） */
export function isTownBuildingUnlocked(
  buildingId: string,
  ctx: TownBuildingUnlockContext
): boolean {
  if (ctx.previewAllUnlocked) return true;
  if (ctx.unlockedBuildingIds?.has(buildingId)) return true;
  const def = getTownBuilding(buildingId);
  if (!def) return false;
  return ctx.townLevel >= def.visibleFromStage;
}
