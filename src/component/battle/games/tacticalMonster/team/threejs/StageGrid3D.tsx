/**
 * StageGrid3D 组件
 * 3D 障碍物、Boss、禁用区域等
 */

import React, { useMemo } from "react";
import { useTeamDeployManager } from "../service/TeamDeployManager";
import Boss3D from "./components/Boss3D";
import HexCell3D from "./components/HexCell3D";
import Obstacle3D from "./components/Obstacle3D";
import { hexTo3DPosition } from "./utils/coordinate3DUtils";

const StageGrid3D: React.FC = () => {
    const { stage, boss, mapDimension, deployables, logicToView } = useTeamDeployManager();

    if (!stage || !mapDimension) {
        return null;
    }

    // 渲染障碍物
    const obstacles = useMemo(() => {
        if (!stage.map.obstacles) return [];

        return stage.map.obstacles.map((obstacle, index) => {
            const viewPos = logicToView(obstacle.q, obstacle.r);
            const position = hexTo3DPosition(viewPos.q, viewPos.r, mapDimension, 0.1);
            if (!position) return null;

            return (
                <Obstacle3D
                    key={`obstacle-${obstacle.q}-${obstacle.r}-${index}`}
                    q={viewPos.q}
                    r={viewPos.r}
                    width={mapDimension.hexWidth}
                    height={mapDimension.hexHeight}
                    position={[position.x, position.y, position.z]}
                    type={obstacle.type}
                    asset={obstacle.asset}
                />
            );
        });
    }, [stage.map.obstacles, mapDimension, logicToView]);

    // 渲染禁用区域
    // Y 偏移设置为 0.12，明显高于基础格子，避免 Z-fighting
    const disables = useMemo(() => {
        if (!stage.map.disables) return [];

        return stage.map.disables.map((disable, index) => {
            const viewPos = logicToView(disable.q, disable.r);
            const position = hexTo3DPosition(viewPos.q, viewPos.r, mapDimension, 0.12);
            if (!position) return null;

            return (
                <HexCell3D
                    key={`disable-${disable.q}-${disable.r}-${index}`}
                    q={viewPos.q}
                    r={viewPos.r}
                    width={mapDimension.hexWidth}
                    height={mapDimension.hexHeight}
                    position={[position.x, position.y, position.z]}
                    state="disabled"
                />
            );
        });
    }, [stage.map.disables, mapDimension, logicToView]);

    // 渲染可部署区域
    // Y 偏移设置为 0.15，明显高于基础格子（0 + yOffset），避免 Z-fighting
    const deployableCells = useMemo(() => {
        if (!deployables || deployables.length === 0) return [];

        return deployables.map((deployable, index) => {
            const viewPos = logicToView(deployable.q, deployable.r);
            const position = hexTo3DPosition(viewPos.q, viewPos.r, mapDimension, 0.15);
            if (!position) return null;

            return (
                <HexCell3D
                    key={`deployable-${deployable.q}-${deployable.r}-${index}`}
                    q={viewPos.q}
                    r={viewPos.r}
                    width={mapDimension.hexWidth}
                    height={mapDimension.hexHeight}
                    position={[position.x, position.y, position.z]}
                    state="deployable"
                />
            );
        });
    }, [deployables, mapDimension, logicToView]);

    // 渲染 Boss
    const bossElement = useMemo(() => {
        if (!boss?.position) return null;

        const viewPos = logicToView(boss.position.q, boss.position.r);
        const position = hexTo3DPosition(viewPos.q, viewPos.r, mapDimension, 0.2);
        if (!position) return null;

        return (
            <Boss3D
                q={viewPos.q}
                r={viewPos.r}
                width={mapDimension.hexWidth}
                height={mapDimension.hexHeight}
                position={[position.x, position.y, position.z]}
                bossId={stage.bossId}
            />
        );
    }, [boss, stage.bossId, mapDimension, logicToView]);

    // 渲染 Minions
    const minions = useMemo(() => {
        if (!boss?.minions) return [];

        return boss.minions.map((minion, index) => {
            const viewPos = logicToView(minion.position.q, minion.position.r);
            const position = hexTo3DPosition(viewPos.q, viewPos.r, mapDimension, 0.15);
            if (!position) return null;

            return (
                <HexCell3D
                    key={`minion-${minion.position.q}-${minion.position.r}-${index}`}
                    q={viewPos.q}
                    r={viewPos.r}
                    width={mapDimension.hexWidth}
                    height={mapDimension.hexHeight}
                    position={[position.x, position.y, position.z]}
                    state="highlighted"
                />
            );
        });
    }, [boss?.minions, mapDimension, logicToView]);

    return (
        <group>
            {obstacles}
            {disables}
            {deployableCells}
            {bossElement}
            {minions}
        </group>
    );
};

export default StageGrid3D;
