/**
 * 战斗 GridGround3D - 六边形地面网格
 * 始终按逻辑坐标 (q, r) 遍历与定位，横竖屏同一场景；竖屏由相机旋转 90° 实现。
 */

import React, { useMemo } from "react";
import { useCombatManager } from "../../battle/service/CombatManager";
import type { BattleMapDimension } from "../utils/coordinate3DUtils";
import { hexTo3DPosition } from "../utils/coordinate3DUtils";
import { getSharedHexagonGeometry } from "../utils/geometryCache";
import HexCell3D, { type BattleCellState } from "./components/HexCell3D";

interface GridGround3DProps {
    mapDimension: BattleMapDimension | null;
    /** getCellState 接收逻辑坐标 (logicQ, logicR) */
    getCellState?: (q: number, r: number) => BattleCellState;
    /** 格子点击回调，参数为逻辑坐标 (logicQ, logicR) */
    onCellClick?: (logicQ: number, logicR: number) => void;
}

export const GridGround3D: React.FC<GridGround3DProps> = ({ mapDimension, getCellState, onCellClick }) => {
    const { groundCells } = useCombatManager();

    const sharedGeometries = useMemo(() => {
        if (!mapDimension) return null;
        const w = mapDimension.hexWidth;
        return {
            normal: getSharedHexagonGeometry(w, 2, 0.92),
            walkable: getSharedHexagonGeometry(w, 3, 0.90),
            attackable: getSharedHexagonGeometry(w, 3, 0.90),
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
                const state: BattleCellState = getCellState
                    ? getCellState(q, r)
                    : logicCell?.disable
                        ? "disabled"
                        : "normal";

                const geometry =
                    (state && sharedGeometries[state as keyof typeof sharedGeometries]) ||
                    sharedGeometries.normal;

                const isClickable = state === "walkable" || state === "attackable";

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
                        onClick={isClickable && onCellClick ? () => onCellClick(q, r) : undefined}
                    />
                );
            }
        }

        return result;
    }, [groundCells, mapDimension, sharedGeometries, getCellState, onCellClick]);

    return <group>{cells}</group>;
};
