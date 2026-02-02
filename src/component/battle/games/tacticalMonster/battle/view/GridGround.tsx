/**
 * Tactical Monster 网格地面视图
 */

import React, { useCallback, useMemo } from 'react';

import { GridCellSprite } from '../../types/CombatTypes';
import { GridCellProps } from '../../types/GridTypes';
import { HEX_RATIO, SCALE_FACTOR, STYLES } from '../constants/GridConstants';
import { useCombatManager } from '../service/CombatManager';
import '../style.css';
import { calculateHexPoints, pointsToPath, scalePoint } from '../utils/gridUtils';

const GroundCell: React.FC<GridCellProps> = ({ row, col, cell }) => {
    const { hexDimension } = useCombatManager();
    const { q, r, disable } = cell;
    const { width, height } = hexDimension;

    // 使用自定义 Hook 加载网格元素


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

    const svgStyle: React.CSSProperties = {
        width: width,
        height: hexHeight,
        pointerEvents: "none",
    };

    return (
        <>
            <svg
                width={width}
                height={hexHeight}
                style={svgStyle}
                viewBox={`0 0 ${width} ${hexHeight}`}
                xmlns="http://www.w3.org/2000/svg"
                data-testid={`grid-cell-${row}-${col}`}
            >
                {/* <path
                d={pathData}
                fill="grey"
                stroke="white"
                strokeWidth={3}
                opacity={1}
                pointerEvents="none"
                role="button"
                aria-label={`Base grid at row ${row}, column ${col}`}
            /> */}
                {disable ? null : <text x={width / 2} y={hexHeight / 2} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="12">{row},{col}</text>}
                <polygon
                    ref={(el) => {
                        cell.element = el;
                    }}
                    data-q={col}
                    data-r={row}
                    points={outerPolygonPoints}
                    fill="black"
                    stroke="white"
                    strokeWidth={4}
                    opacity={disable ? 0 : 0.6}
                    pointerEvents="none"
                    role="button"
                    aria-label={`Ground grid at row ${row}, column ${col}`}
                />
                <polygon
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
                />
            </svg>
        </>
    );
};

const GridGround: React.FC = () => {
    const { game, hexDimension, groundCells } = useCombatManager();
    const { map } = game || {};

    // 计算每行的样式，考虑 direction 对奇数行偏移的影响
    const rowStyle = useCallback((row: number) => {
        const isOdd = row % 2 !== 0;
        // 当 direction === 1 时，奇数行的偏移方向相反，与 coordToPixel 保持一致
        const left = isOdd ? (map?.direction === 1 ? -hexDimension.width / 2 : hexDimension.width / 2) : 0;
        const bottom = -hexDimension.width * HEX_RATIO.HEIGHT_TO_WIDTH * 1 / 4;
        return STYLES.row(bottom, left);
    }, [hexDimension, map]);

    if (!groundCells || !map) {
        return <div>Loading grid...</div>;
    }


    return (
        // <div style={{ position: "absolute", top: position.top, left: position.left, width: position.width, height: position.height }}>
        <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}>
            {groundCells?.map((row: GridCellSprite[], rowIndex: number) => (
                <div
                    key={rowIndex}
                    style={rowStyle(rowIndex)}
                    data-testid={`grid-row-${rowIndex}`}
                >
                    {row.map((cell: GridCellSprite, colIndex: number) => (
                        (<GroundCell
                            key={`${rowIndex}-${colIndex}`}
                            row={rowIndex}
                            col={colIndex}
                            cell={cell}
                        />
                        )
                    ))}
                </div>
            ))}
        </div>
    );
};

export default GridGround;

