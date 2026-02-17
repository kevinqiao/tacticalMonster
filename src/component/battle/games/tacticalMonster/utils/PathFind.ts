/**
 * Tactical Monster 路径查找工具
 * 寻路与可移动范围统一使用 offset (even-r) 六边形距离，与网格渲染、后端校验一致。
 */

import { MonsterSkill } from "../../../../../convex/tacticalMonster/convex/data/skillConfigs";
import { AttackableNode, HexNode, WalkableNode } from "../types/CombatTypes";

/** Offset (even-r) 六边形距离，与网格步数、后端 offsetHexDistance 一致 */
const offsetHexDistance = (from: HexNode, to: HexNode): number => {
    const dq = Math.abs(from.q - to.q);
    const dr = Math.abs(from.r - to.r);
    return Math.max(dq, dr) + Math.floor(Math.min(dq, dr) / 2);
};

/** Offset (even-r) 下 (q,r) 的 6 邻格偏移，与网格显示一致 */
const getOffsetNeighborDirs = (r: number): { dq: number; dr: number }[] =>
    r % 2 === 0
        ? [
            { dq: 1, dr: 0 }, { dq: 0, dr: -1 }, { dq: -1, dr: -1 },
            { dq: -1, dr: 0 }, { dq: -1, dr: 1 }, { dq: 0, dr: 1 },
        ]
        : [
            { dq: 1, dr: 0 }, { dq: 1, dr: -1 }, { dq: 0, dr: -1 },
            { dq: -1, dr: 0 }, { dq: 0, dr: 1 }, { dq: 1, dr: 1 },
        ];

/**
 * 飞行单位直线路径：offset 邻格 + offset 距离。
 * 横屏 grid=逻辑网格；竖屏 grid=view 网格（useWalkAction3D 构建），path 为 view 坐标。
 */
const findDirectPath = (start: HexNode, goal: HexNode, grid: HexNode[][]): HexNode[] => {
    const path: HexNode[] = [start];
    if (start.q === goal.q && start.r === goal.r) return path;

    const rows = grid.length;
    const cols = grid[0]?.length ?? 0;
    const inBounds = (q: number, r: number) => r >= 0 && r < rows && q >= 0 && q < cols;
    const distance = offsetHexDistance(start, goal);
    if (distance <= 1) return [start, goal];

    const maxSteps = Math.min(rows * cols, Math.max(distance + 2, 8));
    let current: HexNode = { q: start.q, r: start.r };
    for (let step = 0; step < maxSteps; step++) {
        if (current.q === goal.q && current.r === goal.r) break;
        const curDist = offsetHexDistance(current, goal);
        const prevNode = path.length >= 2 ? path[path.length - 2] : null;
        let best: HexNode | null = null;
        let bestDist = Infinity;
        for (const { dq, dr } of getOffsetNeighborDirs(current.r)) {
            const nq = current.q + dq;
            const nr = current.r + dr;
            if (!inBounds(nq, nr)) continue;
            if (prevNode && nq === prevNode.q && nr === prevNode.r) continue;
            if (nq === goal.q && nr === goal.r) {
                best = { q: nq, r: nr };
                bestDist = 0;
                break;
            }
            const next = { q: nq, r: nr };
            const dist = offsetHexDistance(next, goal);
            const notFarther = dist <= curDist;
            const better =
                !best ||
                dist < bestDist ||
                (dist === bestDist && offsetHexDistance(next, goal) < offsetHexDistance(best!, goal));
            if (notFarther && better) {
                bestDist = dist;
                best = next;
            }
        }
        if (!best) break;
        path.push(best);
        current = best;
    }
    return path;
};

export const findPath = (
    grid: HexNode[][],
    start: HexNode,
    goal: HexNode,
    canIgnoreObstacles?: boolean,  // 是否可以忽略障碍物（飞行单位）
    _debugLabel?: string            // 调试：调用来源 "walk" | "attack" 等，便于区分日志
): HexNode[] => {
    if (canIgnoreObstacles) {
        return findDirectPath(start, goal, grid);
    }

    const isWalkable = (q: number, r: number): boolean => {
        if (r < 0 || r >= grid.length || q < 0 || q >= grid[0].length) return false;
        return grid[r][q].walkable ?? false;
    };

    const getNeighbors = (pos: HexNode): HexNode[] => {
        return getOffsetNeighborDirs(pos.r)
            .map(({ dq, dr }) => ({ q: pos.q + dq, r: pos.r + dr }))
            .filter((neighbor) => isWalkable(neighbor.q, neighbor.r));
    };

    const heuristic = (a: HexNode, b: HexNode): number => offsetHexDistance(a, b);

    const openSet = new Set<string>([`${start.q},${start.r}`]);
    const cameFrom = new Map<string, HexNode>();
    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();

    gScore.set(`${start.q},${start.r}`, 0);
    fScore.set(`${start.q},${start.r}`, heuristic(start, goal));

    while (openSet.size > 0) {
        let current = null;
        let lowestFScore = Infinity;

        for (const pos of openSet) {
            const score = fScore.get(pos) ?? Infinity;
            if (score < lowestFScore) {
                lowestFScore = score;
                const [q, r] = pos.split(',').map(Number);
                current = { q, r };
            }
        }

        if (!current) break;
        if (current.q === goal.q && current.r === goal.r) {
            const path = [current];
            let key = `${current.q},${current.r}`;
            while (cameFrom.has(key)) {
                const pos = cameFrom.get(key)!;
                path.unshift(pos);
                key = `${pos.q},${pos.r}`;
            }
            const offsetDist = offsetHexDistance(start, goal);
            console.log("[HexDebug] findPath", {
                caller: _debugLabel ?? "?",
                start: { q: start.q, r: start.r },
                goal: { q: goal.q, r: goal.r },
                pathSteps: path.length - 1,
                offsetDistance: offsetDist,
            });
            return path;
        }

        openSet.delete(`${current.q},${current.r}`);

        for (const neighbor of getNeighbors(current)) {
            const tentativeGScore =
                (gScore.get(`${current.q},${current.r}`) ?? Infinity) + 1;

            if (tentativeGScore < (gScore.get(`${neighbor.q},${neighbor.r}`) ?? Infinity)) {
                cameFrom.set(`${neighbor.q},${neighbor.r}`, current);
                gScore.set(`${neighbor.q},${neighbor.r}`, tentativeGScore);
                fScore.set(
                    `${neighbor.q},${neighbor.r}`,
                    tentativeGScore + heuristic(neighbor, goal)
                );
                openSet.add(`${neighbor.q},${neighbor.r}`);
            }
        }
    }

    return [start];
};

export const getWalkableNodes = (
    gridCells: HexNode[][],
    start: { q: number, r: number },
    moveRange: number,
    canIgnoreObstacles?: boolean  // 是否可以忽略障碍物（飞行单位）
): WalkableNode[] => {
    // 飞行单位：计算范围内的所有格子（忽略障碍物），与非飞行一致使用 offset 距离
    if (canIgnoreObstacles) {
        const movableNodes: WalkableNode[] = [];
        const rows = gridCells.length;
        const cols = gridCells[0]?.length || 0;
        const startNode = { q: start.q, r: start.r };

        for (let r = 0; r < rows; r++) {
            for (let q = 0; q < cols; q++) {
                const distance = offsetHexDistance(startNode, { q, r });

                if (distance > 0 && distance <= moveRange) {
                    movableNodes.push({ q, r, distance, walkable: true });
                }
            }
        }

        console.log("[HexDebug] getWalkableNodes flying", {
            start: { q: start.q, r: start.r },
            moveRange,
            count: movableNodes.length,
            sample: movableNodes.slice(0, 3).map((n) => ({ q: n.q, r: n.r, distance: n.distance })),
        });
        return movableNodes;
    }

    // 非飞行单位：使用BFS算法（考虑障碍物）
    const movableNodes: WalkableNode[] = [];
    const visited = new Set<string>();
    const queue: { node: HexNode, distance: number }[] = [];

    queue.push({ node: { q: start.q, r: start.r }, distance: 0 });
    visited.add(`${start.q},${start.r}`);

    // offset (even-r) 6 邻格，与网格显示一致
    const getNeighbors = (pos: HexNode): HexNode[] => {
        return getOffsetNeighborDirs(pos.r)
            .map((dir) => ({ q: pos.q + dir.dq, r: pos.r + dir.dr }))
            .filter((neighbor) => {
                if (
                    neighbor.r < 0 ||
                    neighbor.r >= gridCells.length ||
                    neighbor.q < 0 ||
                    neighbor.q >= (gridCells[0]?.length ?? 0)
                )
                    return false;
                return gridCells[neighbor.r][neighbor.q].walkable ?? false;
            });
    };

    while (queue.length > 0) {
        const { node, distance } = queue.shift()!;
        movableNodes.push({ ...node, distance });

        if (distance < moveRange) {
            const neighbors = getNeighbors(node);
            for (const neighbor of neighbors) {
                const key = `${neighbor.q},${neighbor.r}`;
                if (!visited.has(key)) {
                    visited.add(key);
                    queue.push({
                        node: neighbor,
                        distance: distance + 1
                    });
                }
            }
        }
    }

    // 与 BFS 一致：用 offset 距离过滤，可行走范围边界统一（不再混用轴向导致有远有近）
    const startNode = { q: start.q, r: start.r };
    const filtered = movableNodes.filter((n) => offsetHexDistance(startNode, n) <= moveRange);

    // 调试：可移动范围（offset 距离）
    const distances = filtered.map((n) => offsetHexDistance(startNode, n));
    const maxDist = distances.length ? Math.max(...distances) : -1;
    const overRangeCells = filtered.filter((n) => offsetHexDistance(startNode, n) > moveRange);

    console.log("[HexDebug] getWalkableNodes BFS", {
        start: { q: start.q, r: start.r },
        moveRange,
        gridShape: [gridCells.length, gridCells[0]?.length ?? 0],
        beforeFilter: movableNodes.length,
        afterFilter: filtered.length,
        maxOffsetDistInResult: maxDist,
        overRangeInResult: overRangeCells.length,
        sample: filtered.slice(0, 4).map((n) => ({ q: n.q, r: n.r, offsetD: offsetHexDistance(startNode, n) })),
    });
    if (overRangeCells.length > 0) {
        console.warn("[HexDebug] getWalkableNodes 过滤后仍存在 offsetD > moveRange", {
            moveRange,
            overRange: overRangeCells.slice(0, 5).map((n) => ({ q: n.q, r: n.r, offsetD: offsetHexDistance(startNode, n) })),
        });
    }

    return filtered;
};

/**
 * 获取可攻击的目标节点
 * PVE模式：enemies参数包含Boss角色（Boss本体 + 小怪，uid="boss"）
 */
export const getAttackableNodes = (
    gridCells: HexNode[][],
    attacker: { q: number, r: number, uid: string, character_id: string, moveRange: number, attackRange: { min: number, max: number } },
    enemies: { q: number, r: number, uid: string, character_id: string }[],  // PVE模式：Boss角色列表
    skill: MonsterSkill | null
): AttackableNode[] => {
    const grid = gridCells.map(row => row.map(cell => ({ ...cell, walkable: true })));
    const attackableNodes: AttackableNode[] = [];

    // PVE模式：遍历Boss角色（Boss本体 + 小怪）
    for (const enemy of enemies) {
        if (attacker.attackRange.max === 1) {
            gridCells[enemy.r][enemy.q].walkable = true;
            const path = findPath(gridCells, { q: attacker.q, r: attacker.r }, { q: enemy.q, r: enemy.r }, undefined, "attack");
            if (path.length - 2 <= attacker.moveRange)
                attackableNodes.push({ uid: enemy.uid, character_id: enemy.character_id, q: enemy.q, r: enemy.r, distance: 1 });
        } else {
            const path = findPath(grid, { q: attacker.q, r: attacker.r }, { q: enemy.q, r: enemy.r }, undefined, "attack");
            const distance = path.length - 1;
            const range = (skill?.range?.distance ?? skill?.range?.max_distance) ?? attacker.attackRange.max;
            if (distance <= range) {
                attackableNodes.push({ uid: enemy.uid, character_id: enemy.character_id, q: enemy.q, r: enemy.r, distance: distance });
            }
        }
    }
    return attackableNodes;
};

export const isInAttackRange = (
    attacker: {
        q: number;
        r: number;
        moveRange: number;
        attackRange: { min: number; max: number };
    },
    target: { q: number; r: number },
    skill: MonsterSkill | null
): { ok: boolean; distance: number } => {
    const distance = offsetHexDistance(attacker, target);
    const maxReach = attacker.moveRange + (skill?.range?.max_distance ?? attacker.attackRange.max);
    return { ok: distance <= maxReach, distance };
};


