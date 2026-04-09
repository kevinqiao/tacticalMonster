/**
 * 游玩模式 3D 战场：本地操作、引导、技能、initialPhaseChanges（play）。
 */

import React from "react";
import { useCombatManager } from "../service/CombatManager";
import { useBattleGridState } from "./handler/useBattleGridState";
import useCombatActHandler3D from "./handler/useCombatActHandler3D";
import { usePhaseChangeEventHandler } from "./handler/usePhaseChangeEventHandler";
import { usePhaseChangesHandler3D } from "./handler/usePhaseChangesHandler3D";
import { useAutoDismissMessage } from "./hooks/useAutoDismissMessage";
import { useBattleVenueCameraLayout } from "./hooks/useBattleVenueCameraLayout";
import { useBattleVenueModelLoading } from "./hooks/useBattleVenueModelLoading";
import { useBattleVenuePedagogy } from "./hooks/useBattleVenuePedagogy";
import { useInitialPhaseChangesPlayBootstrap } from "./hooks/useInitialPhaseChangesPlayBootstrap";
import { BattleVenue3DScene } from "./view/BattleVenue3DScene";
import { SkillPanel } from "./view/skill/SkillPanel";

export const BattleVenue3DPlay: React.FC = () => {
    const { mapDimension } = useCombatManager();
    const gridState = useBattleGridState();
    const { message: skillError, show: handleSkillErrorToast } = useAutoDismissMessage(3500);

    usePhaseChangeEventHandler();

    const pedagogy = useBattleVenuePedagogy({ gridState });

    const { defend, selectSkill, useSkill, handleCellClick, surrender, standBy } = useCombatActHandler3D({
        gridState,
        onSkillError: handleSkillErrorToast,
        onPedagogyNotify: pedagogy.notifyPedagogyGuide,
        cellClickPedagogy: {
            enforceMoveStep: pedagogy.enforceMoveStep,
            enforceCastStep: pedagogy.enforceCastStep,
            enforceSkillSelectStepBoss2: pedagogy.enforceSkillSelectStepBoss2,
        },
    });

    const { handlePhaseChanges } = usePhaseChangesHandler3D(gridState);

    useInitialPhaseChangesPlayBootstrap({ handlePhaseChanges });

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

    return (
        <BattleVenue3DScene
            skillError={skillError}
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
            getCellState={pedagogy.getPedagogyCellState}
            onCellClick={handleCellClick}
            pedagogyAttackTargetPulseBoost={pedagogy.boss2CastTargetPulseBoost}
            skillPanel={
                <SkillPanel
                    selectSkill={selectSkill}
                    useSkill={useSkill}
                    surrender={surrender}
                    standby={standBy}
                    defend={defend}
                    clearGrid={() => gridState.clearAll()}
                    onPedagogyNotify={pedagogy.notifyPedagogyGuide}
                    hideDefend={pedagogy.hideDefendButton}
                    disableDefend={pedagogy.disableDefend}
                    tutorialLockSkillPanel={pedagogy.enforceMoveStep}
                    onTutorialSkillPanelBlocked={() =>
                        handleSkillErrorToast("请先移动到蓝色高亮格子")
                    }
                    onTutorialNudge={handleSkillErrorToast}
                    tutorialHighlightSkillId={pedagogy.tutorialSkillHighlight}
                    tutorialHintText={pedagogy.tutorialHintText}
                />
            }
        />
    );
};
