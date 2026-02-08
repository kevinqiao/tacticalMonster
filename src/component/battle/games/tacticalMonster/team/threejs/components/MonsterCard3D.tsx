/**
 * MonsterCard3D 组件
 * 怪物卡片的 3D 表示（用于拖拽预览和已放置的怪物）
 * 支持 3D 场景内拖拽移动
 *
 * =============================================================================
 * 加载机制说明
 * =============================================================================
 *
 * 1. 整体流程（单卡级别）
 *    ┌─────────────────────────────────────────────────────────────────────┐
 *    │ 外部使用 MonsterCard3DWithSuspense（或 default 导出）                 │
 *    │   → 每张卡被 <Suspense fallback={<MonsterCardPlaceholder />}> 包裹    │
 *    └─────────────────────────────────────────────────────────────────────┘
 *                                    │
 *                                    ▼
 *    ┌─────────────────────────────────────────────────────────────────────┐
 *    │ 子组件 MonsterCard3D 执行                                             │
 *    │   → modelPath = getMonsterModelPathWithFallback(monsterId)           │
 *    │   → const { scene, animations } = useGLTF(modelPath)  ← 关键：会 suspend │
 *    └─────────────────────────────────────────────────────────────────────┘
 *                                    │
 *              ┌─────────────────────┴─────────────────────┐
 *              │ 该 URL 的 GLB 尚未就绪                     │ 该 URL 的 GLB 已就绪
 *              ▼                                           ▼
 *    ┌─────────────────────┐                   ┌─────────────────────────────┐
 *    │ useGLTF 内部抛出     │                   │ useGLTF 同步返回 scene +    │
 *    │ Promise（Suspense   │                   │ animations，组件继续渲染    │
 *    │ 约定）              │                   │ → originalBounds /         │
 *    └─────────────────────┘                   │   modelClone / 动画 / 渲染   │
 *              │                               └─────────────────────────────┘
 *              ▼
 *    ┌─────────────────────┐
 *    │ React 捕获 Promise  │
 *    │ → 显示 fallback：   │
 *    │   MonsterCardPlaceholder（旋转环+底座）
 *    └─────────────────────┘
 *              │
 *              │ 当该 URL 的 GLB 加载完成
 *              ▼
 *    ┌─────────────────────┐
 *    │ Promise resolve     │
 *    │ → React 重新渲染    │
 *    │   MonsterCard3D    │
 *    │ → useGLTF 命中缓存  │
 *    │ → 显示正式角色      │
 *    └─────────────────────┘
 *
 * 2. useGLTF(modelPath) 行为（@react-three/drei）
 *    - 内部使用 Three.js GLTFLoader 请求 modelPath（如 /assets/.../xxx.glb）。
 *    - 若该 URL 已有缓存（含 useGLTF.preload 预加载的）：同步返回 { scene, animations }，不 suspend。
 *    - 若该 URL 无缓存：发起请求，并抛出 Promise 给 React；请求完成后 Promise resolve，React 重新渲染该子树。
 *    - 因此「是否 suspend」完全由「该 URL 是否已加载」决定，与其它卡无关。
 *
 * 3. 预加载（布局层，如 TeamLayout3D）
 *    - getAllMonsterGlbPaths() 收集所有怪物 GLB 路径。
 *    - useEffect 中：paths.forEach(path => useGLTF.preload(path))。
 *    - preload 只发起下载并写入内部缓存，不阻塞渲染；场景可立即显示，各卡按需从缓存读取或等待。
 *
 * 4. 单卡 Suspense 的意义
 *    - 某张卡的 modelPath 未在 preload 中、或 preload 未完成、或失败：该卡单独显示占位，其它卡照常显示。
 *    - 不会出现「整屏等最慢的一个模型」。
 *
 * 5. 开发调试（DEBUG_SIMULATE_SLOW_LOAD）
 *    - 设为 true：DelayedRender 在渲染 MonsterCard3D 前抛出延迟 Promise（DEBUG_DELAY_MS），
 *      用于人为制造 suspend，观察占位 → 正式角色的切换。
 *    - 使用模块级 _delayCache 记录每张卡（按 monsterId）是否已度过延迟，避免重挂载后重复延迟。
 *    - 发布前应设为 false。
 *
 * 6. 如何识别「模型加载完成」
 *    - 单卡：传入可选回调 onModelLoaded?: (monsterId: string) => void。当该卡 GLB 已加载且
 *      modelClone 就绪（即 Suspense 已落幕、正式角色即将/正在渲染）时调用一次。
 *    - 全局：在 Canvas 内使用 useProgress()（如 TeamLayout3D 的 LoadingTracker），
 *      progress === 100 表示当前已请求的资源全部加载完成（含 preload 的 GLB）。
 */

import { useAnimations, useCursor, useGLTF } from "@react-three/drei";
import { ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { SkeletonUtils } from "three-stdlib";
import { getMonsterModelPathWithFallback } from "../utils/modelPathMapper";

interface MonsterCard3DProps {
    q: number;
    r: number;
    width: number;
    height: number;
    position: [number, number, number];
    monsterId: string;
    isDragging?: boolean;
    onDragStart?: (monsterId: string) => void;
    onDragMove?: (monsterId: string, worldPos: THREE.Vector3) => void;
    onDragEnd?: (monsterId: string, worldPos: THREE.Vector3) => void;
    onClick?: () => void;
    onPointerEnter?: () => void;
    onPointerLeave?: () => void;
    /** 该卡 GLB 加载完成且已准备好渲染时调用（Suspense 落幕后、modelClone 就绪后触发一次） */
    onModelLoaded?: (monsterId: string) => void;
    /** 是否竖屏，竖屏时朝向正上 + X 轴前倾（与 BattleCharacter3D 一致） */
    isPortrait?: boolean;
}

/** 角色在场景中的整体放大系数 */
const MODEL_SCALE_FACTOR = 1.6;
/** 横屏朝向：面向正右（无上下偏移） */
const MODEL_FACE_RIGHT_Y = Math.PI / 2;
/** 竖屏朝向：面向正上（无左右偏移） */
const PORTRAIT_FACE_UP_Y = Math.PI;
/** 竖屏俯视时模型前倾角度（皇室战争风格，与 BattleCharacter3D 一致） */
const PORTRAIT_TILT_X = -Math.PI * 0.2;

const MonsterCard3D: React.FC<MonsterCard3DProps> = ({
    q,
    r,
    width,
    height,
    position,
    monsterId,
    isDragging: externalDragging = false,
    onDragStart,
    onDragMove,
    onDragEnd,
    onClick,
    onPointerEnter,
    onPointerLeave,
    onModelLoaded,
    isPortrait = false,
}) => {
    const groupRef = useRef<THREE.Group>(null);
    const [modeLoaded, setModeLoaded] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [isLocalDragging, setIsLocalDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState(new THREE.Vector3());
    const { camera, gl, raycaster } = useThree();

    // 显示手型光标
    useCursor(isHovered);

    const isDragging = externalDragging || isLocalDragging;

    // 当 position 变化且不在拖拽状态时，同步 groupRef 的位置
    // 这确保了拖拽结束后怪物回到正确位置
    useEffect(() => {
        if (groupRef.current && !isLocalDragging) {
            groupRef.current.position.set(position[0], position[1], position[2]);
        }
    }, [position, isLocalDragging]);

    // 获取模型路径
    const modelPath = getMonsterModelPathWithFallback(monsterId);
    console.log("modelPath", modelPath);

    // 加载 3D 模型（含动画片段）
    const { scene, animations } = useGLTF(modelPath);
    const clips = Array.isArray(animations) ? animations : [];

    // 从原始 scene 计算包围盒（骨骼已正确更新，克隆体的骨骼尚未更新导致 bbox 几乎为零）
    const originalBounds = useMemo(() => {
        if (!scene) return null;
        const box = new THREE.Box3().setFromObject(scene);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        console.log("[MonsterCard3D] 原始 scene 包围盒:", {
            monsterId,
            size: { x: size.x.toFixed(2), y: size.y.toFixed(2), z: size.z.toFixed(2) },
            center: { x: center.x.toFixed(2), y: center.y.toFixed(2), z: center.z.toFixed(2) }
        });
        return { center, size };
    }, [scene, monsterId]);

    // 用 SkeletonUtils.clone 创建独立副本（正确克隆 SkinnedMesh + 骨骼绑定，每张卡独立实例）
    const modelClone = useMemo(() => {
        if (!scene || !originalBounds) {
            console.log("[MonsterCard3D] scene 为空");
            return null;
        }

        console.log("[MonsterCard3D] SkeletonUtils.clone 克隆模型:", monsterId);

        // SkeletonUtils.clone 正确处理 SkinnedMesh 的骨骼绑定
        const clone = SkeletonUtils.clone(scene);

        // 克隆材质以隔离各实例，保留纹理
        clone.traverse((node) => {
            if ((node as THREE.Mesh).isMesh) {
                const mesh = node as THREE.Mesh;
                if (mesh.material) {
                    if (Array.isArray(mesh.material)) {
                        mesh.material = mesh.material.map((m) => {
                            const mat = m.clone();
                            if ("side" in mat) mat.side = THREE.DoubleSide;
                            return mat;
                        });
                    } else {
                        const mat = (mesh.material as THREE.Material).clone();
                        if ("side" in mat) mat.side = THREE.DoubleSide;
                        mesh.material = mat;
                    }
                }
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                mesh.frustumCulled = false;
            }
        });

        // 用原始 scene 的包围盒居中（克隆体的骨骼未更新，自身 bbox 不可靠）
        const { center, size } = originalBounds;
        clone.position.set(-center.x, -center.y + size.y / 2, -center.z);

        return clone;
    }, [scene, monsterId, originalBounds]);

    // 动画：用 modelClone 作为根，clips 按骨骼名匹配克隆体的骨骼
    const cloneRef = useRef<THREE.Object3D>(null);

    // 保持 ref 与 modelClone 同步
    useEffect(() => {
        (cloneRef as React.MutableRefObject<THREE.Object3D | null>).current = modelClone;
        setTimeout(() => {
            setModeLoaded(true);
        }, 3000);
    }, [modelClone]);

    // 模型加载完成：useGLTF 已 resolve 且 modelClone 已就绪，通知外部（每卡仅触发一次）
    const hasNotifiedLoaded = useRef(false);
    useEffect(() => {
        if (!modelClone || hasNotifiedLoaded.current) return;
        hasNotifiedLoaded.current = true;
        onModelLoaded?.(monsterId);
    }, [modelClone, monsterId, onModelLoaded]);

    const { actions, names } = useAnimations(clips, cloneRef);

    useEffect(() => {
        if (!modelClone || names.length === 0) return;
        const name =
            names.find((n) => /idle|Idle|stand|Stand|wait|Wait/i.test(n)) ||
            names[0];
        const action = name && actions[name];
        if (action) {
            action.reset().fadeIn(0.2).play();
        }
    }, [modelClone, names, actions]);

    // 获取鼠标在地面上的世界坐标
    const getWorldPosition = useCallback((event: ThreeEvent<PointerEvent>) => {
        // 创建一个水平面（Y=0）
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const intersection = new THREE.Vector3();

        // 使用射线与平面求交
        raycaster.setFromCamera(event.pointer, camera);
        raycaster.ray.intersectPlane(plane, intersection);

        return intersection;
    }, [camera, raycaster]);

    // 拖拽开始
    const handlePointerDown = useCallback((event: ThreeEvent<PointerEvent>) => {
        event.stopPropagation();
        setIsLocalDragging(true);

        // 计算拖拽偏移量
        const worldPos = getWorldPosition(event);
        const currentPos = new THREE.Vector3(...position);
        setDragOffset(currentPos.sub(worldPos));

        // 捕获指针
        (event.target as HTMLElement).setPointerCapture(event.pointerId);

        onDragStart?.(monsterId);
    }, [getWorldPosition, position, monsterId, onDragStart]);

    // 拖拽移动
    const handlePointerMove = useCallback((event: ThreeEvent<PointerEvent>) => {
        if (!isLocalDragging || !groupRef.current) return;

        event.stopPropagation();
        const worldPos = getWorldPosition(event);
        worldPos.add(dragOffset);

        // 更新位置
        groupRef.current.position.set(worldPos.x, position[1], worldPos.z);

        onDragMove?.(monsterId, worldPos);
    }, [isLocalDragging, getWorldPosition, dragOffset, position, monsterId, onDragMove]);

    // 拖拽结束
    const handlePointerUp = useCallback((event: ThreeEvent<PointerEvent>) => {
        if (!isLocalDragging) return;

        event.stopPropagation();
        setIsLocalDragging(false);

        // 释放指针捕获
        (event.target as HTMLElement).releasePointerCapture(event.pointerId);

        const worldPos = getWorldPosition(event);
        worldPos.add(dragOffset);

        onDragEnd?.(monsterId, worldPos);
    }, [isLocalDragging, getWorldPosition, dragOffset, monsterId, onDragEnd]);

    // 鼠标悬停
    const handlePointerEnter = useCallback((event: ThreeEvent<PointerEvent>) => {
        setIsHovered(true);
        onPointerEnter?.();
    }, [onPointerEnter]);

    const handlePointerLeave = useCallback((event: ThreeEvent<PointerEvent>) => {
        setIsHovered(false);
        onPointerLeave?.();
    }, [onPointerLeave]);

    // 悬浮效果（拖拽时保持静止，不旋转）
    useFrame(({ clock }) => {
        if (groupRef.current) {
            // 悬停时上下浮动（非拖拽状态）
            if (isHovered && !isDragging) {
                const baseY = position[1];
                groupRef.current.position.y = baseY + Math.sin(clock.elapsedTime * 3) * 3;
            }
        }
    });

    // 计算缩放：用原始 scene 的包围盒（正确尺寸），让模型高度大约占六边格宽度的 70%
    const modelScale = useMemo(() => {
        if (!originalBounds) return 1;
        const { size } = originalBounds;
        const maxDim = Math.max(size.x, size.y, size.z);
        const targetSize = width * 0.7;
        const scale = maxDim > 0 ? targetSize / maxDim : 1;

        console.log("[MonsterCard3D] 缩放计算:", {
            monsterId,
            hexWidth: width,
            modelMaxDim: maxDim.toFixed(2),
            targetSize: targetSize.toFixed(2),
            rawScale: scale.toFixed(4),
            finalScale: (scale * MODEL_SCALE_FACTOR).toFixed(4),
        });

        return Math.max(0.01, scale);
    }, [originalBounds, width, monsterId]);
    useEffect(() => {

    }, [modelClone]);

    return (
        <group
            ref={groupRef}
            position={position}
            onClick={onClick}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerEnter={handlePointerEnter}
            onPointerLeave={handlePointerLeave}
        >
            {/* 底座 - Y 位置设为 4 确保高于 deployable 区域 */}
            <mesh position={[0, 4, 0]}>
                <cylinderGeometry args={[width * 0.25, width * 0.3, 6, 6]} />
                <meshStandardMaterial
                    color={isDragging ? "#ff9900" : isHovered ? "#64B5F6" : "#2196F3"}
                    metalness={0.3}
                    roughness={0.7}
                    polygonOffset={true}
                    polygonOffsetFactor={-5}
                    polygonOffsetUnits={-5}
                    emissive={isHovered ? "#1565C0" : "#000000"}
                    emissiveIntensity={isHovered ? 0.3 : 0}
                />
            </mesh>

            {/* 统一用 SkeletonUtils 克隆体 + primitive 渲染（每张卡独立实例，都能显示+播动画） */}
            {modelClone && (
                <group
                    position={[0, 10, 0]}
                    rotation={[isPortrait ? PORTRAIT_TILT_X : 0, isPortrait ? PORTRAIT_FACE_UP_Y : MODEL_FACE_RIGHT_Y, 0]}
                    scale={[modelScale * MODEL_SCALE_FACTOR, modelScale * MODEL_SCALE_FACTOR, modelScale * MODEL_SCALE_FACTOR]}
                >
                    <primitive object={modelClone} />
                </group>
            )}
        </group>
    );
};

// ============================================================
// 加载中旋转占位组件（在 3D 场景中显示旋转的半透明环 + 底座）
// ============================================================
const MonsterCardPlaceholder: React.FC<{
    width: number;
    position: [number, number, number];
}> = ({ width, position }) => {
    const ringRef = useRef<THREE.Mesh>(null);

    useFrame(({ clock }) => {
        if (ringRef.current) {
            ringRef.current.rotation.y = clock.elapsedTime * 2.5;
            // 缓慢上下浮动
            ringRef.current.position.y = 30 + Math.sin(clock.elapsedTime * 2) * 5;
        }
    });

    return (
        <group position={position}>
            {/* 底座（与正式卡片相同） */}
            <mesh position={[0, 4, 0]}>
                <cylinderGeometry args={[width * 0.25, width * 0.3, 6, 6]} />
                <meshStandardMaterial
                    color="#90CAF9"
                    metalness={0.3}
                    roughness={0.7}
                    transparent
                    opacity={0.6}
                />
            </mesh>

            {/* 旋转环 */}
            <mesh ref={ringRef} position={[0, 30, 0]}>
                <torusGeometry args={[width * 0.2, width * 0.03, 16, 32]} />
                <meshStandardMaterial
                    color="#42A5F5"
                    emissive="#1E88E5"
                    emissiveIntensity={0.5}
                    transparent
                    opacity={0.8}
                />
            </mesh>

            {/* 中心小球 */}
            <mesh position={[0, 30, 0]}>
                <sphereGeometry args={[width * 0.06, 16, 16]} />
                <meshStandardMaterial
                    color="#90CAF9"
                    emissive="#42A5F5"
                    emissiveIntensity={0.3}
                    transparent
                    opacity={0.7}
                />
            </mesh>
        </group>
    );
};



// ============================================================
// 带 Suspense 的包裹组件：单卡级别加载，模型未就绪时显示旋转占位
// ============================================================
const MonsterCard3DWithSuspense: React.FC<MonsterCard3DProps> = (props) => {
    return (
        <Suspense
            fallback={
                <MonsterCardPlaceholder
                    width={props.width}
                    position={props.position}
                />
            }
        >
            <MonsterCard3D {...props} />
        </Suspense>
    );
};

// 预加载在布局层统一处理（见 TeamLayout3D 或 getAllMonsterGlbPaths）


export { MonsterCard3D, MonsterCard3DWithSuspense, MonsterCardPlaceholder };

