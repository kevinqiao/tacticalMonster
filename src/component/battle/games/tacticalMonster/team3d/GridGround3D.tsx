/**
 * GridGround3D 组件
 * 3D 六边形网格地面，支持怪物拖拽移动
 */

import React, { useCallback, useContext, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useTeamDeployManager } from "../service/TeamDeployManager";
import HexCell3D from "./components/HexCell3D";
import { MonsterCard3DWithSuspense } from "./components/MonsterCard3D";
import { TeamLayoutLoadingContext } from "./TeamLayoutLoadingContext";
import { getSharedHexagonGeometry } from "./utils/geometryCache";

const GridGround3D: React.FC = () => {
    const {
        groundCells,
        mapDimension,
        isCellOccupied,
        askAdd,
        dragMonster,
        playerMonsters,
        moveMonster,
        selectedMonsterId,
        selectMonster,
    } = useTeamDeployManager();
    const loadingContext = useContext(TeamLayoutLoadingContext);

    const [hoveredCell, setHoveredCell] = useState<{ q: number; r: number } | null>(null);
    const [draggingMonsterId, setDraggingMonsterId] = useState<string | null>(null);
    const [dragHighlightCell, setDragHighlightCell] = useState<{ q: number; r: number } | null>(null);
    const [dragStartCell, setDragStartCell] = useState<{ q: number; r: number } | null>(null); // 拖拽起始位置

    // ===== 性能优化：用 ref 保存频繁变化但不影响 placedMonsters 结构的值 =====
    const loadingContextRef = useRef(loadingContext);
    loadingContextRef.current = loadingContext;

    // 为每种状态创建共享的几何体（在父组件中统一管理）
    const sharedGeometries = useMemo(() => {
        if (!mapDimension) return null;

        const width = mapDimension.hexWidth;

        return {
            normal: getSharedHexagonGeometry(width, 2, 0.92),      // 普通格子
            highlighted: getSharedHexagonGeometry(width, 4, 0.90),  // 高亮格子
            disabled: getSharedHexagonGeometry(width, 2, 0.90),     // 禁用格子
            deployable: getSharedHexagonGeometry(width, 3, 0.90),   // 可部署格子
        };
    }, [mapDimension]);

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

    // 世界坐标转换为格子坐标
    // 怪物位置是格子中心：centerX = leftX + hexWidth/2, centerZ = topZ - hexHeight/2
    const worldToHex = useCallback((worldPos: THREE.Vector3): { q: number; r: number } | null => {
        if (!mapDimension) return null;

        const { hexWidth, hexHeight, cols, rows } = mapDimension;

        // 从中心坐标反推左上角坐标
        // centerX = leftX + hexWidth/2  =>  leftX = centerX - hexWidth/2
        // centerZ = topZ - hexHeight/2  =>  topZ = centerZ + hexHeight/2
        const leftX = worldPos.x - hexWidth / 2;
        const topZ = worldPos.z + hexHeight / 2;

        // 从 topZ 计算 r
        // topZ = r * hexHeight * 0.75
        const approxR = Math.round(topZ / (hexHeight * 0.75));

        // 从 leftX 计算 q
        // leftX = q * hexWidth + (isOddRow ? hexWidth / 2 : 0)
        const isOddRow = approxR % 2 !== 0;
        const colOffset = isOddRow ? hexWidth / 2 : 0;
        const approxQ = Math.round((leftX - colOffset) / hexWidth);

        // 边界检查
        if (approxQ < 0 || approxQ >= cols || approxR < 0 || approxR >= rows) {
            return null;
        }

        return { q: approxQ, r: approxR };
    }, [mapDimension]);

    // 怪物拖拽开始（3D 模式：直接用逻辑坐标，camera.up 处理竖屏旋转）
    const handleMonsterDragStart = useCallback((monsterId: string) => {
        const monster = playerMonsters?.find(m => m.monsterId === monsterId);
        if (monster?.teamPosition) {
            setDragStartCell(monster.teamPosition);
        }
        setDraggingMonsterId(monsterId);
    }, [playerMonsters]);

    // 怪物拖拽移动
    const handleMonsterDragMove = useCallback((monsterId: string, worldPos: THREE.Vector3) => {
        const hexCoord = worldToHex(worldPos);
        if (hexCoord && !isCellOccupied(hexCoord.q, hexCoord.r)) {
            setDragHighlightCell(hexCoord);
        } else {
            setDragHighlightCell(null);
        }
    }, [worldToHex, isCellOccupied]);

    // 怪物拖拽结束（3D 模式：世界坐标即逻辑坐标）
    const handleMonsterDragEnd = useCallback((monsterId: string, worldPos: THREE.Vector3) => {
        const hexCoord = worldToHex(worldPos);

        const isValidNewPosition = hexCoord &&
            !isCellOccupied(hexCoord.q, hexCoord.r) &&
            !(dragStartCell && hexCoord.q === dragStartCell.q && hexCoord.r === dragStartCell.r);

        if (isValidNewPosition) {
            moveMonster?.(monsterId, hexCoord.q, hexCoord.r);
        }

        setDraggingMonsterId(null);
        setDragHighlightCell(null);
        setDragStartCell(null);
    }, [worldToHex, isCellOccupied, moveMonster, dragStartCell]);

    // ===== 性能优化：用 ref 包装 drag 回调，创建稳定引用供 placedMonsters 使用 =====
    const dragStartRef = useRef(handleMonsterDragStart);
    dragStartRef.current = handleMonsterDragStart;
    const dragMoveRef = useRef(handleMonsterDragMove);
    dragMoveRef.current = handleMonsterDragMove;
    const dragEndRef = useRef(handleMonsterDragEnd);
    dragEndRef.current = handleMonsterDragEnd;

    // 稳定的回调包装器，引用永远不变
    const stableDragStart = useCallback((monsterId: string) => {
        dragStartRef.current(monsterId);
    }, []);
    const stableDragMove = useCallback((monsterId: string, worldPos: THREE.Vector3) => {
        dragMoveRef.current(monsterId, worldPos);
    }, []);
    const stableDragEnd = useCallback((monsterId: string, worldPos: THREE.Vector3) => {
        dragEndRef.current(monsterId, worldPos);
    }, []);

    // 检查格子是否有玩家怪物（排除正在拖拽的怪物）—— 3D 模式：直接比较逻辑坐标
    const hasMonsterAt = useCallback((q: number, r: number) => {
        if (!playerMonsters) return false;
        return playerMonsters.some(monster => {
            if (draggingMonsterId && monster.monsterId === draggingMonsterId) {
                return false;
            }
            if (!monster.teamPosition) return false;
            return monster.teamPosition.q === q && monster.teamPosition.r === r;
        });
    }, [playerMonsters, draggingMonsterId]);

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
                const isDragHighlight = dragHighlightCell?.q === q && dragHighlightCell?.r === r;
                const isDragStart = dragStartCell?.q === q && dragStartCell?.r === r;
                const isOccupied = isCellOccupied(q, r);
                const isDragging = dragMonster !== null || draggingMonsterId !== null;

                if (isDragHighlight) {
                    state = "highlighted"; // 拖拽时的目标格子高亮
                } else if (isHovered && !isDragging) {
                    state = "highlighted"; // 非拖拽时的悬停高亮
                } else if (isOccupied && !isDragStart) {
                    // 被占用的格子显示为 disabled，但起始位置除外（起始位置显示为 normal）
                    state = "disabled";
                }

                // 根据状态选择对应的共享几何体
                const geometry = sharedGeometries?.[state] || sharedGeometries?.normal;

                if (!geometry) return null;

                return (
                    <HexCell3D
                        key={`cell-${q}-${r}`}
                        q={q}
                        r={r}
                        width={mapDimension.hexWidth}
                        height={mapDimension.hexHeight}
                        position={[leftX, 0, topZ]}
                        geometry={geometry}
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
        sharedGeometries,
        dragMonster,
        draggingMonsterId,
        dragHighlightCell,
        dragStartCell,
        hoveredCell,
        isCellOccupied,
        hasMonsterAt,
        handleCellClick,
        handleCellPointerEnter,
        handleCellPointerLeave,
    ]);

    // 渲染已放置的怪物（3D 模式：直接用逻辑坐标定位，camera.up 处理竖屏旋转）
    const placedMonsters = useMemo(() => {
        if (!playerMonsters || !mapDimension) {
            return [];
        }

        const monstersWithPosition = playerMonsters.filter((monster) => monster.teamPosition);

        const renderedMonsters = monstersWithPosition
            .map((monster) => {
                if (!monster.teamPosition) return null;
                const { q, r } = monster.teamPosition;

                const isOddRow = r % 2 !== 0;
                const colOffset = isOddRow ? mapDimension.hexWidth / 2 : 0;
                const leftX = q * mapDimension.hexWidth + colOffset;
                const topZ = r * mapDimension.hexHeight * 0.75;

                const centerX = leftX + mapDimension.hexWidth / 2;
                const centerZ = topZ - mapDimension.hexHeight / 2;

                const isDragging = dragMonster?.monsterId === monster.monsterId || draggingMonsterId === monster.monsterId;

                return (
                    <MonsterCard3DWithSuspense
                        key={`monster-${monster.monsterId}`}
                        q={q}
                        r={r}
                        width={mapDimension.hexWidth}
                        height={mapDimension.hexHeight}
                        position={[centerX, 0, centerZ]}
                        monsterId={monster.monsterId}
                        isDragging={isDragging}
                        isSelected={selectedMonsterId === monster.monsterId}
                        onClick={() => selectMonster(monster.monsterId)}
                        onDragStart={stableDragStart}
                        onDragMove={stableDragMove}
                        onDragEnd={stableDragEnd}
                        onModelLoaded={loadingContextRef.current?.onModelLoaded}
                        isPortrait={mapDimension.isPortrait}
                    />
                );
            })
            .filter((monster) => monster !== null);

        return renderedMonsters;
    }, [playerMonsters, mapDimension, dragMonster, draggingMonsterId, selectedMonsterId, selectMonster, stableDragStart, stableDragMove, stableDragEnd]);

    return (
        <group>
            {cells}
            {placedMonsters}
        </group>
    );
};

export default GridGround3D;
