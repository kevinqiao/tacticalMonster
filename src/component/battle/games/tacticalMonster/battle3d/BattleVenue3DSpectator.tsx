/**
 * 观战 / 重播 3D 战场：useWatchOrReplay 驱动事件流，initialPhaseChanges 与 ingest 协调；无本地战斗操作。
 * 重播 overlay：ReplayControls、ReplayScoreDisplay（replay 来自 replayContext）。
 */

import React, { useCallback } from "react";
import { ReplayControls } from "../battle/view/ReplayControls";
import { ReplayScoreDisplay } from "../battle/view/ReplayScoreDisplay";
import { useCombatManager } from "../service/CombatManager";
import { useBattleGridState } from "./handler/useBattleGridState";
import { usePhaseChangeEventHandler } from "./handler/usePhaseChangeEventHandler";
import { usePhaseChangesHandler3D } from "./handler/usePhaseChangesHandler3D";
import useWatchOrReplay from "./handler/useWatchOrReplay";
import { useBattleVenueCameraLayout } from "./hooks/useBattleVenueCameraLayout";
import { useBattleVenueModelLoading } from "./hooks/useBattleVenueModelLoading";
import { useBattleVenuePedagogy } from "./hooks/useBattleVenuePedagogy";
import { useInitialPhaseChangesSpectatorBootstrap } from "./hooks/useInitialPhaseChangesSpectatorBootstrap";
import { BattleVenue3DScene } from "./view/BattleVenue3DScene";
import { SkillPanel } from "./view/skill/SkillPanel";

const noopAsync = async () => { };

export const BattleVenue3DSpectator: React.FC = () => {
    const {
        game,
        mode,
        characters,
        groundCells: contextGroundCells,
        initialPhaseChanges,
        initialPhaseChangesGate,
        mapDimension,
    } = useCombatManager();
    const gridState = useBattleGridState();

    const { eventQueueRef } = useWatchOrReplay({ gridState });

    usePhaseChangeEventHandler();

    const pedagogy = useBattleVenuePedagogy({ gridState });

    const { handlePhaseChanges } = usePhaseChangesHandler3D(gridState);

    useInitialPhaseChangesSpectatorBootstrap({
        game,
        initialPhaseChanges,
        initialPhaseChangesGate,
        mode,
        characters,
        contextGroundCells,
        mapDimension,
        handlePhaseChanges,
        eventQueueRef,
    });

    const { onModelLoaded, handleProgress } = useBattleVenueModelLoading();

    const {
        isPortrait,
        cameraPosition,
        cameraTarget,
        minDistance,
        maxDistance,
        orthoZoom,
        cameraUp,
        mapContainerStyle,
    } = useBattleVenueCameraLayout();

    const getCellState = useCallback(
        (q: number, r: number) => gridState.getCellState(q, r),
        [gridState]
    );

    return (
        <>
            <BattleVenue3DScene
                skillError={null}
                pedagogy={pedagogy}
                gridState={gridState}
                mapDimension={mapDimension}
                isPortrait={isPortrait}
                cameraPosition={cameraPosition}
                cameraTarget={cameraTarget}
                minDistance={minDistance}
                maxDistance={maxDistance}
                orthoZoom={orthoZoom}
                cameraUp={cameraUp}
                mapContainerStyle={mapContainerStyle}
                onModelLoaded={onModelLoaded}
                handleProgress={handleProgress}
                getCellState={getCellState}
                pedagogyAttackTargetPulseBoost={false}
                skillPanel={
                    <SkillPanel
                        selectSkill={noopAsync}
                        useSkill={noopAsync}
                        surrender={close ?? (() => { })}
                        defend={() => { }}
                        clearGrid={() => gridState.clearAll()}
                        onPedagogyNotify={pedagogy.notifyPedagogyGuide}
                    />
                }
            />
            <ReplayControls />
            <ReplayScoreDisplay />
        </>
    );
};
