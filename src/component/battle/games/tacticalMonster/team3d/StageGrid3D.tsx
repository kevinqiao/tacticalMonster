/**
 * StageGrid3D 组件
 * 3D 障碍物、Boss、禁用区域等
 */

import React, { useCallback, useContext, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useTeamDeployManager } from "../service/TeamDeployManager";
import Boss3D from "./components/Boss3D";
import HexCell3D from "./components/HexCell3D";
import Obstacle3D from "./components/Obstacle3D";
import { buildBossHoverStatLines, getBossHoverTitle } from "./components/teamLayoutHoverStats";
import { TeamLayoutLoadingContext } from "./TeamLayoutLoadingContext";
import { useTeamLayoutHoverOverlay } from "./TeamLayoutHoverOverlayContext";

import { hexTo3DPosition } from "./utils/coordinate3DUtils";
import { getSharedHexagonGeometry } from "./utils/geometryCache";

const BOSS_HOVER_OFFSET_Y = 52;

const StageGrid3D: React.FC = () => {
    const {
        stage,
        boss,
        mapDimension,
        deployables,
        isCellOccupied,
        askAdd,
        previewTeamPower,
        bossBaseStats,
    } = useTeamDeployManager();
    const loadingContext = useContext(TeamLayoutLoadingContext);
    const bossGroupRef = useRef<THREE.Group>(null);
    const { setHover } = useTeamLayoutHoverOverlay();

    const bossHoverHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const cancelBossHoverHide = useCallback(() => {
        if (bossHoverHideTimerRef.current) {
            clearTimeout(bossHoverHideTimerRef.current);
            bossHoverHideTimerRef.current = null;
        }
    }, []);

    const scheduleBossHoverHide = useCallback(() => {
        cancelBossHoverHide();
        bossHoverHideTimerRef.current = setTimeout(() => {
            setHover(null);
            bossHoverHideTimerRef.current = null;
        }, 450);
    }, [cancelBossHoverHide, setHover]);

    useEffect(() => () => cancelBossHoverHide(), [cancelBossHoverHide]);

    // 创建共享几何体（与 GridGround3D 中的参数保持一致）
    const sharedGeometries = useMemo(() => {
        if (!mapDimension) return null;
        const width = mapDimension.hexWidth;
        return {
            disabled: getSharedHexagonGeometry(width, 2, 0.90),
            deployable: getSharedHexagonGeometry(width, 3, 0.90),
            highlighted: getSharedHexagonGeometry(width, 4, 0.90),
        };
    }, [mapDimension]);

    // 渲染障碍物（3D 模式：直接用逻辑坐标，camera.up 处理竖屏旋转）
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- 预留与 GridGround 一致的障碍层；当前关闭渲染
    const obstacles = useMemo(() => {
        if (!stage?.map?.obstacles || !mapDimension) return [];

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
    }, [stage?.map?.obstacles, mapDimension]);

    // 渲染禁用区域（3D 模式：直接用逻辑坐标）
    const disables = useMemo(() => {
        if (!stage?.map?.disables || !mapDimension || !sharedGeometries) return [];

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
    }, [stage?.map?.disables, mapDimension, sharedGeometries]);

    // 渲染可部署区域（3D 模式：直接用逻辑坐标）；空格子显示 +
    const deployableCells = useMemo(() => {
        if (!deployables || deployables.length === 0 || !mapDimension || !sharedGeometries) return [];

        return deployables.map((deployable, index) => {
            const position = hexTo3DPosition(deployable.q, deployable.r, mapDimension, 0.15);
            if (!position) return null;
            const isEmpty = !isCellOccupied(deployable.q, deployable.r);

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
                    showPlus={isEmpty}
                    onClick={isEmpty ? () => askAdd(deployable.q, deployable.r) : undefined}
                />
            );
        });
    }, [deployables, mapDimension, sharedGeometries, isCellOccupied, askAdd]);

    // Boss 世界坐标（与 GridGround3D 中怪物定位一致）
    const bossPlacement = useMemo(() => {
        if (!boss?.position || !mapDimension) return null;
        const { q, r } = boss.position;
        const isOddRow = r % 2 !== 0;
        const colOffset = isOddRow ? mapDimension.hexWidth / 2 : 0;
        const leftX = q * mapDimension.hexWidth + colOffset;
        const topZ = r * mapDimension.hexHeight * 0.75;
        const centerX = leftX + mapDimension.hexWidth / 2;
        const centerZ = topZ - mapDimension.hexHeight / 2;
        return { q, r, centerX, centerZ };
    }, [boss, mapDimension]);

    // 渲染 Minions（3D 模式：直接用逻辑坐标）
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- 预留小怪层；当前关闭渲染
    const minions = useMemo(() => {
        if (!boss?.minions || !mapDimension || !sharedGeometries) return [];

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

    if (!stage || !mapDimension) {
        return null;
    }

    return (
        <group>
            {/* {obstacles} */}
            {disables}
            {deployableCells}
            {boss && bossPlacement && stage ? (
                // eslint-disable-next-line react/no-unknown-property -- react-three-fiber group
                <group ref={bossGroupRef} position={[bossPlacement.centerX, 0, bossPlacement.centerZ]}>
                    <Boss3D
                        q={bossPlacement.q}
                        r={bossPlacement.r}
                        width={mapDimension.hexWidth}
                        height={mapDimension.hexHeight}
                        position={[0, 0, 0]}
                        bossId={stage.bossId}
                        monsterId={boss.monsterId}
                        onModelLoaded={loadingContext?.onModelLoaded}
                        onPointerEnter={() => {
                            cancelBossHoverHide();
                            setHover({
                                anchorRef: bossGroupRef,
                                offsetY: BOSS_HOVER_OFFSET_Y,
                                title: getBossHoverTitle(boss as { monsterId: string; name?: string }),
                                subtitle: "Boss",
                                lines: buildBossHoverStatLines(
                                    boss as {
                                        monsterId: string;
                                        hp: number;
                                        damage: number;
                                        defense: number;
                                        speed: number;
                                        name?: string;
                                        skills?: unknown;
                                    },
                                    {
                                        teamPower: previewTeamPower,
                                        stageDifficulty: stage.difficulty,
                                        baseStats: bossBaseStats ?? undefined,
                                    },
                                ),
                                onPanelMouseEnter: cancelBossHoverHide,
                                onPanelMouseLeave: scheduleBossHoverHide,
                            });
                        }}
                        onPointerLeave={scheduleBossHoverHide}
                        isPortrait={mapDimension.isPortrait}
                    />
                </group>
            ) : null}
            {/* {minions} */}
        </group>
    );
};

export { StageGrid3D };
export default StageGrid3D;
