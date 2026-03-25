/**
 * 3D 战斗场景 - 与 TeamLayout3D 相同方式使用 useMapDimension，无 placePosition
 */

import { CharacterGrid3D } from "@/component/battle/games/tacticalMonster/battle3d/view/CharacterGrid3D";
import { GridGround3D } from "@/component/battle/games/tacticalMonster/battle3d/view/GridGround3D";
import { GridHighlight3D } from "@/component/battle/games/tacticalMonster/battle3d/view/GridHighlight3D";
import { ObstacleGrid3D } from "@/component/battle/games/tacticalMonster/battle3d/view/ObstacleGrid3D";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useUserManager } from "service/UserManager";
import { getStageRuleConfig } from "../config/stageRuleConfigs";
import type { MonsterSprite } from "../types/CombatTypes";
import {
    getDynamicPedagogyGuideText,
    phaseLabel,
} from "../utils/pedagogyDynamicGuide";
import { resolveAttackProfile } from "../utils/skillRangeUtils";
import { MONSTER_CONFIGS_MAP } from "../config/monsterConfigs";
import { SKILL_CONFIGS } from "../config/skillConfigs";
import { useCombatManager } from "../service/CombatManager";
import { filterSkillIdsForPedagogy } from "../utils/pedagogySkillFilter";
import { canPerformAction } from "../utils/validationUtils";
import { BattleLoadingContext } from "./BattleLoadingContext";
import { useBattleGridState, type BattleCellState } from "./handler/useBattleGridState";
import useCombatActHandler3D from "./handler/useCombatActHandler3D";
import useEventHandler3D from "./handler/useEventHandler3D";
import { usePhaseChangesHandler3D } from "./handler/usePhaseChangesHandler3D";
import "./style.css";
import { BattleMapDimension, getGridCenter3D, getGridExtent3D } from "./utils/coordinate3DUtils";
import { getAllMonsterGlbPaths } from "./utils/modelPathMapper";
import { usePedagogyGuideFlow } from "./hooks/usePedagogyGuideFlow";
import { TurnOrderBar } from "./view/turnbar/TurnOrderBar";

const CAMERA_CONFIG = {
    mode: "spherical" as const,
    distance: 600,
    azimuth: -1.09,
    polar: 41.69,
    fov: 35,
    near: 0.1,
    far: 5000,
};

const sphericalToPosition = (
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

const CanvasWithControls: React.FC<{
    cameraPosition: [number, number, number];
    target: [number, number, number];
    mapDimension: BattleMapDimension | null;
    minDistance: number;
    maxDistance: number;
    onProgress: (progress: number) => void;
    onModelLoaded: (monsterId: string) => void;
    isPortrait: boolean;
    orthoZoom: number;
    cameraUp?: [number, number, number];
    getCellState?: (q: number, r: number) => BattleCellState;
    getWalkableDistance?: (q: number, r: number) => number | undefined;
    getWalkableMoveRange?: () => number | undefined;
    onCellClick?: (logicQ: number, logicR: number) => void;
}> = ({ cameraPosition, target, mapDimension, minDistance, maxDistance, onProgress, onModelLoaded, isPortrait, orthoZoom, cameraUp, getCellState, getWalkableDistance, getWalkableMoveRange, onCellClick }) => {
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

/**
 * 技能面板 - 显示当前角色的主动技能，支持选择技能并执行
 * 使用本地乐观状态：点击技能后立即显示选中与「使用」按钮，不等待后端 skillSelect 推送
 */
const SkillPanel: React.FC<{
    selectSkill: (skill: import("../types/skillTypes").MonsterSkill) => void | Promise<void>;
    useSkill: (skillId: string, target?: import("../types/CombatTypes").MonsterSprite) => Promise<void>;
    surrender: () => void;
    defend: () => void;
    clearGrid: () => void;
}> = ({ selectSkill, useSkill, surrender, defend, clearGrid }) => {
    const { game, mode, characters } = useCombatManager();
    const validation = canPerformAction(mode ?? "play", game, characters);
    const { can, currentTurn, character } = validation;

    const [localSelectedSkillId, setLocalSelectedSkillId] = useState<string | null>(null);
    const turnKey = `${currentTurn?.uid ?? ""}-${currentTurn?.character_id ?? ""}-${game?.currentRound?.no ?? 0}`;

    useEffect(() => {
        setLocalSelectedSkillId(null);
    }, [turnKey]);

    const selectedSkillId = localSelectedSkillId ?? currentTurn?.skillSelect ?? null;
    const selectedSkill = selectedSkillId ? SKILL_CONFIGS[selectedSkillId] : null;
    const isNoTargetSkill =
        selectedSkill?.effects?.some(
            (e: any) => e.type === "summon" && e.summonConfig?.position_mode === "caster_adjacent"
        ) ?? false;

    const rawSkillIds =
        character?.skills?.length
            ? character.skills
            : (character as any)?.unlockSkills?.length
                ? (character as any).unlockSkills
                : (character as any)?.monsterId
                    ? (MONSTER_CONFIGS_MAP[(character as any).monsterId]?.skillIds ?? ["basic_attack"])
                    : ["basic_attack"];
    const ruleKey = (game as { ruleId?: string; stageId?: string })?.ruleId ?? game?.stageId;
    const skillIds = filterSkillIdsForPedagogy(ruleKey, Array.isArray(rawSkillIds) ? rawSkillIds : ["basic_attack"]);
    const activeSkills = (Array.isArray(skillIds) ? skillIds : [])
        .map((id: string) => ({ id, skill: SKILL_CONFIGS[id] }))
        .filter(({ skill }: { skill: any }) => skill && (skill.type === "active" || skill.type === "master" || skill.type === "ultimate"));

    const mp = (character as any)?.stats?.mp?.current ?? 100;
    const energy = (character as any)?.stats?.energy?.current ?? 0;
    const energyMax = (character as any)?.stats?.energy?.max ?? 100;
    const cooldowns = (character as any)?.skillCooldowns ?? {};
    const charLevel = (character as { level?: number })?.level ?? 1;

    if (mode === "watch" || mode === "replay") {
        return (
            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 4 }}>
                <div className="action-panel-item" onClick={() => surrender()}>GAME OVER</div>
            </div>
        );
    }
    if (!can) {
        return (
            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 4, fontSize: 12, color: "rgba(255,255,255,0.8)" }}>
                <span>{validation.reason ?? "等待回合..."}</span>
                <div className="action-panel-item" onClick={() => surrender()}>GAME OVER</div>
            </div>
        );
    }

    const handleSkillClick = async (skill: any) => {
        setLocalSelectedSkillId(skill.id);
        await Promise.resolve(selectSkill(skill));
    };

    const handleUseNoTarget = () => {
        if (!selectedSkillId || !isNoTargetSkill) return;
        const cooldown = cooldowns[selectedSkillId] ?? 0;
        const mpCost = selectedSkill?.resource_cost?.mp ?? 0;
        const reqLevel = selectedSkill?.unlockConditions?.level;
        const levelLocked = reqLevel != null && charLevel < reqLevel;
        if (levelLocked || cooldown > 0 || mp < mpCost) return; // 等级/冷却/MP 不足时不再发起请求
        setLocalSelectedSkillId(null);
        clearGrid();
        useSkill(selectedSkillId).catch((err: any) => console.error("[SkillPanel] useSkill error:", err));
    };

    return (
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center", gap: 4 }}>
            {energyMax > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginRight: 4 }}>
                    <span style={{ fontSize: 11 }}>能量</span>
                    <div style={{ width: 60, height: 8, background: "#333", borderRadius: 4, overflow: "hidden" }}>
                        <div
                            style={{
                                width: `${Math.min(100, (energy / energyMax) * 100)}%`,
                                height: "100%",
                                background: "linear-gradient(90deg, #ffd700, #ff8c00)",
                                transition: "width 0.2s",
                            }}
                        />
                    </div>
                    <span style={{ fontSize: 10 }}>{energy}/{energyMax}</span>
                </div>
            )}
            {activeSkills.map(({ id, skill }: { id: string; skill: any }) => {
                const cooldown = cooldowns[id] ?? 0;
                const mpCost = skill.resource_cost?.mp ?? 0;
                const energyCost = skill.resource_cost?.energy ?? 0;
                const requiredLevel = skill.unlockConditions?.level;
                const levelLocked = requiredLevel != null && charLevel < requiredLevel;
                const disabled = levelLocked || cooldown > 0 || (mpCost > 0 && mp < mpCost) || (energyCost > 0 && energy < energyCost);
                const isSelected = selectedSkillId === id;
                const titleParts = [skill.name];
                if (levelLocked) titleParts.push(`需要等级 ${requiredLevel}`);
                if (cooldown > 0) titleParts.push(`(冷却${cooldown})`);
                if (energyCost > 0) titleParts.push(`消耗能量${energyCost}`);
                return (
                    <div
                        key={id}
                        className={`action-panel-item ${isSelected ? "action-panel-item--selected" : ""}`}
                        style={{
                            opacity: disabled ? 0.6 : 1,
                            pointerEvents: disabled ? "none" : "auto",
                            border: isSelected ? "2px solid #fff" : undefined,
                        }}
                        onClick={() => !disabled && handleSkillClick(skill)}
                        title={titleParts.join(" ")}
                    >
                        {skill.name}
                        {cooldown > 0 && <span style={{ fontSize: 10, marginLeft: 2 }}>CD{cooldown}</span>}
                    </div>
                );
            })}
            {isNoTargetSkill && (() => {
                const cd = cooldowns[selectedSkillId ?? ""] ?? 0;
                const cost = selectedSkill?.resource_cost?.mp ?? 0;
                const reqLvl = selectedSkill?.unlockConditions?.level;
                const lvlLocked = reqLvl != null && charLevel < reqLvl;
                const useDisabled = lvlLocked || cd > 0 || mp < cost;
                return (
                    <div
                        className="action-panel-item"
                        style={{
                            backgroundColor: "rgb(34, 139, 34)",
                            border: "2px solid #fff",
                            opacity: useDisabled ? 0.6 : 1,
                            pointerEvents: useDisabled ? "none" : "auto",
                        }}
                        onClick={handleUseNoTarget}
                        title={useDisabled ? (lvlLocked ? `需要等级 ${reqLvl}` : cd > 0 ? `技能冷却中，剩余 ${cd} 回合` : "MP 不足") : "使用"}
                    >
                        使用
                    </div>
                );
            })()}
            <div
                className="action-panel-item"
                onClick={() => {
                    clearGrid();
                    defend();
                }}
                style={{ backgroundColor: "rgb(70, 130, 180)" }}
                title="防守"
            >
                防守
            </div>
            <div className="action-panel-item" onClick={() => surrender()}>
                GAME OVER
            </div>
        </div>
    );
};

/** 3D 战斗场景。mapDimension、containerRef 从 CombatManager context 获取（CombatManager 内 useMapDimension 测量包装容器）。 */
export const BattleVenue3D: React.FC = () => {
    const { user } = useUserManager();
    const {
        game,
        mode,
        characters,
        groundCells: contextGroundCells,
        initialPhaseChanges,
        initialPhaseChangesGate,
        replay,
        eventQueue,
        mapDimension,
    } = useCombatManager();
    const gridState = useBattleGridState();
    const [skillError, setSkillError] = useState<string | null>(null);
    const skillErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleSkillErrorToast = useCallback((message: string) => {
        setSkillError(message);
        if (skillErrorTimerRef.current) clearTimeout(skillErrorTimerRef.current);
        skillErrorTimerRef.current = setTimeout(() => {
            setSkillError(null);
            skillErrorTimerRef.current = null;
        }, 3500);
    }, []);

    useEffect(() => () => {
        if (skillErrorTimerRef.current) clearTimeout(skillErrorTimerRef.current);
    }, []);

    useEventHandler3D({ gridState, mapDimension });

    const { surrender, defend, walk, attack, selectSkill, useSkill } = useCombatActHandler3D({
        gridState,
        mapDimension,
        onSkillError: handleSkillErrorToast,
    });

    const ruleKeyForPedagogy = (game as { ruleId?: string; stageId?: string })?.ruleId ?? game?.stageId;
    const pedagogyHint = useMemo(() => {
        const rid = game?.ruleId ?? game?.stageId;
        if (!rid || mode !== "play") return null;
        return getStageRuleConfig(rid)?.pedagogy;
    }, [game?.ruleId, game?.stageId, game?.gameId, mode]);

    const {
        bannerActive: guideBannerActive,
        currentStep: guideCurrentStep,
        notify: notifyPedagogyGuide,
        skip: skipPedagogyGuide,
        stepIndex: guideStepIndex,
        totalSteps: guideTotalSteps,
        isDynamicGuide,
    } = usePedagogyGuideFlow({
        mode,
        uid: user?.uid,
        ruleId: ruleKeyForPedagogy,
        gameId: game?.gameId,
        steps: pedagogyHint?.guideFlow,
        dynamicGuide: pedagogyHint?.dynamicGuide,
        completionSkillId: pedagogyHint?.allowedSkillIds?.[0],
    });

    const dynamicGuidePayload = useMemo(() => {
        if (!pedagogyHint?.dynamicGuide || !ruleKeyForPedagogy) return null;
        return getDynamicPedagogyGuideText(ruleKeyForPedagogy, game, characters, gridState.cellStates);
    }, [pedagogyHint?.dynamicGuide, ruleKeyForPedagogy, game, characters, gridState.cellStates]);

    const showPedagogyGuidePanel =
        guideBannerActive &&
        (isDynamicGuide ? !!dynamicGuidePayload : !!guideCurrentStep);

    /** 动态引导会话中不叠一行 tutorialNotes（含 Boss 回合仅 guideBannerActive、无面板时） */
    const showPedagogyTutorialNotesStrip =
        !!pedagogyHint &&
        !showPedagogyGuidePanel &&
        !(pedagogyHint.dynamicGuide && guideBannerActive);

    // 格子点击：参数为逻辑坐标 (logicQ, logicR)，所见即所点
    const handleCellClick = useCallback(
        (logicQ: number, logicR: number) => {
            if (!mapDimension || mode !== "play") return;
            const effectiveGame = game;
            const validation = canPerformAction(mode, effectiveGame, characters);
            if (!validation.can || !validation.character) {
                gridState.clearAll();
                return;
            }
            const cellState = gridState.getCellState(logicQ, logicR);
            if (cellState === "walkable") {
                gridState.clearAll();
                walk({ q: logicQ, r: logicR })
                    .catch((err: any) => {
                        const message = String(err?.message ?? err ?? "");
                        const expectedDuringTransition =
                            message.includes("Walk action in progress") ||
                            message.includes("no active turn") ||
                            message.includes("turn changed before request") ||
                            message.includes("不是当前回合");
                        if (!expectedDuringTransition) {
                            console.error("[handleCellClick] walk error:", err);
                        }
                    });
            } else if (cellState === "attackable") {
                const enemy = characters?.find((c) => c.q === logicQ && c.r === logicR);
                if (enemy) {
                    const selectedSkillId = effectiveGame?.currentRound?.turns?.find((t: any) => t.status === 1)?.skillSelect;
                    const attacker = validation.character;
                    const attackSkillId = resolveAttackProfile(attacker as MonsterSprite).skillId;
                    if (selectedSkillId) {
                        gridState.clearAll();
                        useSkill(selectedSkillId, enemy)
                            .then(() => {
                                notifyPedagogyGuide({ type: "cast", skillId: selectedSkillId });
                            })
                            .catch((err: any) => console.error("[handleCellClick] useSkill error:", err));
                    } else {
                        attack(enemy)
                            .then(() => {
                                notifyPedagogyGuide({ type: "cast", skillId: attackSkillId });
                            })
                            .catch((err: any) => console.error("[handleCellClick] attack error:", err));
                    }
                }
            }
        },
        [mapDimension, mode, gridState, walk, attack, useSkill, characters, game, notifyPedagogyGuide]
    );

    // ✅ 3D 阶段变化处理器（用于 initialPhaseChanges）
    const { handlePhaseChanges } = usePhaseChangesHandler3D({ gridState, mapDimension });

    // ✅ 处理 initialPhaseChanges（从 CombatManager context 获取）
    // 注意：initialPhaseChangesGate.markProcessed 必须在 setTimeout 回调内部调用，
    // 避免因 React 重渲染取消 timer 后标记已被设置导致永远不再处理。
    useEffect(() => {
        if (
            game &&
            initialPhaseChanges &&
            !initialPhaseChangesGate.isProcessed() &&
            characters && characters.length > 0 &&
            contextGroundCells &&
            mapDimension
        ) {
            if (mode === 'play') {
                const timer = setTimeout(() => {
                    initialPhaseChangesGate.markProcessed();
                    console.log("[BattleVenue3D] 处理 initialPhaseChanges (play):", initialPhaseChanges);
                    handlePhaseChanges(initialPhaseChanges).catch((error) => {
                        console.error("[BattleVenue3D] Error handling initial phaseChanges:", error);
                    });
                }, 500);
                return () => clearTimeout(timer);
            } else if (mode === 'watch' || mode === 'replay') {
                const timer = setTimeout(() => {
                    if (mode === 'watch') {
                        if (eventQueue.length === 0) {
                            initialPhaseChangesGate.markProcessed();
                            handlePhaseChanges(initialPhaseChanges).catch((error) => {
                                console.error("[BattleVenue3D] Error handling initial phaseChanges (watch):", error);
                            });
                        }
                    } else if (mode === 'replay') {
                        if (replay && replay.getAllEvents && replay.getAllEvents().length === 0) {
                            initialPhaseChangesGate.markProcessed();
                            handlePhaseChanges(initialPhaseChanges).catch((error) => {
                                console.error("[BattleVenue3D] Error handling initial phaseChanges (replay):", error);
                            });
                        }
                    }
                }, 1000);
                return () => clearTimeout(timer);
            }
        }
    }, [game, initialPhaseChanges, mode, characters, contextGroundCells, mapDimension, handlePhaseChanges, initialPhaseChangesGate, eventQueue, replay]);

    useEffect(() => {
        getAllMonsterGlbPaths().forEach((path) => useGLTF.preload(path));
    }, []);

    const [loadedModelCount, setLoadedModelCount] = useState(0);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        setLoadedModelCount(0);
        if (!mapDimension) return;
        const count =
            (game?.team?.length ?? 0) + (game?.boss ? 1 + (game.boss.minions?.length ?? 0) : 0);
        if (count === 0) setIsLoaded(true);
        else setIsLoaded(false);
    }, [mapDimension, game?.gameId]);

    useEffect(() => {
        const count =
            (game?.team?.length ?? 0) + (game?.boss ? 1 + (game.boss.minions?.length ?? 0) : 0);
        if (count > 0 && loadedModelCount >= count) setIsLoaded(true);
    }, [loadedModelCount, game?.team, game?.boss]);

    const onModelLoaded = useCallback((_monsterId: string) => {
        setLoadedModelCount((c) => c + 1);
    }, []);

    const handleProgress = useCallback((progress: number) => {
        setLoadingProgress(progress);
    }, []);

    const isPortrait = mapDimension?.isPortrait ?? false;

    const { cameraPosition, cameraTarget, minDistance, maxDistance, orthoZoom, cameraUp } = useMemo(() => {
        let target: [number, number, number] =
            (mapDimension && getGridCenter3D(mapDimension)) ?? [0, 0, 0];

        let position: [number, number, number];
        let minDist = 550;
        let maxDist = 1500;
        let zoom = mapDimension?.zoom ?? 1;
        let up: [number, number, number] | undefined;

        if (mapDimension) {
            if (mapDimension.isPortrait) {
                position = [target[0], 2000, target[2]];
                up = [1, 0, 0];
                // camera.up=(1,0,0)：屏幕竖轴=world X，屏幕横轴=world Z
            } else {
                // 横屏：透视相机，用网格实际 XZ 范围计算距离，避免场景被裁剪
                target = [target[0], target[1], target[2]];
                const extent = getGridExtent3D(mapDimension);
                const fitWidth = extent?.extentX ?? mapDimension.width;
                const fitHeight = extent?.extentZ ?? mapDimension.height;
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



    // 竖屏时画布填满容器；横屏用 mapDimension 尺寸
    const mapContainerStyle: React.CSSProperties = useMemo(() => {
        if (!mapDimension) return {};
        // const offset = mapDimension?.isPortrait ? mapDimension.hexWidth / 4 : mapDimension.hexHeight / 2;
        return {
            position: "absolute",
            top: `calc(50% - ${mapDimension.topOffset ?? 0}px)`,
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: mapDimension?.width,
            height: mapDimension?.height,
            backgroundColor: "transparent",
        }
    }, [mapDimension]);

    return (
        <div
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
            }}
        >
            {showPedagogyGuidePanel && (
                <div
                    style={{
                        position: "absolute",
                        top: skillError ? 44 : 10,
                        left: "50%",
                        transform: "translateX(-50%)",
                        zIndex: 21,
                        maxWidth: "92%",
                        padding: "8px 12px",
                        borderRadius: 8,
                        background: "rgba(20, 60, 100, 0.92)",
                        color: "rgba(255,255,255,0.95)",
                        fontSize: 12,
                        lineHeight: 1.4,
                        textAlign: "center",
                        pointerEvents: "auto",
                        boxShadow: "0 2px 10px rgba(0,0,0,0.35)",
                    }}
                >
                    <div>
                        {isDynamicGuide && dynamicGuidePayload
                            ? dynamicGuidePayload.text
                            : guideCurrentStep?.text}
                    </div>
                    <div style={{ marginTop: 6, fontSize: 10, opacity: 0.85 }}>
                        {isDynamicGuide && dynamicGuidePayload
                            ? `当前阶段：${phaseLabel(dynamicGuidePayload.phase)}`
                            : `步骤 ${guideStepIndex != null ? guideStepIndex + 1 : 0}/${guideTotalSteps}`}
                    </div>
                    <button
                        type="button"
                        onClick={skipPedagogyGuide}
                        style={{
                            marginTop: 8,
                            padding: "4px 12px",
                            fontSize: 11,
                            borderRadius: 4,
                            border: "1px solid rgba(255,255,255,0.4)",
                            background: "rgba(0,0,0,0.25)",
                            color: "#fff",
                            cursor: "pointer",
                        }}
                    >
                        跳过引导
                    </button>
                </div>
            )}
            {showPedagogyTutorialNotesStrip &&
                (pedagogyHint.tutorialNotes || (pedagogyHint.loanMonsterIds && pedagogyHint.loanMonsterIds.length > 0)) && (
                <div
                    style={{
                        position: "absolute",
                        top: skillError ? 44 : 10,
                        left: "50%",
                        transform: "translateX(-50%)",
                        zIndex: 20,
                        maxWidth: "92%",
                        padding: "6px 10px",
                        borderRadius: 6,
                        background: "rgba(0,40,80,0.85)",
                        color: "rgba(255,255,255,0.95)",
                        fontSize: 11,
                        lineHeight: 1.35,
                        textAlign: "center",
                        pointerEvents: "none",
                    }}
                >
                    {pedagogyHint.tutorialNotes && <div>{pedagogyHint.tutorialNotes}</div>}
                    {pedagogyHint.loanMonsterIds && pedagogyHint.loanMonsterIds.length > 0 && (
                        <div style={{ marginTop: 4, opacity: 0.9 }}>
                            试用角色（编队接入后可自动上场）: {pedagogyHint.loanMonsterIds.join(", ")}
                        </div>
                    )}
                </div>
            )}
            {/* 技能失败提示 toast */}
            {skillError && (
                <div
                    style={{
                        position: "absolute",
                        top: 12,
                        left: "50%",
                        transform: "translateX(-50%)",
                        zIndex: 10,
                        padding: "8px 16px",
                        background: "rgba(180, 0, 0, 0.9)",
                        color: "#fff",
                        borderRadius: 8,
                        fontSize: 13,
                        maxWidth: "90%",
                        textAlign: "center",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                        pointerEvents: "none",
                    }}
                >
                    技能使用失败: {skillError}
                </div>
            )}
            {/* 背景层：竖屏时旋转 90 度，不影响坐标 */}
            <div
                style={{
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
                }}
            />

            <div style={{ ...mapContainerStyle, zIndex: 1 }}>
                {/* <LoadingScreen progress={progress} isLoaded={isLoaded} /> */}

                {mapDimension && (
                    <div style={{ width: "100%", height: "100%", backgroundColor: "transparent" }}>
                        <CanvasWithControls
                            cameraPosition={cameraPosition}
                            target={cameraTarget}
                            mapDimension={mapDimension}
                            minDistance={minDistance}
                            maxDistance={maxDistance}
                            onProgress={handleProgress}
                            onModelLoaded={onModelLoaded}
                            isPortrait={isPortrait}
                            orthoZoom={orthoZoom}
                            cameraUp={cameraUp}
                            getCellState={gridState.getCellState}
                            getWalkableDistance={gridState.getWalkableDistance}
                            getWalkableMoveRange={gridState.getWalkableMoveRange}
                            onCellClick={handleCellClick}
                        />
                    </div>
                )}



            </div>
            {/* 底部 UI：Grid 布局，TurnOrderBar 优先占位，SkillPanel 使用剩余空间，不重叠 */}
            <div
                style={{
                    position: "absolute",
                    bottom: 8,
                    left: 8,
                    right: 8,
                    zIndex: 2,
                    pointerEvents: "auto",
                    display: "grid",
                    gridTemplateColumns: "minmax(120px, 55%) minmax(160px, 1fr)",
                    gap: 12,
                    alignItems: "end",
                }}
            >
                <div style={{ minWidth: 0, overflow: "hidden" }}>
                    <TurnOrderBar />
                </div>
                <div
                    style={{
                        minWidth: 0,
                        display: "flex",
                        flexWrap: "wrap",
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "flex-end",
                        alignContent: "flex-end",
                        gap: 4,
                        background: "linear-gradient(transparent, rgba(0,0,0,0.7))",
                        padding: "4px 0 0 8px",
                    }}
                >
                    <SkillPanel
                        selectSkill={selectSkill}
                        useSkill={useSkill}
                        surrender={surrender}
                        defend={defend}
                        clearGrid={() => gridState.clearAll()}
                    />
                </div>
            </div>

        </div>
    );
};
