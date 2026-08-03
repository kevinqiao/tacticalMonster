import type { CasualPlayerSkinState } from "component/lobby/casual/service/useCasualPlatformManager";

import type { GameVisualComponents, ResolvedGameVisualTheme } from "./gameVisualThemeTypes";

const DEFAULT: ResolvedGameVisualTheme = {
  skinId: "classic_card",
  visualKey: "classic",
  components: { card_face: "classic", card_back: "classic", table_bg: "classic" },
};

export function resolveGameVisualFromPlatform(
  skinState: CasualPlayerSkinState | null,
  gameId: string
): ResolvedGameVisualTheme {
  if (!skinState) return DEFAULT;

  const slot = `game:${gameId}`;
  const skinId =
    skinState.equipped[slot] ??
    skinState.equipped.card_global ??
    (gameId === "solitaire" ? "classic_card" : undefined);

  if (!skinId) return DEFAULT;

  const catalogEntry = skinState.catalog.find((c) => c.skinId === skinId);
  const owned =
    skinState.effectiveOwned.includes(skinId) || skinId === "classic_card";
  if (!owned) return DEFAULT;

  const components =
    (catalogEntry as { componentsByGame?: Record<string, GameVisualComponents> } | undefined)
      ?.componentsByGame?.[gameId] ??
    inferComponentsFromSkinId(skinId, gameId);

  const visualKey =
    components?.card_face ??
    components?.board_bg ??
    components?.piece_set ??
    skinId.replace(/_/g, "_");

  return {
    skinId,
    visualKey,
    components: components ?? DEFAULT.components,
  };
}

function inferComponentsFromSkinId(skinId: string, gameId: string): GameVisualComponents {
  if (skinId.includes("s2") && skinId.includes("deluxe")) {
    return gameId === "block_blast"
      ? { board_bg: "s2_edo_deluxe", piece_set: "s2_edo_deluxe" }
      : { card_face: "s2_edo_deluxe", card_back: "s2_edo_deluxe", table_bg: "s2_edo_deluxe" };
  }
  if (skinId.includes("s2")) {
    return gameId === "block_blast"
      ? { board_bg: "s2_edo", piece_set: "s2_edo" }
      : { card_face: "s2_edo", card_back: "s2_edo", table_bg: "s2_edo" };
  }
  if (skinId.includes("deluxe")) {
    return gameId === "block_blast"
      ? { board_bg: "s1_midnight_deluxe", piece_set: "s1_midnight_deluxe" }
      : {
          card_face: "s1_midnight_deluxe",
          card_back: "s1_midnight_deluxe",
          table_bg: "s1_midnight_deluxe",
        };
  }
  if (skinId.includes("s1") || skinId.includes("visual_bundle")) {
    return gameId === "block_blast"
      ? { board_bg: "s1_midnight", piece_set: "s1_midnight" }
      : { card_face: "s1_midnight", card_back: "s1_midnight", table_bg: "s1_midnight" };
  }
  if (skinId === "shop_steam_punk") {
    return { card_face: "steam_punk", card_back: "steam_punk", table_bg: "steam_punk" };
  }
  return DEFAULT.components;
}
