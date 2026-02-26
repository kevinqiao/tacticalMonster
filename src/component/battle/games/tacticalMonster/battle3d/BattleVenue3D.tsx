/**
 * 3D 战斗场景 - 与 TeamLayout3D 相同方式使用 useMapDimension，无 placePosition
 */

import { CharacterGrid3D } from "@/component/battle/games/tacticalMonster/battle3d/view/CharacterGrid3D";
import { GridGround3D } from "@/component/battle/games/tacticalMonster/battle3d/view/GridGround3D";
import { GridHighlight3D } from "@/component/battle/games/tacticalMonster/battle3d/view/GridHighlight3D";
import { ObstacleGrid3D } from "@/component/battle/games/tacticalMonster/battle3d/view/ObstacleGrid3D";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useCombatManager } from "../service/CombatManager";
import { BattleLoadingContext } from "./BattleLoadingContext";
import { useBattleGridState, type BattleCellState } from "./handler/useBattleGridState";
import useCombatActHandler3D from "./handler/useCombatActHandler3D";
import useEventHandler3D from "./handler/useEventHandler3D";
import { usePhaseChangesHandler3D } from "./handler/usePhaseChangesHandler3D";
import "./style.css";
import { BattleMapDimension, getGridCenter3D, getGridExtent3D } from "./utils/coordinate3DUtils";
import { getAllMonsterGlbPaths } from "./utils/modelPathMapper";
import { TurnOrderBar } from "./view/turnbar/TurnOrderBar";

const CAMERA_CONFIG = {
    mode: "spherical" as const,
    distance: 600,
    azimuth: -1.09,
    polar: 41.69,
    fov: 35,
    near: 0.1,
    far: 5000,
};

const sphericalToPosition = (
    target: [number, number, number],
    distance: number,
    azimuth: number,
    polar: number
): [number, number, number] => {
    const azimuthRad = (azimuth * Math.PI) / 180;
    const polarRad = (polar * Math.PI) / 180;
    const x = target[0] + distance * Math.sin(polarRad) * Math.sin(azimuthRad);
    const y = target[1] + distance * Math.cos(polarRad);
    const z = target[2] + distance * Math.sin(polarRad) * Math.cos(azimuthRad);
    return [x, y, z];
};

/** 横屏透视相机：让矩形 (width, height) 刚好放入视锥，padding 略放大距离避免边缘裁剪 */
const getViewportFitDistance = (
    width: number,
    height: number,
    fovDeg: number,
    padding: number = 1.15
): { distance: number; minDistance: number; maxDistance: number } => {
    const fovRad = (fovDeg * Math.PI) / 180;
    const halfTan = Math.tan(fovRad / 2);
    const aspect = width / height;
    const distanceByHeight = height / (2 * halfTan);
    const distanceByWidth = width / (2 * halfTan * aspect);
    const distance = Math.max(distanceByHeight, distanceByWidth) * padding;
    return {
        distance,
        minDistance: distance * 0.5,
        maxDistance: distance * 2,
    };
};


const TransparentBackground: React.FC = () => {
    const { gl } = useThree();
    useEffect(() => {
        gl.setClearColor(0x000000, 0);
        return () => gl.setClearColor(0x000000, 1);
    }, [gl]);
    return null;
};



const CameraSync: React.FC<{
    cameraPosition: [number, number, number];
    target: [number, number, number];
    controlsRef: React.RefObject<OrbitControlsImpl | null>;
    orthoZoom?: number;
    /** 竖屏时设为 (1,0,0)，使俯视画面旋转 90° */
    cameraUp?: [number, number, number];
}> = ({ cameraPosition, target, controlsRef, orthoZoom, cameraUp }) => {
    const { camera } = useThree();
    useEffect(() => {
        camera.position.set(cameraPosition[0], cameraPosition[1], cameraPosition[2]);
        camera.up.set(cameraUp?.[0] ?? 0, cameraUp?.[1] ?? 1, cameraUp?.[2] ?? 0);
        camera.lookAt(target[0], target[1], target[2]);

        if (camera instanceof THREE.OrthographicCamera && orthoZoom !== undefined) {
            camera.zoom = orthoZoom;
            camera.updateProjectionMatrix();
        }

        if (controlsRef.current) {
            controlsRef.current.target.set(target[0], target[1], target[2]);
            controlsRef.current.update();
        }
    }, [camera, cameraPosition, target, controlsRef, orthoZoom, cameraUp]);
    return null;
};

const CanvasWithControls: React.FC<{
    cameraPosition: [number, number, number];
    target: [number, number, number];
    mapDimension: BattleMapDimension | null;
    minDistance: number;
    maxDistance: number;
    onProgress: (progress: number) => void;
    onModelLoaded: (monsterId: string) => void;
    isPortrait: boolean;
    orthoZoom: number;
    cameraUp?: [number, number, number];
    getCellState?: (q: number, r: number) => BattleCellState;
    getWalkableDistance?: (q: number, r: number) => number | undefined;
    getWalkableMoveRange?: () => number | undefined;
    onCellClick?: (logicQ: number, logicR: number) => void;
}> = ({ cameraPosition, target, mapDimension, minDistance, maxDistance, onProgress, onModelLoaded, isPortrait, orthoZoom, cameraUp, getCellState, getWalkableDistance, getWalkableMoveRange, onCellClick }) => {
    const controlsRef = useRef<OrbitControlsImpl | null>(null);

    // 稳定引用，供 onCreated 使用（避免闭包过期）
    const cameraUpRef = useRef(cameraUp);
    const targetRef = useRef(target);
    const orthoZoomRef = useRef(orthoZoom);
    cameraUpRef.current = cameraUp;
    targetRef.current = target;
    orthoZoomRef.current = orthoZoom;

    // onCreated：Canvas 创建后、首帧渲染前设置 camera.up + lookAt + zoom
    // R3F 自动根据画布尺寸管理 left/right/top/bottom，我们只需 zoom 控制可见范围
    const handleCreated = useCallback(({ camera }: { camera: THREE.Camera }) => {
        const up = cameraUpRef.current;
        const t = targetRef.current;
        if (up) {
            camera.up.set(up[0], up[1], up[2]);
        }
        camera.lookAt(t[0], t[1], t[2]);
        if (camera instanceof THREE.OrthographicCamera) {
            camera.zoom = orthoZoomRef.current;
            camera.updateProjectionMatrix();
        }
    }, []);

    // 共用的场景内容
    const sceneContent = (
        <>
            <TransparentBackground />
            {/* <LoadingTracker onProgress={onProgress} /> */}
            <CameraSync
                cameraPosition={cameraPosition}
                target={target}
                controlsRef={controlsRef}
                orthoZoom={isPortrait ? orthoZoom : undefined}
                cameraUp={cameraUp}
            />

            <ambientLight intensity={0.8} />
            <directionalLight position={[500, 500, 500]} intensity={1.2} castShadow />
            <pointLight position={[0, 300, 0]} intensity={0.5} />

            <BattleLoadingContext.Provider value={{ onModelLoaded }}>
                {mapDimension && (
                    <>
                        <GridGround3D
                            mapDimension={mapDimension}
                            getCellState={getCellState}
                            getWalkableDistance={getWalkableDistance}
                            getWalkableMoveRange={getWalkableMoveRange}
                            onCellClick={onCellClick}
                        />
                        <ObstacleGrid3D mapDimension={mapDimension} />
                        <CharacterGrid3D mapDimension={mapDimension} />
                        <GridHighlight3D
                            mapDimension={mapDimension}
                            getCellState={getCellState}
                            getWalkableDistance={getWalkableDistance}
                            getWalkableMoveRange={getWalkableMoveRange}
                            onCellClick={onCellClick}
                        />
                    </>
                )}
            </BattleLoadingContext.Provider>
        </>
    );

    // 竖屏：正交相机 + 俯视（camera.up 旋转 90°），禁用旋转
    // 横屏：透视相机 + 球面坐标，允许旋转
    return (
        <Canvas
            key={isPortrait ? "ortho" : "persp"}
            orthographic={isPortrait}
            shadows
            style={{ width: "100%", height: "100%", background: "transparent" }}
            gl={{ antialias: true, alpha: true }}
            camera={
                isPortrait
                    ? {
                        position: [target[0], 2000, target[2]],
                        zoom: orthoZoom,
                        near: 0.1,
                        far: 5000,
                    }
                    : {
                        position: cameraPosition,
                        fov: CAMERA_CONFIG.fov,
                        near: CAMERA_CONFIG.near,
                        far: CAMERA_CONFIG.far,
                    }
            }
            onCreated={handleCreated}
        >
            {sceneContent}

            <OrbitControls
                ref={controlsRef}
                enablePan={isPortrait}
                enableZoom={true}
                enableRotate={false}
                target={target}
                minDistance={isPortrait ? undefined : minDistance}
                maxDistance={isPortrait ? undefined : maxDistance}
                minZoom={isPortrait ? orthoZoom * 0.5 : undefined}
                maxZoom={isPortrait ? orthoZoom * 2 : undefined}
                maxPolarAngle={isPortrait ? Math.PI / 2 : undefined}
                minPolarAngle={isPortrait ? Math.PI / 2 : undefined}
            />
        </Canvas>
    );
};

const CombatActPanel: React.FC<{ surrender: () => void }> = ({ surrender }) => (
    <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center" }}>
        <div className="action-panel-item">STANDBY</div>
        <div className="action-panel-item">DEFEND</div>
        <div className="action-panel-item" onClick={() => surrender()}>
            GAME OVER
        </div>
    </div>
);

/** 3D 战斗场景。mapDimension、containerRef 从 CombatManager context 获取（CombatManager 内 useMapDimension 测量包装容器）。 */
export const BattleVenue3D: React.FC = () => {
    const {
        game,
        mode,
        characters,
        groundCells: contextGroundCells,
        initialPhaseChanges,
        markInitialPhaseChangesProcessed,
        isInitialPhaseChangesProcessed,
        replay,
        eventQueue,
        mapDimension,
    } = useCombatManager();
    const gridState = useBattleGridState();


    useEventHandler3D({ gridState, mapDimension });

    const { surrender, walk, attack } = useCombatActHandler3D({ gridState, mapDimension });

    // 格子点击：参数为逻辑坐标 (logicQ, logicR)，所见即所点
    const handleCellClick = useCallback(
        (logicQ: number, logicR: number) => {
            if (!mapDimension || mode !== "play") return;
            const cellState = gridState.getCellState(logicQ, logicR);
            console.log("[handleCellClick] cellState", cellState);
            if (cellState === "walkable") {
                gridState.clearAll();
                walk({ q: logicQ, r: logicR }).catch((err: any) => console.error("[handleCellClick] walk error:", err));
            } else if (cellState === "attackable") {
                const enemy = characters?.find(
                    (c) => c.q === logicQ && c.r === logicR
                );
                if (enemy) {
                    console.log("[handleCellClick] attack enemy", enemy);
                    attack(enemy);
                }
            }
        },
        [mapDimension, mode, gridState, walk, attack, characters]
    );

    // ✅ 3D 阶段变化处理器（用于 initialPhaseChanges）
    const { handlePhaseChanges } = usePhaseChangesHandler3D({ gridState, mapDimension });

    // ✅ 处理 initialPhaseChanges（从 CombatManager context 获取）
    // 注意：markInitialPhaseChangesProcessed 必须在 setTimeout 回调内部调用，
    // 避免因 React 重渲染取消 timer 后标记已被设置导致永远不再处理。
    useEffect(() => {
        if (
            game &&
            initialPhaseChanges &&
            !isInitialPhaseChangesProcessed() &&
            characters && characters.length > 0 &&
            contextGroundCells &&
            mapDimension
        ) {
            if (mode === 'play') {
                const timer = setTimeout(() => {
                    markInitialPhaseChangesProcessed();
                    console.log("[BattleVenue3D] 处理 initialPhaseChanges (play):", initialPhaseChanges);
                    handlePhaseChanges(initialPhaseChanges).catch((error) => {
                        console.error("[BattleVenue3D] Error handling initial phaseChanges:", error);
                    });
                }, 500);
                return () => clearTimeout(timer);
            } else if (mode === 'watch' || mode === 'replay') {
                const timer = setTimeout(() => {
                    if (mode === 'watch') {
                        if (eventQueue.length === 0) {
                            markInitialPhaseChangesProcessed();
                            handlePhaseChanges(initialPhaseChanges).catch((error) => {
                                console.error("[BattleVenue3D] Error handling initial phaseChanges (watch):", error);
                            });
                        }
                    } else if (mode === 'replay') {
                        if (replay && replay.getAllEvents && replay.getAllEvents().length === 0) {
                            markInitialPhaseChangesProcessed();
                            handlePhaseChanges(initialPhaseChanges).catch((error) => {
                                console.error("[BattleVenue3D] Error handling initial phaseChanges (replay):", error);
                            });
                        }
                    }
                }, 1000);
                return () => clearTimeout(timer);
            }
        }
    }, [game, initialPhaseChanges, mode, characters, contextGroundCells, mapDimension, handlePhaseChanges, markInitialPhaseChangesProcessed, isInitialPhaseChangesProcessed, eventQueue, replay]);

    useEffect(() => {
        getAllMonsterGlbPaths().forEach((path) => useGLTF.preload(path));
    }, []);

    const [loadedModelCount, setLoadedModelCount] = useState(0);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        setLoadedModelCount(0);
        if (!mapDimension) return;
        const count =
            (game?.team?.length ?? 0) + (game?.boss ? 1 + (game.boss.minions?.length ?? 0) : 0);
        if (count === 0) setIsLoaded(true);
        else setIsLoaded(false);
    }, [mapDimension, game?.gameId]);

    useEffect(() => {
        const count =
            (game?.team?.length ?? 0) + (game?.boss ? 1 + (game.boss.minions?.length ?? 0) : 0);
        if (count > 0 && loadedModelCount >= count) setIsLoaded(true);
    }, [loadedModelCount, game?.team, game?.boss]);

    const onModelLoaded = useCallback((_monsterId: string) => {
        setLoadedModelCount((c) => c + 1);
    }, []);

    const handleProgress = useCallback((progress: number) => {
        setLoadingProgress(progress);
    }, []);

    const isPortrait = mapDimension?.isPortrait ?? false;

    const { cameraPosition, cameraTarget, minDistance, maxDistance, orthoZoom, cameraUp } = useMemo(() => {
        let target: [number, number, number] =
            (mapDimension && getGridCenter3D(mapDimension)) ?? [0, 0, 0];

        let position: [number, number, number];
        let minDist = 550;
        let maxDist = 1500;
        let zoom = mapDimension?.zoom ?? 1;
        let up: [number, number, number] | undefined;

        if (mapDimension) {
            if (mapDimension.isPortrait) {
                position = [target[0], 2000, target[2]];
                up = [1, 0, 0];
                // camera.up=(1,0,0)：屏幕竖轴=world X，屏幕横轴=world Z
            } else {
                // 横屏：透视相机，用网格实际 XZ 范围计算距离，避免场景被裁剪
                target = [target[0], target[1], target[2]];
                const extent = getGridExtent3D(mapDimension);
                const fitWidth = extent?.extentX ?? mapDimension.width;
                const fitHeight = extent?.extentZ ?? mapDimension.height;
                const fit = getViewportFitDistance(
                    fitWidth,
                    fitHeight,
                    CAMERA_CONFIG.fov
                );
                minDist = fit.minDistance;
                maxDist = fit.maxDistance;
                const distance = fit.distance;
                position = sphericalToPosition(
                    target,
                    distance,
                    CAMERA_CONFIG.azimuth,
                    CAMERA_CONFIG.polar
                );
            }
        } else {
            position = [0, 10, 10];
        }

        return {
            cameraPosition: position,
            cameraTarget: target,
            minDistance: minDist,
            maxDistance: maxDist,
            orthoZoom: zoom,
            cameraUp: up,
        };
    }, [mapDimension]);



    // 竖屏时画布填满容器；横屏用 mapDimension 尺寸
    const mapContainerStyle: React.CSSProperties = useMemo(() => {
        if (!mapDimension) return {};
        // const offset = mapDimension?.isPortrait ? mapDimension.hexWidth / 4 : mapDimension.hexHeight / 2;
        return {
            position: "absolute",
            top: `calc(50% - ${mapDimension.topOffset ?? 0}px)`,
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: mapDimension?.width,
            height: mapDimension?.height,
            backgroundColor: "transparent",
        }
    }, [mapDimension]);

    return (
        <div
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
            }}
        >
            {/* 背景层：竖屏时旋转 90 度，不影响坐标 */}
            <div
                style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    width: isPortrait ? "100vh" : "100%",
                    height: isPortrait ? "100vw" : "100%",
                    backgroundImage: "url(/assets/battle_bg.png)",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    transform: isPortrait ? "translate(-50%, -50%) rotate(-90deg)" : "translate(-50%, -50%)",
                    pointerEvents: "none",
                    zIndex: 0,
                }}
            />

            <div style={{ ...mapContainerStyle, zIndex: 1 }}>
                {/* <LoadingScreen progress={progress} isLoaded={isLoaded} /> */}

                {mapDimension && (
                    <div style={{ width: "100%", height: "100%", backgroundColor: "transparent" }}>
                        <CanvasWithControls
                            cameraPosition={cameraPosition}
                            target={cameraTarget}
                            mapDimension={mapDimension}
                            minDistance={minDistance}
                            maxDistance={maxDistance}
                            onProgress={handleProgress}
                            onModelLoaded={onModelLoaded}
                            isPortrait={isPortrait}
                            orthoZoom={orthoZoom}
                            cameraUp={cameraUp}
                            getCellState={gridState.getCellState}
                            getWalkableDistance={gridState.getWalkableDistance}
                            getWalkableMoveRange={gridState.getWalkableMoveRange}
                            onCellClick={handleCellClick}
                        />
                    </div>
                )}



            </div>
            <div style={{ display: "flex", position: "absolute", bottom: 0, left: 0, width: "100%", zIndex: 2 }}>
                <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "center", width: "100%" }}>
                    <TurnOrderBar />
                </div>
                <div>
                    <CombatActPanel surrender={surrender} />
                </div>
            </div>

        </div>
    );
};
