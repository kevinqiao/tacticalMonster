import type { CasualSkinEntitlements } from "../../service/useCasualPlatformManager";

import type { CasualTownAssetId } from "./assets/casualTownAssetCatalog";

export type TownBpLayer = "env" | "accent" | "facade" | "full";

export interface CasualTownLayoutItem {
  assetId: CasualTownAssetId;
  gridX: number;
  gridY: number;
  locked?: boolean;
}

/** Clash Royale 风格：明亮卡通天空（城镇场景专用，不受暗色大厅影响） */
export function townSkyGradient(cssThemeKey: string): string {
  if (cssThemeKey === "s2-edo-sakura") {
    return "linear-gradient(180deg, #fdf8f6 0%, #f5e6ea 45%, #ecd5dc 100%)";
  }
  return "linear-gradient(180deg, #4db3f2 0%, #7ec8f8 32%, #a8ddf5 52%, #c5e89a 78%, #7ec850 100%)";
}

export function townGroundTint(entitlements: CasualSkinEntitlements): string {
  const deluxe = entitlements.townVariant === "deluxe" ? 1.12 : 1;
  if (entitlements.cssThemeKey === "s2-edo-sakura") {
    return `linear-gradient(180deg, transparent 40%, rgba(122, 158, 126, ${0.22 * deluxe}) 100%)`;
  }
  return `radial-gradient(ellipse 90% 70% at 50% 85%, rgba(90, 160, 50, ${0.28 * deluxe}) 0%, transparent 70%)`;
}

/** 卡通饱和滤镜（更接近 CR 村庄质感） */
export function townCartoonFilter(entitlements: CasualSkinEntitlements): string {
  if (entitlements.townVariant === "deluxe") {
    return "saturate(1.28) brightness(1.12) contrast(1.06)";
  }
  return "saturate(1.2) brightness(1.08) contrast(1.03)";
}

export function isTownLayerUnlocked(
  required: TownBpLayer,
  entitlements: CasualSkinEntitlements
): boolean {
  const order: TownBpLayer[] = ["env", "accent", "facade", "full"];
  const have = entitlements.townLayer === "none" ? -1 : order.indexOf(entitlements.townLayer);
  const need = order.indexOf(required);
  return have >= need;
}
