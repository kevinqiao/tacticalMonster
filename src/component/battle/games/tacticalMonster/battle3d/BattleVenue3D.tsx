/**
 * 3D 战斗场景 - 与 TeamLayout3D 相同方式使用 useMapDimension，无 placePosition
 */

import { CharacterGrid3D } from "@/component/battle/games/tacticalMonster/battle3d/view/CharacterGrid3D";
import { GridGround3D } from "@/component/battle/games/tacticalMonster/battle3d/view/GridGround3D";
import { ObstacleGrid3D } from "@/component/battle/games/tacticalMonster/battle3d/view/ObstacleGrid3D";
import { useMapDimension } from "@/component/battle/games/tacticalMonster/common/hooks/useMapDimension";
import { OrbitControls, useGLTF, useProgress } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import gsap from "gsap";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useCombatManager } from "../battle/service/CombatManager";
import "../battle/style.css";
import { BattleLoadingContext } from "./BattleLoadingContext";
import { useBattleGridState, type BattleCellState } from "./hooks/useBattleGridState";
import useCombatActHandler3D from "./hooks/useCombatActHandler3D";
import useEventHandler3D from "./hooks/useEventHandler3D";
import { usePhaseChangesHandler3D } from "./hooks/usePhaseChangesHandler3D";
import { BattleMapDimension, getGridCenter3D } from "./utils/coordinate3DUtils";
import { getAllMonsterGlbPaths } from "./utils/modelPathMapper";

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

const getViewportFitDistance = (
    width: number,
    height: number,
    fovDeg: number
): { distance: number; minDistance: number; maxDistance: number } => {
    const fovRad = (fovDeg * Math.PI) / 180;
    const halfTan = Math.tan(fovRad / 2);
    const aspect = width / height;
    const distanceByHeight = height / (2 * halfTan);
    const distanceByWidth = width / (2 * halfTan * aspect);
    const distance = Math.max(distanceByHeight, distanceByWidth);
    return {
        distance,
        minDistance: distance * 0.5,
        maxDistance: distance * 2,
    };
};

const LoadingScreen: React.FC<{ progress: number; isLoaded: boolean }> = ({ progress, isLoaded }) => {
    const barRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isLoaded && barRef.current) {
            gsap.to(barRef.current, {
                opacity: 0,
                duration: 0.5,
                delay: 0.3,
                ease: "power2.inOut",
            });
        }
    }, [isLoaded]);

    if (isLoaded && barRef.current?.style.opacity === "0") return null;

    return (
        <div
            ref={barRef}
            style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: 3,
                backgroundColor: "rgba(0,0,0,0.2)",
                zIndex: 100,
                pointerEvents: "none",
            }}
        >
            <div
                style={{
                    width: `${progress}%`,
                    height: "100%",
                    backgroundColor: "#4CAF50",
                    borderRadius: "0 2px 2px 0",
                    transition: "width 0.3s ease",
                    boxShadow: "0 0 6px rgba(76,175,80,0.6)",
                }}
            />
        </div>
    );
};

const TransparentBackground: React.FC = () => {
    const { gl } = useThree();
    useEffect(() => {
        gl.setClearColor(0x000000, 0);
        return () => gl.setClearColor(0x000000, 1);
    }, [gl]);
    return null;
};

const LoadingTracker: React.FC<{ onProgress: (progress: number) => void }> = ({ onProgress }) => {
    const { progress } = useProgress();
    useEffect(() => {
        onProgress(progress);
    }, [progress, onProgress]);
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
    onCellClick?: (logicQ: number, logicR: number) => void;
}> = ({ cameraPosition, target, mapDimension, minDistance, maxDistance, onProgress, onModelLoaded, isPortrait, orthoZoom, cameraUp, getCellState, onCellClick }) => {
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
            <LoadingTracker onProgress={onProgress} />
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
                            onCellClick={onCellClick}
                        />
                        <ObstacleGrid3D mapDimension={mapDimension} />
                        <CharacterGrid3D mapDimension={mapDimension} />
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
                enableRotate={!isPortrait}
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
    <div className="action-control" style={{ left: -40, bottom: -40, pointerEvents: "auto" }}>
        <div className="action-panel-item">STANDBY</div>
        <div className="action-panel-item">DEFEND</div>
        <div className="action-panel-item" onClick={() => surrender()}>
            GAME OVER
        </div>
    </div>
);

/** 3D 战斗场景。mapDimension：本视图用 useMapDimension() 测容器并同步到 CombatManager，与 2D 的 BattlePlayer 一致（仅当前激活视图写入 context）。 */
export const BattleVenue3D: React.FC = () => {
    const {
        game,
        setMapDimension,
        mode,
        characters,
        groundCells: contextGroundCells,
        initialPhaseChanges,
        markInitialPhaseChangesProcessed,
        isInitialPhaseChangesProcessed,
        replay,
        eventQueue,
    } = useCombatManager();
    const gridState = useBattleGridState();

    const { containerRef, mapDimension } = useMapDimension();

    // // // 3D 竖屏：使用逻辑 rows/cols（与 game.map 一致），不对调；仅根据容器计算宽高与 hex 尺寸
    // const mapDimension = useMemo((): BattleMapDimension | null => {
    //     if (!rawMapDimension) return null;
    //     if (!rawMapDimension.isPortrait || !game?.map) return rawMapDimension as BattleMapDimension;

    //     const logicCols = game.map.cols;
    //     const logicRows = game.map.rows;
    //     const cw = containerSize?.width ?? rawMapDimension.width;
    //     const ch = containerSize?.height ?? rawMapDimension.height;
    //     const mapRatio =
    //         ((logicCols + 0.5) * Math.sqrt(3)) / 2 / (1 + (logicRows * 3) / 4);
    //     const containerRatio = cw / ch;
    //     let mapWidth: number;
    //     let mapHeight: number;
    //     if (mapRatio < containerRatio) {
    //         mapHeight = ch;
    //         mapWidth = mapHeight * mapRatio;
    //     } else {
    //         mapWidth = cw;
    //         mapHeight = mapWidth / mapRatio;
    //     }
    //     const hexWidth = mapWidth / (logicCols + 0.5);
    //     const hexHeight = (hexWidth * 2) / Math.sqrt(3);
    //     return {
    //         ...rawMapDimension,
    //         width: mapWidth,
    //         height: mapHeight,
    //         hexWidth,
    //         hexHeight,
    //         cols: logicCols,
    //         rows: logicRows,
    //         isPortrait: true,
    //     };
    // }, [rawMapDimension, game?.map, containerSize]);

    // useEffect(() => {
    //     if (mapDimension) {
    //         setMapDimension(mapDimension);
    //     }
    // }, [mapDimension, setMapDimension]);

    useEventHandler3D({ gridState, mapDimension });

    const { surrender, walk, attack, positionSelectionUI } = useCombatActHandler3D({ gridState, mapDimension });

    // 格子点击：参数为逻辑坐标 (logicQ, logicR)，所见即所点
    const handleCellClick = useCallback(
        (logicQ: number, logicR: number) => {
            if (!mapDimension || mode !== "play") return;
            const cellState = gridState.getCellState(logicQ, logicR);

            if (cellState === "walkable") {
                walk({ q: logicQ, r: logicR }).catch((err: any) => console.error("[handleCellClick] walk error:", err));
            } else if (cellState === "attackable") {
                const enemy = characters?.find(
                    (c) => c.q === logicQ && c.r === logicR
                );
                if (enemy) {
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
        const defaultTarget: [number, number, number] =
            (mapDimension && getGridCenter3D(mapDimension)) ?? [0, 0, 0];

        let position: [number, number, number];
        const target = defaultTarget;
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
                // 横屏：透视相机
                const fit = getViewportFitDistance(
                    mapDimension.width,
                    mapDimension.height,
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

    const progress =
        (game?.team?.length ?? 0) + (game?.boss ? 1 : 0) > 0
            ? Math.round(
                (loadedModelCount /
                    ((game?.team?.length ?? 0) +
                        (game?.boss ? 1 + (game.boss.minions?.length ?? 0) : 0))) *
                100
            )
            : loadingProgress;

    // 竖屏时画布填满容器；横屏用 mapDimension 尺寸
    const mapContainerStyle: React.CSSProperties = {
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: mapDimension?.width,
        height: mapDimension?.height,       
        backgroundColor: "transparent",
    };

    return (
        <div
            ref={containerRef}
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
                    transform: isPortrait ? "translate(-50%, -50%) rotate(90deg)" : "translate(-50%, -50%)",
                    pointerEvents: "none",
                    zIndex: 0,
                }}
            />

            <div style={{ ...mapContainerStyle, zIndex: 1 }}>
                <LoadingScreen progress={progress} isLoaded={isLoaded} />

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
                            onCellClick={handleCellClick}
                        />
                    </div>
                )}

                <CombatActPanel surrender={surrender} />
                {positionSelectionUI}
            </div>

        </div>
    );
};
