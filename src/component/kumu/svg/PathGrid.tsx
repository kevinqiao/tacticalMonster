import React from "react";
import { useCombatManager } from "../service/CombatManager";
import PathCellDiv from "./PathCellDiv";
interface Props {
  size: number;
  rows: number;
  cols: number;
}
const PathGrid: React.FC = () => {
  const { map, pathCells } = useCombatManager();
  const { size, rows, cols } = map;
  return (
    <>
      {pathCells ? (
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
                    position: "relative",
                    width: `${size}px`,
                    height: `${size}px`,
                    margin: 1,
                  }}
                >
                  <PathCellDiv
                    row={row}
                    col={col}
                    cell={pathCells[row][col]}
                    size={size}
                    fillColor="grey"
                    strokeColor="none"
                    strokeWidth={0}
                  />
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      width: "100%",
                      height: "100%",
                    }}
                  >
                    {row + "-" + col}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </>
      ) : null}
    </>
  );
};

export default PathGrid;
