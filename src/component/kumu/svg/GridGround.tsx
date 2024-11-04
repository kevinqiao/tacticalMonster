import React, { useCallback, useRef } from "react";
import "../map.css";
import { useCombatManager } from "../service/CombatManager";

interface HexagonProps {
  size: number; // 六边形的边长
  row: number;
  col: number;
}

const GroundCell: React.FC<HexagonProps> = ({ row, col, size }) => {
  const containerRef = useRef<SVGSVGElement | null>(null);
  const baseRef = useRef<SVGPolygonElement | null>(null);
  const groundRef = useRef<SVGPolygonElement | null>(null);
  const standRef = useRef<SVGPolygonElement | null>(null);
  const attackRef = useRef<SVGCircleElement | null>(null);
  const { gridMap, gridCells, players, setResourceLoad, walk } = useCombatManager();

  const points: [number, number][] = [
    [size / 2, 0], // 顶点1
    [size, size * 0.25], // 顶点2
    [size, size * 0.75], // 顶点3
    [size / 2, size * 1.0], // 顶点4
    [0, size * 0.75], // 顶点5
    [0, size * 0.25], // 顶点6
  ];
  // .map((point) => point.join(","))
  // .join(" ");
  const centerX = size / 2;
  const centerY = size / 2;
  const scaleFactor = 0.8;

  // 缩放函数
  const scalePoint = (point: [number, number], scaleFactor: number): [number, number] => {
    const [x, y] = point;
    return [
      centerX + (x - centerX) * scaleFactor, // 缩放 x 坐标
      centerY + (y - centerY) * scaleFactor, // 缩放 y 坐标
    ];
  };

  // 内六边形的顶点
  const innerPoints = points.map((point) => scalePoint(point, scaleFactor));

  const outerPolygonPoints = points.map((point) => point.join(",")).join(" ");
  const innerPolygonPoints = innerPoints.map((point) => point.join(",")).join(" ");

  const hexHeight = size * 1; // 六边形的标准高度为边长的 sqrt(3)/2

  const loadContainer = useCallback(
    (ele: SVGSVGElement) => {
      if (gridCells) {
        const cell = gridCells[row][col];
        if (cell) cell.gridContainer = ele;
        containerRef.current = ele;
        const loaded = gridCells.every((row) => row.every((item) => (item.gridContainer ? true : false)));
        if (loaded) {
          setResourceLoad((pre) => {
            if (pre.gridContainer === 0) return { ...pre, gridContainer: 1 };
            else return pre;
          });
        }
      }
    },
    [gridCells, setResourceLoad]
  );
  const loadGround = useCallback(
    (ele: SVGPolygonElement) => {
      groundRef.current = ele;
      if (gridCells) {
        const cell = gridCells[row][col];
        if (cell) {
          cell.gridGround = ele;
        }
        const loaded = gridCells.every((row) => row.every((item) => (item.gridGround ? true : false)));
        if (loaded) {
          setResourceLoad((pre) => {
            if (pre.gridGround === 0) return { ...pre, gridGround: 1 };
            else return pre;
          });
        }
      }
    },
    [gridCells, setResourceLoad]
  );
  const loadStand = useCallback(
    (ele: SVGPolygonElement) => {
      standRef.current = ele;
      if (gridCells) {
        const cell = gridCells[row][col];
        if (cell) {
          cell.gridStand = ele;
        }
        const loaded = gridCells.every((row) => row.every((item) => (item.gridStand ? true : false)));
        if (loaded) {
          setResourceLoad((pre) => {
            if (pre.gridStand === 0) return { ...pre, gridStand: 1 };
            else return pre;
          });
        }
      }
    },
    [gridCells, setResourceLoad]
  );
  const loadAttack = useCallback(
    (ele: SVGCircleElement) => {
      attackRef.current = ele;
      if (gridCells) {
        const cell = gridCells[row][col];
        if (cell) {
          cell.gridAttack = ele;
        }
        const loaded = gridCells.every((row) => row.every((item) => (item.gridAttack ? true : false)));
        if (loaded) {
          setResourceLoad((pre) => {
            if (pre.gridAttack === 0) return { ...pre, gridAttack: 1 };
            else return pre;
          });
        }
      }
    },
    [gridCells, setResourceLoad]
  );

  return (
    <>
      <svg
        ref={loadContainer}
        width={size}
        height={hexHeight}
        // opacity={"0.3"}
        // visibility={"hidden"}
        viewBox={`0 0 ${size} ${hexHeight}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <polygon
          ref={baseRef}
          points={outerPolygonPoints}
          fill={"grey"}
          stroke={"white"}
          strokeWidth={3}
          opacity={"0"}
          pointerEvents="auto"
          onClick={() => console.log("base:" + row + ":" + col)}
        />
        <polygon
          ref={loadGround}
          points={outerPolygonPoints}
          fill={"black"}
          stroke={"white"}
          strokeWidth={4}
          opacity={"0"}
          visibility={"hidden"}
          pointerEvents="auto"
          onClick={() => walk({ x: col, y: row })}
        />
        <polygon
          ref={loadStand}
          points={innerPolygonPoints}
          fill={"none"}
          stroke={"red"}
          strokeWidth={3}
          opacity={"0.3"}
          visibility={"hidden"}
        />
        <circle
          ref={loadAttack}
          cx={size / 2} // 圆心X坐标，位于SVG的水平中心
          cy={hexHeight / 2} // 圆心Y坐标，位于SVG的垂直中心
          r={size * 0.4} // 半径，取六边形大小的20%作为示例
          fill="none" // 圆心不填充
          stroke="white" // 圆环的颜色
          strokeWidth="2" // 圆环的宽度
          strokeDasharray="25, 15"
          opacity={"0"}
          visibility={"hidden"}
        />
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
  const { map, cellSize: size, gridCells, players, gridMap } = useCombatManager();
  const { rows, cols } = map;

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
              }}
            >
              {Array.from({ length: cols }).map((_, col) => (
                <div
                  key={`${row}-${col}`}
                  style={{
                    position: "relative",
                    width: `${size}px`,
                    height: `${size}px`,
                    margin: 0,
                    pointerEvents: "none",
                  }}
                  // onClick={() => handleClick(col, row)}
                >
                  <GroundCell row={row} col={col} size={size} />
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
