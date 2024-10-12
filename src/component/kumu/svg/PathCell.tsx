import React, { useEffect, useRef } from "react";

import gsap from "gsap";
interface HexagonProps {
  size: number; // 六边形的边长
  row: number;
  col: number;
  fillColor: string; // 六边形的填充颜色
  strokeColor: string; // 边框颜色
  strokeWidth: number; // 边框宽度
}
const cells = [
  { row: 1, col: 3 },
  { row: 4, col: 4 },
];
const PathCell: React.FC<HexagonProps> = ({ row, col, size, fillColor, strokeColor, strokeWidth }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
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
    // const cell = cells.find((c) => c.row === row && col === c.col);
    // if (cell && svgRef.current) {
    gsap.to(svgRef.current, { autoAlpha: 1, duration: 6 });
    // }
  }, [row, col]);

  return (
    <svg
      ref={svgRef}
      width={size}
      height={hexHeight}
      opacity={"0"}
      visibility={"hidden"}
      viewBox={`0 0 ${size} ${hexHeight}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <polygon points={points} fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
    </svg>
  );
};

export default PathCell;
