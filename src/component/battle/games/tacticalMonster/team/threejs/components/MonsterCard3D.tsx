/**
 * MonsterCard3D 组件
 * 怪物卡片的 3D 表示（用于拖拽预览和已放置的怪物）
 */

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import React, { useMemo, useRef } from "react";
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
    isDragging = false,
    onClick,
    onPointerEnter,
    onPointerLeave,
}) => {
    const groupRef = useRef<THREE.Group>(null);

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

    // 拖拽时旋转动画
    useFrame(({ clock }) => {
        if (groupRef.current && isDragging) {
            groupRef.current.rotation.y = clock.elapsedTime * 2;
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
            onPointerEnter={onPointerEnter}
            onPointerLeave={onPointerLeave}
        >
            {/* 底座 - Y 位置设为 4 确保高于 deployable 区域（约 0.2） */}
            <mesh position={[0, 4, 0]}>
                <cylinderGeometry args={[width * 0.25, width * 0.3, 6, 6]} />
                <meshStandardMaterial
                    color={isDragging ? "#ff9900" : "#2196F3"}
                    metalness={0.3}
                    roughness={0.7}
                    polygonOffset={true}
                    polygonOffsetFactor={-5}
                    polygonOffsetUnits={-5}
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
