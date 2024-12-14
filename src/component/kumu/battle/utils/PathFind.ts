import { GridCell, HexNode } from "../model/CombatModels";

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
