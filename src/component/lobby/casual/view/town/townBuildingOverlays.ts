import type { TownIllustrationHotspot } from "./townIllustrationConfig";

/** fullCanvas：全幅差分增量（base 上已有民房，叠装饰）；hotspot：热区内整栋建筑（base 该处为空地） */
export type TownBuildingOverlayLayout = "fullCanvas" | "hotspot";

export interface TownBuildingOverlayDef {
  buildingId: string;
  src: string;
  /** 未指定时与对应 hotspot 矩形一致 */
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  opacity?: number;
  /** hotspot 模式下 object-fit，默认 contain */
  objectFit?: "contain" | "cover";
}

export interface ResolvedTownBuildingOverlay extends TownBuildingOverlayDef {
  x: number;
  y: number;
  w: number;
  h: number;
  opacity: number;
  objectFit?: "contain" | "cover";
}

const overlayUrl = (file: string) =>
  new URL(`./assets/illustration/overlays/${file}`, import.meta.url).href;

/** S1 建筑解锁叠层（透明 PNG，与母图同尺寸；占位资源可替换为正式美术） */
export const TOWN_S1_BUILDING_OVERLAYS: TownBuildingOverlayDef[] = [
  { buildingId: "town_square", src: overlayUrl("town_square.png") },
  { buildingId: "champion_plaza", src: overlayUrl("champion_plaza.png") },
  { buildingId: "battle_board", src: overlayUrl("battle_board.png") },
  { buildingId: "season_archive", src: overlayUrl("season_archive.png") },
  { buildingId: "honor_gallery", src: overlayUrl("honor_gallery.png") },
  { buildingId: "visitor_log", src: overlayUrl("visitor_log.png") },
  { buildingId: "game_museum", src: overlayUrl("game_museum.png") },
  { buildingId: "skin_exhibition", src: overlayUrl("skin_exhibition.png") },
  { buildingId: "streak_monument", src: overlayUrl("streak_monument.png") },
  { buildingId: "rival_hall", src: overlayUrl("rival_hall.png") },
  { buildingId: "arena", src: overlayUrl("arena.png") },
  { buildingId: "legend_hall", src: overlayUrl("legend_hall.png"), opacity: 1 },
];

export function resolveOverlayRect(
  overlay: TownBuildingOverlayDef,
  hotspot: TownIllustrationHotspot | undefined
): Pick<ResolvedTownBuildingOverlay, "x" | "y" | "w" | "h"> | null {
  if (hotspot) {
    return {
      x: overlay.x ?? hotspot.x,
      y: overlay.y ?? hotspot.y,
      w: overlay.w ?? hotspot.w,
      h: overlay.h ?? hotspot.h,
    };
  }
  if (
    overlay.x != null &&
    overlay.y != null &&
    overlay.w != null &&
    overlay.h != null
  ) {
    return { x: overlay.x, y: overlay.y, w: overlay.w, h: overlay.h };
  }
  return null;
}

export function resolveBuildingOverlays(
  overlays: readonly TownBuildingOverlayDef[],
  hotspots: readonly TownIllustrationHotspot[]
): ResolvedTownBuildingOverlay[] {
  const hotspotById = new Map(hotspots.map((h) => [h.buildingId, h]));
  const out: ResolvedTownBuildingOverlay[] = [];

  for (const o of overlays) {
    const rect = resolveOverlayRect(o, hotspotById.get(o.buildingId));
    if (!rect) continue;
    out.push({
      ...o,
      ...rect,
      opacity: o.opacity ?? 1,
    });
  }
  return out;
}
