import { useCasualPlatform } from "component/lobby/casual/service/useCasualPlatformManager";
import { useMemo } from "react";

import { resolveGameVisualFromPlatform } from "./resolveGameVisualTheme";
import type { ResolvedGameVisualTheme } from "./gameVisualThemeTypes";

export function useGameVisualTheme(gameId: string): ResolvedGameVisualTheme {
  const { skinState } = useCasualPlatform();
  return useMemo(
    () => resolveGameVisualFromPlatform(skinState, gameId),
    [skinState, gameId]
  );
}
