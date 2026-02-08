/**
 * 战斗格子状态管理 - 控制 walkable/attackable/path/selected 高亮
 */

import { useCallback, useMemo, useState } from "react";

export type BattleCellState =
    | "normal"
    | "disabled"
    | "walkable"
    | "attackable"
    | "path"
    | "selected"
    | "highlighted";

export interface UseBattleGridStateReturn {
    /** 格子 (q,r) -> 状态 */
    cellStates: Map<string, BattleCellState>;
    highlightWalkable: (cells: Array<{ q: number; r: number }>) => void;
    highlightAttackable: (cells: Array<{ q: number; r: number }>) => void;
    highlightPath: (path: Array<{ q: number; r: number }>) => void;
    setSelected: (cell: { q: number; r: number } | null) => void;
    clearAll: () => void;
    getCellState: (q: number, r: number) => BattleCellState;
}

const cellKey = (q: number, r: number) => `${q},${r}`;

export const useBattleGridState = (
    disabledCells: Array<{ q: number; r: number }> = []
): UseBattleGridStateReturn => {
    const [cellStates, setCellStates] = useState<Map<string, BattleCellState>>(new Map());

    const disabledSet = useMemo(() => {
        const s = new Set<string>();
        disabledCells.forEach(({ q, r }) => s.add(cellKey(q, r)));
        return s;
    }, [disabledCells]);

    const getCellState = useCallback(
        (q: number, r: number): BattleCellState => {
            const key = cellKey(q, r);
            if (cellStates.has(key)) return cellStates.get(key)!;
            if (disabledSet.has(key)) return "disabled";
            return "normal";
        },
        [cellStates, disabledSet]
    );

    const highlightWalkable = useCallback((cells: Array<{ q: number; r: number }>) => {
        setCellStates((prev) => {
            const next = new Map(prev);
            next.clear();
            cells.forEach(({ q, r }) => next.set(cellKey(q, r), "walkable"));
            return next;
        });
    }, []);

    const highlightAttackable = useCallback((cells: Array<{ q: number; r: number }>) => {
        setCellStates((prev) => {
            const next = new Map(prev);
            cells.forEach(({ q, r }) => next.set(cellKey(q, r), "attackable"));
            return next;
        });
    }, []);

    const highlightPath = useCallback((path: Array<{ q: number; r: number }>) => {
        setCellStates((prev) => {
            const next = new Map(prev);
            path.forEach(({ q, r }) => next.set(cellKey(q, r), "path"));
            return next;
        });
    }, []);

    const setSelected = useCallback((cell: { q: number; r: number } | null) => {
        setCellStates((prev) => {
            if (!cell) return new Map(prev);
            const next = new Map(prev);
            next.set(cellKey(cell.q, cell.r), "selected");
            return next;
        });
    }, []);

    const clearAll = useCallback(() => {
        setCellStates(new Map());
    }, []);

    return {
        cellStates,
        highlightWalkable,
        highlightAttackable,
        highlightPath,
        setSelected,
        clearAll,
        getCellState,
    };
};
