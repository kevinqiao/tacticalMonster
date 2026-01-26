/**
 * Tactical Monster 网格地面视图
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { GridCellSprite } from '../battle/types/CombatTypes';
import { calculateHexPoints } from '../battle/utils/gridUtils';

import { STYLES } from '../battle/constants/GridConstants';
import { useTeamDeployManager } from './service/TeamDeployManager';
import './styles.css';

const GroundCell: React.FC<{
    // width: number,
    // height: number,
    cell: GridCellSprite,

}> = ({ cell }) => {
    const [isDragging, setIsDragging] = useState(false);
    const { mapDimension, placedMonsters, highlightedCell, startDrag, endDrag, removeCandidate } = useTeamDeployManager();
    const [placedMonster, setPlacedMonster] = useState<{ monsterId: string, q: number, r: number } | null>(null);
    const width = mapDimension?.hexWidth || 0;
    const height = mapDimension?.hexHeight || 0;

    const points = useMemo(() => calculateHexPoints(width), [width]);
    const hexHeight = height;
    const isHighlighted = highlightedCell?.q === cell.q && highlightedCell?.r === cell.r;

    const outerPolygonPoints = useMemo(() =>
        points.map(point => `${point.x},${point.y}`).join(" "),
        [points]
    );

    const svgStyle: React.CSSProperties = {
        width: width,
        height: hexHeight,
        pointerEvents: "none",
    }; const handleDragStart = (e: React.DragEvent) => {
        setIsDragging(true);

        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", placedMonster?.monsterId || "");

        // 隐藏原生拖拽预览，使用自定义的 DragPreview 组件
        const emptyImage = new Image();
        emptyImage.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
        e.dataTransfer.setDragImage(emptyImage, 0, 0);

        startDrag(placedMonster?.monsterId || "", e);
    };

    const handleDragEnd = (e: React.DragEvent) => {
        setIsDragging(false);

        if (e.dataTransfer.dropEffect === "move") {
            setPlacedMonster(null);
        }

        // 无论 drop 是否触发，都要清除拖拽状态和预览
        endDrag();
        e.dataTransfer.clearData();
    };
    useEffect(() => {
        const key = `${cell.q}-${cell.r}`;
        const monster = placedMonsters.find((p) => p.q === cell.q && p.r === cell.r);
        if (!monster)
            setPlacedMonster(null);
        else if (placedMonster === null || placedMonster.monsterId !== monster.monsterId) {
            console.log("monster", monster);
            setPlacedMonster(monster);
        }
    }, [placedMonsters, cell]);
    return (
        <div style={{ position: "relative", width: width, height: hexHeight }}>
            <svg
                width={width}
                height={height}
                style={svgStyle}
                viewBox={`0 0 ${width} ${height}`}
                xmlns="http://www.w3.org/2000/svg"
                data-testid={`grid-cell-${cell.r}-${cell.q}`}
            >
                <polygon
                    ref={(el) => {
                        cell.element = el;
                    }}
                    data-q={cell.q}
                    data-r={cell.r}
                    points={outerPolygonPoints}
                    fill={isHighlighted ? "rgba(0, 255, 0, 0.5)" : "black"}
                    stroke={isHighlighted ? "yellow" : "white"}
                    strokeWidth={isHighlighted ? 6 : 4}
                    opacity={isHighlighted ? 0.8 : 0.6}
                    pointerEvents="none"
                    role="button"
                    aria-label={`Ground grid at row ${cell.r}, column ${cell.q}`}
                />
            </svg>
            {placedMonster && <div
                key={placedMonster.monsterId}
                draggable={true}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "absolute",
                    top: 0,
                    left: 0,
                    cursor: "grab",
                    userSelect: "none",
                    width: "100%",
                    height: "100%",
                    opacity: isDragging ? 0 : 1,
                    // 尖角朝上的正六边形 clip-path
                    // 顶点顺序：上 → 右上 → 右下 → 下 → 左下 → 左上
                    clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
                    backgroundColor: "red",
                }} >
                {placedMonster.monsterId}
            </div>}
        </div>
    );
};

const GridGround: React.FC = () => {
    const { mapDimension, groundCells, highlightedCell } = useTeamDeployManager();

    const hexHeight = mapDimension?.hexHeight || 0;
    const hexWidth = mapDimension?.hexWidth || 0;

    const rowStyle = useCallback((row: number) => {
        const isOdd = row % 2 !== 0;
        const left = isOdd ? hexWidth / 2 : 0;
        const bottom = -hexHeight * 1 / 4;
        return {
            ...STYLES.row(bottom, left),
            position: "relative" as const,
        };
    }, [hexHeight, hexWidth]);

    return (
        <div style={{
            width: "100%",
            height: "100%",
        }}>
            {groundCells?.map((row: GridCellSprite[], rowIndex: number) => (
                <div
                    key={rowIndex}
                    style={rowStyle(rowIndex)}
                    data-testid={`grid-row-${rowIndex}`}
                >
                    {row.map((cell: GridCellSprite, colIndex: number) => {
                        return (
                            <GroundCell
                                key={`${rowIndex}-${colIndex}`}
                                // width={hexWidth}
                                // height={hexHeight}
                                cell={cell}
                            />
                        );
                    })}
                </div>
            ))}
        </div>
    );
};

export default GridGround;
