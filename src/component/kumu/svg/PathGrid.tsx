import React from "react";
import { useCombatManager } from "../service/CombatManager";
import PathCell from "./PathCell";
interface Props {
  size: number;
  rows: number;
  cols: number;
}
const PathGrid: React.FC = () => {
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
              <PathCell row={row} col={col} size={size} fillColor="#6C9" strokeColor="none" strokeWidth={0} />
            </div>
          ))}
        </div>
      ))}
    </>
  );
};

export default PathGrid;
