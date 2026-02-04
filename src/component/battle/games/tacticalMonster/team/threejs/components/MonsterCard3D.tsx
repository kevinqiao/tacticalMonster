/**
 * MonsterCard3D 组件
 * 怪物卡片的 3D 表示（用于拖拽预览和已放置的怪物）
 * 支持 3D 场景内拖拽移动
 */

import { useCursor, useGLTF } from "@react-three/drei";
import { ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
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
}

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
}) => {
    const groupRef = useRef<THREE.Group>(null);
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

    // 加载 3D 模型
    const { scene } = useGLTF(modelPath);

    // 创建独立的模型副本
    const modelClone = useMemo(() => {
        if (!scene) {
            console.log("[MonsterCard3D] scene 为空");
            return null;
        }

        console.log("[MonsterCard3D] 开始克隆模型:", monsterId);

        // 深度克隆
        const clone = scene.clone(true);

        // 遍历并克隆材质
        clone.traverse((node) => {
            if ((node as THREE.Mesh).isMesh) {
                const mesh = node as THREE.Mesh;
                // 克隆材质以避免共享
                if (mesh.material) {
                    if (Array.isArray(mesh.material)) {
                        mesh.material = mesh.material.map(m => {
                            const newMat = new THREE.MeshBasicMaterial({
                                color: 0xff6600,
                                side: THREE.DoubleSide
                            });
                            return newMat;
                        });
                    } else {
                        mesh.material = new THREE.MeshBasicMaterial({
                            color: 0xff6600,
                            side: THREE.DoubleSide
                        });
                    }
                }
                mesh.castShadow = true;
                mesh.receiveShadow = true;
            }
        });

        // 计算边界框并居中
        const box = new THREE.Box3().setFromObject(clone);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        console.log("[MonsterCard3D] 模型信息:", {
            monsterId,
            size: { x: size.x.toFixed(2), y: size.y.toFixed(2), z: size.z.toFixed(2) },
            center: { x: center.x.toFixed(2), y: center.y.toFixed(2), z: center.z.toFixed(2) }
        });

        // 将模型移到原点
        clone.position.set(-center.x, -center.y + size.y / 2, -center.z);

        return clone;
    }, [scene, monsterId]);

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

    // 计算缩放
    const modelScale = useMemo(() => {
        if (!modelClone) return 50;
        const box = new THREE.Box3().setFromObject(modelClone);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        // 目标大小是六边形宽度的 60%
        const targetSize = width * 0.6;
        const scale = maxDim > 0 ? targetSize / maxDim : 50;
        console.log("[MonsterCard3D] 缩放计算:", { monsterId, maxDim, targetSize, scale });
        return scale;
    }, [modelClone, width, monsterId]);

    // 提取模型中的网格几何体
    const meshData = useMemo(() => {
        if (!modelClone) return null;

        const meshes: { geometry: THREE.BufferGeometry; position: THREE.Vector3 }[] = [];

        modelClone.traverse((node) => {
            if ((node as THREE.Mesh).isMesh) {
                const mesh = node as THREE.Mesh;
                if (mesh.geometry) {
                    const worldPos = new THREE.Vector3();
                    mesh.getWorldPosition(worldPos);
                    meshes.push({
                        geometry: mesh.geometry.clone(),
                        position: worldPos
                    });
                }
            }
        });

        return meshes;
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

            {/* 3D 模型 */}
            {meshData && meshData.length > 0 && (
                <group scale={modelScale} position={[0, 10, 0]}>
                    {meshData.map((data, index) => (
                        <mesh key={index} geometry={data.geometry}>
                            <meshStandardMaterial
                                color="#ff6600"
                                side={THREE.DoubleSide}
                                metalness={0.1}
                                roughness={0.8}
                            />
                        </mesh>
                    ))}
                </group>
            )}

            {/* 备用占位符 */}
            {(!meshData || meshData.length === 0) && (
                <mesh position={[0, 30, 0]}>
                    <boxGeometry args={[width * 0.4, width * 0.5, width * 0.4]} />
                    <meshStandardMaterial color="#888888" />
                </mesh>
            )}
        </group>
    );
};

// 预加载默认模型
useGLTF.preload('/assets/3d/glb/characters/tiger/model/tiger.glb');

export default MonsterCard3D;
