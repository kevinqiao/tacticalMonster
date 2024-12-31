import { AttackableNode, GridCell, HexNode, WalkableNode } from "../types/CombatTypes";

export const findPath = (
    grid: GridCell[][],
    start: HexNode,
    goal: HexNode
): HexNode[] => {
  
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

        // 找到 F 值最小的节点
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
            // 重建路径
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

    return [start]; // 如果找不到路径，返回起点
};



export const getWalkableNodes = (
    gridCells: GridCell[][],
    start: { x: number, y: number },
    moveRange: number
): WalkableNode[] => {
    const movableNodes: WalkableNode[] = [];
    const visited = new Set<string>();
    const queue: { node: HexNode, distance: number }[] = [];

    // 添加起始点
    queue.push({ node: { x: start.x, y: start.y }, distance: 0 });
    visited.add(`${start.x},${start.y}`);

    // 六边形网格的邻居方向
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

        // 添加到可移动格子列表，包含距离信息
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
   attacker:{q:number,r:number,uid:string,character_id:string},
   enemies: { q: number, r: number, uid: string, character_id: string }[],
   attackRange: {min:number,max:number}
): AttackableNode[] => {
    const attackableNodes: AttackableNode[] = [];
 
    for(const enemy of enemies){  
        const distance = calculateDistance([ attacker.r,attacker.q], [enemy.r, enemy.q]);
        if(distance >= attackRange.min && distance <= attackRange.max){
            attackableNodes.push({uid:enemy.uid, character_id:enemy.character_id, x:enemy.q, y:enemy.r, distance });
        }
    }
    return attackableNodes;
};
const offsetToAxial = (row:number, col:number) => [col - Math.floor(row / 2), row];

// 计算两点之间的六边形曼哈顿距离
const calculateDistance = (
  point1: [number, number], 
  point2: [number, number]
): number => {
    const [q1, r1] = offsetToAxial(...point1);
    const [q2, r2] = offsetToAxial(...point2);
    return Math.max(
        Math.abs(q2 - q1),
        Math.abs(r2 - r1),
        Math.abs(-(q1 + r1) + (q2 + r2))
    );
};
