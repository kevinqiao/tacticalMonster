import React from "react";
import "./map.css"; // 自定义样式

// 定义组件 Props 的类型
interface HexagonCellProps {
  row: number;
  col: number;
}

// 六边形格子组件
const HexagonCell: React.FC<HexagonCellProps> = ({ row, col }) => {
  return (
    <div className="hexagon">
      <div className="hexagon-inner">
        <span>{`${row},${col}`}</span> {/* 显示行和列编号 */}
      </div>
    </div>
  );
};

export default HexagonCell;
