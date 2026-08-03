/**
 * 战斗高亮叠加层 - 仅渲染 walkable/attackable/path/selected
 * 置于 CharacterGrid3D 之后，确保高亮始终在最顶层（紧靠怪物的第一层）
 */

import React, { useMemo } from "react";
import * as THREE from "three";
import { useCombatManager } from "../../service/CombatManager";
import type { BattleMapDimension } from "../utils/coordinate3DUtils";
import { hexTo3DPosition } from "../utils/coordinate3DUtils";
import { createHexagonShape } from "../utils/hex3DUtils";
import { HexCell3D, type BattleCellState } from "./components/HexCell3D";

const HIGHLIGHT_STATES: BattleCellState[] = [
    "walkable",
    "walkable_dim",
    "attackable",
    "attackable_dim",
    "attackable_focus",
    "path",
    "selected",
];

interface GridHighlight3DProps {
    mapDimension: BattleMapDimension | null;
    getCellState?: (q: number, r: number) => BattleCellState;
    getWalkableDistance?: (q: number, r: number) => number | undefined;
    getWalkableMoveRange?: () => number | undefined;
    onCellClick?: (logicQ: number, logicR: number) => void;
    /** 教学：施法步开始后约 1s 内加强 attackable_focus 脉冲 */
    pedagogyAttackTargetPulseBoost?: boolean;
}

export const GridHighlight3D: React.FC<GridHighlight3DProps> = ({
    mapDimension,
    getCellState,
    getWalkableDistance,
    getWalkableMoveRange,
    onCellClick,
    pedagogyAttackTargetPulseBoost,
}) => {
    const { groundCells } = useCombatManager();

    const sharedGeometries = useMemo(() => {
        if (!mapDimension) return null;
        const w = mapDimension.hexWidth;
        // 高亮用完全平面的 ShapeGeometry（零厚度、单面），彻底消除 z-fighting 闪烁
        const flatGeo = new THREE.ShapeGeometry(createHexagonShape(w, 0.90));
        const flatGeoSelected = new THREE.ShapeGeometry(createHexagonShape(w, 0.90));
        return {
            walkable: flatGeo,
            walkable_dim: flatGeo,
            attackable: flatGeo,
            attackable_dim: flatGeo,
            attackable_focus: flatGeo,
            path: flatGeo,
            selected: flatGeoSelected,
        };
    }, [mapDimension]);

    const cells = useMemo(() => {
        if (!mapDimension || !sharedGeometries || !getCellState) return [];

        const result: React.ReactElement[] = [];
        const rows = mapDimension.rows;
        const cols = mapDimension.cols;

        for (let r = 0; r < rows; r++) {
            for (let q = 0; q < cols; q++) {
                const state = getCellState(q, r);
                if (!HIGHLIGHT_STATES.includes(state)) continue;

                const pos = hexTo3DPosition(q, r, mapDimension, 0);
                if (!pos) continue;

                const geometry =
                    sharedGeometries[state as keyof typeof sharedGeometries] ?? sharedGeometries.walkable;
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
                        key={`highlight-${q}-${r}`}
                        q={q}
                        r={r}
                        width={mapDimension.hexWidth}
                        height={mapDimension.hexHeight}
                        position={[pos.x, pos.y, pos.z]}
                        geometry={geometry}
                        state={state}
                        walkableDistance={walkableDistance}
                        moveRange={moveRange}
                        pedagogyPulseBoost={
                            !!pedagogyAttackTargetPulseBoost && state === "attackable_focus"
                        }
                        onClick={isClickable && onCellClick ? () => onCellClick(q, r) : undefined}
                    />
                );
            }
        }

        return result;
    }, [
        groundCells,
        mapDimension,
        sharedGeometries,
        getCellState,
        getWalkableDistance,
        getWalkableMoveRange,
        onCellClick,
        pedagogyAttackTargetPulseBoost,
    ]);

    return <group>{cells}</group>;
};
