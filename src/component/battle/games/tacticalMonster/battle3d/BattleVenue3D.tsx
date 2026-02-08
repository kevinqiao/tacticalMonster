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
import useCombatActHandler from "../battle/service/handler/useCombatActHandler";
import useEventHandler from "../battle/service/handler/useEventHandler";
import "../battle/style.css";
import { BattleLoadingContext } from "./BattleLoadingContext";
import { BattleMapDimension } from "./utils/coordinate3DUtils";
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
}> = ({ cameraPosition, target, controlsRef, orthoZoom }) => {
    const { camera } = useThree();
    useEffect(() => {
        camera.position.set(cameraPosition[0], cameraPosition[1], cameraPosition[2]);
        camera.lookAt(target[0], target[1], target[2]);

        // 正交相机需要同步 zoom 并刷新投影矩阵
        if (camera instanceof THREE.OrthographicCamera && orthoZoom !== undefined) {
            camera.zoom = orthoZoom;
            camera.updateProjectionMatrix();
        }

        if (controlsRef.current) {
            controlsRef.current.target.set(target[0], target[1], target[2]);
            controlsRef.current.update();
        }
    }, [camera, cameraPosition, target, controlsRef, orthoZoom]);
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
}> = ({ cameraPosition, target, mapDimension, minDistance, maxDistance, onProgress, onModelLoaded, isPortrait, orthoZoom }) => {
    const controlsRef = useRef<OrbitControlsImpl | null>(null);

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
            />

            <ambientLight intensity={0.8} />
            <directionalLight position={[500, 500, 500]} intensity={1.2} castShadow />
            <pointLight position={[0, 300, 0]} intensity={0.5} />

            <BattleLoadingContext.Provider value={{ onModelLoaded }}>
                {mapDimension && (
                    <>
                        <GridGround3D mapDimension={mapDimension} />
                        <ObstacleGrid3D mapDimension={mapDimension} />
                        <CharacterGrid3D mapDimension={mapDimension} />
                    </>
                )}
            </BattleLoadingContext.Provider>
        </>
    );

    // 竖屏：正交相机 + 纯俯视，禁用旋转
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
                maxPolarAngle={isPortrait ? 0 : undefined}
                minPolarAngle={isPortrait ? 0 : undefined}
            />
        </Canvas>
    );
};

const CombatActPanel: React.FC = () => {
    const { surrender } = useCombatActHandler();
    return (
        <div className="action-control" style={{ left: -40, bottom: -40, pointerEvents: "auto" }}>
            <div className="action-panel-item">STANDBY</div>
            <div className="action-panel-item">DEFEND</div>
            <div className="action-panel-item" onClick={() => surrender()}>
                GAME OVER
            </div>
        </div>
    );
};

export const BattleVenue3D: React.FC = () => {
    const { game, changeCell } = useCombatManager();
    useEventHandler();

    const { containerRef, mapDimension: rawMapDimension, containerSize } = useMapDimension();

    // direction 来自游戏数据（决定哪个玩家看到镜像），不随屏幕方向变化
    // isPortrait 来自 rawMapDimension，用于 logicToView/viewToLogic 坐标转换
    const mapDimension: BattleMapDimension | null = useMemo(() => {
        if (!rawMapDimension) return null;
        return {
            ...rawMapDimension,
            direction: game?.map?.direction ?? 0,
            isPortrait: rawMapDimension.isPortrait,
        };
    }, [rawMapDimension, game?.map?.direction]);

    useEffect(() => {
        getAllMonsterGlbPaths().forEach((path) => useGLTF.preload(path));
    }, []);

    useEffect(() => {
        if (mapDimension) {
            changeCell({ width: mapDimension.hexWidth, height: mapDimension.hexHeight });
        }
    }, [mapDimension, changeCell]);

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

    const { cameraPosition, cameraTarget, minDistance, maxDistance, orthoZoom } = useMemo(() => {
        const defaultTarget: [number, number, number] = mapDimension
            ? [mapDimension.width / 2, 0, mapDimension.height / 2]
            : [0, 0, 0];

        let position: [number, number, number];
        let target = defaultTarget;
        let minDist = 550;
        let maxDist = 1500;
        let zoom = 1;

        if (mapDimension) {
            target = [defaultTarget[0], defaultTarget[1], defaultTarget[2]];

            if (mapDimension.isPortrait) {
                // 竖屏：正交相机，纯俯视
                // 不减会偏移的原因：defaultTarget[2]=height/2 是「按 mapRatio 算出的矩形」的中心，
                // 而六边形网格的 Z 中心在第一行中心 (-hexHeight/2) 与最后一行中心的中点，二者相差约 hexHeight
                // （height = hexHeight*(1+(rows-1)*3/4)，几何中心在 height/2 - hexHeight），故减去 hexHeight 使对准真实网格中心
                target = [target[0], target[1], target[2] - mapDimension.hexHeight * 1.2];
                // 相机在目标正上方
                position = [target[0], 2000, target[2]];
                // 正交相机 zoom: 画布CSS像素 / 3D世界尺寸，取小边保证完全显示
                // R3F 正交相机 frustum = canvasCSS / zoom，因此 zoom = canvasCSS / worldSize
                const containerW = containerSize?.width ?? mapDimension.width;
                const containerH = containerSize?.height ?? mapDimension.height;
                zoom = Math.min(
                    containerW / mapDimension.width,
                    containerH / mapDimension.height
                );
            } else {
                target = [target[0], target[1], target[2] - mapDimension.hexHeight / 2];

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
        };
    }, [mapDimension, containerSize]);

    const progress =
        (game?.team?.length ?? 0) + (game?.boss ? 1 : 0) > 0
            ? Math.round(
                (loadedModelCount /
                    ((game?.team?.length ?? 0) +
                        (game?.boss ? 1 + (game.boss.minions?.length ?? 0) : 0))) *
                100
            )
            : loadingProgress;

    // 与 TeamLayout3D 相同：容器 ref，map 区域用 mapDimension/containerSize 控制宽高，居中由 CSS 完成
    const mapContainerStyle: React.CSSProperties = {
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: mapDimension ? `${mapDimension.width}px` : containerSize ? `${containerSize.width}px` : "100%",
        height: mapDimension ? `${mapDimension.height}px` : containerSize ? `${containerSize.height}px` : "100%",
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
                    <div style={{ width: "100%", height: "100%" }}>
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
                        />
                    </div>
                )}

                <CombatActPanel />
            </div>

        </div>
    );
};
