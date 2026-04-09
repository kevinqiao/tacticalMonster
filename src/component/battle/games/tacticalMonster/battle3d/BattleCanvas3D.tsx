/**
 * R3F Canvas：灯光、网格、角色、轨道控制；以及横屏相机距离/球面位置工具（供 BattleVenue3D 计算 cameraPosition）。
 */

import { CharacterGrid3D } from "@/component/battle/games/tacticalMonster/battle3d/view/CharacterGrid3D";
import { GridGround3D } from "@/component/battle/games/tacticalMonster/battle3d/view/GridGround3D";
import { GridHighlight3D } from "@/component/battle/games/tacticalMonster/battle3d/view/GridHighlight3D";
import { ObstacleGrid3D } from "@/component/battle/games/tacticalMonster/battle3d/view/ObstacleGrid3D";
import { OrbitControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import React, { useCallback, useEffect, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { BattleLoadingContext } from "./BattleLoadingContext";
import type { BattleCellState } from "./handler/useBattleGridState";
import type { BattleMapDimension } from "./utils/coordinate3DUtils";

export const CAMERA_CONFIG = {
    mode: "spherical" as const,
    distance: 600,
    azimuth: -1.09,
    polar: 41.69,
    fov: 35,
    near: 0.1,
    far: 5000,
};

export const sphericalToPosition = (
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
export const getViewportFitDistance = (
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

export const CanvasWithControls: React.FC<{
    cameraPosition: [number, number, number];
    target: [number, number, number];
    mapDimension: BattleMapDimension | null;
    minDistance: number;
    maxDistance: number;
    /** 预留：LoadingTracker 等 */
    onProgress: (progress: number) => void;
    onModelLoaded: (monsterId: string) => void;
    isPortrait: boolean;
    orthoZoom: number;
    cameraUp?: [number, number, number];
    getCellState?: (q: number, r: number) => BattleCellState;
    getWalkableDistance?: (q: number, r: number) => number | undefined;
    getWalkableMoveRange?: () => number | undefined;
    onCellClick?: (logicQ: number, logicR: number) => void;
    pedagogyAttackTargetPulseBoost?: boolean;
}> = ({
    cameraPosition,
    target,
    mapDimension,
    minDistance,
    maxDistance,
    onProgress: _onProgress,
    onModelLoaded,
    isPortrait,
    orthoZoom,
    cameraUp,
    getCellState,
    getWalkableDistance,
    getWalkableMoveRange,
    onCellClick,
    pedagogyAttackTargetPulseBoost,
}) => {
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
                                pedagogyAttackTargetPulseBoost={pedagogyAttackTargetPulseBoost}
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
