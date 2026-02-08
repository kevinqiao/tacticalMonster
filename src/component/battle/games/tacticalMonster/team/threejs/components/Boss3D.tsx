/**
 * Boss3D 组件
 * Boss 的 3D 表示，按 MonsterCard3D 方式加载 GLB 模型并播放动画
 */

import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import React, { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { SkeletonUtils } from "three-stdlib";
import { getMonsterModelPathWithFallback } from "../utils/modelPathMapper";

interface Boss3DProps {
    q: number;
    r: number;
    width: number;
    height: number;
    position: [number, number, number];
    bossId: string;
    monsterId: string;
    onClick?: () => void;
    /** 该 Boss GLB 加载完成且已准备好渲染时调用 */
    onModelLoaded?: (monsterId: string) => void;
    /** 是否竖屏，竖屏时朝向正下 + X 轴前倾（与 BattleCharacter3D 一致） */
    isPortrait?: boolean;
}

/** Boss 在场景中的整体放大系数（比普通怪物更大） */
const BOSS_SCALE_FACTOR = 2.2;
/** 横屏朝向：面向正左（无上下偏移） */
const MODEL_FACE_LEFT_Y = -Math.PI / 2;
/** 竖屏朝向：面向正下（无左右偏移） */
const PORTRAIT_FACE_DOWN_Y = 0;
/** 竖屏俯视时模型前倾角度（与 BattleCharacter3D 一致） */
const PORTRAIT_TILT_X = -Math.PI * 0.2;

const Boss3D: React.FC<Boss3DProps> = ({
    q,
    r,
    width,
    height,
    position,
    bossId,
    monsterId,
    onClick,
    onModelLoaded,
    isPortrait = false,
}) => {
    const groupRef = useRef<THREE.Group>(null);
    const modelGroupRef = useRef<THREE.Group>(null);

    const modelPath = getMonsterModelPathWithFallback(monsterId);
    const { scene, animations } = useGLTF(modelPath);
    const clips = Array.isArray(animations) ? animations : [];

    const originalBounds = useMemo(() => {
        if (!scene) return null;
        const box = new THREE.Box3().setFromObject(scene);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        return { center, size };
    }, [scene, monsterId]);

    const modelClone = useMemo(() => {
        if (!scene || !originalBounds) return null;
        const clone = SkeletonUtils.clone(scene);
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
        const { center, size } = originalBounds;
        clone.position.set(-center.x, -center.y + size.y / 2, -center.z);
        return clone;
    }, [scene, monsterId, originalBounds]);

    const cloneRef = useRef<THREE.Object3D>(null);
    useEffect(() => {
        (cloneRef as React.MutableRefObject<THREE.Object3D | null>).current = modelClone;
    }, [modelClone]);

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
            names.find((n) => /idle|Idle|stand|Stand|wait|Wait/i.test(n)) || names[0];
        const action = name && actions[name];
        if (action) action.reset().fadeIn(0.2).play();
    }, [modelClone, names, actions]);

    const modelScale = useMemo(() => {
        if (!originalBounds) return 1;
        const { size } = originalBounds;
        const maxDim = Math.max(size.x, size.y, size.z);
        const targetSize = width * 0.7;
        const scale = maxDim > 0 ? targetSize / maxDim : 1;
        return Math.max(0.01, scale);
    }, [originalBounds, width, monsterId]);

    const baseScaleRef = useRef(modelScale * BOSS_SCALE_FACTOR);
    baseScaleRef.current = modelScale * BOSS_SCALE_FACTOR;

    // 轻微脉冲动画（保留原有效果）
    useFrame(({ clock }) => {
        if (modelGroupRef.current) {
            const pulse = 1 + Math.sin(clock.elapsedTime * 2) * 0.08;
            const s = baseScaleRef.current * pulse;
            modelGroupRef.current.scale.set(s, s, s);
        }
    });

    return (
        <group ref={groupRef} position={position} onClick={onClick}>
            {/* 底座 */}
            <mesh position={[0, 4, 0]}>
                <cylinderGeometry args={[width * 0.3, width * 0.35, 8, 6]} />
                <meshStandardMaterial
                    color="#B71C1C"
                    metalness={0.3}
                    roughness={0.7}
                    emissive="#7F0000"
                    emissiveIntensity={0.2}
                />
            </mesh>

            {modelClone && (
                <group
                    ref={modelGroupRef}
                    position={[0, 12, 0]}
                    rotation={[isPortrait ? PORTRAIT_TILT_X : 0, isPortrait ? PORTRAIT_FACE_DOWN_Y : MODEL_FACE_LEFT_Y, 0]}
                    scale={modelScale * BOSS_SCALE_FACTOR}
                >
                    <primitive object={modelClone} />
                </group>
            )}
        </group>
    );
};

// ============================================================
// 加载中旋转占位（红色调，略大）
// ============================================================
const BossPlaceholder: React.FC<{
    width: number;
    position: [number, number, number];
}> = ({ width, position }) => {
    const ringRef = useRef<THREE.Mesh>(null);

    useFrame(({ clock }) => {
        if (ringRef.current) {
            ringRef.current.rotation.y = clock.elapsedTime * 2.5;
            ringRef.current.position.y = 35 + Math.sin(clock.elapsedTime * 2) * 5;
        }
    });

    return (
        <group position={position}>
            <mesh position={[0, 4, 0]}>
                <cylinderGeometry args={[width * 0.3, width * 0.35, 8, 6]} />
                <meshStandardMaterial
                    color="#EF5350"
                    metalness={0.3}
                    roughness={0.7}
                    transparent
                    opacity={0.6}
                />
            </mesh>
            <mesh ref={ringRef} position={[0, 35, 0]}>
                <torusGeometry args={[width * 0.25, width * 0.04, 16, 32]} />
                <meshStandardMaterial
                    color="#E53935"
                    emissive="#B71C1C"
                    emissiveIntensity={0.5}
                    transparent
                    opacity={0.8}
                />
            </mesh>
            <mesh position={[0, 35, 0]}>
                <sphereGeometry args={[width * 0.08, 16, 16]} />
                <meshStandardMaterial
                    color="#EF5350"
                    emissive="#C62828"
                    emissiveIntensity={0.3}
                    transparent
                    opacity={0.7}
                />
            </mesh>
        </group>
    );
};

// ============================================================
// 带 Suspense 的包裹组件
// ============================================================
const Boss3DWithSuspense: React.FC<Boss3DProps> = (props) => {
    return (
        <Suspense
            fallback={
                <BossPlaceholder width={props.width} position={props.position} />
            }
        >
            <Boss3D {...props} />
        </Suspense>
    );
};

export default Boss3DWithSuspense;
export { Boss3D, Boss3DWithSuspense, BossPlaceholder };

