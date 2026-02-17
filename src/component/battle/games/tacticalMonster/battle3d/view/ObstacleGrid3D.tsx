/**
 * 战斗 ObstacleGrid3D - 障碍物 3D 渲染
 * 障碍物始终用逻辑坐标 (q,r) 通过 hexTo3DCenter 算 3D 位置。
 */

import React, { useMemo } from "react";
import { useCombatManager } from "../../service/CombatManager";
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
            const pos = hexTo3DCenter(cell.q, cell.r, mapDimension, 0);
            if (!pos) return null;

            return (
                <mesh key={`obstacle-${idx}`} position={[pos.x, 0.5, pos.z]} renderOrder={2}>
                    <boxGeometry args={[mapDimension.hexWidth * 0.6, 1, mapDimension.hexHeight * 0.6]} />
                    <meshStandardMaterial color={0x8b4513} />
                </mesh>
            );
        });
    }, [game?.map?.obstacles, mapDimension]);

    return <group>{obstacles}</group>;
};
