interface Point {
    x: number;
    y: number;
}
const getLinePath = (x0: number, y0: number, x1: number, y1: number): Point[] => {
    const path: Point[] = [];

    // 计算增量
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);

    // 判断主要方向
    const sx = (x0 < x1) ? 1 : -1;
    const sy = (y0 < y1) ? 1 : -1;

    let err = dx - dy;

    // 使用Bresenham算法生成路径，直到到达终点
    let currentX = x0;
    let currentY = y0;
    while (currentX !== x1 || currentY !== y1) {
        path.push({ x: currentX, y: currentY });

        const e2 = 2 * err;

        if (e2 > -dy) {
            err -= dy;
            currentX += sx;
        }

        if (e2 < dx) {
            err += dx;
            currentY += sy;
        }
    }

    // 将终点添加到路径中
    path.push({ x: x1, y: y1 });

    return path;
};
// 定义HexNode接口
export interface HexNode {
    x: number;
    y: number;
    g: number; // 从起点到该节点的实际代价
    h: number; // 从该节点到终点的估算代价
    f: number; // 总代价 f = g + h
    walkable: boolean; // 该节点是否可通行
    parent: HexNode | null; // 用于路径回溯
}

// 定义网格类型
export type GridMap = HexNode[][];

// A* 算法实现
const aStarSearch = (grid: GridMap, start: HexNode, end: HexNode): HexNode[] | null => {
    const openList: HexNode[] = [];
    const closedList: Set<string> = new Set();

    openList.push(start);

    while (openList.length > 0) {
        // 从开放列表中找出F值最小的节点
        const currentNode = openList.reduce((prev, curr) => (prev.f < curr.f ? prev : curr));

        // 如果找到目标节点，生成路径
        if (currentNode.x === end.x && currentNode.y === end.y) {
            const path: HexNode[] = [];
            let current: HexNode | null = currentNode;
            while (current) {
                path.unshift(current);
                current = current.parent;
            }
            return path;
        }

        // 移出开放列表，加入封闭列表
        openList.splice(openList.indexOf(currentNode), 1);
        closedList.add(`${currentNode.x},${currentNode.y}`);

        // 遍历邻居节点
        const neighbors = getHexNeighbors(grid, currentNode);
        for (const neighbor of neighbors) {
            if (closedList.has(`${neighbor.x},${neighbor.y}`) || !neighbor.walkable) {
                continue;
            }

            const tentativeG = currentNode.g + 1; // 假设移动代价为1

            if (!openList.includes(neighbor)) {
                neighbor.g = tentativeG;
                neighbor.h = heuristic(neighbor, end);
                neighbor.f = neighbor.g + neighbor.h;
                neighbor.parent = currentNode;
                openList.push(neighbor);
            } else if (tentativeG < neighbor.g) {
                neighbor.g = tentativeG;
                neighbor.f = neighbor.g + neighbor.h;
                neighbor.parent = currentNode;
            }
        }
    }

    // 找不到路径
    return null;
};

// 获取六边形网格的邻居节点
const getHexNeighbors = (grid: GridMap, node: HexNode): HexNode[] => {
    const { x, y } = node;
    const neighbors: HexNode[] = [];

    // 六边形的六个方向
    const directions = [
        { dx: 1, dy: 0 },   // 右
        { dx: -1, dy: 0 },  // 左
        { dx: 0, dy: 1 },   // 右下
        { dx: 0, dy: -1 },  // 左上
        { dx: 1, dy: -1 },  // 右上
        { dx: -1, dy: 1 }   // 左下
    ];

    directions.forEach(({ dx, dy }) => {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < grid.length && ny < grid[0].length) {
            neighbors.push(grid[nx][ny]);
        }
    });

    return neighbors;
};

// 启发式函数（六边形网格的距离计算）
const heuristic = (a: HexNode, b: HexNode): number =>
    (Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.x + a.y - b.x - b.y)) / 2;

// 初始化网格
const initializeGrid = (width: number, height: number): GridMap =>
    Array.from({ length: width }, (_, x) =>
        Array.from({ length: height }, (_, y) => ({
            x,
            y,
            g: 0,
            h: 0,
            f: 0,
            walkable: true,
            parent: null
        }))
    );

// 示例用法
const grid = initializeGrid(10, 10);
const start = grid[0][0];
const end = grid[9][9];
const path = aStarSearch(grid, start, end);

if (path) {
    console.log("找到路径:", path.map(node => `(${node.x}, ${node.y})`).join(" -> "));
} else {
    console.log("未找到路径");
}
export { aStarSearch, getLinePath };

