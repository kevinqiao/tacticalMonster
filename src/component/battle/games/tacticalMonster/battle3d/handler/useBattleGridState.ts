/**
 * 战斗格子状态管理 - 控制 walkable/attackable/path/selected 高亮
 * 禁用格从 CombatManager 的 groundCells 推导（与 groundCells 单一数据源一致）
 * 约定：highlightWalkable / highlightAttackable / highlightPath / setSelected 均使用逻辑坐标 (q, r)；
 * GridGround3D 按逻辑 (q,r) 遍历，getCellState(q,r) 与 onCellClick 均为逻辑坐标，横竖屏一致。
 * 可行走格支持按距离区分暗区（近深远浅，Braveland 式）。
 */

import { useCallback, useMemo, useRef, useState } from "react";
import { useCombatManager } from "../../service/CombatManager";

export type BattleCellState =
    | "normal"
    | "disabled"
    | "walkable"
    | "walkable_dim"
    | "attackable"
    | "attackable_dim"
    | "attackable_focus"
    | "path"
    | "selected"
    | "highlighted";

export interface UseBattleGridStateReturn {
    /** 格子 (q,r) -> 状态 */
    cellStates: Map<string, BattleCellState>;
    highlightWalkable: (cells: Array<{ q: number; r: number; distance?: number }>, moveRange?: number) => void;
    highlightAttackable: (cells: Array<{ q: number; r: number }>) => void;
    highlightPath: (path: Array<{ q: number; r: number }>) => void;
    setSelected: (cell: { q: number; r: number } | null) => void;
    clearAll: () => void;
    getCellState: (q: number, r: number) => BattleCellState;
    /** 可行走格距离（用于近深远浅）；仅当该格为 walkable 且有存储时有效 */
    getWalkableDistance: (q: number, r: number) => number | undefined;
    /** 当前高亮可行走时的移动范围（用于计算透明度） */
    getWalkableMoveRange: () => number | undefined;
}

const cellKey = (q: number, r: number) => `${q},${r}`;

export const useBattleGridState = (): UseBattleGridStateReturn => {
    const { groundCells } = useCombatManager();
    const [cellStates, setCellStates] = useState<Map<string, BattleCellState>>(new Map());
    const walkableDistanceRef = useRef<Map<string, number>>(new Map());
    const walkableMoveRangeRef = useRef<number>(0);

    const disabledSet = useMemo(() => {
        const s = new Set<string>();
        if (!groundCells) return s;
        groundCells.forEach((row) =>
            row.forEach((cell) => {
                if (cell.disable) s.add(cellKey(cell.q, cell.r));
            })
        );
        return s;
    }, [groundCells]);

    const getCellState = useCallback(
        (q: number, r: number): BattleCellState => {
            const key = cellKey(q, r);
            if (cellStates.has(key)) return cellStates.get(key)!;
            if (disabledSet.has(key)) return "disabled";
            return "normal";
        },
        [cellStates, disabledSet]
    );

    const highlightWalkable = useCallback((cells: Array<{ q: number; r: number; distance?: number }>, moveRange?: number) => {
        const distMap = new Map<string, number>();
        cells.forEach(({ q, r, distance }) => {
            if (distance !== undefined) distMap.set(cellKey(q, r), distance);
        });
        walkableDistanceRef.current = distMap;
        walkableMoveRangeRef.current = moveRange ?? 0;
        setCellStates((prev) => {
            const next = new Map(prev);
            next.clear();
            cells.forEach(({ q, r }) => next.set(cellKey(q, r), "walkable"));
            return next;
        });
    }, []);

    const getWalkableDistance = useCallback((q: number, r: number): number | undefined => {
        return walkableDistanceRef.current.get(cellKey(q, r));
    }, []);

    const getWalkableMoveRange = useCallback((): number | undefined => {
        const range = walkableMoveRangeRef.current;
        return range > 0 ? range : undefined;
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
        walkableDistanceRef.current = new Map();
        walkableMoveRangeRef.current = 0;
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
        getWalkableDistance,
        getWalkableMoveRange,
    };
};
