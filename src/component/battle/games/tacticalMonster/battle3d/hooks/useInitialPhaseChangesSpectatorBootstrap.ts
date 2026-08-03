import { useEffect, type MutableRefObject } from "react";
import { useReplay } from "../../battle/view/replayContext";
import type { GameModel, GameMode } from "../../types/CombatTypes";
import type { PhaseChanges } from "../../types/gameTypes";

/**
 * 观战 / 重播：与 ingest 协调，仅在事件队列仍为空（或重播无事件）时应用 loadGame 的 initialPhaseChanges。
 */
export function useInitialPhaseChangesSpectatorBootstrap({
    game,
    initialPhaseChanges,
    initialPhaseChangesGate,
    mode,
    characters,
    contextGroundCells,
    mapDimension,
    handlePhaseChanges,
    eventQueueRef,
}: {
    game: GameModel | null | undefined;
    initialPhaseChanges: PhaseChanges | undefined;
    initialPhaseChangesGate: { markProcessed: () => void; isProcessed: () => boolean };
    mode: GameMode | undefined;
    characters: unknown[] | null | undefined;
    contextGroundCells: unknown;
    mapDimension: unknown;
    handlePhaseChanges: (pc: PhaseChanges) => Promise<void>;
    eventQueueRef: MutableRefObject<unknown[]>;
}): void {
    const replay = useReplay();
    useEffect(() => {
        if (
            game &&
            initialPhaseChanges &&
            !initialPhaseChangesGate.isProcessed() &&
            characters &&
            characters.length > 0 &&
            contextGroundCells &&
            mapDimension &&
            (mode === "watch" || mode === "replay")
        ) {
            const timer = setTimeout(() => {
                if (mode === "watch") {
                    if (eventQueueRef.current.length === 0) {
                        initialPhaseChangesGate.markProcessed();
                        console.log("[BattleVenue3DSpectator] 处理 initialPhaseChanges (watch):", initialPhaseChanges);
                        handlePhaseChanges(initialPhaseChanges).catch((error: unknown) => {
                            console.error("[BattleVenue3DSpectator] Error handling initial phaseChanges (watch):", error);
                        });
                    }
                } else if (mode === "replay") {
                    if (replay && replay.getAllEvents && replay.getAllEvents().length === 0) {
                        initialPhaseChangesGate.markProcessed();
                        console.log("[BattleVenue3DSpectator] 处理 initialPhaseChanges (replay):", initialPhaseChanges);
                        handlePhaseChanges(initialPhaseChanges).catch((error: unknown) => {
                            console.error("[BattleVenue3DSpectator] Error handling initial phaseChanges (replay):", error);
                        });
                    }
                }
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [
        game,
        initialPhaseChanges,
        mode,
        characters,
        contextGroundCells,
        mapDimension,
        handlePhaseChanges,
        initialPhaseChangesGate,
        eventQueueRef,
        replay,
    ]);
}
