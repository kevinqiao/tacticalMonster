/**
 * Tactical Monster 路径查找工具
 */

import { MonsterSkill } from "../../../../../../convex/tacticalMonster/convex/data/skillConfigs";
import { AttackableNode, HexNode, WalkableNode } from "../types/CombatTypes";

// 计算六边形距离（用于飞行单位的直线路径）
const calculateHexDistance = (from: HexNode, to: HexNode): number => {
    const fromX = from.q - Math.floor(from.r / 2);
    const fromZ = from.r;
    const fromY = -fromX - fromZ;

    const toX = to.q - Math.floor(to.r / 2);
    const toZ = to.r;
    const toY = -toX - toZ;

    return Math.max(
        Math.abs(fromX - toX),
        Math.abs(fromY - toY),
        Math.abs(fromZ - toZ)
    );
};

// 飞行单位的直线路径（忽略障碍物）
const findDirectPath = (start: HexNode, goal: HexNode, grid: HexNode[][]): HexNode[] => {
    const path: HexNode[] = [start];

    // 如果起点和终点相同，直接返回
    if (start.q === goal.q && start.r === goal.r) {
        return path;
    }

    const distance = calculateHexDistance(start, goal);

    // 如果距离为1，直接返回终点
    if (distance <= 1) {
        return [start, goal];
    }

    // 计算直线路径上的所有中间点
    const steps = distance;
    for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const q = Math.round(start.q + (goal.q - start.q) * t);
        const r = Math.round(start.r + (goal.r - start.r) * t);

        // 检查是否在网格范围内
        if (r >= 0 && r < grid.length && q >= 0 && q < grid[0].length) {
            const node = { q, r };
            // 避免重复添加
            const lastNode = path[path.length - 1];
            if (lastNode.q !== node.q || lastNode.r !== node.r) {
                path.push(node);
            }
        }
    }

    return path;
};

export const findPath = (
    grid: HexNode[][],
    start: HexNode,
    goal: HexNode,
    canIgnoreObstacles?: boolean  // 是否可以忽略障碍物（飞行单位）
): HexNode[] => {
    // 飞行单位：使用直线路径（忽略障碍物）
    if (canIgnoreObstacles) {
        return findDirectPath(start, goal, grid);
    }

    const isWalkable = (q: number, r: number): boolean => {
        if (r < 0 || r >= grid.length || q < 0 || q >= grid[0].length) return false;
        return grid[r][q].walkable ?? false;
    };

    const getNeighbors = (pos: HexNode): HexNode[] => {
        const directions = pos.r % 2 === 0 ? [
            { q: 1, r: 0 },   // 右
            { q: 0, r: -1 },  // 右上
            { q: -1, r: -1 }, // 左上
            { q: -1, r: 0 },  // 左
            { q: -1, r: 1 },  // 左下
            { q: 0, r: 1 },   // 右下
        ] : [
            { q: 1, r: 0 },   // 右
            { q: 1, r: -1 },  // 右上
            { q: 0, r: -1 },  // 左上
            { q: -1, r: 0 },  // 左
            { q: 0, r: 1 },   // 左下
            { q: 1, r: 1 },   // 右下
        ];

        return directions
            .map(dir => ({
                q: pos.q + dir.q,
                r: pos.r + dir.r
            }))
            .filter(neighbor => isWalkable(neighbor.q, neighbor.r));
    };

    const heuristic = (a: HexNode, b: HexNode): number => {
        const dq = Math.abs(a.q - b.q);
        const dr = Math.abs(a.r - b.r);
        return Math.max(dq, dr) + Math.floor(Math.min(dq, dr) / 2);
    };

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
    // 飞行单位：计算范围内的所有格子（忽略障碍物）
    if (canIgnoreObstacles) {
        const movableNodes: WalkableNode[] = [];
        const rows = gridCells.length;
        const cols = gridCells[0]?.length || 0;

        for (let r = 0; r < rows; r++) {
            for (let q = 0; q < cols; q++) {
                const distance = calculateHexDistance(
                    { q: start.q, r: start.r },
                    { q, r }
                );

                if (distance > 0 && distance <= moveRange) {
                    movableNodes.push({ q, r, distance, walkable: true });
                }
            }
        }

        return movableNodes;
    }

    // 非飞行单位：使用BFS算法（考虑障碍物）
    const movableNodes: WalkableNode[] = [];
    const visited = new Set<string>();
    const queue: { node: HexNode, distance: number }[] = [];

    queue.push({ node: { q: start.q, r: start.r }, distance: 0 });
    visited.add(`${start.q},${start.r}`);

    const getNeighbors = (pos: HexNode): HexNode[] => {
        const directions = pos.r % 2 === 0 ? [
            { q: 1, r: 0 },   // 右
            { q: 0, r: -1 },  // 右上
            { q: -1, r: -1 }, // 左上
            { q: -1, r: 0 },  // 左
            { q: -1, r: 1 },  // 左下
            { q: 0, r: 1 },   // 右下
        ] : [
            { q: 1, r: 0 },   // 右
            { q: 1, r: -1 },  // 右上
            { q: 0, r: -1 },  // 左上
            { q: -1, r: 0 },  // 左
            { q: 0, r: 1 },   // 左下
            { q: 1, r: 1 },   // 右下
        ];

        return directions
            .map(dir => ({
                q: pos.q + dir.q,
                r: pos.r + dir.r
            }))
            .filter(neighbor => {
                if (neighbor.r < 0 || neighbor.r >= gridCells.length ||
                    neighbor.q < 0 || neighbor.q >= gridCells[0].length) return false;
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

    return movableNodes;
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
            const path = findPath(gridCells, { q: attacker.q, r: attacker.r }, { q: enemy.q, r: enemy.r });
            if (path.length - 2 <= attacker.moveRange)
                attackableNodes.push({ uid: enemy.uid, character_id: enemy.character_id, q: enemy.q, r: enemy.r, distance: 1 });
        } else {
            const path = findPath(grid, { q: attacker.q, r: attacker.r }, { q: enemy.q, r: enemy.r });
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
        q: number,
        r: number,
        moveRange: number,
        attackRange: { min: number, max: number }
    },
    target: { q: number, r: number },
    skill: MonsterSkill | null
): { ok: boolean, distance: number } => {
    const dx = attacker.q - target.q;
    const dy = attacker.r - target.r;
    const distance = Math.max(Math.abs(dx), Math.abs(dy));
    const maxReach = attacker.moveRange + (skill?.range?.max_distance ?? attacker.attackRange.max);
    return { ok: distance <= maxReach ? true : false, distance };
};


