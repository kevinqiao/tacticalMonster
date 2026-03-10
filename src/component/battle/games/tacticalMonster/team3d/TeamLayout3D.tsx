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
import type { BattleMapDimension } from "../battle3d/utils/coordinate3DUtils";
import { getGridCenter3D, getGridExtent3D } from "../battle3d/utils/coordinate3DUtils";
import { TeamDeployProvider, useTeamDeployManager } from "../service/TeamDeployManager";
import "../team/styles.css";
import { Stage } from "../types/StageTypes";
import CandidatesBox3D from "./CandidatesBox3D";
import GridGround3D from "./GridGround3D";
import StageGrid3D from "./StageGrid3D";
import { TeamLayoutLoadingContext } from "./TeamLayoutLoadingContext";
import { getAllMonsterGlbPaths } from "./utils/modelPathMapper";

// ============================================================
// 📷 相机配置（与 BattleVenue3D 一致：球面坐标模式）
// ============================================================
const CAMERA_CONFIG = {
    mode: "spherical" as const,
    distance: 600,
    azimuth: -1.09,
    polar: 41.69,
    fov: 35,
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
 * 视窗适配（与 BattleVenue3D 一致）：padding 略放大距离避免边缘裁剪。
 */
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

// 相机同步组件：竖屏可传 cameraUp 使俯视旋转 90°（与 BattleVenue3D 一致）
const CameraSync: React.FC<{
    cameraPosition: [number, number, number];
    target: [number, number, number];
    controlsRef: React.RefObject<OrbitControlsImpl | null>;
    orthoZoom?: number;
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

// Canvas 和控制器组件（竖屏 cameraUp=[1,0,0] 与 BattleVenue3D 一致）
const CanvasWithControls: React.FC<{
    cameraPosition: [number, number, number];
    target: [number, number, number];
    minDistance: number;
    maxDistance: number;
    onProgress: (progress: number) => void;
    isPortrait: boolean;
    orthoZoom: number;
    cameraUp?: [number, number, number];
}> = ({ cameraPosition, target, minDistance, maxDistance, onProgress, isPortrait, orthoZoom, cameraUp }) => {
    const controlsRef = useRef<OrbitControlsImpl | null>(null);
    const cameraUpRef = useRef(cameraUp);
    const targetRef = useRef(target);
    const orthoZoomRef = useRef(orthoZoom);
    cameraUpRef.current = cameraUp;
    targetRef.current = target;
    orthoZoomRef.current = orthoZoom;

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

    // 共用的场景内容（与 BattleVenue3D 一致的结构）
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

            {/* 灯光 */}
            <ambientLight intensity={0.8} />
            <directionalLight position={[500, 500, 500]} intensity={1.2} castShadow />
            <pointLight position={[0, 300, 0]} intensity={0.5} />

            {/* 3D 场景内容 */}
            <GridGround3D />
            <StageGrid3D />
        </>
    );

    // 竖屏：正交相机 + 俯视，无透视，无阴影
    // 横屏：透视相机 + 球面坐标，保持立体效果（阴影 + 透视）
    return (
        <Canvas
            key={isPortrait ? "ortho" : "persp"}
            orthographic={isPortrait}
            shadows={!isPortrait}
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
                enablePan={false}
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

// 内部布局组件，使用 Context
const TeamLayoutContent3D: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
    const {
        askAddMonster,
        mapDimension,
        candidateContainerRef,
        containerRef,
        mapContainerRef,
        handleDragOver,
        handleDrop,
        selectCanadidate,
        playerMonsters,
        boss,
        selectedMonsterId,
        selectMonster,
        quitTeam,
    } = useTeamDeployManager();

    const controlBarRef = useRef<HTMLDivElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);

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
        transform: isPortrait ? "translate(-50%, -50%) rotate(-90deg)" : "translate(-50%, -50%)",
        pointerEvents: "none",
        zIndex: 0,
    }), [isPortrait]);

    // 地图容器样式（与 BattleVenue3D 一致：居中 + offset 微调 + mapDimension 宽高）
    const mapContainerStyle = useMemo<React.CSSProperties>(() => {
        if (!mapDimension) return {};
        const offset = mapDimension.isPortrait ? mapDimension.hexWidth / 4 : mapDimension.hexHeight / 2;
        return {
            position: "absolute",
            top: `calc(50% - ${offset}px)`,
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: mapDimension.width,
            height: mapDimension.height,
            backgroundColor: "transparent",
        };
    }, [mapDimension]);

    // 计算相机位置、目标点（与 BattleVenue3D 一致：网格几何中心，横屏用 extent fit）
    const { cameraPosition, cameraTarget, minDistance, maxDistance, orthoZoom, cameraUp } = useMemo(() => {
        let target: [number, number, number] =
            (mapDimension && getGridCenter3D(mapDimension as BattleMapDimension)) ?? [0, 0, 0];

        let position: [number, number, number];
        let minDist = 550;
        let maxDist = 1500;
        let zoom = mapDimension?.zoom ?? 1;
        let up: [number, number, number] | undefined;

        if (mapDimension) {
            if (mapDimension.isPortrait) {
                position = [target[0], 2000, target[2]];
                up = [1, 0, 0];
            } else {
                const md = mapDimension as BattleMapDimension;
                const extent = getGridExtent3D(md);
                const fitWidth = extent?.extentX ?? md.width;
                const fitHeight = extent?.extentZ ?? md.height;
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
    const join = useCallback(() => {
        onComplete();
    }, [onComplete]);

    const handleDeselect = useCallback(() => {
        if (!controlBarRef.current || !overlayRef.current) return;
        gsap.to(overlayRef.current, { opacity: 0, duration: 0.2, ease: "power2.in" });
        gsap.to(controlBarRef.current, { y: "100%", duration: 0.2, ease: "power2.in", onComplete: () => selectMonster(null) });
    }, [selectMonster]);

    const handleRemoveMonster = useCallback(() => {
        if (selectedMonsterId) {
            quitTeam(selectedMonsterId);
            selectMonster(null);
        }
    }, [selectedMonsterId, quitTeam, selectMonster]);

    useEffect(() => {
        if (!selectedMonsterId || !controlBarRef.current || !overlayRef.current) return;
        gsap.set(overlayRef.current, { opacity: 0, display: "block" });
        gsap.set(controlBarRef.current, { y: "100%", display: "flex" });
        gsap.to(overlayRef.current, { opacity: 1, duration: 0.25, ease: "power2.out" });
        gsap.to(controlBarRef.current, { y: 0, duration: 0.25, ease: "power2.out" });
    }, [selectedMonsterId]);

    return (
        <div
            ref={containerRef}
            style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            {/* 背景层：竖屏时旋转 90 度，不影响坐标 */}
            <div style={bgStyle} />

            <div className="team-editor-container" style={{ position: "relative", width: "100%", height: "100%", zIndex: 1 }}>
                <div
                    ref={mapContainerRef}
                    className="team-map-container"
                    style={mapContainerStyle}
                >


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
                            cameraUp={cameraUp}
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

            {/* 方案 B：选中怪物时的遮罩 + 底部控制条（置于顶层，高于 team-control-container） */}
            {selectedMonsterId && (
                <>
                    <div
                        ref={overlayRef}
                        className="team-selection-overlay"
                        onClick={handleDeselect}
                        onKeyDown={(e) => e.key === "Escape" && handleDeselect()}
                        role="button"
                        tabIndex={0}
                        aria-label="取消选中"
                    />
                    <div ref={controlBarRef} className="team-selection-control-bar">
                        <button type="button" className="team-control-remove" onClick={handleRemoveMonster}>
                            移除
                        </button>
                        <button type="button" className="team-control-cancel" onClick={handleDeselect}>
                            取消
                        </button>
                    </div>
                </>
            )}

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
