import { GridCellType } from "../model/CombatModels";

export interface GridCellProps {
  row: number;
  col: number;
  onWalk?: (data:any)=>void;
  onAttack?: (data:any)=>void;
}

export interface GridStyles {
  row: (size: number, isOdd: boolean) => React.CSSProperties;
  cell: (size: number) => React.CSSProperties;
  svg: (size: number, hexHeight: number) => React.CSSProperties;
}

export interface GridElementRefs {
  container: React.RefObject<SVGSVGElement>;
  base: React.RefObject<SVGPolygonElement>;
  ground: React.RefObject<SVGPolygonElement>;
  stand: React.RefObject<SVGPolygonElement>;
  attack: React.RefObject<SVGCircleElement>;
}

export interface GridCellState {
  type: GridCellType;
  isWalkable: boolean;
  isHighlighted: boolean;
  isSelected: boolean;
}

export interface HexMetrics {
  width: number;          // 六边形宽度（两个水平边之间的距离）
  height: number;         // 六边形高度（顶点到对面顶点的距离）
  sideLength: number;     // 边长
  horizontalRadius: number; // 从中心到水平边的距离
  verticalRadius: number;   // 从中心到顶点的垂直距离
}

export interface HexPoint {
  x: number;
  y: number;
}

export interface GridPosition {
    col: number;
    row: number;
} 