import React, { useCallback } from "react";
import "../map.css";
import { useCombatManager } from "../service/CombatManager";
interface Props {
  size: number;
  rows: number;
  cols: number;
}

const GridCover: React.FC = () => {
  const { cellSize: size, map, gridCells, setResourceLoad } = useCombatManager();
  const { rows, cols } = map;

  const load = useCallback(
    (ele: HTMLDivElement | null, row: number, col: number) => {
      if (gridCells) {
        const cell = gridCells[row][col];
        if (cell) {
          cell.gridCover = ele;
        }
        const loaded = gridCells.every((row) => row.every((item) => (item.gridCover ? true : false)));
        if (loaded) {
          setResourceLoad((pre) => {
            if (pre.gridCover === 0) return { ...pre, gridCover: 1 };
            else return pre;
          });
        }
      }
    },
    [gridCells, setResourceLoad]
  );
  return (
    <>
      {gridCells ? (
        <>
          {Array.from({ length: rows }).map((_, row) => (
            <div
              key={row}
              style={{
                display: "flex",
                justifyContent: "flex-start",
                marginLeft: row % 2 !== 0 ? `${size / 2}px` : "0", // 奇数行右移半个六边形的宽度
                marginBottom: `${-size * 0.25}px`,
                opacity: 0,
                visibility: "hidden",
              }}
            >
              {Array.from({ length: cols }).map((_, col) => (
                <div
                  ref={(ele) => load(ele, row, col)}
                  key={`${row}-${col}`}
                  style={{
                    position: "relative",
                    width: `${size}px`,
                    height: `${size}px`,
                    margin: 1,
                    opacity: 0,
                    visibility: "hidden",
                  }}
                >
                  {/* <CoverCell row={row} col={col} /> */}
                </div>
              ))}
            </div>
          ))}
        </>
      ) : null}
    </>
  );
};

export default GridCover;
