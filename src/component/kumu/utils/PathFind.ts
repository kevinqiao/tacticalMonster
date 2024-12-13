import { GridPosition } from "../battle/types/GridTypes";

// 定义六个方向的偏移量，基于奇数行右偏移
const directionsEven = [
    { col: 1, row: 0 },  // 右
    { col: 0, row: -1 }, // 左上
    { col: -1, row: -1 },// 左上
    { col: -1, row: 0 }, // 左
    { col: -1, row: 1 }, // 左下
    { col: 0, row: 1 },  // 右下
];

const directionsOdd = [
    { col: 1, row: 0 },  // 右
    { col: 1, row: -1 }, // 右上
    { col: 0, row: -1 }, // 左上
    { col: -1, row: 0 }, // 左
    { col: 0, row: 1 },  // 左下
    { col: 1, row: 1 },  // 右下
];

/**
 * 计算六边形网格中的距离（基于奇数行偏移）
 */
const hexDistance = (a: GridPosition, b: GridPosition): number => {
    const dx = Math.abs(a.col - b.col);
    const dy = Math.abs(a.row - b.row) * 0.75;
    return Math.sqrt(dx * dx + dy * dy);
};

/**
 * 将奇数行偏移坐标转换为立方体坐标
 */
const offsetToCube = (hex: GridPosition) => {
    const x = hex.col - (hex.row - (hex.row & 1)) / 2;
    const z = hex.row * 0.75;
    const y = -x - z;
    return { x, y, z };
};

/**
 * 获取指定格子的所有邻居
 */
const getNeighbors = (pos: GridPosition): GridPosition[] => {
    const isOddRow = pos.row % 2 !== 0;
    const directions = isOddRow ? directionsOdd : directionsEven;
    
    return directions
        .map(dir => ({
            col: pos.col + dir.col,
            row: pos.row + dir.row
        }))
        .filter(neighbor => {
            const dx = Math.abs(neighbor.col - pos.col);
            const dy = Math.abs(neighbor.row - pos.row);
            return dx <= 1 && dy <= 1;
        });
};

export interface Hex {
    q: number;
    r: number;
}

// 添加转换函数
export const gridToHex = (grid: GridPosition): Hex => ({
    q: grid.col,
    r: grid.row
});

export const hexToGrid = (hex: Hex): GridPosition => ({
    col: hex.q,
    row: hex.r
});

export class PathFind {
    constructor(private width: number, private height: number) {}

    private isWalkable(pos: GridPosition): boolean {
        return pos.col >= 0 && pos.col < this.width && 
               pos.row >= 0 && pos.row < this.height;
    }

    findPath(start: GridPosition, end: GridPosition): GridPosition[] {
        type Node = {
            pos: GridPosition;
            g: number;
            h: number;
            f: number;
            parent: Node | null;
        };

        const openList: Node[] = [];
        const closedSet = new Set<string>();

        const startNode: Node = {
            pos: start,
            g: 0,
            h: hexDistance(start, end),
            f: hexDistance(start, end),
            parent: null,
        };

        openList.push(startNode);

        while (openList.length > 0) {
            openList.sort((a, b) => a.f - b.f);
            const currentNode = openList.shift()!;
            const currentKey = `${currentNode.pos.col},${currentNode.pos.row}`;

            if (currentNode.pos.col === end.col && currentNode.pos.row === end.row) {
                const path: GridPosition[] = [];
                let temp: Node | null = currentNode;
                while (temp) {
                    path.push(temp.pos);
                    temp = temp.parent;
                }
                return path.reverse();
            }

            closedSet.add(currentKey);

            const neighbors = getNeighbors(currentNode.pos);
            for (const neighbor of neighbors) {
                const neighborKey = `${neighbor.col},${neighbor.row}`;

                if (!this.isWalkable(neighbor) || closedSet.has(neighborKey)) {
                    continue;
                }

                const tentativeG = currentNode.g + 1;
                const openNode = openList.find(n => 
                    n.pos.col === neighbor.col && n.pos.row === neighbor.row
                );

                if (!openNode) {
                    openList.push({
                        pos: neighbor,
                        g: tentativeG,
                        h: hexDistance(neighbor, end),
                        f: tentativeG + hexDistance(neighbor, end),
                        parent: currentNode,
                    });
                } else if (tentativeG < openNode.g) {
                    openNode.g = tentativeG;
                    openNode.f = tentativeG + openNode.h;
                    openNode.parent = currentNode;
                }
            }
        }

        return [start, end];
    }
}

export const aStar = (
    start: Hex,
    goal: Hex,
    isWalkable: (q: number, r: number) => boolean
): Hex[] => {
    const pathFinder = new PathFind(8, 7); // 使用固定的网格大小
    const startGrid = hexToGrid(start);
    const goalGrid = hexToGrid(goal);
    const path = pathFinder.findPath(startGrid, goalGrid);
    return path.map(gridToHex);
};
