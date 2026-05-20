import type { CasualSkinEntitlements } from "../../service/useCasualPlatformManager";

import {
  isTownLayerUnlocked,
  type TownBpLayer,
} from "./casualTownThemeCatalog";
import type { TownIllustrationConfig, TownIllustrationFxLayer } from "./townIllustrationConfig";

export const TOWN_BP_LAYER_ORDER: TownBpLayer[] = ["env", "accent", "facade", "full"];

export const TOWN_BP_LAYER_LABELS: Record<TownBpLayer, string> = {
  env: "环境 env",
  accent: "点缀 accent",
  facade: "外墙 facade",
  full: "完整 full",
};

export function buildPreviewEntitlements(
  townLayer: TownBpLayer,
  townVariant: "standard" | "deluxe" = "standard",
  base?: Partial<CasualSkinEntitlements>
): CasualSkinEntitlements {
  return {
    seasonId: base?.seasonId ?? "casual_s1",
    uiTier: base?.uiTier ?? "free",
    townLayer,
    townVariant,
    passLevel: base?.passLevel ?? 1,
    cssThemeKey: base?.cssThemeKey ?? "s1-midnight-sky",
  };
}

/** 预览条覆盖 entitlement；null 表示跟随 BP 真实档位 */
export function resolveTownEntitlements(
  live: CasualSkinEntitlements,
  preview: { townLayer: TownBpLayer; townVariant?: "standard" | "deluxe" } | null
): CasualSkinEntitlements {
  if (!preview) return live;
  return buildPreviewEntitlements(
    preview.townLayer,
    preview.townVariant ?? live.townVariant,
    live
  );
}

export interface ResolvedTownFxLayer {
  layer: TownBpLayer;
  cssFx: NonNullable<TownIllustrationFxLayer["cssFx"]>;
  /** full 档可用同图强化滤镜模拟（正式资源到位后换 src） */
  imageSrc?: string;
  imageFilter?: string;
  opacity: number;
}

export function resolveVisibleFxLayers(
  config: TownIllustrationConfig,
  entitlements: CasualSkinEntitlements
): ResolvedTownFxLayer[] {
  const deluxe = entitlements.townVariant === "deluxe";
  const out: ResolvedTownFxLayer[] = [];

  for (const fx of config.fxLayers) {
    if (!isTownLayerUnlocked(fx.layer, entitlements)) continue;

    if (fx.src || fx.deluxeSrc) {
      const imageSrc = deluxe && fx.deluxeSrc ? fx.deluxeSrc : fx.src;
      if (imageSrc) {
        out.push({
          layer: fx.layer,
          cssFx: fx.cssFx ?? fx.layer,
          imageSrc,
          opacity: fx.opacity ?? 1,
        });
        continue;
      }
    }

    if (fx.cssFx) {
      out.push({
        layer: fx.layer,
        cssFx: fx.cssFx,
        opacity: fx.opacity ?? 1,
      });
    }
  }

  return out;
}

export function townLayerBadge(entitlements: CasualSkinEntitlements): string {
  const v = entitlements.townVariant === "deluxe" ? " · 豪华" : "";
  if (entitlements.townLayer === "none") return `未解锁${v}`;
  return `${TOWN_BP_LAYER_LABELS[entitlements.townLayer]}${v}`;
}

export function effectiveTownBpLayer(
  entitlements: CasualSkinEntitlements
): TownBpLayer {
  if (entitlements.townLayer === "none") return "env";
  return entitlements.townLayer;
}

/** 演示用：各档差异明显的天空（正式资源后可改回统一 sky + PNG 叠层） */
export function townLayerSkyGradient(
  layer: TownBpLayer,
  cssThemeKey: string,
  deluxe: boolean
): string {
  if (cssThemeKey === "s2-edo-sakura") {
    switch (layer) {
      case "env":
        return "linear-gradient(180deg, #f0eae8 0%, #e8dce0 55%, #d8c8d0 100%)";
      case "accent":
        return "linear-gradient(180deg, #fff5f2 0%, #f8d8e4 40%, #e8b8c8 75%, #c8a0b0 100%)";
      case "facade":
        return "linear-gradient(180deg, #fce8f0 0%, #e8a8c0 35%, #d08098 70%, #a86078 100%)";
      case "full":
        return deluxe
          ? "linear-gradient(180deg, #2a1020 0%, #c84878 30%, #ff98b8 55%, #ffd0e0 100%)"
          : "linear-gradient(180deg, #3a1830 0%, #b04068 35%, #f080a0 60%, #ffc8d8 100%)";
    }
  }
  switch (layer) {
    case "env":
      return "linear-gradient(180deg, #6a9ec8 0%, #94bdd8 38%, #a8c890 72%, #5a9438 100%)";
    case "accent":
      return "linear-gradient(180deg, #4db8ff 0%, #8ad0ff 22%, #ffe680 52%, #9ad85a 82%, #4a9e28 100%)";
    case "facade":
      return "linear-gradient(180deg, #3898e8 0%, #70c0f8 25%, #ffc860 55%, #78c848 85%, #3d8820 100%)";
    case "full":
      return deluxe
        ? "linear-gradient(180deg, #1a1848 0%, #ff6040 22%, #ffd040 42%, #90e050 72%, #287018 100%)"
        : "linear-gradient(180deg, #281858 0%, #e85038 25%, #f0c030 48%, #78b838 78%, #306818 100%)";
  }
}

export function townLayerGroundTint(
  layer: TownBpLayer,
  cssThemeKey: string,
  deluxe: boolean
): string {
  const boost = deluxe ? 1.25 : 1;
  if (cssThemeKey === "s2-edo-sakura") {
    const a = 0.18 * boost;
    return `radial-gradient(ellipse 95% 75% at 50% 88%, rgba(180, 100, 130, ${a}) 0%, transparent 68%)`;
  }
  switch (layer) {
    case "env":
      return `radial-gradient(ellipse 90% 65% at 50% 90%, rgba(70, 130, 45, ${0.2 * boost}) 0%, transparent 70%)`;
    case "accent":
      return `radial-gradient(ellipse 95% 70% at 50% 88%, rgba(255, 200, 60, ${0.28 * boost}) 0%, transparent 65%)`;
    case "facade":
      return `radial-gradient(ellipse 100% 75% at 50% 85%, rgba(80, 180, 255, ${0.22 * boost}) 0%, transparent 62%)`;
    case "full":
      return `radial-gradient(ellipse 110% 80% at 50% 92%, rgba(255, 140, 40, ${0.38 * boost}) 0%, transparent 58%)`;
  }
}

export function townLayerBaseFilter(
  layer: TownBpLayer,
  deluxe: boolean
): string {
  const d = deluxe ? " brightness(1.06) contrast(1.04)" : "";
  switch (layer) {
    case "env":
      return `saturate(0.88) brightness(0.94) contrast(0.98)${d}`;
    case "accent":
      return `saturate(1.12) brightness(1.06)${d}`;
    case "facade":
      return `saturate(1.22) brightness(1.08) hue-rotate(-6deg)${d}`;
    case "full":
      return `saturate(1.42) brightness(1.14) contrast(1.1) hue-rotate(10deg)${d}`;
  }
}
