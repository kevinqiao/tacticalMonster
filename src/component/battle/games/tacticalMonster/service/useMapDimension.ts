/**
 * 地图尺寸计算 Hook
 */

import { useEffect, useRef, useState } from "react";
import type { MapDimension } from "../../shared/mapDimension";
import { calculateMapDimension } from "../utils/coordinateUtils";

/**
 * 计算地图尺寸和六边形尺寸（cols/rows 由屏幕方向推导，direction 由业务层决定）
 */
export const useMapDimension = () => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [mapDimension, setMapDimension] = useState<MapDimension | null>(null);
    // const [containerSize, setContainerSize] = useState<{ width: number; height: number } | null>(null);


    useEffect(() => {
        const updateMap = () => {
            if (!containerRef.current) return;

            const containerWidth = containerRef.current.clientWidth;
            const containerHeight = containerRef.current.clientHeight;

            // setContainerSize({ width: containerWidth, height: containerHeight });
            const dimension = calculateMapDimension(containerWidth, containerHeight);
            if (dimension) {
                setMapDimension(dimension);
            }
        };

        updateMap();

        const resizeObserver = new ResizeObserver(() => {
            updateMap();
        });

        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        return () => {
            resizeObserver.disconnect();
        };
    }, []);

    return { containerRef, mapDimension };
};
