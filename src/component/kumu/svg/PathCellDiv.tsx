import gsap from "gsap";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { CharacterUnit, PathCell, useCombatManager } from "../service/CombatManager";
interface HexagonProps {
  size: number; // 六边形的边长
  row: number;
  col: number;
  cell: PathCell;
  fillColor: string; // 六边形的填充颜色
  strokeColor: string; // 边框颜色
  strokeWidth: number; // 边框宽度
}

const PathCellDiv: React.FC<HexagonProps> = ({ row, col, size, cell, fillColor, strokeColor, strokeWidth }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const polygonRef = useRef<SVGPolygonElement | null>(null);
  const coverRef = useRef<SVGPolygonElement | null>(null);
  const { players, selectedCharacter, walk } = useCombatManager();
  const characters = players.reduce<CharacterUnit[]>((acc, cur) => [...acc, ...cur.characters], []);

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

  useEffect(() => {
    const character = characters.find((c) => c.position.x === col && c.position.y === row);
    if (character) {
      const tl = gsap.timeline({
        onComplete: () => {
          tl.kill();
        },
      });
      tl.to(svgRef.current, { autoAlpha: 1, duration: 1 });
      tl.to(polygonRef.current, { fill: character.uid === "1" ? "yellow" : "grey", duration: 1 }, "<");
      // tl.to(coverRef.current, { fill: "blue", duration: 1 }, "<");
      tl.play();
    } else gsap.to(svgRef.current, { autoAlpha: 0.5, duration: 1 });
  }, [row, col]);
  const walkable = useMemo(() => {
    if (selectedCharacter?.walkablCells) {
      const walkCell = selectedCharacter.walkablCells.find((c) => c.x === col && c.y === row);
      if (walkCell) return true;
    }
    return false;
  }, [selectedCharacter]);
  const loadContainer = useCallback(
    (ele: SVGSVGElement) => {
      if (cell) cell.container = ele;
      svgRef.current = ele;
    },
    [cell]
  );
  const loadElement = useCallback(
    (ele: SVGPolygonElement) => {
      if (cell) cell.element = ele;
      polygonRef.current = ele;
    },
    [cell]
  );
  const loadCover = useCallback(
    (ele: SVGPolygonElement) => {
      if (cell) cell.cover = ele;
      coverRef.current = ele;
    },
    [cell]
  );
  return (
    <svg
      ref={loadContainer}
      width={size}
      height={hexHeight}
      opacity={"0"}
      visibility={"hidden"}
      viewBox={`0 0 ${size} ${hexHeight}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <polygon ref={loadElement} points={points} fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
      {walkable && selectedCharacter ? (
        <polygon
          ref={loadCover}
          points={points}
          fill={"none"}
          stroke={"none"}
          strokeWidth={"0"}
          onClick={() => walk(selectedCharacter, row, col)}
        />
      ) : null}
    </svg>
  );
};

export default PathCellDiv;
