/**
 * BattleCharacter3D - 战斗角色 3D 模型
 * 基于 MonsterCard3D 模式，支持 idle/walk/attack/hurt 动画
 */

import { Html, useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import gsap from "gsap";
import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { SkeletonUtils } from "three-stdlib";
import { DEBUG_USE_MONSTER_NAME } from "../../../config/debugConfig";
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
    /** 在角色身上显示技能名称淡入淡出（主动/被动技能） */
    showSkillName?: (skillName: string) => void;
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
    // ✅ 比较 HP/MP：applyStateChanges 原地修改 character.stats，需触发重渲染以更新 HP 条
    const hpCur = prev.character.stats?.hp?.current;
    const hpMax = prev.character.stats?.hp?.max;
    const nextHpCur = next.character.stats?.hp?.current;
    const nextHpMax = next.character.stats?.hp?.max;
    const hpEqual = hpCur === nextHpCur && hpMax === nextHpMax;
    return (
        prev.character === next.character &&
        posEqual &&
        hpEqual &&
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

    const [skillNameOverlay, setSkillNameOverlay] = useState<string | null>(null);
    const skillNameOverlayRef = useRef<HTMLDivElement | null>(null);
    const skillOverlayGroupRef = useRef<THREE.Group | null>(null);

    const showSkillName = useCallback((skillName: string) => {
        setSkillNameOverlay(skillName);
    }, []);

    const SKILL_NAME_BASE_Y = 48;
    const SKILL_NAME_DURATION = 1.0;
    useEffect(() => {
        if (!skillNameOverlay) return;
        const hideTimer = setTimeout(() => setSkillNameOverlay(null), SKILL_NAME_DURATION * 1000);
        const el = skillNameOverlayRef.current;
        const grp = skillOverlayGroupRef.current;
        if (el) {
            gsap.killTweensOf(el);
            gsap.set(el, { opacity: 0 });
            gsap.to(el, { opacity: 1, duration: 0.2, ease: "power2.out" });
            gsap.to(el, { opacity: 0, duration: 0.25, ease: "power2.in", delay: 0.5 });
        }
        if (grp) {
            gsap.killTweensOf(grp.position);
            grp.position.y = SKILL_NAME_BASE_Y;
            gsap.to(grp.position, { y: SKILL_NAME_BASE_Y + 40, duration: 0.25, ease: "power2.in", delay: 0.5 });
        }
        return () => {
            clearTimeout(hideTimer);
            if (el) gsap.killTweensOf(el);
            if (grp) gsap.killTweensOf(grp.position);
        };
    }, [skillNameOverlay]);

    useEffect(() => {
        if (!modelClone || names.length === 0) return;
        playAnimation("idle");
    }, [modelClone, names, playAnimation]);

    const refApi = useMemo<BattleCharacter3DRef>(
        () => ({
            groupRef,
            modelGroupRef,
            playAnimation,
            showSkillName,
        }),
        [playAnimation, showSkillName]
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
                {skillNameOverlay && (
                    <group ref={skillOverlayGroupRef} position={[0, SKILL_NAME_BASE_Y, 0]}>
                        <Html position={[0, 0, 0]} center style={{ pointerEvents: "none", overflow: "visible" }}>
                            <div
                                style={{
                                    fontSize: 11,
                                    color: "#ffffff",
                                    textAlign: "center",
                                    textShadow: "1px 1px 2px #000, 0 0 8px rgba(255,235,100,0.6)",
                                    whiteSpace: "nowrap",
                                    padding: "2px 6px",
                                    background: "rgba(0,0,0,0.5)",
                                    borderRadius: 4,
                                }}
                            >
                                <div
                                    ref={(el) => {
                                        (skillNameOverlayRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
                                    }}
                                >
                                    {skillNameOverlay}
                                </div>
                            </div>
                        </Html>
                    </group>
                )}
            </group>
        </group>
    );
};

// ============================================================
// 调试模式：仅显示角色名称（不加载 GLB）
// ============================================================

/** Html 名字样式：根据 currentAnim 返回动画态样式 */
function getAnimStyle(currentAnim: BattleAnimationState | null): React.CSSProperties {
    switch (currentAnim) {
        case "attack":
            return {
                color: "#ffffff",
                textShadow: "0 0 10px rgba(255,235,100,0.9)",
                transform: "scale(1.08)",
            };
        case "hurt":
            return {
                color: "#ff6666",
                textShadow: "0 0 6px rgba(255,80,80,0.8)",
                transition: "color 0.15s",
            };
        case "stand":
        case "idle":
        case "walk":
        default:
            return {
                color: "#ffffff",
                textShadow: "1px 1px 2px #000, -1px -1px 2px #000",
                transform: "scale(1)",
            };
    }
}

const BattleCharacterNameOnly: React.FC<BattleCharacter3DProps> = ({
    character,
    position,
    width,
    facing = 1,
    isPortrait = false,
    isActive = false,
    onRefReady,
}) => {
    const groupRef = useRef<THREE.Group>(null);
    const activeRingRef = useRef<THREE.Mesh>(null);
    const [currentAnim, setCurrentAnim] = useState<BattleAnimationState | null>(null);
    const [skillNameOverlay, setSkillNameOverlay] = useState<string | null>(null);
    const skillNameOverlayRef = useRef<HTMLDivElement | null>(null);
    const skillOverlayGroupRef = useRef<THREE.Group | null>(null);

    const showSkillName = useCallback((skillName: string) => {
        setSkillNameOverlay(skillName);
    }, []);

    const SKILL_NAME_BASE_Y = 48;
    const SKILL_NAME_DURATION = 1.0;
    useEffect(() => {
        if (!skillNameOverlay) return;
        const hideTimer = setTimeout(() => setSkillNameOverlay(null), SKILL_NAME_DURATION * 1000);
        const el = skillNameOverlayRef.current;
        const grp = skillOverlayGroupRef.current;
        if (el) {
            gsap.killTweensOf(el);
            gsap.set(el, { opacity: 0 });
            gsap.to(el, { opacity: 1, duration: 0.2, ease: "power2.out" });
            gsap.to(el, { opacity: 0, duration: 0.25, ease: "power2.in", delay: 0.5 });
        }
        if (grp) {
            gsap.killTweensOf(grp.position);
            grp.position.y = SKILL_NAME_BASE_Y;
            gsap.to(grp.position, { y: SKILL_NAME_BASE_Y + 40, duration: 0.25, ease: "power2.in", delay: 0.5 });
        }
        return () => {
            clearTimeout(hideTimer);
            if (el) gsap.killTweensOf(el);
            if (grp) gsap.killTweensOf(grp.position);
        };
    }, [skillNameOverlay]);

    const playAnimation = useCallback((name: BattleAnimationState) => {
        const group = groupRef.current;
        if (!group) return;

        setCurrentAnim(name);
        gsap.killTweensOf(group.scale);

        switch (name) {
            case "attack":
                gsap
                    .timeline()
                    .to(group.scale, {
                        x: 1.15,
                        y: 1.15,
                        z: 1.15,
                        duration: 0.2,
                        ease: "power2.out",
                    })
                    .to(group.scale, {
                        x: 1,
                        y: 1,
                        z: 1,
                        duration: 0.2,
                        ease: "power2.in",
                    })
                    .call(() => setCurrentAnim("stand"));
                break;
            case "hurt":
                gsap
                    .timeline()
                    .to(group.scale, {
                        x: 0.88,
                        y: 0.88,
                        z: 0.88,
                        duration: 0.15,
                        ease: "power2.in",
                    })
                    .to(group.scale, {
                        x: 1,
                        y: 1,
                        z: 1,
                        duration: 0.2,
                        ease: "back.out(1.2)",
                    })
                    .call(() => setCurrentAnim("stand"));
                break;
            case "stand":
            case "idle":
                gsap.set(group.scale, { x: 1, y: 1, z: 1 });
                setCurrentAnim(null);
                break;
            case "walk":
                // no-op
                break;
        }
    }, []);

    const refApi = useMemo<BattleCharacter3DRef>(
        () => ({ groupRef, modelGroupRef: groupRef, playAnimation, showSkillName }),
        [playAnimation, showSkillName]
    );

    useEffect(() => {
        if (groupRef.current) {
            character.ref3D = refApi as CharacterRef3D;
            onRefReady?.(refApi);
        }
        return () => {
            character.ref3D = undefined;
            if (groupRef.current) {
                gsap.killTweensOf(groupRef.current.scale);
            }
        };
    }, [character, onRefReady, refApi]);

    useFrame(({ clock }) => {
        if (activeRingRef.current && isActive) {
            const pulse = 1 + Math.sin(clock.elapsedTime * 3) * 0.12;
            activeRingRef.current.scale.set(pulse, pulse, 1);
            activeRingRef.current.rotation.z = clock.elapsedTime * 0.5;
        }
    });

    const hpPercent = character.stats?.hp
        ? (character.stats.hp.current / character.stats.hp.max) * 100
        : 100;
    const attackRangeLabel = useMemo(() => {
        const { attackRange } = resolveAttackProfile(character);
        return attackRange;
    }, [character]);

    const baseNameStyle: React.CSSProperties = {
        fontSize: Math.round(width * 0.15),
        textAlign: "center",
        whiteSpace: "nowrap",
    };

    const upperRotation: [number, number, number] = isPortrait
        ? [0, 0, facing >= 0 ? BODY_TILT_Z_PORTRAIT : -BODY_TILT_Z_PORTRAIT]
        : [0, 0, 0];

    return (
        <group ref={groupRef} position={position}>
            <group>
                <mesh position={[0, 4, 0]} renderOrder={2}>
                    <cylinderGeometry args={[width * 0.25, width * 0.3, 6, 6]} />
                    <meshStandardMaterial
                        color={character.uid === "boss" ? "#e91e63" : "#2196F3"}
                        metalness={0.3}
                        roughness={0.7}
                        polygonOffset
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
            <group rotation={upperRotation}>
                <Html position={[0, 10, 0]} center style={{ pointerEvents: "none" }}>
                    <div style={{ ...baseNameStyle, ...getAnimStyle(currentAnim) }}>
                        {character.name}
                    </div>
                </Html>
                {skillNameOverlay && (
                    <group ref={skillOverlayGroupRef} position={[0, SKILL_NAME_BASE_Y, 0]}>
                        <Html position={[0, 0, 0]} center style={{ pointerEvents: "none", overflow: "visible" }}>
                            <div
                                style={{
                                    fontSize: 11,
                                    color: "#ffffff",
                                    textAlign: "center",
                                    textShadow: "1px 1px 2px #000, 0 0 8px rgba(255,235,100,0.6)",
                                    whiteSpace: "nowrap",
                                    padding: "2px 6px",
                                    background: "rgba(0,0,0,0.5)",
                                    borderRadius: 4,
                                }}
                            >
                                <div
                                    ref={(el) => {
                                        (skillNameOverlayRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
                                    }}
                                >
                                    {skillNameOverlay}
                                </div>
                            </div>
                        </Html>
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

const BattleCharacter3DWithSuspense: React.FC<BattleCharacter3DProps> = (props) => {
    if (DEBUG_USE_MONSTER_NAME) {
        return <BattleCharacterNameOnly {...props} />;
    }
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

export { BattleCharacter3DInner, BattleCharacter3DWithSuspense };

