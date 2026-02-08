/**
 * BattleCharacter3D - 战斗角色 3D 模型
 * 基于 MonsterCard3D 模式，支持 idle/walk/attack/hurt 动画
 */

import { Html, useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import React, { Suspense, useCallback, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { SkeletonUtils } from "three-stdlib";
import type { MonsterSprite } from "../../../types/CombatTypes";
import { getMonsterModelPathWithFallback } from "../../utils/modelPathMapper";

const MODEL_SCALE_FACTOR = 1.6;
// 横屏朝向：面向正右 / 面向正左（无上下偏移）
const MODEL_FACE_RIGHT_Y = Math.PI / 2;
const MODEL_FACE_LEFT_Y = -Math.PI / 2;
// 竖屏朝向：面向正上 / 面向正下（无左右偏移）
const PORTRAIT_FACE_UP_Y = Math.PI;
const PORTRAIT_FACE_DOWN_Y = 0;
// 竖屏俯视时模型前倾角度（皇室战争风格，约 -63 度）
const PORTRAIT_TILT_X = -Math.PI * 0.2;

export type BattleAnimationState = "idle" | "walk" | "attack" | "hurt" | "stand";

export interface BattleCharacter3DRef {
    groupRef: React.RefObject<THREE.Group | null>;
    playAnimation: (name: BattleAnimationState) => void;
}

interface BattleCharacter3DProps {
    character: MonsterSprite;
    position: [number, number, number];
    width: number;
    height: number;
    /** 朝向：1=右/上（玩家），-1=左/下（boss） */
    facing?: number;
    /** 是否竖屏，竖屏时朝向旋转为上下 */
    isPortrait?: boolean;
    onModelLoaded?: (monsterId: string) => void;
    onRefReady?: (ref: BattleCharacter3DRef) => void;
}

const BattleCharacter3DInner: React.FC<BattleCharacter3DProps> = ({
    character,
    position,
    width,
    height,
    facing = 1,
    isPortrait = false,
    onModelLoaded,
    onRefReady,
}) => {
    const groupRef = useRef<THREE.Group>(null);
    const modelPath = getMonsterModelPathWithFallback(character.monsterId);
    const { scene, animations } = useGLTF(modelPath);
    const clips = Array.isArray(animations) ? animations : [];

    const originalBounds = useMemo(() => {
        if (!scene) return null;
        const box = new THREE.Box3().setFromObject(scene);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        return { center, size };
    }, [scene]);

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
    }, [scene, originalBounds]);

    const cloneRef = useRef<THREE.Object3D>(null);
    useEffect(() => {
        (cloneRef as React.MutableRefObject<THREE.Object3D | null>).current = modelClone;
    }, [modelClone]);

    const hasNotifiedLoaded = useRef(false);
    useEffect(() => {
        if (!modelClone || hasNotifiedLoaded.current) return;
        hasNotifiedLoaded.current = true;
        onModelLoaded?.(character.monsterId);
    }, [modelClone, character.monsterId, onModelLoaded]);

    const { actions, names } = useAnimations(clips, cloneRef);

    const findAnimation = useCallback(
        (patterns: RegExp[]) => {
            for (const pat of patterns) {
                const name = names.find((n) => pat.test(n));
                if (name && actions[name]) return actions[name];
            }
            return names[0] ? actions[names[0]] : null;
        },
        [names, actions]
    );

    const playAnimation = useCallback(
        (name: BattleAnimationState) => {
            if (!modelClone || names.length === 0) return;

            const actionMap: Record<BattleAnimationState, RegExp[]> = {
                idle: [/idle|Idle|stand|Stand|wait|Wait/i],
                walk: [/walk|Walk|move|Move|run|Run|locomotion/i],
                attack: [/attack|Attack|atk|Atk/i],
                hurt: [/hurt|Hurt|hit|Hit|damage/i],
                stand: [/idle|Idle|stand|Stand|wait|Wait/i],
            };

            const action = findAnimation(actionMap[name] || actionMap.idle);
            if (action) {
                if (name === "attack" || name === "hurt") {
                    action.reset().setLoop(THREE.LoopOnce, 1).fadeIn(0.1).play();
                } else {
                    action.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(0.2).play();
                }
            }
        },
        [modelClone, names, actions, findAnimation]
    );

    useEffect(() => {
        if (!modelClone || names.length === 0) return;
        playAnimation("idle");
    }, [modelClone, names, playAnimation]);

    const refApi = useMemo<BattleCharacter3DRef>(
        () => ({
            groupRef,
            playAnimation,
        }),
        [playAnimation]
    );

    useEffect(() => {
        if (groupRef.current) onRefReady?.(refApi);
    }, [onRefReady, refApi]);

    const modelScale = useMemo(() => {
        if (!originalBounds) return 1;
        const { size } = originalBounds;
        const maxDim = Math.max(size.x, size.y, size.z);
        const targetSize = width * 0.7;
        return maxDim > 0 ? Math.max(0.01, targetSize / maxDim) : 1;
    }, [originalBounds, width]);

    // 竖屏时朝向旋转为上下方向，横屏时保持左右方向
    const rotationY = isPortrait
        ? (facing >= 0 ? PORTRAIT_FACE_UP_Y : PORTRAIT_FACE_DOWN_Y)
        : (facing >= 0 ? MODEL_FACE_RIGHT_Y : MODEL_FACE_LEFT_Y);

    const hpPercent = character.stats?.hp
        ? (character.stats.hp.current / character.stats.hp.max) * 100
        : 100;

    return (
        <group ref={groupRef} position={position}>
            {/* 底座 */}
            <mesh position={[0, 4, 0]}>
                <cylinderGeometry args={[width * 0.25, width * 0.3, 6, 6]} />
                <meshStandardMaterial
                    color={character.uid === "boss" ? "#e91e63" : "#2196F3"}
                    metalness={0.3}
                    roughness={0.7}
                    polygonOffset={true}
                    polygonOffsetFactor={-5}
                    polygonOffsetUnits={-5}
                />
            </mesh>

            {/* 3D 模型 */}
            {modelClone && (
                <group
                    position={[0, 10, 0]}
                    rotation={[isPortrait ? (facing >= 0 ? -PORTRAIT_TILT_X : PORTRAIT_TILT_X) : 0, rotationY, 0]}
                    scale={[modelScale * MODEL_SCALE_FACTOR, modelScale * MODEL_SCALE_FACTOR, modelScale * MODEL_SCALE_FACTOR]}
                >
                    <primitive object={modelClone} />
                </group>
            )}

            {/* HP 条 */}
            {character.stats?.hp && (
                <Html position={[0, 35, 0]} center style={{ pointerEvents: "none" }}>
                    <div
                        style={{
                            width: 60,
                            height: 8,
                            background: "rgba(0,0,0,0.6)",
                            borderRadius: 4,
                            overflow: "hidden",
                        }}
                    >
                        <div
                            style={{
                                width: `${hpPercent}%`,
                                height: "100%",
                                background: hpPercent > 50 ? "#4caf50" : hpPercent > 25 ? "#ff9800" : "#f44336",
                                transition: "width 0.2s",
                            }}
                        />
                    </div>
                    <div
                        style={{
                            fontSize: 10,
                            color: "#fff",
                            textAlign: "center",
                            marginTop: 2,
                            textShadow: "1px 1px 2px #000",
                        }}
                    >
                        {character.stats.hp.current}/{character.stats.hp.max}
                    </div>
                </Html>
            )}
        </group>
    );
};

const BattleCharacterPlaceholder: React.FC<{
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
            <mesh position={[0, 4, 0]}>
                <cylinderGeometry args={[width * 0.25, width * 0.3, 6, 6]} />
                <meshStandardMaterial color="#90CAF9" metalness={0.3} roughness={0.7} transparent opacity={0.6} />
            </mesh>
            <mesh ref={ringRef} position={[0, 30, 0]}>
                <torusGeometry args={[width * 0.2, width * 0.03, 16, 32]} />
                <meshStandardMaterial color="#42A5F5" transparent opacity={0.8} />
            </mesh>
        </group>
    );
};

export const BattleCharacter3DWithSuspense: React.FC<BattleCharacter3DProps> = (props) => {
    return (
        <Suspense
            fallback={
                <BattleCharacterPlaceholder width={props.width} position={props.position} />
            }
        >
            <BattleCharacter3DInner {...props} />
        </Suspense>
    );
};

export { BattleCharacter3DInner };

