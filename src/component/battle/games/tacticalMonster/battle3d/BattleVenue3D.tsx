/**
 * 3D 战斗场景 - 与 TeamLayout3D 相同方式使用 useMapDimension，无 placePosition
 */

import React, { useMemo } from "react";
import { useUserManager } from "service/UserManager";
import { useCombatManager } from "../service/CombatManager";
import { getReplayPlaybackSpeed } from "../utils/replayPlaybackSpeed";
import {
    CanvasWithControls,
} from "./BattleCanvas3D";
import { useBattleGridState } from "./handler/useBattleGridState";
import useCombatActHandler3D from "./handler/useCombatActHandler3D";
import { usePhaseChangeEventHandler } from "./handler/usePhaseChangeEventHandler";
import { usePhaseChangesHandler3D } from "./handler/usePhaseChangesHandler3D";
import useWatchOrReplay from "./handler/useWatchOrReplay";
import { useAutoDismissMessage } from "./hooks/useAutoDismissMessage";
import { useBattleVenueCameraLayout } from "./hooks/useBattleVenueCameraLayout";
import { useBattleVenueCellClick } from "./hooks/useBattleVenueCellClick";
import { useBattleVenueModelLoading } from "./hooks/useBattleVenueModelLoading";
import { useBattleVenuePedagogy } from "./hooks/useBattleVenuePedagogy";
import { useInitialPhaseChangesBootstrap } from "./hooks/useInitialPhaseChangesBootstrap";
import "./style.css";
import { BattleVenuePedagogyOverlays } from "./view/BattleVenuePedagogyOverlays";
import GameOver from "./view/gameover/GameOver";
import { SkillPanel } from "./view/skill/SkillPanel";
import { computeTurnBarDimension } from "./view/turnbar/turnBarLayout";
import { TurnOrderBar } from "./view/turnbar/TurnOrderBar";

/** 3D 战斗场景。mapDimension、containerRef 从 CombatManager context 获取（CombatManager 内 useMapDimension 测量包装容器）。 */
export const BattleVenue3D: React.FC<{ close?: () => void }> = ({ close }) => {
    const { user } = useUserManager();
    const {
        game,
        mode,
        characters,
        groundCells: contextGroundCells,
        initialPhaseChanges,
        initialPhaseChangesGate,
        replay,
        mapDimension,
        phaseChangeEventQueueRef,
        initQueuedGameKeyRef,
        turnOrderBarSpriteRef,
    } = useCombatManager();
    const gridState = useBattleGridState();
    const { message: skillError, show: handleSkillErrorToast } = useAutoDismissMessage(3500);

    const { eventQueueRef } = useWatchOrReplay({ gridState, mapDimension });

    const playbackSpeed = getReplayPlaybackSpeed(replay);
    const turnBarDimension = useMemo(() => computeTurnBarDimension(mapDimension), [mapDimension]);
    usePhaseChangeEventHandler({
        dimension: turnBarDimension,
        turnOrderBarSpriteRef,
        playbackSpeed,
        phaseChangeEventQueueRef,
        initQueuedGameKeyRef,
        mode,
    });

    const pedagogy = useBattleVenuePedagogy({
        user,
        game,
        mode,
        characters,
        gridState,
    });

    const { defend, walk, attack, selectSkill, useSkill } = useCombatActHandler3D({
        gridState,
        mapDimension,
        onSkillError: handleSkillErrorToast,
        onPedagogyNotify: pedagogy.notifyPedagogyGuide,
    });

    const { handleCellClick } = useBattleVenueCellClick({
        mapDimension,
        mode,
        game,
        characters,
        gridState,
        walk,
        attack,
        useSkill,
        notifyPedagogyGuide: pedagogy.notifyPedagogyGuide,
        enforceMoveStep: pedagogy.enforceMoveStep,
        enforceCastStep: pedagogy.enforceCastStep,
        enforceSkillSelectStepBoss2: pedagogy.enforceSkillSelectStepBoss2,
        handleSkillErrorToast,
    });

    const { handlePhaseChanges } = usePhaseChangesHandler3D({ gridState, mapDimension });

    useInitialPhaseChangesBootstrap({
        game,
        initialPhaseChanges,
        initialPhaseChangesGate,
        mode,
        characters,
        contextGroundCells,
        mapDimension,
        handlePhaseChanges,
        eventQueueRef,
        replay,
    });

    const { onModelLoaded, handleProgress } = useBattleVenueModelLoading({ mapDimension, game });

    const {
        isPortrait,
        cameraPosition,
        cameraTarget,
        minDistance,
        maxDistance,
        orthoZoom,
        cameraUp,
        mapContainerStyle,
    } = useBattleVenueCameraLayout(mapDimension);

    return (
        <div
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
            }}
        >
            <BattleVenuePedagogyOverlays skillError={skillError} pedagogy={pedagogy} />
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
                            getCellState={pedagogy.getPedagogyCellState}
                            getWalkableDistance={gridState.getWalkableDistance}
                            getWalkableMoveRange={gridState.getWalkableMoveRange}
                            onCellClick={handleCellClick}
                            pedagogyAttackTargetPulseBoost={pedagogy.boss2CastTargetPulseBoost}
                        />
                    </div>
                )}
            </div>
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
                        surrender={close ?? (() => { })}
                        defend={defend}
                        clearGrid={() => gridState.clearAll()}
                        onPedagogyNotify={pedagogy.notifyPedagogyGuide}
                        disableDefend={pedagogy.isBronzeBoss1GuideSession || pedagogy.isBronzeBoss2GuideSession}
                        tutorialLockSkillPanel={pedagogy.enforceMoveStep}
                        onTutorialSkillPanelBlocked={() =>
                            handleSkillErrorToast("请先移动到蓝色高亮格子")
                        }
                        onTutorialNudge={handleSkillErrorToast}
                        tutorialHighlightSkillId={pedagogy.tutorialSkillHighlight}
                        tutorialHintText={pedagogy.tutorialHintText}
                    />
                </div>
            </div>
            <div style={{ position: "absolute", top: 0, right: 0, height: "100%", width: "100%", zIndex: 5, visibility: "hidden", opacity: 0 }}>
                <GameOver />
            </div>
        </div>
    );
};
