/**
 * GridGround3D 组件
 * 3D 六边形网格地面
 */

import React, { useCallback, useMemo, useState } from "react";
import { useTeamDeployManager } from "../service/TeamDeployManager";
import HexCell3D from "./components/HexCell3D";
import MonsterCard3D from "./components/MonsterCard3D";

const GridGround3D: React.FC = () => {
    const {
        groundCells,
        mapDimension,
        isCellOccupied,
        askAdd,
        dragMonster,
        playerMonsters,
        logicToView,
    } = useTeamDeployManager();

    const [hoveredCell, setHoveredCell] = useState<{ q: number; r: number } | null>(null);

    // 处理单元格点击
    const handleCellClick = useCallback(
        (q: number, r: number) => {
            askAdd(q, r);
        },
        [askAdd]
    );

    // 处理鼠标悬停
    const handleCellPointerEnter = useCallback(
        (q: number, r: number) => {
            setHoveredCell({ q, r });
        },
        []
    );

    const handleCellPointerLeave = useCallback(() => {
        setHoveredCell(null);
    }, []);

    // 检查格子是否有玩家怪物
    const hasMonsterAt = useCallback((viewQ: number, viewR: number) => {
        if (!playerMonsters) return false;
        return playerMonsters.some(monster => {
            if (!monster.teamPosition) return false;
            const viewPos = logicToView(monster.teamPosition.q, monster.teamPosition.r);
            return viewPos.q === viewQ && viewPos.r === viewR;
        });
    }, [playerMonsters, logicToView]);

    // 渲染所有单元格
    const cells = useMemo(() => {
        if (!groundCells || !mapDimension) return [];

        return groundCells.flatMap((row, r) =>
            row.map((cell, q) => {
                // 计算六边形左上角位置
                const isOddRow = r % 2 !== 0;
                const colOffset = isOddRow ? mapDimension.hexWidth / 2 : 0;
                const leftX = q * mapDimension.hexWidth + colOffset;
                const topZ = r * mapDimension.hexHeight * 0.75;

                // 检查是否有怪物在此格子
                const hasMonster = hasMonsterAt(q, r);

                // 如果有怪物，跳过渲染底层格子，避免 Z-fighting
                if (hasMonster) {
                    return null;
                }

                // 确定单元格状态
                let state: "normal" | "highlighted" | "disabled" | "deployable" = "normal";
                const isHovered = hoveredCell?.q === q && hoveredCell?.r === r;
                const isOccupied = isCellOccupied(q, r);
                const isDragging = dragMonster !== null;

                if (isHovered || (isDragging && !isOccupied)) {
                    state = "highlighted";
                } else if (isOccupied) {
                    state = "disabled";
                }

                return (
                    <HexCell3D
                        key={`cell-${q}-${r}`}
                        q={q}
                        r={r}
                        width={mapDimension.hexWidth}
                        height={mapDimension.hexHeight}
                        position={[leftX, 0, topZ]}
                        state={state}
                        onClick={() => handleCellClick(q, r)}
                        onPointerEnter={() => handleCellPointerEnter(q, r)}
                        onPointerLeave={handleCellPointerLeave}
                    />
                );
            })
        ).filter(cell => cell !== null);
    }, [
        groundCells,
        mapDimension,
        dragMonster,
        hoveredCell,
        isCellOccupied,
        hasMonsterAt,
        handleCellClick,
        handleCellPointerEnter,
        handleCellPointerLeave,
    ]);

    // 渲染已放置的怪物
    const placedMonsters = useMemo(() => {
        if (!playerMonsters || !mapDimension) {
            console.log("[GridGround3D] 缺少数据:", {
                playerMonsters: playerMonsters?.length || 0,
                mapDimension: !!mapDimension
            });
            return [];
        }

        const monstersWithPosition = playerMonsters.filter((monster) => monster.teamPosition);
        console.log("[GridGround3D] 已放置的怪物数量:", monstersWithPosition.length);
        console.log("[GridGround3D] 怪物详情:", monstersWithPosition.map(m => ({
            monsterId: m.monsterId,
            teamPosition: m.teamPosition ? { q: m.teamPosition.q, r: m.teamPosition.r } : null,
        })));

        // 检查是否有重复的位置
        const positions = monstersWithPosition.map(m => m.teamPosition ? `${m.teamPosition.q},${m.teamPosition.r}` : null);
        const uniquePositions = new Set(positions);
        if (positions.length !== uniquePositions.size) {
            console.warn("[GridGround3D] ⚠️ 检测到重复位置!", {
                total: positions.length,
                unique: uniquePositions.size,
                positions: positions,
                duplicates: positions.filter((pos, idx) => positions.indexOf(pos) !== idx)
            });
        }

        const renderedMonsters = monstersWithPosition
            .map((monster) => {
                if (!monster.teamPosition) return null;
                const viewPos = logicToView(monster.teamPosition.q, monster.teamPosition.r);

                // 计算六边形左上角位置（与 HexCell3D 相同）
                const isOddRow = viewPos.r % 2 !== 0;
                const colOffset = isOddRow ? mapDimension.hexWidth / 2 : 0;
                const leftX = viewPos.q * mapDimension.hexWidth + colOffset;
                const topZ = viewPos.r * mapDimension.hexHeight * 0.75;

                // 六边形几何体中心相对于左上角的偏移
                // 由于 HexCell3D 旋转 -90 度，原来的 Y 变成 -Z
                // 几何体从 (0,0) 开始，中心在 (width/2, height/2)
                // 旋转后中心变成 (width/2, 0, -height/2)
                // 所以实际中心 = 左上角 + (width/2, 0, -height/2)
                const centerX = leftX + mapDimension.hexWidth / 2;
                const centerZ = topZ - mapDimension.hexHeight / 2;

                const isDragging = dragMonster?.monsterId === monster.monsterId;

                return (
                    <MonsterCard3D
                        key={`monster-${monster.monsterId}`}
                        q={viewPos.q}
                        r={viewPos.r}
                        width={mapDimension.hexWidth}
                        height={mapDimension.hexHeight}
                        position={[centerX, 0, centerZ]}
                        monsterId={monster.monsterId}
                        isDragging={isDragging}
                    />
                );
            })
            .filter((monster) => monster !== null);

        return renderedMonsters;
    }, [playerMonsters, mapDimension, dragMonster, logicToView]);

    return (
        <group>
            {cells}
            {placedMonsters}
        </group>
    );
};

export default GridGround3D;
