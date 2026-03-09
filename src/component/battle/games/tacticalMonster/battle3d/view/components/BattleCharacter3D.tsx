/**
 * BattleCharacter3D - 战斗角色 3D 模型
 * 基于 MonsterCard3D 模式，支持 idle/walk/attack/hurt 动画
 */

import { Html, useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import React, { Suspense, useCallback, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { SkeletonUtils } from "three-stdlib";
import type { CharacterRef3D, MonsterSprite } from "../../../types/CombatTypes";
import { resolveAttackProfile } from "../../../utils/skillRangeUtils";
import { getCharacterKey } from "../../utils/battle3DAdapter";
import { getMonsterModelPathWithFallback } from "../../utils/modelPathMapper";

const MODEL_SCALE_FACTOR = 1.6;
// 朝向：面向正右 / 面向正左（竖屏由相机旋转 90° 实现，模型始终用横屏朝向）
const MODEL_FACE_RIGHT_Y = Math.PI / 2;
const MODEL_FACE_LEFT_Y = -Math.PI / 2;
// 模型绕 Z 轴倾斜（约 ±12°），配合整体倾斜让脸部更朝向镜头
const MODEL_TILT_Z = Math.PI * 0.065;
// 竖屏整体身体绕 Z 轴后倾（参考皇室战争）：约 ±35°，以脚为支点后仰，俯视可见正面
const BODY_TILT_Z_PORTRAIT = Math.PI * 0.195;

export type BattleAnimationState = "idle" | "walk" | "attack" | "hurt" | "stand";

export interface BattleCharacter3DRef {
    groupRef: React.RefObject<THREE.Group | null>;
    modelGroupRef?: React.RefObject<THREE.Group | null>;
    playAnimation: (name: BattleAnimationState) => void;
}

interface BattleCharacter3DProps {
    character: MonsterSprite;
    position: [number, number, number];
    /** 当前正在动画的角色 key（CombatManager）；用于 memo 在动画期间跳过重渲染 */
    animatingCharacterKey?: string | null;
    width: number;
    height: number;
    /** 朝向：1=右/上（玩家），-1=左/下（boss） */
    facing?: number;
    /** 是否竖屏，竖屏时朝向旋转为上下 */
    isPortrait?: boolean;
    /** 是否是当前回合活跃角色（显示高亮指示器） */
    isActive?: boolean;
    onModelLoaded?: (monsterId: string) => void;
    onRefReady?: (ref: BattleCharacter3DRef) => void;
}

function areEqual(prev: BattleCharacter3DProps, next: BattleCharacter3DProps): boolean {
    const nextKey = getCharacterKey(next.character);
    if (next.animatingCharacterKey && nextKey === next.animatingCharacterKey) return true;
    // ✅ 按值比较 position（每次 useMemo 都会创建新数组，引用必不同）
    const posEqual =
        prev.position[0] === next.position[0] &&
        prev.position[1] === next.position[1] &&
        prev.position[2] === next.position[2];
    return (
        prev.character === next.character &&
        posEqual &&
        prev.width === next.width &&
        prev.height === next.height &&
        prev.facing === next.facing &&
        prev.isPortrait === next.isPortrait &&
        prev.isActive === next.isActive
    );
}

const BattleCharacter3DInner: React.FC<BattleCharacter3DProps> = ({
    character,
    position,
    animatingCharacterKey,
    width,
    height,
    facing = 1,
    isPortrait = false,
    isActive = false,
    onModelLoaded,
    onRefReady,
}) => {
    const groupRef = useRef<THREE.Group>(null);
    const modelGroupRef = useRef<THREE.Group>(null);
    const activeRingRef = useRef<THREE.Mesh>(null);
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
                mesh.renderOrder = 2; // 角色在高亮层 (renderOrder=1) 之上渲染
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
            modelGroupRef,
            playAnimation,
        }),
        [playAnimation]
    );

    useEffect(() => {
        if (groupRef.current) {
            character.ref3D = refApi as CharacterRef3D;
            onRefReady?.(refApi);
        }
        return () => {
            character.ref3D = undefined;
        };
    }, [character, onRefReady, refApi]);

    // ✅ 活跃角色指示器：脉冲缩放 + 缓慢旋转
    useFrame(({ clock }) => {
        if (activeRingRef.current && isActive) {
            const pulse = 1 + Math.sin(clock.elapsedTime * 3) * 0.12;
            activeRingRef.current.scale.set(pulse, pulse, 1);
            activeRingRef.current.rotation.z = clock.elapsedTime * 0.5;
        }
    });

    const modelScale = useMemo(() => {
        if (!originalBounds) return 1;
        const { size } = originalBounds;
        const maxDim = Math.max(size.x, size.y, size.z);
        const targetSize = width * 0.7;
        return maxDim > 0 ? Math.max(0.01, targetSize / maxDim) : 1;
    }, [originalBounds, width]);

    // 朝向始终为左右方向（竖屏由相机旋转处理，模型与横屏一致）
    const rotationY = facing >= 0 ? MODEL_FACE_RIGHT_Y : MODEL_FACE_LEFT_Y;

    const hpPercent = character.stats?.hp
        ? (character.stats.hp.current / character.stats.hp.max) * 100
        : 100;
    const attackRangeLabel = useMemo(() => {
        const { skillId, attackRange, isMelee } = resolveAttackProfile(character);
        return attackRange;
        // const min = character.attack_range?.min ?? 1;
        // const max = character.attack_range?.max ?? min;
        // return min === max ? `${max}` : `${min}-${max}`;
    }, [character]);

    const isAnimating = animatingCharacterKey === getCharacterKey(character);
    const upperRotation: [number, number, number] = isPortrait
        ? [0, 0, facing >= 0 ? BODY_TILT_Z_PORTRAIT : -BODY_TILT_Z_PORTRAIT]
        : [0, 0, 0];

    return (
        <group ref={groupRef} position={position}>
            {/* 底座 + 光环：始终水平，不随竖屏倾斜 */}
            <group>
                <mesh position={[0, 4, 0]} renderOrder={2}>
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
                {isActive && (
                    <mesh
                        ref={activeRingRef}
                        position={[0, 7.5, 0]}
                        rotation={[-Math.PI / 2, 0, 0]}
                        renderOrder={2}
                    >
                        <ringGeometry args={[width * 0.28, width * 0.42, 32]} />
                        <meshStandardMaterial
                            color="#FFD700"
                            emissive="#FFD700"
                            emissiveIntensity={2.5}
                            transparent
                            opacity={0.9}
                            side={THREE.DoubleSide}
                        />
                    </mesh>
                )}
            </group>

            {/* 模型 + HP：竖屏时整体绕 Z 轴后倾，底座保持平 */}
            <group rotation={upperRotation}>
                {modelClone && (
                    <group position={[0, 10, 0]} rotation={[0, 0, facing >= 0 ? MODEL_TILT_Z : -MODEL_TILT_Z]}>
                        <group
                            ref={modelGroupRef}
                            rotation={isAnimating ? undefined : [0, rotationY, 0]}
                            scale={[modelScale * MODEL_SCALE_FACTOR, modelScale * MODEL_SCALE_FACTOR, modelScale * MODEL_SCALE_FACTOR]}
                        >
                            <primitive object={modelClone} />
                        </group>
                    </group>
                )}
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
                        <div
                            style={{
                                fontSize: 10,
                                color: "#ffeb3b",
                                textAlign: "center",
                                marginTop: 2,
                                textShadow: "1px 1px 2px #000",
                            }}
                        >
                            AR: {attackRangeLabel}
                        </div>
                    </Html>
                )}
            </group>
        </group>
    );
};

const BattleCharacterPlaceholder: React.FC<{
    character: MonsterSprite;
    width: number;
    position: [number, number, number];
}> = ({ character, width, position }) => {
    const groupRef = useRef<THREE.Group>(null);
    const ringRef = useRef<THREE.Mesh>(null);

    useEffect(() => {
        const refApi: CharacterRef3D = {
            groupRef,
            playAnimation: () => { },
        };
        character.ref3D = refApi;
        return () => {
            character.ref3D = undefined;
        };
    }, [character]);

    useFrame(({ clock }) => {
        if (ringRef.current) {
            ringRef.current.rotation.y = clock.elapsedTime * 2.5;
            ringRef.current.position.y = 30 + Math.sin(clock.elapsedTime * 2) * 5;
        }
    });

    return (
        <group ref={groupRef} position={position}>
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

const BattleCharacter3DInnerMemo = React.memo(BattleCharacter3DInner, areEqual);

export const BattleCharacter3DWithSuspense: React.FC<BattleCharacter3DProps> = (props) => {
    
    return (
        <Suspense
            fallback={
                <BattleCharacterPlaceholder
                    character={props.character}
                    width={props.width}
                    position={props.position}
                />
            }
        >
            <BattleCharacter3DInnerMemo {...props} />
        </Suspense>
    );
};

export { BattleCharacter3DInner };

