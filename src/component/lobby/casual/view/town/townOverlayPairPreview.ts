/** MJ 差分工作流：raw/pairs/{buildingId}_before|after.png */
export type TownOverlayPairSide = "before" | "after";

export type TownOverlayMergeBaseSide = "game" | TownOverlayPairSide;

export interface TownOverlayMergePreviewState {
  enabled: boolean;
  buildingId: string;
  /** game = 当前 config.baseSrc；before/after = raw/pairs */
  baseSide: TownOverlayMergeBaseSide;
  showOverlay: boolean;
}

export function getTownOverlayPairSrc(
  buildingId: string,
  side: TownOverlayPairSide
): string {
  return new URL(
    `./assets/illustration/raw/pairs/${buildingId}_${side}.png`,
    import.meta.url
  ).href;
}

/** pair 图通常为 1024×1024，与游戏母图比例可能不同 */
export const TOWN_OVERLAY_PAIR_ASPECT_RATIO = 1;

export function resolveOverlayMergeBaseSrc(
  buildingId: string,
  baseSide: TownOverlayMergeBaseSide,
  gameBaseSrc: string
): string {
  if (baseSide === "game") return gameBaseSrc;
  return getTownOverlayPairSrc(buildingId, baseSide);
}
