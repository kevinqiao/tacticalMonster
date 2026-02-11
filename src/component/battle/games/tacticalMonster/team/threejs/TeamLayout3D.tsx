/**
 * TeamLayout3D 组件
 * 基于 React Three Fiber 的 3D 版本团队布局
 */

import { OrbitControls, useGLTF, useProgress } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import gsap from "gsap";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Stage } from "../../types/StageTypes";
import { TeamDeployProvider, useTeamDeployManager } from "../service/TeamDeployManager";
import "../styles.css";
import CandidatesBox3D from "./CandidatesBox3D";
import GridGround3D from "./GridGround3D";
import StageGrid3D from "./StageGrid3D";
import { TeamLayoutLoadingContext } from "./TeamLayoutLoadingContext";
import { getAllMonsterGlbPaths } from "./utils/modelPathMapper";

// ============================================================
// 📷 相机初始配置 - 调整视角后将控制台输出的参数复制到这里
// ============================================================
const CAMERA_CONFIG = {
    // 配置模式：
    // - "auto": 根据地图尺寸自动计算
    // - "position": 使用自定义 position 和 target
    // - "spherical": 使用球面坐标（distance, azimuth, polar）
    mode: "spherical" as "auto" | "position" | "spherical",

    // ===== 模式 "position" 的参数 =====
    // 自定义相机位置 [x, y, z] - 从控制台复制 position 值
    customPosition: [552.66, 871.20, 1384.37] as [number, number, number],
    // 自定义目标点 [x, y, z] - 从控制台复制 target 值
    customTarget: [576.38, 0.00, 430.65] as [number, number, number],

    // ===== 模式 "spherical" 的参数 =====
    // 相机到目标点的距离（越大场景越小）
    distance: 600,
    // 水平旋转角度（度），0=正前方，正值=向右旋转，负值=向左旋转
    azimuth: -1.09,
    // 垂直角度（度），0=正上方俯视，90=水平视角，建议 30-60 度
    polar: 41.69,

    // ===== 通用参数 =====
    // 视野角度
    fov: 35,
    // 近裁剪面和远裁剪面
    near: 0.1,
    far: 5000,
};

/**
 * 根据球面坐标计算相机位置
 * @param target 目标点
 * @param distance 距离
 * @param azimuth 水平角度（度）
 * @param polar 垂直角度（度）
 */
const sphericalToPosition = (
    target: [number, number, number],
    distance: number,
    azimuth: number,
    polar: number
): [number, number, number] => {
    const azimuthRad = (azimuth * Math.PI) / 180;
    const polarRad = (polar * Math.PI) / 180;

    // 球面坐标转笛卡尔坐标
    const x = target[0] + distance * Math.sin(polarRad) * Math.sin(azimuthRad);
    const y = target[1] + distance * Math.cos(polarRad);
    const z = target[2] + distance * Math.sin(polarRad) * Math.cos(azimuthRad);

    return [x, y, z];
};

/**
 * 方案1 视窗适配（两边都够）：用 mapDimension 与 fov 反推 distance，
 * 使可见范围同时满足宽高，取较大 distance，场景始终填满画布且不裁切。
 */
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
// ============================================================

// 加载进度显示组件 — 轻量顶部进度条，不遮挡场景
const LoadingScreen: React.FC<{ progress: number; isLoaded: boolean }> = ({ progress, isLoaded }) => {
    const barRef = useRef<HTMLDivElement>(null);
    const [hidden, setHidden] = useState(false);

    useEffect(() => {
        if (isLoaded && barRef.current) {
            gsap.to(barRef.current, {
                opacity: 0,
                duration: 0.5,
                delay: 0.3,
                ease: "power2.inOut",
                onComplete: () => setHidden(true),
            });
        }
    }, [isLoaded]);

    if (hidden) return null;

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

// 透明背景（使 CSS 背景图透过 Canvas 显示）
const TransparentBackground: React.FC = () => {
    const { gl } = useThree();
    useEffect(() => {
        gl.setClearColor(0x000000, 0);
        return () => {
            gl.setClearColor(0x000000, 1);
        };
    }, [gl]);
    return null;
};

// 加载进度追踪组件（在 Canvas 内部使用，仅上报 useProgress 供无卡时进度条显示）
const LoadingTracker: React.FC<{ onProgress: (progress: number) => void }> = ({ onProgress }) => {
    const { progress } = useProgress();
    useEffect(() => {
        onProgress(progress);
    }, [progress, onProgress]);
    return null;
};

// 相机同步组件：窗口变化时保持目标与位置一致，避免突变“倾斜”
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

// Canvas 和控制器组件（onLoaded 已改为由各卡 onModelLoaded 驱动，此处仅保留 onProgress 供无卡时进度条）
const CanvasWithControls: React.FC<{
    cameraPosition: [number, number, number];
    target: [number, number, number];
    minDistance: number;
    maxDistance: number;
    onProgress: (progress: number) => void;
    isPortrait: boolean;
    orthoZoom: number;
}> = ({ cameraPosition, target, minDistance, maxDistance, onProgress, isPortrait, orthoZoom }) => {
    const controlsRef = useRef<OrbitControlsImpl | null>(null);

    // 竖屏俯视相机位置（复用，避免重复计算）
    const effectivePosition: [number, number, number] = isPortrait
        ? [target[0], 2000, target[2]]
        : cameraPosition;

    return (
        <Canvas
            key={isPortrait ? "ortho" : "persp"}
            orthographic={isPortrait}
            shadows
            style={{ width: "100%", height: "100%", background: "transparent" }}
            gl={{ antialias: true, alpha: true }}
            camera={
                isPortrait
                    ? { position: effectivePosition, zoom: orthoZoom, near: CAMERA_CONFIG.near, far: CAMERA_CONFIG.far }
                    : { position: effectivePosition, fov: CAMERA_CONFIG.fov, near: CAMERA_CONFIG.near, far: CAMERA_CONFIG.far }
            }
        >
            <TransparentBackground />
            <LoadingTracker onProgress={onProgress} />
            <CameraSync
                cameraPosition={effectivePosition}
                target={target}
                controlsRef={controlsRef}
                orthoZoom={isPortrait ? orthoZoom : undefined}
            />

            {/* 灯光 */}
            <ambientLight intensity={0.8} />
            <directionalLight
                position={[500, 500, 500]}
                intensity={1.2}
                castShadow
            />
            <pointLight position={[0, 300, 0]} intensity={0.5} />

            {/* 3D 场景内容 */}
            <GridGround3D />
            <StageGrid3D />

            {/* 轨道控制器 - 竖屏允许平移/缩放，横屏全部禁用 */}
            <OrbitControls
                ref={controlsRef}
                enablePan={isPortrait}
                enableZoom={isPortrait}
                enableRotate={false}
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

// 内部布局组件，使用 Context
const TeamLayoutContent3D: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
    const {
        askAddMonster,
        mapDimension,
        containerSize,
        candidateContainerRef,
        containerRef,
        mapContainerRef,
        handleDragOver,
        handleDrop,
        selectCanadidate,
        playerMonsters,
        boss,
    } = useTeamDeployManager();

    // 预加载所有角色 GLB
    useEffect(() => {
        getAllMonsterGlbPaths().forEach((path) => useGLTF.preload(path));
    }, []);

    // 当前需要加载的模型数量：已放置的怪物卡 + Boss（若有）
    const expectedModelCount = useMemo(
        () =>
            playerMonsters.filter((m) => m.teamPosition).length +
            (boss?.position ? 1 : 0),
        [playerMonsters, boss?.position]
    );

    // 加载状态：以「每张卡的模型 onModelLoaded」为准，不再仅依赖 useProgress
    const [loadedModelCount, setLoadedModelCount] = useState(0);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [isLoaded, setIsLoaded] = useState(false);

    // 当放置的卡数变化时重置计数；无卡时直接视为已加载
    useEffect(() => {
        setLoadedModelCount(0);
        if (expectedModelCount === 0) setIsLoaded(true);
        else setIsLoaded(false);
    }, [expectedModelCount]);

    // 所有当前卡片的模型都 onModelLoaded 后，才视为加载完成
    useEffect(() => {
        if (expectedModelCount > 0 && loadedModelCount >= expectedModelCount) {
            setIsLoaded(true);
        }
    }, [expectedModelCount, loadedModelCount]);

    const onModelLoaded = useCallback((_monsterId: string) => {
        setLoadedModelCount((c) => c + 1);
    }, []);

    // 稳定 context value，避免每次渲染创建新对象导致消费者重渲染
    const loadingContextValue = useMemo(() => ({ onModelLoaded }), [onModelLoaded]);

    const handleProgress = useCallback((progress: number) => {
        setLoadingProgress(progress);
    }, []);

    const openCandidates = useCallback(() => {
        gsap.to(candidateContainerRef.current, {
            autoAlpha: 1,
            duration: 0.5,
            ease: "power2.inOut",
        });
    }, [candidateContainerRef]);

    const closeCandidates = useCallback(() => {
        gsap.to(candidateContainerRef.current, {
            autoAlpha: 0,
            duration: 0.5,
            ease: "power2.inOut",
        });
    }, [candidateContainerRef]);

    const handleSelectCandidate = useCallback(
        (monsterId: string) => {
            closeCandidates();
            selectCanadidate(monsterId);
        },
        [closeCandidates, selectCanadidate]
    );

    useEffect(() => {
        if (askAddMonster) {
            openCandidates();
        }
    }, [askAddMonster, openCandidates]);

    const isPortrait = mapDimension?.isPortrait ?? false;

    // 背景样式：竖屏旋转 90°，横屏正常
    const bgStyle = useMemo<React.CSSProperties>(() => ({
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
    }), [isPortrait]);

    // 地图容器尺寸样式
    const mapContainerStyle = useMemo<React.CSSProperties>(() => ({
        width: mapDimension ? `${mapDimension.width}px` : containerSize ? `${containerSize.width}px` : "100%",
        height: mapDimension ? `${mapDimension.height}px` : containerSize ? `${containerSize.height}px` : "100%",
        backgroundColor: "transparent",
    }), [mapDimension?.width, mapDimension?.height, containerSize?.width, containerSize?.height]);

    // 根据配置模式计算相机位置、目标点与视窗适配的 distance（useMemo 稳定引用）
    const { cameraPosition, cameraTarget, minDistance, maxDistance, orthoZoom } = useMemo(() => {
        // const defaultTarget: [number, number, number] = mapDimension
        //     ? [mapDimension.width / 2, 0, mapDimension.height / 2]
        //     : [0, 0, 0];

        let position: [number, number, number];
        let target: [number, number, number] = mapDimension
            ? [mapDimension.width / 2, 0, mapDimension.height / 2]
            : [0, 0, 0];;
        let distance = CAMERA_CONFIG.distance;
        let minDist = 550;
        let maxDist = 2000;
        let zoom = 1;

        switch (CAMERA_CONFIG.mode) {
            case "position":
                position = CAMERA_CONFIG.customPosition;
                target = CAMERA_CONFIG.customTarget;
                break;
            case "spherical": {
                // target = [defaultTarget[0] + 5, defaultTarget[1], defaultTarget[2]];
                if (mapDimension) {
                    if (mapDimension.isPortrait) {
                        // 竖屏：正交相机，纯俯视
                        target = [target[0], target[1], target[2] - mapDimension.hexHeight * 1.2];
                        position = [target[0], 2000, target[2]];
                        const containerW = containerSize?.width ?? mapDimension.width;
                        const containerH = containerSize?.height ?? mapDimension.height;
                        zoom = Math.min(
                            containerW / mapDimension.width,
                            containerH / mapDimension.height
                        );
                    } else {
                        target = [target[0], target[1], target[2] - mapDimension.hexHeight / 2];
                        const fit = getViewportFitDistance(
                            mapDimension.width,
                            mapDimension.height,
                            CAMERA_CONFIG.fov
                        );
                        distance = fit.distance;
                        minDist = fit.minDistance;
                        maxDist = fit.maxDistance;
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
                break;
            }
            case "auto":
            default:

                position = mapDimension
                    ? [mapDimension.width / 2, mapDimension.height * 1.5, mapDimension.height / 2]
                    : [0, 10, 10];
                break;
        }

        return {
            cameraPosition: position,
            cameraTarget: target,
            minDistance: minDist,
            maxDistance: maxDist,
            orthoZoom: zoom,
        };
    }, [mapDimension, containerSize]);
    const join = useCallback(() => {
        onComplete();
    }, [onComplete]);

    return (
        <div
            ref={containerRef}
            style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            {/* 背景层：竖屏时旋转 90 度，不影响坐标 */}
            <div style={bgStyle} />

            <div className="team-editor-container" style={{ position: "relative", zIndex: 1 }}>
                <div
                    ref={mapContainerRef}
                    className="team-map-container"
                    style={mapContainerStyle}
                >
                    {/* 加载效果：进度与完成态由「每张卡 onModelLoaded」驱动，无卡时用 useProgress */}
                    <LoadingScreen
                        progress={
                            expectedModelCount > 0
                                ? Math.round((loadedModelCount / expectedModelCount) * 100)
                                : loadingProgress
                        }
                        isLoaded={isLoaded}
                    />

                    {/* React Three Fiber Canvas */}
                    <TeamLayoutLoadingContext.Provider value={loadingContextValue}>
                        <CanvasWithControls
                            cameraPosition={cameraPosition}
                            target={cameraTarget}
                            minDistance={minDistance}
                            maxDistance={maxDistance}
                            onProgress={handleProgress}
                            isPortrait={isPortrait}
                            orthoZoom={orthoZoom}
                        />
                    </TeamLayoutLoadingContext.Provider>
                </div>

                {/* 候选怪物列表（2D UI overlay） */}
                <div
                    ref={candidateContainerRef}
                    className="candidates-container"
                    style={{
                        opacity: 0,
                        visibility: "hidden",
                        backgroundColor: "white",
                        overflowY: "auto",
                        overflowX: "hidden",
                        pointerEvents: "auto",
                    }}
                >
                    <CandidatesBox3D onSelect={handleSelectCandidate} />
                    <div className="close-candidates-button" onClick={closeCandidates}>
                        X
                    </div>
                </div>
            </div>

            <div className="team-control-container">
                <button className="team-join-button" onClick={join}>Join</button>
            </div>
        </div>
    );
};

// 外部组件，包裹 Provider
const TeamLayout3D: React.FC<{ stage?: Stage; onComplete: () => void }> = ({ stage, onComplete }) => {
    return (
        <TeamDeployProvider stage={stage}>
            <TeamLayoutContent3D onComplete={onComplete} />
        </TeamDeployProvider>
    );
};

export default TeamLayout3D;
