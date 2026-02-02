/**
 * 地图尺寸计算 Hook
 */

import { useEffect, useRef, useState } from "react";
import { MapDimension } from "../service/TeamDeployManager";
import { calculateMapRatio } from "../utils/coordinateUtils";

/**
 * 计算地图尺寸和六边形尺寸
 */
export const useMapDimension = () => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [mapDimension, setMapDimension] = useState<MapDimension | null>(null);

    useEffect(() => {
        const updateMap = () => {
            if (containerRef.current) {
                const containerWidth = containerRef.current.clientWidth;
                const containerHeight = containerRef.current.clientHeight;

                // 根据容器尺寸判断屏幕方向
                const isPortrait = containerHeight > containerWidth;

                // 根据方向决定行列数
                const cols = isPortrait ? 7 : 8;  // 竖屏7列，横屏8列
                const rows = isPortrait ? 8 : 7;  // 竖屏8行，横屏7行

                const containerRatio = containerWidth / containerHeight;
                const mapRatio = calculateMapRatio(cols, rows);

                let mapSize: { width: number; height: number } = { width: 0, height: 0 };
                let hexHeight: number;
                let hexWidth: number;

                if (mapRatio < containerRatio) {
                    mapSize.height = containerHeight * 0.9;
                    mapSize.width = mapSize.height * mapRatio;
                    hexWidth = mapSize.width / (cols + 0.5);
                    hexHeight = (hexWidth * 2) / Math.sqrt(3);
                } else {
                    mapSize.width = containerWidth * 0.9;
                    mapSize.height = mapSize.width / mapRatio;
                    hexWidth = mapSize.width / (cols + 0.5);
                    hexHeight = (hexWidth * 2) / Math.sqrt(3);
                }

                setMapDimension({
                    width: mapSize.width,
                    height: mapSize.height,
                    hexHeight,
                    hexWidth,
                    isPortrait,
                    cols,
                    rows
                });
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
