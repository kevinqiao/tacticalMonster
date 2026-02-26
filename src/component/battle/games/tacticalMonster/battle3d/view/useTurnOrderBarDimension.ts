/**
 * TurnOrderBar 尺寸计算 Hook
 * 类似 useMapDimension，基于容器和角色数量实时计算 Item 宽高
 */

import { useEffect, useRef, useState } from "react";
import { useCombatManager } from "../../service/CombatManager";

const PADDING = 8;
const GAP = 4;
const MAX_ITEM_HEIGHT = 56;

export interface TurnOrderBarDimension {
    itemWidth: number;
    itemHeight: number;
    separatorWidth: number;
}



export function useTurnOrderBarDimension(options: {
    itemCount: number;
    hasSeparator: boolean;
}) {
    const { itemCount, hasSeparator } = options;
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [dimension, setDimension] = useState<TurnOrderBarDimension | null>(null);
    const { mapDimension } = useCombatManager();

    useEffect(() => {
        const updateDimension = () => {

            if (!containerRef.current || !mapDimension) return;
            const w = containerRef.current.clientWidth;
            if (w <= 0) return;
            const cw = w / (8 + 1 + 0.3);
            const itemWidth = Math.min(cw, mapDimension.isPortrait ? mapDimension.hexHeight : mapDimension.hexWidth);
            const itemHeight = itemWidth * 1.2;
            setDimension({ itemWidth, itemHeight, separatorWidth: itemWidth * 0.3 });
        };

        updateDimension();

        const resizeObserver = new ResizeObserver(() => {
            updateDimension();
        });

        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        return () => {
            resizeObserver.disconnect();
        };
    }, [itemCount, hasSeparator, mapDimension]);

    return { containerRef, dimension };
}
