import React, { useCallback, useMemo } from 'react';

import '../../map.css';
import { HEX_RATIO, SCALE_FACTOR, STYLES } from '../constants/GridConstants';
import { useGridElementLoader } from '../hooks/useGridElements';
import { useCombatManager } from '../service/CombatManager';
import useCombatAct from '../service/useCombatAct';
import { GridCellProps } from '../types/GridTypes';
import { calculateHexPoints, pointsToPath, scalePoint } from '../utils/gridUtils';

const GroundCell: React.FC<GridCellProps> = ({ row, col, walk }) => {
  const { hexCell } = useCombatManager();
  const { width, height } = hexCell;


  // 使用自定义 Hook 加载网格元素
  const loadContainer = useGridElementLoader('container', row, col);
  const loadGround = useGridElementLoader('ground', row, col);
  const loadWalk = useGridElementLoader('walk', row, col);


  // 使用 useMemo 缓存计算结果
  const points = useMemo(() => calculateHexPoints(width), [width]);
  const pathData = useMemo(() => pointsToPath(points), [points]);

  const centerX = width / 2;
  const centerY = height / 2;
  const hexHeight = height;

  const innerPoints = useMemo(() =>
    points.map(point => scalePoint(point, centerX, centerY, SCALE_FACTOR)),
    [points, centerX, centerY]
  );

  const outerPolygonPoints = useMemo(() =>
    points.map(point => `${point.x},${point.y}`).join(" "),
    [points]
  );

  const innerPolygonPoints = useMemo(() =>
    innerPoints.map(point => `${point.x},${point.y}`).join(" "),
    [innerPoints]
  );

  // const handleClick = useCallback(() => {
  //   console.log("click", { q: col, r: row });
  //   walk({ q: col, r: row });
  // }, [walk, col, row]);

  return (
    <svg
      ref={loadContainer}
      width={width}
      height={hexHeight}
      style={{ width: width, height: hexHeight, pointerEvents: "none" }}
      viewBox={`0 0 ${width} ${hexHeight}`}
      xmlns="http://www.w3.org/2000/svg"
      data-testid={`grid-cell-${row}-${col}`}
    >
      <path
        d={pathData}
        fill="grey"
        stroke="white"
        strokeWidth={3}
        opacity={0}
        pointerEvents="none"
        role="button"
        aria-label={`Base grid at row ${row}, column ${col}`}
      />
      <polygon
        ref={loadGround}
        data-q={col}
        data-r={row}
        points={outerPolygonPoints}
        fill="black"
        stroke="white"
        strokeWidth={4}
        opacity={0.1}
        // visibility="hidden"
        pointerEvents="none"
        role="button"
        aria-label={`Ground grid at row ${row}, column ${col}`}
      />
      <polygon
        ref={loadWalk}
        data-q={col}
        data-r={row}
        points={outerPolygonPoints}
        fill="black"
        stroke="white"
        strokeWidth={4}
        opacity={0}
        visibility="hidden"
        pointerEvents="auto"
        role="button"
        aria-label={`Ground grid at row ${row}, column ${col}`}
        onClick={() => walk?.({ q: col, r: row })}
      />
      {/* <polygon
        ref={loadWalk}
        points={innerPolygonPoints}
        fill="none"
        stroke="red"
        strokeWidth={3}
        opacity={0.3}
        visibility="hidden"
      /> */}
      {/* <circle
        ref={loadAttack}
        cx={width / 2}
        cy={hexHeight / 2}
        r={width * 0.4}
        fill="none"
        stroke="white"
        strokeWidth={2}
        strokeDasharray="25, 15"
        opacity={0}
        visibility="hidden"
      /> */}
    </svg>
  );
};

const GridContainer: React.FC = () => {
  const { map, hexCell, gridCells } = useCombatManager();
  const { walk, attack } = useCombatAct();

  // 移动 useCallback 到顶部
  const rowStyle = useCallback((row: number) => {
    const isOdd = row % 2 !== 0;
    const left = isOdd ? (map?.direction === 1 ? -hexCell.width / 2 : hexCell.width / 2) : 0;
    const bottom = -hexCell.width * HEX_RATIO.HEIGHT_TO_WIDTH * 1 / 4;
    return STYLES.row(bottom, left);
  }, [hexCell, map]);

  if (!gridCells || !map) {
    return <div>Loading grid...</div>;
  }

  const { rows, cols } = map;

  return (
    <>
      {Array.from({ length: rows }).map((_, row) => (
        <div
          key={row}
          style={rowStyle(row)}  // 使用缓存的样式函数
          data-testid={`grid-row-${row}`}
        >
          {Array.from({ length: cols }).map((_, col) => (
            <GroundCell
              key={`${row}-${col}`}
              row={row}
              col={col}
              walk={walk}
              attack={attack}
            />
          ))}
        </div>
      ))}
    </>
  );
};

const GridGround: React.FC = () => <GridContainer />;

export default GridGround;
