/**
 * StageGrid3D 组件
 * 3D 障碍物、Boss、禁用区域等
 */

import React, { useContext, useMemo } from "react";
import { useTeamDeployManager } from "../service/TeamDeployManager";
import Boss3D from "./components/Boss3D";
import HexCell3D from "./components/HexCell3D";
import Obstacle3D from "./components/Obstacle3D";
import { TeamLayoutLoadingContext } from "./TeamLayoutLoadingContext";
import { hexTo3DPosition } from "./utils/coordinate3DUtils";
import { getSharedHexagonGeometry } from "./utils/geometryCache";

const StageGrid3D: React.FC = () => {
    const { stage, boss, mapDimension, deployables } = useTeamDeployManager();
    const loadingContext = useContext(TeamLayoutLoadingContext);

    if (!stage || !mapDimension) {
        return null;
    }
    console.log("stage:", stage);
    // 创建共享几何体（与 GridGround3D 中的参数保持一致）
    const sharedGeometries = useMemo(() => {
        const width = mapDimension.hexWidth;
        return {
            disabled: getSharedHexagonGeometry(width, 2, 0.90),
            deployable: getSharedHexagonGeometry(width, 3, 0.90),
            highlighted: getSharedHexagonGeometry(width, 4, 0.90),
        };
    }, [mapDimension]);

    // 渲染障碍物（3D 模式：直接用逻辑坐标，camera.up 处理竖屏旋转）
    const obstacles = useMemo(() => {
        if (!stage.map.obstacles) return [];

        return stage.map.obstacles.map((obstacle, index) => {
            const position = hexTo3DPosition(obstacle.q, obstacle.r, mapDimension, 0.1);
            if (!position) return null;

            return (
                <Obstacle3D
                    key={`obstacle-${obstacle.q}-${obstacle.r}-${index}`}
                    q={obstacle.q}
                    r={obstacle.r}
                    width={mapDimension.hexWidth}
                    height={mapDimension.hexHeight}
                    position={[position.x, position.y, position.z]}
                    type={obstacle.type}
                    asset={obstacle.asset}
                />
            );
        });
    }, [stage.map.obstacles, mapDimension]);

    // 渲染禁用区域（3D 模式：直接用逻辑坐标）
    const disables = useMemo(() => {
        if (!stage.map.disables) return [];

        return stage.map.disables.map((disable, index) => {
            const position = hexTo3DPosition(disable.q, disable.r, mapDimension, 0.12);
            if (!position) return null;

            return (
                <HexCell3D
                    key={`disable-${disable.q}-${disable.r}-${index}`}
                    q={disable.q}
                    r={disable.r}
                    width={mapDimension.hexWidth}
                    height={mapDimension.hexHeight}
                    position={[position.x, position.y, position.z]}
                    geometry={sharedGeometries.disabled}
                    state="disabled"
                />
            );
        });
    }, [stage.map.disables, mapDimension, sharedGeometries]);

    // 渲染可部署区域（3D 模式：直接用逻辑坐标）
    const deployableCells = useMemo(() => {
        if (!deployables || deployables.length === 0) return [];

        return deployables.map((deployable, index) => {
            const position = hexTo3DPosition(deployable.q, deployable.r, mapDimension, 0.15);
            if (!position) return null;

            return (
                <HexCell3D
                    key={`deployable-${deployable.q}-${deployable.r}-${index}`}
                    q={deployable.q}
                    r={deployable.r}
                    width={mapDimension.hexWidth}
                    height={mapDimension.hexHeight}
                    position={[position.x, position.y, position.z]}
                    geometry={sharedGeometries.deployable}
                    state="deployable"
                />
            );
        });
    }, [deployables, mapDimension, sharedGeometries]);

    // 渲染 Boss（3D 模式：直接用逻辑坐标，camera.up 处理竖屏旋转）
    const bossElement = useMemo(() => {
        if (!boss?.position) return null;

        const { q, r } = boss.position;

        const isOddRow = r % 2 !== 0;
        const colOffset = isOddRow ? mapDimension.hexWidth / 2 : 0;
        const leftX = q * mapDimension.hexWidth + colOffset;
        const topZ = r * mapDimension.hexHeight * 0.75;
        const centerX = leftX + mapDimension.hexWidth / 2;
        const centerZ = topZ - mapDimension.hexHeight / 2;

        return (
            <Boss3D
                q={q}
                r={r}
                width={mapDimension.hexWidth}
                height={mapDimension.hexHeight}
                position={[centerX, 0, centerZ]}
                bossId={stage.bossId}
                monsterId={boss.monsterId}
                onModelLoaded={loadingContext?.onModelLoaded}
                isPortrait={mapDimension.isPortrait}
            />
        );
    }, [boss, stage.bossId, mapDimension, loadingContext]);

    // 渲染 Minions（3D 模式：直接用逻辑坐标）
    const minions = useMemo(() => {
        if (!boss?.minions) return [];

        return boss.minions.map((minion, index) => {
            const position = hexTo3DPosition(minion.position.q, minion.position.r, mapDimension, 0.15);
            if (!position) return null;

            return (
                <HexCell3D
                    key={`minion-${minion.position.q}-${minion.position.r}-${index}`}
                    q={minion.position.q}
                    r={minion.position.r}
                    width={mapDimension.hexWidth}
                    height={mapDimension.hexHeight}
                    position={[position.x, position.y, position.z]}
                    geometry={sharedGeometries.highlighted}
                    state="highlighted"
                />
            );
        });
    }, [boss?.minions, mapDimension, sharedGeometries]);

    return (
        <group>
            {/* {obstacles} */}
            {disables}
            {deployableCells}
            {bossElement}
            {/* {minions} */}
        </group>
    );
};

export default StageGrid3D;
