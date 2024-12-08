

// 定义六个方向的偏移量，基于奇数行右偏移
const directionsEven = [
    { q: 1, r: 0 },  // 右
    { q: 0, r: -1 }, // 左上
    { q: -1, r: -1 },// 左上
    { q: -1, r: 0 }, // 左
    { q: -1, r: 1 }, // 左下
    { q: 0, r: 1 },  // 右下
    
];

const directionsOdd = [
    { q: 1, r: 0 },  // 右
    { q: 1, r: -1 }, // 右上
    { q: 0, r: -1 }, // 左上
    { q: -1, r: 0 }, // 左
    { q: 0, r: 1 },  // 左下
    { q: 1, r: 1 },  // 右下
];

// 定义格子坐标
export interface Hex {
    q: number;
    r: number;
}

/**
 * 计算六边形网格中的距离（基于奇数行偏移）
 * @param a - 起点，包含 q 和 r
 * @param b - 终点，包含 q 和 r
 * @returns 两点之间的距离
 */
export const hexDistance = (a: Hex, b: Hex): number => {
    const cubeA = offsetToCube(a);
    const cubeB = offsetToCube(b);
    return cubeDistance(cubeA, cubeB);
};

/**
 * 将奇数行偏移坐标转换为立方体坐标
 * @param hex - 六边形坐标，包含 q 和 r
 * @returns 立方体坐标
 */
const offsetToCube = (hex: Hex) => {
    const x = hex.q - (hex.r - (hex.r & 1)) / 2;
    const z = hex.r;
    const y = -x - z;
    return { x, y, z };
};

/**
 * 计算立方体坐标系中的距离
 * @param a - 起点，包含 x, y, z
 * @param b - 终点，包含 x, y, z
 * @returns 两点之间的距离
 */
const cubeDistance = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number => {
    return (Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.z - b.z)) / 2;
};

/**
 * 获取指定格子的所有邻居，基于奇数行右偏移
 * @param q - 当前格子的 q 坐标
 * @param r - 当前格子的 r 坐标
 * @returns 邻居格子的数组
 */
const getNeighbors = (q: number, r: number): Hex[] => {
    const directions = r % 2 === 0 ? directionsEven : directionsOdd;
    return directions.map(dir => ({ q: q + dir.q, r: r + dir.r }));
};

/**
 * A* 寻路算法，基于奇数行右偏移
 * @param start - 起点，包含 q 和 r
 * @param goal - 终点，包含 q 和 r
 * @param isWalkable - 判断指定格子是否可行走的函数
 * @returns 路径数组或 null（如果没有路径）
 */
export const aStar = (
    start: Hex,
    goal: Hex,
    isWalkable: (q: number, r: number) => boolean
): Hex[] | null => {
    type Node = {
        hex: Hex;
        g: number; // 从起点到当前节点的实际代价
        h: number; // 当前节点到终点的启发式代价
        f: number; // 总代价
        parent: Node | null;
    };

    const openList: Node[] = [];
    const closedSet = new Set<string>();

    const startNode: Node = {
        hex: start,
        g: 0,
        h: hexDistance(start, goal),
        f: hexDistance(start, goal),
        parent: null,
    };

    openList.push(startNode);

    while (openList.length > 0) {
        // 从开放列表中选择 f 值最低的节点
        openList.sort((a, b) => a.f - b.f);
        const currentNode = openList.shift()!;

        const currentKey = `${currentNode.hex.q},${currentNode.hex.r}`;

        // 如果当前节点是目标节点，重建路径
        if (currentNode.hex.q === goal.q && currentNode.hex.r === goal.r) {
            const path: Hex[] = [];
            let temp: Node | null = currentNode;
            while (temp) {
                path.push(temp.hex);
                temp = temp.parent;
            }
            return path.reverse();
        }

        closedSet.add(currentKey);

        // 遍历邻居
        const neighbors = getNeighbors(currentNode.hex.q, currentNode.hex.r);
        for (const neighbor of neighbors) {
            const neighborKey = `${neighbor.q},${neighbor.r}`;

            // 忽略不可通行或已在关闭列表中的节点
            if (!isWalkable(neighbor.q, neighbor.r) || closedSet.has(neighborKey)) {
                continue;
            }

            const tentativeG = currentNode.g + 1; // 假设每步移动成本为1

            // 检查开放列表中是否存在该邻居
            const openNode = openList.find(n => n.hex.q === neighbor.q && n.hex.r === neighbor.r);

            if (!openNode) {
                // 新节点，添加到开放列表
                openList.push({
                    hex: neighbor,
                    g: tentativeG,
                    h: hexDistance(neighbor, goal),
                    f: tentativeG + hexDistance(neighbor, goal),
                    parent: currentNode,
                });
            } else if (tentativeG < openNode.g) {
                // 更优路径，更新节点信息
                openNode.g = tentativeG;
                openNode.f = tentativeG + openNode.h;
                openNode.parent = currentNode;
            }
        }
    }

    // 无路径找到
    return null;
};
