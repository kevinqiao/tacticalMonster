import React from "react";
import HexagonCell from "./HexagonCell"; // 引入 HexagonCell 组件
import "./map.css"; // 引入自定义样式

// 定义 HexagonMap 的 Props 类型
interface HexagonMapProps {
  rows: number; // 网格的行数
  cols: number; // 网格的列数
}

// HexagonMap 组件
const HexagonMap: React.FC<HexagonMapProps> = ({ rows, cols }) => {
  // 生成网格
  const grid = [];
  for (let row = 0; row < rows; row++) {
    const rowArray = [];
    for (let col = 0; col < cols; col++) {
      rowArray.push(<HexagonCell key={`${row}-${col}`} row={row} col={col} />);
    }
    grid.push(
      <div className={`hex-row ${row % 2 === 0 ? "even" : "odd"}`} key={row}>
        {rowArray}
      </div>
    );
  }

  return <div className="hex-map">{grid}</div>;
};

export default HexagonMap;
