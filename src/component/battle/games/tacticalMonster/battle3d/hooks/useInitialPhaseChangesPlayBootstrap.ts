import { useEffect } from "react";
import { useCombatManager } from "../../service/CombatManager";
import type { PhaseChanges } from "../../types/gameTypes";

/** 仅游玩模式：loadGame 返回的 initialPhaseChanges 在场景就绪后应用一次 */
export function useInitialPhaseChangesPlayBootstrap({
    handlePhaseChanges,
}: {
    handlePhaseChanges: (pc: PhaseChanges) => Promise<void>;
}): void {
    const {
        game,
        initialPhaseChanges,
        initialPhaseChangesGate,
        characters,
        groundCells: contextGroundCells,
        mapDimension,
    } = useCombatManager();
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
            const timer = setTimeout(() => {
                initialPhaseChangesGate.markProcessed();
                console.log("[BattleVenue3DPlay] 处理 initialPhaseChanges (play):", initialPhaseChanges);
                handlePhaseChanges(initialPhaseChanges).catch((error: unknown) => {
                    console.error("[BattleVenue3DPlay] Error handling initial phaseChanges:", error);
                });
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [
        game,
        initialPhaseChanges,
        characters,
        contextGroundCells,
        mapDimension,
        handlePhaseChanges,
        initialPhaseChangesGate,
    ]);
}
