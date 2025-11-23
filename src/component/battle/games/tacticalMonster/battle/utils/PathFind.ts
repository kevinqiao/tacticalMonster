/**
 * Tactical Monster 路径查找工具
 */

import { Skill } from "../types/CharacterTypes";
import { AttackableNode, HexNode, WalkableNode } from "../types/CombatTypes";

// 计算六边形距离（用于飞行单位的直线路径）
const calculateHexDistance = (from: HexNode, to: HexNode): number => {
    const fromX = from.x - Math.floor(from.y / 2);
    const fromZ = from.y;
    const fromY = -fromX - fromZ;

    const toX = to.x - Math.floor(to.y / 2);
    const toZ = to.y;
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
    if (start.x === goal.x && start.y === goal.y) {
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
        const q = Math.round(start.x + (goal.x - start.x) * t);
        const r = Math.round(start.y + (goal.y - start.y) * t);
        
        // 检查是否在网格范围内
        if (r >= 0 && r < grid.length && q >= 0 && q < grid[0].length) {
            const node = { x: q, y: r };
            // 避免重复添加
            const lastNode = path[path.length - 1];
            if (lastNode.x !== node.x || lastNode.y !== node.y) {
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
    
    const isWalkable = (x: number, y: number): boolean => {
        if (y < 0 || y >= grid.length || x < 0 || x >= grid[0].length) return false;
        return grid[y][x].walkable ?? false;
    };

    const getNeighbors = (pos: HexNode): HexNode[] => {
        const directions = pos.y % 2 === 0 ? [
            { x: 1, y: 0 },   // 右
            { x: 0, y: -1 },  // 右上
            { x: -1, y: -1 }, // 左上
            { x: -1, y: 0 },  // 左
            { x: -1, y: 1 },  // 左下
            { x: 0, y: 1 },   // 右下
        ] : [
            { x: 1, y: 0 },   // 右
            { x: 1, y: -1 },  // 右上
            { x: 0, y: -1 },  // 左上
            { x: -1, y: 0 },  // 左
            { x: 0, y: 1 },   // 左下
            { x: 1, y: 1 },   // 右下
        ];

        return directions
            .map(dir => ({
                x: pos.x + dir.x,
                y: pos.y + dir.y
            }))
            .filter(neighbor => isWalkable(neighbor.x, neighbor.y));
    };

    const heuristic = (a: HexNode, b: HexNode): number => {
        const dx = Math.abs(a.x - b.x);
        const dy = Math.abs(a.y - b.y);
        return Math.max(dx, dy) + Math.floor(Math.min(dx, dy) / 2);
    };

    const openSet = new Set<string>([`${start.x},${start.y}`]);
    const cameFrom = new Map<string, HexNode>();
    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();

    gScore.set(`${start.x},${start.y}`, 0);
    fScore.set(`${start.x},${start.y}`, heuristic(start, goal));

    while (openSet.size > 0) {
        let current = null;
        let lowestFScore = Infinity;

        for (const pos of openSet) {
            const score = fScore.get(pos) ?? Infinity;
            if (score < lowestFScore) {
                lowestFScore = score;
                const [x, y] = pos.split(',').map(Number);
                current = { x, y };
            }
        }

        if (!current) break;
        if (current.x === goal.x && current.y === goal.y) {
            const path = [current];
            let key = `${current.x},${current.y}`;
            while (cameFrom.has(key)) {
                const pos = cameFrom.get(key)!;
                path.unshift(pos);
                key = `${pos.x},${pos.y}`;
            }
            return path;
        }

        openSet.delete(`${current.x},${current.y}`);

        for (const neighbor of getNeighbors(current)) {
            const tentativeGScore =
                (gScore.get(`${current.x},${current.y}`) ?? Infinity) + 1;

            if (tentativeGScore < (gScore.get(`${neighbor.x},${neighbor.y}`) ?? Infinity)) {
                cameFrom.set(`${neighbor.x},${neighbor.y}`, current);
                gScore.set(`${neighbor.x},${neighbor.y}`, tentativeGScore);
                fScore.set(
                    `${neighbor.x},${neighbor.y}`,
                    tentativeGScore + heuristic(neighbor, goal)
                );
                openSet.add(`${neighbor.x},${neighbor.y}`);
            }
        }
    }

    return [start];
};

export const getWalkableNodes = (
    gridCells: HexNode[][],
    start: { x: number, y: number },
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
                    { x: start.x, y: start.y },
                    { x: q, y: r }
                );
                
                if (distance > 0 && distance <= moveRange) {
                    movableNodes.push({ x: q, y: r, distance, walkable: true });
                }
            }
        }
        
        return movableNodes;
    }
    
    // 非飞行单位：使用BFS算法（考虑障碍物）
    const movableNodes: WalkableNode[] = [];
    const visited = new Set<string>();
    const queue: { node: HexNode, distance: number }[] = [];

    queue.push({ node: { x: start.x, y: start.y }, distance: 0 });
    visited.add(`${start.x},${start.y}`);

    const getNeighbors = (pos: HexNode): HexNode[] => {
        const directions = pos.y % 2 === 0 ? [
            { x: 1, y: 0 },   // 右
            { x: 0, y: -1 },  // 右上
            { x: -1, y: -1 }, // 左上
            { x: -1, y: 0 },  // 左
            { x: -1, y: 1 },  // 左下
            { x: 0, y: 1 },   // 右下
        ] : [
            { x: 1, y: 0 },   // 右
            { x: 1, y: -1 },  // 右上
            { x: 0, y: -1 },  // 左上
            { x: -1, y: 0 },  // 左
            { x: 0, y: 1 },   // 左下
            { x: 1, y: 1 },   // 右下
        ];

        return directions
            .map(dir => ({
                x: pos.x + dir.x,
                y: pos.y + dir.y
            }))
            .filter(neighbor => {
                if (neighbor.y < 0 || neighbor.y >= gridCells.length ||
                    neighbor.x < 0 || neighbor.x >= gridCells[0].length) return false;
                return gridCells[neighbor.y][neighbor.x].walkable ?? false;
            });
    };

    while (queue.length > 0) {
        const { node, distance } = queue.shift()!;
        movableNodes.push({ ...node, distance });

        if (distance < moveRange) {
            const neighbors = getNeighbors(node);
            for (const neighbor of neighbors) {
                const key = `${neighbor.x},${neighbor.y}`;
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

export const getAttackableNodes = (
    gridCells: HexNode[][],
    attacker: { q: number, r: number, uid: string, character_id: string, moveRange: number, attackRange: { min: number, max: number } },
    enemies: { q: number, r: number, uid: string, character_id: string }[],
    skill: Skill | null
): AttackableNode[] => {
    const grid = gridCells.map(row => row.map(cell => ({ ...cell, walkable: true })));
    const attackableNodes: AttackableNode[] = [];

    for (const enemy of enemies) {
        if (attacker.attackRange.max === 1) {
            gridCells[enemy.r][enemy.q].walkable = true;
            const path = findPath(gridCells, { x: attacker.q, y: attacker.r }, { x: enemy.q, y: enemy.r });
            if (path.length - 2 <= attacker.moveRange)
                attackableNodes.push({ uid: enemy.uid, character_id: enemy.character_id, x: enemy.q, y: enemy.r, distance: 1 });
        } else {
            const path = findPath(grid, { x: attacker.q, y: attacker.r }, { x: enemy.q, y: enemy.r });
            const distance = path.length - 1;
            const range = (skill?.range?.distance ?? skill?.range?.max_distance) ?? attacker.attackRange.max;
            if (distance <= range) {
                attackableNodes.push({ uid: enemy.uid, character_id: enemy.character_id, x: enemy.q, y: enemy.r, distance: distance });
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
    skill: Skill | null
): { ok: boolean, distance: number } => {
    const dx = attacker.q - target.q;
    const dy = attacker.r - target.r;
    const distance = Math.max(Math.abs(dx), Math.abs(dy));
    const maxReach = attacker.moveRange + (skill?.range?.max_distance ?? attacker.attackRange.max);
    return { ok: distance <= maxReach ? true : false, distance };
};


