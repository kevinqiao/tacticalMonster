import React from "react";
import "../map.css";
import { useCombatManager } from "../service/CombatManager";
interface Props {
  size: number;
  rows: number;
  cols: number;
}
interface HexagonCellProps {
  row: number;
  col: number;
}
const cells = [
  { row: 0, col: 3 },
  { row: 2, col: 4 },
];
// 六边形格子组件
const ObstacleCell: React.FC<HexagonCellProps> = ({ row, col }) => {
  const cell = cells.find((c) => c.row === row && c.col === col);
  return <>{cell ? <div className="hexagon-div" /> : null}</>;
};

const ObstacleGrid: React.FC = () => {
  const { map } = useCombatManager();
  const { size, rows, cols } = map;
  return (
    <>
      {Array.from({ length: rows }).map((_, row) => (
        <div
          key={row}
          style={{
            display: "flex",
            justifyContent: "flex-start",
            marginLeft: row % 2 !== 0 ? `${size / 2}px` : "0", // 奇数行右移半个六边形的宽度
            marginBottom: `${-size * 0.25}px`, // 行间距
          }}
        >
          {Array.from({ length: cols }).map((_, col) => (
            <div
              key={`${row}-${col}`}
              style={{
                width: `${size}px`,
                height: `${size}px`,
                margin: 1,
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
