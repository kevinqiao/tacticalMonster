import { Attributes, Stats } from "../service/model/CharacterModels";

export interface Character {
    x: number;  // 当前列号
    y: number;  // 当前行号
    movementRange: number;  // 角色可移动的最大范围
}
// 定义HexNode接口
export interface HexNode {
    x: number;
    y: number;
    walkable?: boolean;
    cost?: number;
}


export const getHexNeighbors = (grid: HexNode[][], node: { x: number; y: number }): HexNode[] => {
    console.log(node)
    const { x, y } = node;
    const neighbors: HexNode[] = [];

    const directionsOdd = [
        { dx: 1, dy: 0 },    // 右
        { dx: -1, dy: 0 },   // 左
        { dx: 1, dy: 1 },    // 右下
        { dx: 1, dy: -1 },   // 右上
        { dx: 0, dy: 1 },   // 左下
        { dx: 0, dy: -1 }   // 左上
    ];

    const directionsEven = [
        { dx: 1, dy: 0 },    // 右
        { dx: -1, dy: 0 },   // 左
        { dx: 0, dy: 1 },    // 右下
        { dx: 0, dy: -1 },   // 右上
        { dx: -1, dy: 1 },   // 左下
        { dx: -1, dy: -1 }   // 左上
    ];



    // 根据行号 y 是奇数还是偶数，选择相应的方向偏移
    const directions = y % 2 === 0 ? directionsEven : directionsOdd;

    const rlen = grid.length;     // 网格的行数
    const clen = grid[0].length;  // 网格的列数

    // 遍历邻居方向，计算新的列号和行号
    for (const { dx, dy } of directions) {
        const nx = x + dx;  // 新的列号
        const ny = y + dy;  // 新的行号

        // 边界检查，确保计算出的 nx 和 ny 在网格范围内
        if (nx >= 0 && ny >= 0 && nx < clen && ny < rlen) {
            neighbors.push(grid[ny][nx]);  // 使用 [ny][nx] 访问网格，因为 x 是列，y 是行
        }
    }
    console.log(neighbors)
    return neighbors;
};


// 获取可移动范围内的每个格子的路径
const getReachableTiles = (grid: HexNode[][], character: { x: number; y: number; movementRange: number }): { node: HexNode, path: HexNode[], totalCost: number }[] => {
    const reachableTiles: { node: HexNode, path: HexNode[], totalCost: number }[] = [];
    const costMap: Map<string, number> = new Map();  // 记录到达每个格子的最小代价
    const queue: { node: HexNode, path: HexNode[], totalCost: number }[] = [];  // 队列

    // 起始点
    const startNode = grid[character.y][character.x];
    queue.push({ node: startNode, path: [startNode], totalCost: 0 });
    costMap.set(`${character.x},${character.y}`, 0);

    // 定义六边形网格中的六个方向
    const directionsOdd = [
        { dx: 1, dy: 0 },    // 右
        { dx: -1, dy: 0 },   // 左
        { dx: 1, dy: 1 },    // 右下
        { dx: 1, dy: -1 },   // 右上
        { dx: 0, dy: 1 },   // 左下
        { dx: 0, dy: -1 }   // 左上
    ];

    const directionsEven = [
        { dx: 1, dy: 0 },    // 右
        { dx: -1, dy: 0 },   // 左
        { dx: 0, dy: 1 },    // 右下
        { dx: 0, dy: -1 },   // 右上
        { dx: -1, dy: 1 },   // 左下
        { dx: -1, dy: -1 }   // 左上
    ];

    const rlen = grid.length;
    const clen = grid[0].length;

    // 使用 BFS 遍历网格
    while (queue.length > 0) {
        // 按累积代价升序处理队列
        queue.sort((a, b) => a.totalCost - b.totalCost);
        const { node, path, totalCost } = queue.shift()!;

        // 如果当前代价超过移动范围，则不再探索该路径
        if (totalCost > character.movementRange) continue;

        // 将当前格子及其路径加入可移动范围列表
        reachableTiles.push({ node, path: JSON.parse(JSON.stringify(path)), totalCost });  // 深拷贝 path 确保没有引用问题

        // 选择方向，根据奇偶行来选择偏移量
        const directions = node.y % 2 === 0 ? directionsEven : directionsOdd;

        // 遍历所有邻居
        for (const { dx, dy } of directions) {
            const nx = node.x + dx;
            const ny = node.y + dy;

            // 检查边界
            if (nx >= 0 && ny >= 0 && nx < clen && ny < rlen) {
                const neighbor = grid[ny][nx];

                // 只处理可通行的格子
                if (neighbor.walkable) {
                    const newTotalCost = totalCost + (neighbor.cost ?? 1);
                    const key = `${nx},${ny}`;

                    // 如果累积代价不超过角色的最大移动力，继续扩展
                    if (newTotalCost <= character.movementRange && (!costMap.has(key) || newTotalCost < costMap.get(key)!)) {
                        const newPath = JSON.parse(JSON.stringify(path));  // 深拷贝路径
                        newPath.push(neighbor);  // 扩展路径
                        queue.push({
                            node: neighbor,
                            path: newPath,  // 将当前路径扩展
                            totalCost: newTotalCost
                        });
                        costMap.set(key, newTotalCost);
                    }
                }
            }
        }
    }
    return reachableTiles;
};

const findWalkables = (character: { x: number; y: number; movementRange: number }, characters: { x: number; y: number }[], gridCells: HexNode[][]) => {
    const grids: HexNode[][] = gridCells.map<HexNode[]>((row, y) =>
        row.map((node, x) => {
            const c = characters?.find((c) => c.x === x && c.y === y);
            return { ...node, x, y, walkable: c ? false : node.walkable };
        })
    );
    const walkablCells = getReachableTiles(grids, character);
    if (walkablCells)
        return walkablCells
            .filter((w) => w.node.walkable)
            .map((c) => ({
                x: c.node.x,
                y: c.node.y,
                path: c.path,
                distance: c.totalCost,
                turnEnd: (character.movementRange && c.totalCost < character.movementRange) ? 0 : 1,
            }));
    return;
}
const isEnemyInMeleeRange = (grid: HexNode[][], character: Character, enemy: { x: number; y: number }): boolean => {
    // 获取我方角色的可行走格子
    const reachableTiles = getReachableTiles(grid, character);

    // 获取敌方角色相邻的格子
    const enemyNode = grid[enemy.y][enemy.x];
    const enemyNeighbors = getHexNeighbors(grid, enemyNode);

    // 检查敌方角色的相邻格子是否在我方角色的可行走范围内
    return enemyNeighbors.some(neighbor =>
        reachableTiles.some(tile => tile.node.x === neighbor.x && tile.node.y === neighbor.y)
    );
};
const offsetToCube = (x: number, y: number): { q: number, r: number, s: number } => {
    const q = x;
    const r = y - (x - (x & 1)) / 2;
    const s = -q - r;
    return { q, r, s };
};
const distance = (start: HexNode, end: HexNode): number => {
    const startCube = offsetToCube(start.x, start.y);
    const endCube = offsetToCube(end.x, end.y);

    // 立方坐标的距离计算公式
    return Math.max(
        Math.abs(startCube.q - endCube.q),
        Math.abs(startCube.r - endCube.r),
        Math.abs(startCube.s - endCube.s)
    );
};

const getPosition = (size: number, x: number, y: number): { col: number; row: number } => {
    const row = Math.floor(y / (size * 0.75));
    const col = row % 2 === 0 ? Math.floor(x / size) : Math.floor((x - size / 2) / size);
    return { col, row }
}
const calculateStats = (attributes: Attributes): Stats => {
    const { strength, dexterity, constitution, intelligence } = attributes;

    return {
        hp: {
            current: constitution * 10,
            max: constitution * 10, // 每点constitution提供10点最大HP
        },
        mp: {
            current: intelligence * 8,
            max: intelligence * 8, // 每点intelligence提供8点最大MP
        },
        stamina: {
            current: constitution * 5 + strength * 2,
            max: constitution * 5 + strength * 2, // constitution和strength联合决定耐力
        },
        attack: strength * 2, // 每点strength增加2点攻击力
        defense: constitution * 1.5, // 每点constitution增加1.5点防御力
        speed: dexterity * 2, // 每点dexterity增加2点速度
        crit_rate: dexterity * 0.1, // 每点dexterity增加0.1%暴击率
        evasion: dexterity * 0.5, // 每点dexterity增加0.5%回避率
    };
};
export { calculateStats, distance, findWalkables, getPosition };

