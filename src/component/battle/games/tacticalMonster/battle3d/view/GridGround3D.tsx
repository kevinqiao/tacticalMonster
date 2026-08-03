/**
 * 战斗 GridGround3D - 六边形地面网格
 * 始终按逻辑坐标 (q, r) 遍历与定位，横竖屏同一场景；竖屏由相机旋转 90° 实现。
 */

import React, { useMemo } from "react";
import { useCombatManager } from "../../service/CombatManager";
import type { BattleMapDimension } from "../utils/coordinate3DUtils";
import { hexTo3DPosition } from "../utils/coordinate3DUtils";
import { getSharedHexagonGeometry } from "../utils/geometryCache";
import { HexCell3D, type BattleCellState } from "./components/HexCell3D";

interface GridGround3DProps {
    mapDimension: BattleMapDimension | null;
    /** getCellState 接收逻辑坐标 (logicQ, logicR) */
    getCellState?: (q: number, r: number) => BattleCellState;
    /** 可行走格 BFS 距离（可选；HexCell3D 可走现为单色） */
    getWalkableDistance?: (q: number, r: number) => number | undefined;
    getWalkableMoveRange?: () => number | undefined;
    /** 格子点击回调，参数为逻辑坐标 (logicQ, logicR) */
    onCellClick?: (logicQ: number, logicR: number) => void;
}

export const GridGround3D: React.FC<GridGround3DProps> = ({
    mapDimension,
    getCellState,
    getWalkableDistance,
    getWalkableMoveRange,
    onCellClick,
}) => {
    const { groundCells } = useCombatManager();

    const sharedGeometries = useMemo(() => {
        if (!mapDimension) return null;
        const w = mapDimension.hexWidth;
        return {
            normal: getSharedHexagonGeometry(w, 2, 0.92),
            walkable: getSharedHexagonGeometry(w, 3, 0.90),
            walkable_dim: getSharedHexagonGeometry(w, 3, 0.90),
            attackable: getSharedHexagonGeometry(w, 3, 0.90),
            attackable_dim: getSharedHexagonGeometry(w, 3, 0.90),
            attackable_focus: getSharedHexagonGeometry(w, 3, 0.90),
            path: getSharedHexagonGeometry(w, 3, 0.90),
            selected: getSharedHexagonGeometry(w, 4, 0.90),
            disabled: getSharedHexagonGeometry(w, 2, 0.90),
        };
    }, [mapDimension]);

    const cells = useMemo(() => {
        if (!mapDimension || !sharedGeometries) return [];

        const result: React.ReactElement[] = [];
        const rows = mapDimension.rows;
        const cols = mapDimension.cols;

        for (let r = 0; r < rows; r++) {
            for (let q = 0; q < cols; q++) {
                const pos = hexTo3DPosition(q, r, mapDimension, 0);
                if (!pos) continue;

                const logicCell = groundCells?.[r]?.[q];
                const rawState: BattleCellState = getCellState
                    ? getCellState(q, r)
                    : logicCell?.disable
                        ? "disabled"
                        : "normal";
                const overlayStates: BattleCellState[] = [
                    "walkable",
                    "walkable_dim",
                    "attackable",
                    "attackable_dim",
                    "attackable_focus",
                    "path",
                    "selected",
                ];
                const state: BattleCellState = overlayStates.includes(rawState) ? "normal" : rawState;

                const geometry =
                    (state && sharedGeometries[state as keyof typeof sharedGeometries]) ||
                    sharedGeometries.normal;

                const isClickable =
                    state === "walkable" ||
                    state === "attackable" ||
                    state === "attackable_focus";
                const walkableDistance =
                    state === "walkable" || state === "walkable_dim" ? getWalkableDistance?.(q, r) : undefined;
                const moveRange =
                    state === "walkable" || state === "walkable_dim" ? getWalkableMoveRange?.() : undefined;

                result.push(
                    <HexCell3D
                        key={`cell-${q}-${r}`}
                        q={q}
                        r={r}
                        width={mapDimension.hexWidth}
                        height={mapDimension.hexHeight}
                        position={[pos.x, pos.y, pos.z]}
                        geometry={geometry}
                        state={state}
                        walkableDistance={walkableDistance}
                        moveRange={moveRange}
                        onClick={isClickable && onCellClick ? () => onCellClick(q, r) : undefined}
                    />
                );
            }
        }

        return result;
    }, [groundCells, mapDimension, sharedGeometries, getCellState, getWalkableDistance, getWalkableMoveRange, onCellClick]);

    return <group>{cells}</group>;
};
