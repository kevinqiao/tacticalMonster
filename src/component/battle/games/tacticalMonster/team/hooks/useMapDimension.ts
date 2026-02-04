/**
 * 地图尺寸计算 Hook
 */

import { useEffect, useRef, useState } from "react";
import { MapDimension } from "../service/TeamDeployManager";
import { calculateMapRatio } from "../utils/coordinateUtils";

/** 固定 3D 世界尺寸：为 true 时地面/格子不随视窗变化而缩放 */
const USE_FIXED_WORLD_SIZE = false;
/** 固定世界宽度（单位与 3D 一致），高度由 mapRatio 推算 */
const FIXED_WORLD_WIDTH = 1152;
/** 横竖屏切换的滞后阈值，避免窗口尺寸轻微变化导致频繁切换 */
const PORTRAIT_ENTER_RATIO = 1.05; // height/width > 1.05 才进入竖屏
const PORTRAIT_EXIT_RATIO = 0.95;  // height/width < 0.95 才退出竖屏

/**
 * 计算地图尺寸和六边形尺寸
 */
export const useMapDimension = () => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [mapDimension, setMapDimension] = useState<MapDimension | null>(null);
    const [containerSize, setContainerSize] = useState<{ width: number; height: number } | null>(null);
    const orientationRef = useRef<"portrait" | "landscape" | null>(null);

    useEffect(() => {
        const updateMap = () => {
            if (containerRef.current) {
                const containerWidth = containerRef.current.clientWidth;
                const containerHeight = containerRef.current.clientHeight;

                setContainerSize({ width: containerWidth, height: containerHeight });

                // 根据容器尺寸判断屏幕方向（带滞后避免频繁切换）
                const ratio = containerWidth === 0 ? 1 : containerHeight / containerWidth;
                let orientation = orientationRef.current;
                if (!orientation) {
                    orientation = ratio > 1 ? "portrait" : "landscape";
                } else if (orientation === "portrait" && ratio < PORTRAIT_EXIT_RATIO) {
                    orientation = "landscape";
                } else if (orientation === "landscape" && ratio > PORTRAIT_ENTER_RATIO) {
                    orientation = "portrait";
                }
                orientationRef.current = orientation;
                const isPortrait = orientation === "portrait";

                // 根据方向决定行列数
                const cols = isPortrait ? 7 : 8;  // 竖屏7列，横屏8列
                const rows = isPortrait ? 8 : 7;  // 竖屏8行，横屏7行

                const mapRatio = calculateMapRatio(cols, rows);

                let width: number;
                let height: number;
                let hexWidth: number;
                let hexHeight: number;

                if (USE_FIXED_WORLD_SIZE) {
                    // 固定 3D 世界尺寸，不随视窗变化，避免长宽比切换分支时地面“旋转”
                    width = FIXED_WORLD_WIDTH;
                    height = FIXED_WORLD_WIDTH / mapRatio;
                    hexWidth = width / (cols + 0.5);
                    hexHeight = (hexWidth * 2) / Math.sqrt(3);
                } else {
                    const containerRatio = containerWidth / containerHeight;
                    let mapSize: { width: number; height: number } = { width: 0, height: 0 };

                    if (mapRatio < containerRatio) {
                        mapSize.height = containerHeight;
                        mapSize.width = mapSize.height * mapRatio;
                    } else {
                        mapSize.width = containerWidth;
                        mapSize.height = mapSize.width / mapRatio;
                    }
                    width = mapSize.width;
                    height = mapSize.height;
                    hexWidth = width / (cols + 0.5);
                    hexHeight = (hexWidth * 2) / Math.sqrt(3);
                }

                setMapDimension({
                    width,
                    height,
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

    return { containerRef, mapDimension, containerSize };
};
