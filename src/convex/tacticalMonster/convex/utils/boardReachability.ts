/**
 * 战场可达格与敌我枚举（与 validActionEnumerator、技能目标校验共用）
 */

import type { GameModel } from "../types/gameTypes";
import type { GameBoss, GameMinion, GameMonster } from "../types/monsterTypes";
import { getOffsetNeighbors } from "./hexUtils";

/** 敌方存活单位（Boss + 小怪） */
export function getAliveEnemies(game: GameModel): GameMonster[] {
    const enemies: GameMonster[] = [];
    if (game.boss && (game.boss.stats?.hp?.current ?? 0) > 0) {
        enemies.push(game.boss as GameMonster);
    }
    for (const m of game.boss?.minions ?? []) {
        if ((m.stats?.hp?.current ?? 0) > 0) {
            enemies.push(m as GameMonster);
        }
    }
    return enemies;
}

/** 友方存活单位（玩家队伍） */
export function getAliveAllies(game: GameModel): GameMonster[] {
    return (game.team ?? []).filter((m) => (m.stats?.hp?.current ?? 0) > 0);
}

export type CellBlockedOptions = {
    /** 与前端 buildWalkGridForMovement：飞行可越过地形障碍格，但仍受 disable、单位占用限制 */
    ignoreTerrainObstacles?: boolean;
};

/** 检查格子是否被占用（障碍、禁用、其他角色） */
export function isCellBlocked(
    game: GameModel,
    pos: { q: number; r: number },
    excludeChar?: GameMonster,
    options?: CellBlockedOptions
): boolean {
    const { cols, rows } = game.map;
    if (pos.q < 0 || pos.q >= cols || pos.r < 0 || pos.r >= rows) return true;
    if (!options?.ignoreTerrainObstacles) {
        const obstacles = game.map.obstacles ?? [];
        if (obstacles.some((o: { q: number; r: number }) => o.q === pos.q && o.r === pos.r)) return true;
    }
    const disables = game.map.disables ?? [];
    if (disables.some((d: { q: number; r: number }) => d.q === pos.q && d.r === pos.r)) return true;
    const allChars = [...(game.team ?? []), game.boss, ...(game.boss?.minions ?? [])].filter(Boolean);
    for (const c of allChars) {
        if (excludeChar && (c as GameMonster) === excludeChar) continue;
        const cid =
            (c as GameMonster & { character_id?: string; bossId?: string; minionId?: string }).character_id ??
            (c as GameBoss).bossId ??
            (c as GameMinion).minionId ??
            (c as GameMonster).monsterId;
        const eid = excludeChar
            ? (excludeChar as GameMonster & { character_id?: string }).character_id ??
              (excludeChar as GameBoss).bossId ??
              (excludeChar as GameMinion).minionId ??
              excludeChar.monsterId
            : null;
        if (eid != null && cid === eid) continue;
        if ((c as GameMonster).q === pos.q && (c as GameMonster).r === pos.r) return true;
    }
    return false;
}

/**
 * BFS 获取 move_range 内可达格子及步数（不含起点；与 validActionEnumerator 一致）
 */
export function getReachableCells(
    game: GameModel,
    from: { q: number; r: number },
    moveRange: number,
    character: GameMonster,
    options?: CellBlockedOptions
): Array<{ q: number; r: number; steps: number }> {
    const { cols, rows } = game.map;
    const visited = new Set<string>();
    const result: Array<{ q: number; r: number; steps: number }> = [];
    const queue: Array<{ q: number; r: number; steps: number }> = [{ ...from, steps: 0 }];
    visited.add(`${from.q},${from.r}`);

    while (queue.length > 0) {
        const { q, r, steps } = queue.shift()!;
        if (steps > 0 && !isCellBlocked(game, { q, r }, character, options)) {
            result.push({ q, r, steps });
        }
        if (steps >= moveRange) continue;
        const neighbors = getOffsetNeighbors({ q, r }, cols, rows);
        for (const n of neighbors) {
            const key = `${n.q},${n.r}`;
            if (visited.has(key)) continue;
            visited.add(key);
            if (isCellBlocked(game, n, character, options)) continue;
            queue.push({ q: n.q, r: n.r, steps: steps + 1 });
        }
    }
    return result;
}

/**
 * BFS：从 from 到 to 的最少步数（不超过 maxSteps），不可达则返回 Infinity。
 * 与前端 findPathBFS / getReachableCells 规则一致。
 */
export function getMinStepsBetween(
    game: GameModel,
    from: { q: number; r: number },
    to: { q: number; r: number },
    character: GameMonster,
    maxSteps: number,
    options?: CellBlockedOptions
): number {
    const { cols, rows } = game.map;
    if (from.q === to.q && from.r === to.r) return 0;
    const visited = new Set<string>();
    const queue: Array<{ q: number; r: number; steps: number }> = [{ ...from, steps: 0 }];
    visited.add(`${from.q},${from.r}`);

    while (queue.length > 0) {
        const { q, r, steps } = queue.shift()!;
        if (q === to.q && r === to.r) return steps;
        if (steps >= maxSteps) continue;
        const neighbors = getOffsetNeighbors({ q, r }, cols, rows);
        for (const n of neighbors) {
            const key = `${n.q},${n.r}`;
            if (visited.has(key)) continue;
            visited.add(key);
            if (isCellBlocked(game, n, character, options)) continue;
            queue.push({ q: n.q, r: n.r, steps: steps + 1 });
        }
    }
    return Infinity;
}
