/**
 * Tactical Monster 障碍物网格视图
 */

import { ObstacleUtils } from "@/convex/tacticalMonster/convex/utils/obstacleUtils";
import gsap from "gsap";
import React, { useEffect, useMemo, useRef } from "react";
import { useCombatManager } from "../../service/CombatManager";
import "../style.css";
import { coordToPixel } from "../../utils/hexUtil";

interface HexagonCellProps {
    row: number;
    col: number;
}

// 六边形格子组件
const ObstacleCell: React.FC<HexagonCellProps> = ({ row, col }) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const { game, mapDimension } = useCombatManager();
    const { map } = game || {};
    if (!map) return null;
    const cell = map.obstacles?.find((c) => c.r === row && c.q === col);
    if (!cell) return null;
    const cellAsset = useMemo(() => {
        const cell = game?.map?.obstacles?.find((c) => c.r === row && c.q === col);
        if (!cell) return;

        return ObstacleUtils.getObstacleAsset(cell.id);
    }, [game])
    useEffect(() => {
        if (!mapDimension || !game || !game?.map) return;
        const hexCell = { width: mapDimension.hexWidth, height: mapDimension.hexHeight };
        const { x, y } = coordToPixel(col, row, hexCell, game.map);
        gsap.set(containerRef.current, { x, y });
    }, [mapDimension, col, row, game]);
    return (
        <>
            <div
                ref={containerRef}
                className="hexagon-obstacle"
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: `${mapDimension?.hexWidth ?? 0}px`,
                    height: `${mapDimension?.hexHeight ?? 0}px`,
                    backgroundImage: `url(${cellAsset})`,
                }}
            />
        </>
    );
};


const ObstacleGrid: React.FC = () => {
    const { game } = useCombatManager();

    return (
        <div style={{ position: "absolute", width: "100%", height: "100%" }}>
            {game?.map.obstacles?.map((c, index) => (
                <ObstacleCell key={"obstacle-" + c.r + "-" + c.q + "-" + index} row={c.r} col={c.q} />
            ))}
        </div>
    );

};
export default ObstacleGrid;

