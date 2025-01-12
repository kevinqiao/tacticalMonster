import gsap from "gsap";
import React, { useEffect, useRef } from "react";
import "../../map.css";
import { useCombatManager } from "../service/CombatManager";
import { coordToPixel } from "../utils/hexUtil";

interface HexagonCellProps {
  row: number;
  col: number;
}

// 六边形格子组件
const ObstacleCell: React.FC<HexagonCellProps> = ({ row, col }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { map, hexCell } = useCombatManager();
  if (!map) return null;
  const cell = map.obstacles?.find((c) => c.r === row && c.q === col);
  if (!cell) return null;
  useEffect(() => {
    if (!hexCell || !map) return;
    const { x, y } = coordToPixel(col, row, hexCell, map);
    gsap.set(containerRef.current, { x, y });
  }, [hexCell, col, row, map]);
  return (
    <>
      <div
        ref={containerRef}
        className="hexagon-obstacle"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: `${hexCell.width}px`,
          height: `${hexCell.height}px`,
          backgroundImage: `url(${cell.asset})`,
        }}
      />
    </>
  );
};


const ObstacleGrid: React.FC<{ position: { top: number, left: number, width: number, height: number } }> = ({ position }) => {
  const { map } = useCombatManager();
  if (!map) return null;
  const { obstacles } = map;

  return (
    <div style={{ position: "absolute", top: position.top, left: position.left, width: position.width, height: position.height }}>
      {obstacles?.map((c, index) => (
        <ObstacleCell key={"obstacle-" + c.r + "-" + c.q + "-" + index} row={c.r} col={c.q} />
      ))}
    </div>
  );

};
export default ObstacleGrid;
