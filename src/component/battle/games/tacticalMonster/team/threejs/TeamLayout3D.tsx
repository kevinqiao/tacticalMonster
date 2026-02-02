/**
 * TeamLayout3D 组件
 * 基于 React Three Fiber 的 3D 版本团队布局
 */

import { OrbitControls, useProgress } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import gsap from "gsap";
import React, { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Stage } from "../../types/StageTypes";
import { MapDimension, TeamDeployProvider, useTeamDeployManager } from "../service/TeamDeployManager";
import "../styles.css";
import CandidatesBox3D from "./CandidatesBox3D";
import DragPreview3D from "./DragPreview3D";
import GridGround3D from "./GridGround3D";
import StageGrid3D from "./StageGrid3D";

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
    distance: 1291.95,
    // 水平旋转角度（度），0=正前方，正值=向右旋转，负值=向左旋转
    azimuth: -1.09,
    // 垂直角度（度），0=正上方俯视，90=水平视角，建议 30-60 度
    polar: 41.69,

    // ===== 通用参数 =====
    // 视野角度
    fov: 50,
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
// ============================================================

// 加载进度显示组件
const LoadingScreen: React.FC<{ progress: number; isLoaded: boolean }> = ({ progress, isLoaded }) => {
    const [visible, setVisible] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isLoaded && containerRef.current) {
            // 加载完成后，淡出动画
            gsap.to(containerRef.current, {
                opacity: 0,
                duration: 0.5,
                ease: "power2.inOut",
                onComplete: () => setVisible(false),
            });
        }
    }, [isLoaded]);

    if (!visible) return null;

    return (
        <div
            ref={containerRef}
            style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#1a1a2e",
                zIndex: 100,
            }}
        >
            {/* 旋转的六边形动画 */}
            <div
                style={{
                    width: 80,
                    height: 80,
                    position: "relative",
                    marginBottom: 30,
                }}
            >
                <svg
                    viewBox="0 0 100 100"
                    style={{
                        width: "100%",
                        height: "100%",
                        animation: "hexSpin 2s linear infinite",
                    }}
                >
                    <polygon
                        points="50,5 90,27.5 90,72.5 50,95 10,72.5 10,27.5"
                        fill="none"
                        stroke="#4CAF50"
                        strokeWidth="3"
                        strokeLinecap="round"
                        style={{
                            strokeDasharray: "300",
                            strokeDashoffset: 300 - (progress / 100) * 300,
                            transition: "stroke-dashoffset 0.3s ease",
                        }}
                    />
                    <polygon
                        points="50,20 75,35 75,65 50,80 25,65 25,35"
                        fill="none"
                        stroke="#2196F3"
                        strokeWidth="2"
                        style={{
                            animation: "hexPulse 1.5s ease-in-out infinite",
                        }}
                    />
                </svg>
            </div>

            {/* 进度条 */}
            <div
                style={{
                    width: 200,
                    height: 4,
                    backgroundColor: "#333",
                    borderRadius: 2,
                    overflow: "hidden",
                    marginBottom: 15,
                }}
            >
                <div
                    style={{
                        width: `${progress}%`,
                        height: "100%",
                        backgroundColor: "#4CAF50",
                        borderRadius: 2,
                        transition: "width 0.3s ease",
                    }}
                />
            </div>

            {/* 加载文字 */}
            <div
                style={{
                    color: "#aaa",
                    fontSize: 14,
                    fontFamily: "monospace",
                }}
            >
                {progress < 100 ? `Loading... ${Math.round(progress)}%` : "Preparing battlefield..."}
            </div>

            {/* CSS 动画 */}
            <style>{`
                @keyframes hexSpin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes hexPulse {
                    0%, 100% { opacity: 0.3; transform: scale(1); }
                    50% { opacity: 1; transform: scale(1.05); }
                }
            `}</style>
        </div>
    );
};

// 加载进度追踪组件（在 Canvas 内部使用）
const LoadingTracker: React.FC<{ onProgress: (progress: number) => void; onLoaded: () => void }> = ({
    onProgress,
    onLoaded,
}) => {
    const { progress } = useProgress();

    useEffect(() => {
        onProgress(progress);
        if (progress === 100) {
            // 延迟一点确保场景完全渲染
            const timer = setTimeout(onLoaded, 300);
            return () => clearTimeout(timer);
        }
    }, [progress, onProgress, onLoaded]);

    return null;
};

// 相机参数记录组件
const CameraParamsLogger: React.FC<{
    controlsRef: React.RefObject<OrbitControlsImpl | null>;
    mapDimension: MapDimension | null;
}> = ({ controlsRef, mapDimension }) => {
    const { camera } = useThree();

    useEffect(() => {
        if (mapDimension && camera instanceof THREE.PerspectiveCamera) {
            // 设置相机看向地图中心（Y=0 是地面）
            camera.lookAt(mapDimension.width / 2, 0, mapDimension.height / 2);
        }
    }, [camera, mapDimension]);

    // 监听相机变化并记录参数
    useEffect(() => {
        const logCameraParams = () => {
            if (!controlsRef.current) return;

            const pos = camera.position;
            const target = controlsRef.current.target;

            console.log("📷 相机参数（可用于初始化）:");
            console.log(`  position: [${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)}]`);
            console.log(`  target: [${target.x.toFixed(2)}, ${target.y.toFixed(2)}, ${target.z.toFixed(2)}]`);

            if (camera instanceof THREE.PerspectiveCamera) {
                console.log(`  fov: ${camera.fov}`);
            }

            // 计算相机到目标的距离和角度
            const distance = pos.distanceTo(target);
            const azimuth = Math.atan2(pos.x - target.x, pos.z - target.z) * (180 / Math.PI);
            const polar = Math.acos((pos.y - target.y) / distance) * (180 / Math.PI);
            console.log(`  distance: ${distance.toFixed(2)}`);
            console.log(`  azimuth: ${azimuth.toFixed(2)}° (水平旋转)`);
            console.log(`  polar: ${polar.toFixed(2)}° (垂直角度，0=正上方，90=水平)`);
        };

        // 当控制器变化结束时记录参数
        const controls = controlsRef.current;
        if (controls) {
            controls.addEventListener("end", logCameraParams);
            return () => {
                controls.removeEventListener("end", logCameraParams);
            };
        }
    }, [camera, controlsRef]);

    return null;
};

// Canvas 和控制器组件
const CanvasWithControls: React.FC<{
    cameraPosition: [number, number, number];
    target: [number, number, number];
    mapDimension: MapDimension | null;
    onProgress: (progress: number) => void;
    onLoaded: () => void;
}> = ({ cameraPosition, target, mapDimension, onProgress, onLoaded }) => {
    const controlsRef = useRef<OrbitControlsImpl | null>(null);

    return (
        <Canvas
            shadows
            style={{ width: "100%", height: "100%", background: "#2a2a2a" }}
            gl={{ antialias: true }}
            camera={{
                position: cameraPosition,
                fov: CAMERA_CONFIG.fov,
                near: CAMERA_CONFIG.near,
                far: CAMERA_CONFIG.far,
            }}
        >
            <LoadingTracker onProgress={onProgress} onLoaded={onLoaded} />
            <CameraParamsLogger controlsRef={controlsRef} mapDimension={mapDimension} />

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

            {/* 轨道控制器 */}
            <OrbitControls
                ref={controlsRef}
                enablePan={true}
                enableZoom={true}
                enableRotate={true}
                target={target}
            />
        </Canvas>
    );
};

// 内部布局组件，使用 Context
const TeamLayoutContent3D: React.FC = () => {
    const {
        askAddMonster,
        mapDimension,
        candidateContainerRef,
        containerRef,
        mapContainerRef,
        handleDragOver,
        handleDrop,
        selectCanadidate,
    } = useTeamDeployManager();

    // 加载状态
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [isLoaded, setIsLoaded] = useState(false);

    const handleProgress = useCallback((progress: number) => {
        setLoadingProgress(progress);
    }, []);

    const handleLoaded = useCallback(() => {
        setIsLoaded(true);
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

    // 计算相机目标点（地图中心）
    const defaultTarget: [number, number, number] = mapDimension
        ? [mapDimension.width / 2, 0, mapDimension.height / 2]
        : [0, 0, 0];

    // 根据配置模式计算相机位置和目标点
    let cameraPosition: [number, number, number];
    let cameraTarget: [number, number, number];

    switch (CAMERA_CONFIG.mode) {
        case "position":
            // 使用自定义 position 和 target
            cameraPosition = CAMERA_CONFIG.customPosition;
            cameraTarget = CAMERA_CONFIG.customTarget;
            break;
        case "spherical":
            // 使用球面坐标，目标点为地图中心
            cameraTarget = defaultTarget;
            cameraPosition = sphericalToPosition(
                cameraTarget,
                CAMERA_CONFIG.distance,
                CAMERA_CONFIG.azimuth,
                CAMERA_CONFIG.polar
            );
            break;
        case "auto":
        default:
            // 自动计算
            cameraTarget = defaultTarget;
            cameraPosition = mapDimension
                ? [mapDimension.width / 2, mapDimension.height * 1.5, mapDimension.height / 2]
                : [0, 10, 10];
            break;
    }

    return (
        <div
            ref={containerRef}
            style={{ position: "relative", width: "100%", height: "100%", backgroundColor: "#1a1a1a" }}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            <div className="team-editor-container">
                <div
                    ref={mapContainerRef}
                    className="team-map-container"
                    style={{
                        width: mapDimension?.width,
                        height: mapDimension?.height,
                        backgroundColor: "transparent",
                    }}
                >
                    {/* 加载效果 */}
                    <LoadingScreen progress={loadingProgress} isLoaded={isLoaded} />

                    {/* React Three Fiber Canvas */}
                    <CanvasWithControls
                        cameraPosition={cameraPosition}
                        target={cameraTarget}
                        mapDimension={mapDimension}
                        onProgress={handleProgress}
                        onLoaded={handleLoaded}
                    />
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
                <button className="team-join-button">Join</button>
            </div>

            {/* 拖拽预览（2D UI overlay） */}
            <DragPreview3D />
        </div>
    );
};

// 外部组件，包裹 Provider
const TeamLayout3D: React.FC<{ stage?: Stage; onComplete: () => void }> = ({ stage, onComplete }) => {
    return (
        <TeamDeployProvider stage={stage} onComplete={onComplete}>
            <TeamLayoutContent3D />
        </TeamDeployProvider>
    );
};

export default TeamLayout3D;
