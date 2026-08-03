import { useMemo } from "react";

import { useCasualPlatform } from "../../service/useCasualPlatformManager";
import { pickSeasonIdForUiTheme, resolveCasualUiThemeDataAttr } from "../../theme/casualUiTheme";

import {
  isTownLayerUnlocked,
  townCartoonFilter,
  townGroundTint,
  townSkyGradient,
  type TownBpLayer,
} from "./casualTownThemeCatalog";

export function useCasualTownTheme() {
  const casual = useCasualPlatform();
  const entitlements = casual.skinState?.entitlements ?? {
    seasonId: "casual_s1",
    uiTier: "free" as const,
    townLayer: "env" as const,
    townVariant: "standard" as const,
    passLevel: 1,
    cssThemeKey: "s1-midnight-sky",
  };

  const cssThemeKey = useMemo(() => {
    const seasonId = pickSeasonIdForUiTheme(casual) ?? "casual_s1";
    return resolveCasualUiThemeDataAttr(seasonId) || "s1-midnight-sky";
  }, [casual]);

  return useMemo(
    () => ({
      entitlements,
      skyGradient: townSkyGradient(cssThemeKey),
      groundTint: townGroundTint(entitlements),
      cartoonFilter: townCartoonFilter(entitlements),
      layerUnlocked: (layer: TownBpLayer) => isTownLayerUnlocked(layer, entitlements),
    }),
    [entitlements, cssThemeKey]
  );
}
