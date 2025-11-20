/**
 * Tactical Monster 网格类型定义
 */

import { GridCellType } from "./CombatTypes";

export interface GridCellProps {
    row: number;
    col: number;
    walk?: (data: any) => void;
    attack?: (data: any) => void;
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
    width: number;
    height: number;
    sideLength: number;
    horizontalRadius: number;
    verticalRadius: number;
}

export interface HexPoint {
    x: number;
    y: number;
}

export interface GridPosition {
    col: number;
    row: number;
}


