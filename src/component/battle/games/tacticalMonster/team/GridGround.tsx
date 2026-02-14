/**
 * Tactical Monster 网格地面视图
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { calculateHexPoints } from '../battle/utils/gridUtils';
import { GridCellSprite } from '../types/CombatTypes';

import { STYLES } from '../battle/constants/GridConstants';
import { useTeamDeployManager } from './service/TeamDeployManager';
import './styles.css';

const GroundCell: React.FC<{
    // width: number,
    // height: number,
    cell: GridCellSprite,

}> = ({ cell }) => {
    const [isDragging, setIsDragging] = useState(false);
    const { quitTeam, mapDimension, playerMonsters, startDrag, endDrag, askAdd } = useTeamDeployManager();
    const [placedMonster, setPlacedMonster] = useState<{ monsterId: string, teamPosition: { q: number; r: number } } | null>(null);
    const width = mapDimension?.hexWidth || 0;
    const height = mapDimension?.hexHeight || 0;

    const points = useMemo(() => calculateHexPoints(width), [width]);
    const hexHeight = height;
    const outerPolygonPoints = useMemo(() =>
        points.map(point => `${point.x},${point.y}`).join(" "),
        [points]
    );

    const svgStyle: React.CSSProperties = {
        width: width,
        height: hexHeight,
        // pointerEvents: "none",
    };
    const handleDragStart = useCallback((e: React.DragEvent) => {
        if (!placedMonster) return;
        setIsDragging(true);

        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", placedMonster?.monsterId || "");

        // 隐藏原生拖拽预览，使用自定义的 DragPreview 组件
        const emptyImage = new Image();
        emptyImage.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
        e.dataTransfer.setDragImage(emptyImage, 0, 0);
        startDrag(placedMonster, e);
    }, [placedMonster, startDrag]);

    const handleDragEnd = (e: React.DragEvent) => {
        setIsDragging(false);

        if (e.dataTransfer.dropEffect === "move") {
            setPlacedMonster(null);
        }

        // 无论 drop 是否触发，都要清除拖拽状态和预览
        endDrag();
        e.dataTransfer.clearData();
    };
    const handleQuitTeam = useCallback((e: React.MouseEvent) => {
        e.stopPropagation(); // 阻止事件冒泡到拖拽层
        console.log("handleQuitTeam", placedMonster?.monsterId);
        if (placedMonster) {
            quitTeam(placedMonster.monsterId);
        }
    }, [placedMonster, quitTeam]);
    useEffect(() => {
        const monster = playerMonsters.find((m) => {
            if (!m.teamPosition) return false;
            return m.teamPosition.q === cell.q && m.teamPosition.r === cell.r;
        });
        if (!monster && placedMonster) {
            setPlacedMonster(null);
            return;
        }
        if (monster && (monster.monsterId === placedMonster?.monsterId || !placedMonster)) {
            setPlacedMonster(monster as { monsterId: string, teamPosition: { q: number; r: number } });
            return;
        }
        setPlacedMonster(null);
    }, [playerMonsters, placedMonster, cell]);
    useEffect(() => {
        if ((cell as GridCellSprite) && mapDimension) {
            const sprite = cell as GridCellSprite;
            if (sprite.element) {
                sprite.element.style.fill = "black";
                sprite.element.style.stroke = "white";
                sprite.element.style.strokeWidth = "4";
                sprite.element.style.opacity = "0.4";
            }
        }
    }, [cell, mapDimension]);
    return (
        // 单元格容器 - 不响应事件，让事件穿透到内部的 SVG polygon
        <div style={{
            position: "relative",
            width: width,
            height: hexHeight,
            pointerEvents: "none", // 关键：容器不阻挡事件
        }}>
            {/* 背景 SVG - 不响应事件 */}
            <svg
                width={width}
                height={hexHeight}
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                }}
                viewBox={`0 0 ${width} ${hexHeight}`}
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
                    fill={"black"}
                    stroke={"white"}
                    strokeWidth={4}
                    opacity={0.4}
                    pointerEvents="none"
                />
            </svg>

            {placedMonster &&
                <>
                    {/* 可拖拽的怪物卡片 */}
                    <div
                        draggable={true}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            backgroundColor: "blue",
                            cursor: "grab",
                            userSelect: "none",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            opacity: isDragging ? 0 : 1,
                            clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
                            pointerEvents: "auto", // 关键：启用事件响应
                        }}
                    >
                        <span style={{
                            color: "white",
                            fontSize: Math.min(width, hexHeight) * 0.1,
                            pointerEvents: "none",
                        }}>
                            {placedMonster.monsterId}
                        </span>
                    </div>

                    {/* QUIT 按钮 */}
                    <div
                        onClick={handleQuitTeam}
                        style={{
                            position: "absolute",
                            left: "50%",
                            top: "55%",
                            transform: "translateX(-50%)",
                            width: "40%",
                            height: "18%",
                            backgroundColor: "rgb(11, 133, 233)",
                            color: "white",
                            fontSize: Math.min(width, hexHeight) * 0.09,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            borderRadius: 3,
                            opacity: isDragging ? 0 : 1,
                            pointerEvents: "auto", // 关键：启用事件响应
                        }}
                    >
                        QUIT
                    </div>
                </>
            }
            {/* <svg
                    width={width}
                    height={hexHeight}
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                    }}
                    viewBox={`0 0 ${width} ${hexHeight}`}
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <polygon
                        points={outerPolygonPoints}
                        fill="transparent"
                        style={{ cursor: "pointer" }}
                        pointerEvents="auto"
                        // onClick={() => askAdd(cell.q, cell.r)}
                    />
                    <text
                        x="50%"
                        y="50%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="white"
                        fontSize={Math.min(width, hexHeight) * 0.3}
                        pointerEvents="none"
                    >
                        +
                    </text>
                </svg> */}

        </div>
    );
};

const GridGround: React.FC = () => {
    const { mapDimension, groundCells } = useTeamDeployManager();

    const hexHeight = mapDimension?.hexHeight || 0;
    const hexWidth = mapDimension?.hexWidth || 0;

    const rowStyle = useCallback((row: number) => {
        const isOdd = row % 2 !== 0;
        const left = isOdd ? hexWidth / 2 : 0;
        const bottom = -hexHeight * 1 / 4;
        return {
            ...STYLES.row(bottom, left),
            position: "relative" as const,
            pointerEvents: "none" as const, // 行容器不阻挡事件
        };
    }, [hexHeight, hexWidth]);

    return (
        <div style={{
            width: "100%",
            height: "100%",
            pointerEvents: "none", // 网格容器不阻挡事件
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
