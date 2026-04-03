import { useEffect, type MutableRefObject } from "react";
import type { GameModel, GameMode, ReplayControls } from "../../types/CombatTypes";
import type { PhaseChanges } from "../../types/gameTypes";

export function useInitialPhaseChangesBootstrap({
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
    replay: ReplayControls | null | undefined;
}): void {
    useEffect(() => {
        if (
            game &&
            initialPhaseChanges &&
            !initialPhaseChangesGate.isProcessed() &&
            characters &&
            characters.length > 0 &&
            contextGroundCells &&
            mapDimension
        ) {
            if (mode === "play") {
                const timer = setTimeout(() => {
                    initialPhaseChangesGate.markProcessed();
                    console.log("[BattleVenue3D] 处理 initialPhaseChanges (play):", initialPhaseChanges);
                    handlePhaseChanges(initialPhaseChanges).catch((error: unknown) => {
                        console.error("[BattleVenue3D] Error handling initial phaseChanges:", error);
                    });
                }, 500);
                return () => clearTimeout(timer);
            } else if (mode === "watch" || mode === "replay") {
                const timer = setTimeout(() => {
                    if (mode === "watch") {
                        if (eventQueueRef.current.length === 0) {
                            initialPhaseChangesGate.markProcessed();
                            handlePhaseChanges(initialPhaseChanges).catch((error: unknown) => {
                                console.error("[BattleVenue3D] Error handling initial phaseChanges (watch):", error);
                            });
                        }
                    } else if (mode === "replay") {
                        if (replay && replay.getAllEvents && replay.getAllEvents().length === 0) {
                            initialPhaseChangesGate.markProcessed();
                            handlePhaseChanges(initialPhaseChanges).catch((error: unknown) => {
                                console.error("[BattleVenue3D] Error handling initial phaseChanges (replay):", error);
                            });
                        }
                    }
                }, 1000);
                return () => clearTimeout(timer);
            }
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
