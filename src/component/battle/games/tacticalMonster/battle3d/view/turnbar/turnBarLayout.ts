import type { MapDimension } from "../../../service/TeamDeployManager";

export type TurnBarDimension = {
    itemWidth: number;
    itemHeight: number;
    separatorWidth: number;
};

export function computeTurnBarDimension(mapDimension: MapDimension | null): TurnBarDimension | null {
    if (!mapDimension) return null;
    const w = mapDimension.containerWidth / (8 + 1 + 0.5);
    const h = w * 1.2;
    const dh = (mapDimension.containerHeight - mapDimension.height) / 2 + (mapDimension.topOffset ?? 0) - 10;
    const itemHeight = Math.min(dh, h);
    const itemWidth = itemHeight / 1.2;
    const separatorWidth = itemWidth * 0.3;
    return { itemWidth, itemHeight, separatorWidth };
}
