/**
 * 3D 战斗主界面 - 替代 BattlePlayer 的 3D 版本
 */

import React, { useEffect, useState } from "react";
import { useCombatManager } from "../battle/service/CombatManager";
import { useCurrentTurnHandler } from "../battle/service/handler/hooks/useCurrentTurnHandler";
import useCombatActHandler from "../battle/service/handler/useCombatActHandler";
import { ReplayControls } from "../battle/view/ReplayControls";
import { ReplayScoreDisplay } from "../battle/view/ReplayScoreDisplay";
import { BattleCharacterRefsProvider } from "./BattleCharacterRefsContext";
import { BattleVenue3D } from "./BattleVenue3D";

const BattlePlayer3D: React.FC = () => {
    const { game, replay, mode } = useCombatManager();
    const { positionSelectionUI } = useCombatActHandler();
    useCurrentTurnHandler();
    console.log("BattlePlayer3D",game);
    const [currentEventIndex, setCurrentEventIndex] = useState(0);
    const [allEvents, setAllEvents] = useState<any[]>([]);

    useEffect(() => {
        if (mode === "replay" && replay?.state) {
            setCurrentEventIndex(replay.state.currentIndex || 0);
            if (replay && "getAllEvents" in replay && typeof replay.getAllEvents === "function") {
                setAllEvents(replay.getAllEvents());
            }
        }
    }, [mode, replay?.state?.currentIndex, replay]);

    if (!game) return null;

    return (
        <BattleCharacterRefsProvider>
            <BattleVenue3D />
            {positionSelectionUI}
            {mode === "replay" && <ReplayControls />}
            {mode === "replay" && game && allEvents.length > 0 && (
                <ReplayScoreDisplay
                    game={game}
                    events={allEvents}
                    currentEventIndex={currentEventIndex}
                />
            )}
        </BattleCharacterRefsProvider>
    );
};

export default BattlePlayer3D;
