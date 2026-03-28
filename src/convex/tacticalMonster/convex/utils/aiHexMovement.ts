/**
 * AI 寻路与接敌：与前端 PathFind / buildWalkGridForMovement 规则一致（offset even-r、障碍、不可穿人）。
 */

import type { MapModel } from "../types/gameTypes";
import { type HexCoord, getOffsetNeighbors, offsetHexDistance } from "./hexUtils";

export function isCellPassableForMovement(
    cell: { disable?: boolean; obstacle?: number },
    canIgnoreObstacles: boolean,
    occupiedByOtherUnit: boolean
): boolean {
    if (occupiedByOtherUnit) return false;
    const terrainBlocked = !!cell.disable || !!cell.obstacle;
    if (canIgnoreObstacles) {
        return !cell.disable;
    }
    return !terrainBlocked;
}

function cellTerrain(map: MapModel | undefined | null, q: number, r: number): { disable?: boolean; obstacle?: number } {
    const disable = map?.disables?.some((d) => d.q === q && d.r === r) ?? false;
    const obstacle = map?.obstacles?.some((o) => o.q === q && o.r === r) ? 1 : 0;
    return { disable, obstacle };
}

const key = (q: number, r: number) => `${q},${r}`;

/** 战场上所有单位占位（Boss 主体 + 小怪 + 玩家队伍） */
export function buildOccupiedCellKeysFromGame(game: { team?: any[]; boss?: any } | null | undefined): Set<string> {
    const set = new Set<string>();
    for (const m of game?.team ?? []) {
        if (m?.q != null && m?.r != null) set.add(key(m.q, m.r));
    }
    const boss = game?.boss;
    if (boss?.q != null && boss?.r != null) set.add(key(boss.q, boss.r));
    for (const m of boss?.minions ?? []) {
        if (m?.q != null && m?.r != null) set.add(key(m.q, m.r));
    }
    return set;
}

/**
 * 向最近「可近战站位」（目标邻格）最短路径方向的下一格；与前端「最少步接敌」一致。
 * 若无任何邻格可站（全堵），则退化为可走邻格中 offset 距离目标最近的一格。
 */
export function pickBestNeighborTowardMelee(params: {
    from: HexCoord;
    target: HexCoord;
    cols: number;
    rows: number;
    map: MapModel | undefined | null;
    occupiedCellKeys: Set<string>;
    actorFrom: HexCoord;
    canIgnoreObstacles: boolean;
}): HexCoord | null {
    const { from, target, cols, rows, map, occupiedCellKeys, actorFrom, canIgnoreObstacles } = params;

    const occupiedByOther = (q: number, r: number) => {
        if (q === actorFrom.q && r === actorFrom.r) return false;
        return occupiedCellKeys.has(key(q, r));
    };

    const canPass = (q: number, r: number) => {
        const t = cellTerrain(map, q, r);
        return isCellPassableForMovement(t, canIgnoreObstacles, occupiedByOther(q, r));
    };

    const standGoals: HexCoord[] = [];
    for (const n of getOffsetNeighbors(target, cols, rows)) {
        if (canPass(n.q, n.r)) standGoals.push(n);
    }

    const dist = new Map<string, number>();
    const queue: HexCoord[] = [];

    if (standGoals.length > 0) {
        for (const g of standGoals) {
            const k = key(g.q, g.r);
            if (!dist.has(k)) {
                dist.set(k, 0);
                queue.push(g);
            }
        }
        while (queue.length > 0) {
            const c = queue.shift()!;
            const d = dist.get(key(c.q, c.r))!;
            for (const nb of getOffsetNeighbors(c, cols, rows)) {
                const nk = key(nb.q, nb.r);
                if (dist.has(nk)) continue;
                if (!canPass(nb.q, nb.r)) continue;
                dist.set(nk, d + 1);
                queue.push(nb);
            }
        }
    }

    let best: HexCoord | null = null;
    let bestScore = Infinity;
    let bestTd = Infinity;
    let fallback: HexCoord | null = null;
    let fallbackTd = Infinity;

    for (const nb of getOffsetNeighbors(from, cols, rows)) {
        if (!canPass(nb.q, nb.r)) continue;
        const nk = key(nb.q, nb.r);
        const score = dist.get(nk) ?? Infinity;
        const td = offsetHexDistance(nb, target);
        if (score < bestScore || (score === bestScore && td < bestTd)) {
            bestScore = score;
            bestTd = td;
            best = nb;
        }
        if (td < fallbackTd) {
            fallbackTd = td;
            fallback = nb;
        }
    }

    return best ?? fallback;
}

/**
 * 与前端寻路一致的 BFS 步数（障碍、不可穿人）；不可达返回 Infinity。
 */
export function countWalkStepsBetween(params: {
    from: HexCoord;
    to: HexCoord;
    cols: number;
    rows: number;
    map: MapModel | undefined | null;
    occupiedCellKeys: Set<string>;
    actorFrom: HexCoord;
    canIgnoreObstacles: boolean;
}): number {
    const { from, to, cols, rows, map, occupiedCellKeys, actorFrom, canIgnoreObstacles } = params;

    const occupiedByOther = (q: number, r: number) => {
        if (q === actorFrom.q && r === actorFrom.r) return false;
        return occupiedCellKeys.has(key(q, r));
    };

    const canPass = (q: number, r: number) => {
        const t = cellTerrain(map, q, r);
        return isCellPassableForMovement(t, canIgnoreObstacles, occupiedByOther(q, r));
    };

    if (from.q === to.q && from.r === to.r) return 0;

    const dist = new Map<string, number>();
    const queue: HexCoord[] = [from];
    dist.set(key(from.q, from.r), 0);

    while (queue.length > 0) {
        const c = queue.shift()!;
        const d = dist.get(key(c.q, c.r))!;
        for (const nb of getOffsetNeighbors(c, cols, rows)) {
            const nk = key(nb.q, nb.r);
            if (dist.has(nk)) continue;
            if (!canPass(nb.q, nb.r)) continue;
            const nd = d + 1;
            if (nb.q === to.q && nb.r === to.r) return nd;
            dist.set(nk, nd);
            queue.push(nb);
        }
    }
    return Infinity;
}
