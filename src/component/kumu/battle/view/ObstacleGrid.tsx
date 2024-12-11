import gsap from "gsap";
import React, { useEffect, useMemo, useRef } from "react";
import "../../map.css";
import { useCombatManager } from "../service/CombatManager";
import { calculateHexPoints, pointsToPath } from '../utils/gridUtils';

interface HexagonCellProps {
  row: number;
  col: number;
}

// 六边形格子组件
const ObstacleCell: React.FC<HexagonCellProps> = ({ row, col }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { map, hexCell } = useCombatManager();
  const cell = map.obstacles?.find((c) => c.row === row && c.col === col);
  const size = hexCell.width;
  const hexPath = useMemo(() => {
    const points = calculateHexPoints(size);
    return pointsToPath(points);
  }, [size]);
  useEffect(() => {
    gsap.set(containerRef.current, { scale: 0.7 });
  }, []);
  return (
    <>
      <div
        ref={containerRef}
        className="hexagon-obstacle"
        style={{ backgroundImage: cell ? `url(${cell.asset})` : "" }}
      />
    </>
  );
};

const ObstacleGrid: React.FC = () => {
  const { map, hexCell } = useCombatManager();
  const {width,height} = hexCell;
  const { rows, cols } = map;
  return (
    <>
      {Array.from({ length: rows }).map((_, row) => (
        <div
          key={row}
          style={{
            display: "flex",
            justifyContent: "flex-start",
            marginLeft: row % 2 !== 0 ? `${width / 2}px` : "0", // 奇数行右移半个六边形的宽度
            marginBottom: `${-height * 0.25}px`, // 行间距
          }}
        >
          {Array.from({ length: cols }).map((_, col) => (
            <div
              key={`${row}-${col}`}
              style={{
                width: `${width}px`,
                height: `${height}px`,
                margin: 0,
              }}
            >
              <ObstacleCell row={row} col={col} />
            </div>
          ))}
        </div>
      ))}
    </>
  );
};

export default ObstacleGrid;
