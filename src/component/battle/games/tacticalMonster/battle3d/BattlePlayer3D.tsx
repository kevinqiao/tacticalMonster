/**
 * 3D 战斗主界面 - 替代 BattlePlayer 的 3D 版本
 * 事件处理、操作面板与位置选择 UI 由 BattleVenue3D 内 useEventHandler3D / useCombatActHandler3D 驱动
 * 回合 UI 显示由 initialPhaseChanges → handlePhaseChanges 统一处理
 */

import React, { useEffect, useState } from "react";
import { ReplayControls } from "../battle/view/ReplayControls";
import { ReplayScoreDisplay } from "../battle/view/ReplayScoreDisplay";
import { useCombatManager } from "../service/CombatManager";
import { BattleVenue3D } from "./BattleVenue3D";
import GameOver from "./view/gameover/GameOver";

const BattlePlayer3D: React.FC = () => {
    const { game, replay, mode, phaseChangeEvent } = useCombatManager();
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
        <>
            <BattleVenue3D />
            {mode === "replay" && <ReplayControls />}
            {mode === "replay" && game && allEvents.length > 0 && (
                <ReplayScoreDisplay
                    game={game}
                    events={allEvents}
                    currentEventIndex={currentEventIndex}
                />
            )}
            {phaseChangeEvent?.name === "gameOver" && <GameOver />}
        </>
    );
};

export default BattlePlayer3D;
