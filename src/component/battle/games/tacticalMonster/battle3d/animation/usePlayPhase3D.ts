/**
 * 3D 阶段动画 - 回合开始/结束 + 格子高亮
 */

import { useCallback } from "react";
import type { UseBattleGridStateReturn } from "../hooks/useBattleGridState";

export const usePlayPhase3D = (gridState: UseBattleGridStateReturn | null) => {
    const playTurnOn = useCallback(
        (walkableCells: Array<{ q: number; r: number }>, attackableCells: Array<{ q: number; r: number }>) => {
            if (!gridState) return;
            gridState.clearAll();
            if (walkableCells.length > 0) gridState.highlightWalkable(walkableCells);
            if (attackableCells.length > 0) gridState.highlightAttackable(attackableCells);
        },
        [gridState]
    );

    const clearTurnUI = useCallback(() => {
        gridState?.clearAll();
    }, [gridState]);

    return { playTurnOn, clearTurnUI };
};
