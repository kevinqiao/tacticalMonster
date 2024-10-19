import React, { useCallback, useRef } from "react";
import "../map.css";
import { PathCell, useCombatManager } from "../service/CombatManager";

interface HexagonProps {
  size: number; // 六边形的边长
  row: number;
  col: number;
  cell: PathCell;
  fillColor: string; // 六边形的填充颜色
  strokeColor: string; // 边框颜色
  strokeWidth: number; // 边框宽度
}

const GroundCell: React.FC<HexagonProps> = ({ row, col, size, fillColor, strokeColor, strokeWidth }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const polygonRef = useRef<SVGPolygonElement | null>(null);
  const { pathCells, setResourceLoad } = useCombatManager();
  const points = [
    [size / 2, 0], // 顶点1
    [size, size * 0.25], // 顶点2
    [size, size * 0.75], // 顶点3
    [size / 2, size * 1.0], // 顶点4
    [0, size * 0.75], // 顶点5
    [0, size * 0.25], // 顶点6
  ]
    .map((point) => point.join(",")) // 将每个点的坐标转换为字符串格式 "x,y"
    .join(" "); // 用空格连接所有的点，生成 SVG 的 "points" 属性值

  const hexHeight = size * 1; // 六边形的标准高度为边长的 sqrt(3)/2

  const loadContainer = useCallback(
    (ele: SVGSVGElement) => {
      if (pathCells) {
        const cell = pathCells[row][col];
        if (cell) cell.container = ele;
        svgRef.current = ele;
        const loaded = pathCells.every((row) => row.every((item) => (item.container ? true : false)));
        if (loaded) {
          setResourceLoad((pre) => {
            if (pre.gridGround === 0) return { ...pre, gridGround: 1 };
            else return pre;
          });
        }
      }
    },
    [pathCells, setResourceLoad]
  );
  const loadElement = useCallback(
    (ele: SVGPolygonElement) => {
      if (pathCells) {
        const cell = pathCells[row][col];
        if (cell) {
          cell.element = ele;
        }
        const loaded = pathCells.every((row) => row.every((item) => (item.element ? true : false)));
        if (loaded) {
          setResourceLoad((pre) => {
            if (pre.grid === 0) return { ...pre, grid: 1 };
            else return pre;
          });
        }
      }
    },
    [pathCells, setResourceLoad]
  );

  return (
    <>
      <svg
        ref={loadContainer}
        width={size}
        height={hexHeight}
        opacity={"0.3"}
        // visibility={"hidden"}
        viewBox={`0 0 ${size} ${hexHeight}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <polygon ref={loadElement} points={points} fill={"grey"} stroke={strokeColor} strokeWidth={strokeWidth} />
      </svg>
    </>
  );
};
interface Props {
  size: number;
  rows: number;
  cols: number;
}

const GridGround: React.FC = () => {
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
                marginBottom: `${-size * 0.25}px`,
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
                  <GroundCell
                    row={row}
                    col={col}
                    cell={pathCells[row][col]}
                    size={size}
                    fillColor="blue"
                    strokeColor="none"
                    strokeWidth={0}
                  />
                </div>
              ))}
            </div>
          ))}
        </>
      ) : null}
    </>
  );
};

export default GridGround;
