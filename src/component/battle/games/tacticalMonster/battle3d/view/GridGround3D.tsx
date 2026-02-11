/**
 * 战斗 GridGround3D - 六边形地面网格
 * 使用视图坐标渲染，通过 viewToLogic 映射回逻辑坐标检查禁用/状态
 */

import React, { useMemo } from "react";
import { useCombatManager } from "../../battle/service/CombatManager";
import { viewToLogic } from "../../team/utils/coordinateUtils";
import type { BattleMapDimension } from "../utils/coordinate3DUtils";
import { hexTo3DPosition } from "../utils/coordinate3DUtils";
import { getSharedHexagonGeometry } from "../utils/geometryCache";
import HexCell3D, { type BattleCellState } from "./components/HexCell3D";

interface GridGround3DProps {
    mapDimension: BattleMapDimension | null;
    /** getCellState 接收逻辑坐标 (logicQ, logicR) */
    getCellState?: (q: number, r: number) => BattleCellState;
    /** 格子点击回调，参数为视图坐标 (viewQ, viewR) */
    onCellClick?: (viewQ: number, viewR: number) => void;
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

        // 按视图坐标 (cols × rows) 遍历，竖屏时会旋转网格
        for (let viewR = 0; viewR < mapDimension.rows; viewR++) {
            for (let viewQ = 0; viewQ < mapDimension.cols; viewQ++) {
                const pos = hexTo3DPosition(viewQ, viewR, mapDimension, 0);
                if (!pos) continue;

                // 转换回逻辑坐标，用于查询 groundCells 禁用状态和 getCellState
                const logic = viewToLogic(viewQ, viewR, mapDimension);
                const logicCell = groundCells?.[logic.r]?.[logic.q];

                const state: BattleCellState = getCellState
                    ? getCellState(logic.q, logic.r)
                    : logicCell?.disable
                        ? "disabled"
                        : "normal";

                const geometry =
                    sharedGeometries[state === "disabled" ? "disabled" : "normal"] ||
                    sharedGeometries.normal;

                const isClickable = state === "walkable" || state === "attackable";
                const vQ = viewQ;
                const vR = viewR;

                result.push(
                    <HexCell3D
                        key={`cell-${viewQ}-${viewR}`}
                        q={viewQ}
                        r={viewR}
                        width={mapDimension.hexWidth}
                        height={mapDimension.hexHeight}
                        position={[pos.x, pos.y, pos.z]}
                        geometry={geometry}
                        state={state}
                        onClick={isClickable && onCellClick ? () => onCellClick(vQ, vR) : undefined}
                    />
                );
            }
        }

        return result;
    }, [groundCells, mapDimension, sharedGeometries, getCellState, onCellClick]);

    return <group>{cells}</group>;
};
