/**
 * 重播运行时：useGameReplay 仅在此 Provider 内挂载一次，通过 useReplay() 共享（与 CombatManager 解耦）。
 */
import React, { createContext, useContext, useMemo, type ReactNode } from "react";
import { useGameReplay } from "../hooks/useGameReplay";
import type { GameMode, ReplayControls } from "../../types/CombatTypes";

const ReplayContext = createContext<ReplayControls | undefined>(undefined);

export function ReplayProvider({
    gameId,
    mode,
    children,
}: {
    gameId: string | null;
    mode: GameMode;
    children: ReactNode;
}) {
    const replay = useGameReplay(gameId, mode);
    const value = useMemo((): ReplayControls | undefined => {
        if (mode !== "replay") return undefined;
        return {
            play: replay.play,
            pause: replay.pause,
            stop: replay.stop,
            seekTo: replay.seekTo,
            seekToIndex: replay.seekToIndex,
            setSpeed: replay.setSpeed,
            state: replay.replayState,
            getAllEvents: replay.getAllEvents,
            setOnEventProcessed: replay.setOnEventProcessed,
        };
    }, [
        mode,
        replay.play,
        replay.pause,
        replay.stop,
        replay.seekTo,
        replay.seekToIndex,
        replay.setSpeed,
        replay.replayState,
        replay.getAllEvents,
        replay.setOnEventProcessed,
    ]);
    return <ReplayContext.Provider value={value}>{children}</ReplayContext.Provider>;
}

export function useReplay(): ReplayControls | undefined {
    return useContext(ReplayContext);
}
