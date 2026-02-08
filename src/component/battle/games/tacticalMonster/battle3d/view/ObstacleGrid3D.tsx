/**
 * 战斗 ObstacleGrid3D - 障碍物 3D 渲染
 * 障碍物逻辑坐标通过 logicToView 转换为视图坐标后渲染
 */

import React, { useMemo } from "react";
import { useCombatManager } from "../../battle/service/CombatManager";
import { logicToView } from "../../team/utils/coordinateUtils";
import type { BattleMapDimension } from "../utils/coordinate3DUtils";
import { hexTo3DCenter } from "../utils/coordinate3DUtils";

interface ObstacleGrid3DProps {
    mapDimension: BattleMapDimension | null;
}

export const ObstacleGrid3D: React.FC<ObstacleGrid3DProps> = ({ mapDimension }) => {
    const { game } = useCombatManager();

    const obstacles = useMemo(() => {
        if (!game?.map?.obstacles || !mapDimension) return [];

        return game.map.obstacles.map((cell, idx) => {
            // 逻辑坐标 → 视图坐标（竖屏时旋转）
            const view = logicToView(cell.q, cell.r, mapDimension);
            const pos = hexTo3DCenter(view.q, view.r, mapDimension, 0);
            if (!pos) return null;

            return (
                <mesh key={`obstacle-${idx}`} position={[pos.x, 0.5, pos.z]}>
                    <boxGeometry args={[mapDimension.hexWidth * 0.6, 1, mapDimension.hexHeight * 0.6]} />
                    <meshStandardMaterial color={0x8b4513} />
                </mesh>
            );
        });
    }, [game?.map?.obstacles, mapDimension]);

    return <group>{obstacles}</group>;
};
