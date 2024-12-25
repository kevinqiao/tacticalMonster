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
    // const { width, height } = hexCell;
    // const { cols, direction } = map;
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

// const ObstacleGrid: React.FC = () => {
//   const { hexCell, map } = useCombatManager();
//   const { width, height } = hexCell;
//   if (!map) return null;
//   const { rows, cols } = map;
//   return (
//     <>
//       {Array.from({ length: rows }).map((_, row) => (
//         <div
//           key={row}
//           style={{
//             display: "flex",
//             justifyContent: "flex-start",
//             marginLeft: row % 2 !== 0 ? `${width / 2}px` : "0", // 奇数行右移半个六边形的宽度
//             marginBottom: `${-height * 0.25}px`, // 行间距
//           }}
//         >
//           {Array.from({ length: cols }).map((_, col) => (
//             <div
//               key={`${row}-${col}`}
//               style={{
//                 width: `${width}px`,
//                 height: `${height}px`,
//                 margin: 0,
//               }}
//             >
//               <ObstacleCell row={row} col={col} />
//             </div>
//           ))}
//         </div>
//       ))}
//     </>
//   );
// };

const ObstacleGrid: React.FC = () => {
  const { map } = useCombatManager();
  if (!map) return null;
  const { obstacles } = map;

  return (
    <>
      {obstacles?.map((c, index) => (
        <ObstacleCell key={"obstacle-" + c.r + "-" + c.q + "-" + index} row={c.r} col={c.q} />
      ))}
    </>
  );

};
export default ObstacleGrid;
