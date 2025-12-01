/**
 * Hex坐标计算工具
 * 用于处理六边形网格的坐标计算、距离、邻接关系等
 */

export interface HexCoord {
    q: number;
    r: number;
}

/**
 * Hex坐标距离计算（六边形网格中的移动步数）
 */
export function hexDistance(a: HexCoord, b: HexCoord): number {
    return (Math.abs(a.q - b.q) + 
            Math.abs(a.q + a.r - b.q - b.r) + 
            Math.abs(a.r - b.r)) / 2;
}

/**
 * 获取指定距离内的所有Hex坐标
 */
export function getHexesInRange(center: HexCoord, radius: number): HexCoord[] {
    const hexes: HexCoord[] = [];
    
    for (let q = -radius; q <= radius; q++) {
        const r1 = Math.max(-radius, -q - radius);
        const r2 = Math.min(radius, -q + radius);
        for (let r = r1; r <= r2; r++) {
            hexes.push({ q: center.q + q, r: center.r + r });
        }
    }
    
    return hexes;
}

/**
 * 获取相邻的6个Hex坐标
 */
export function getNeighbors(hex: HexCoord): HexCoord[] {
    const directions = [
        { q: 1, r: 0 },
        { q: 1, r: -1 },
        { q: 0, r: -1 },
        { q: -1, r: 0 },
        { q: -1, r: 1 },
        { q: 0, r: 1 },
    ];
    
    return directions.map(dir => ({
        q: hex.q + dir.q,
        r: hex.r + dir.r,
    }));
}

/**
 * 检查坐标是否在区域内
 */
export function isInRegion(
    coord: HexCoord,
    region: { minQ: number; maxQ: number; minR: number; maxR: number }
): boolean {
    return coord.q >= region.minQ &&
           coord.q <= region.maxQ &&
           coord.r >= region.minR &&
           coord.r <= region.maxR;
}

/**
 * 检查坐标是否在圆形区域内（基于Hex距离）
 */
export function isInCircle(
    coord: HexCoord,
    center: HexCoord,
    radius: number
): boolean {
    return hexDistance(coord, center) <= radius;
}

/**
 * 检查两个坐标是否相邻
 */
export function isAdjacent(a: HexCoord, b: HexCoord): boolean {
    return hexDistance(a, b) === 1;
}

/**
 * 检查坐标是否与任何已存在的坐标重叠
 */
export function hasOverlap(coord: HexCoord, existing: HexCoord[]): boolean {
    return existing.some(ex => ex.q === coord.q && ex.r === coord.r);
}

/**
 * 从区域内的可用坐标中选择一个随机坐标
 * 排除已占用的坐标和禁区
 */
export function selectRandomPositionInZone(
    region: { minQ: number; maxQ: number; minR: number; maxR: number },
    exclude: HexCoord[],
    random: { randomInt: (min: number, max: number) => number }
): HexCoord {
    const candidates: HexCoord[] = [];
    
    // 生成区域内所有可能的坐标
    for (let q = region.minQ; q <= region.maxQ; q++) {
        for (let r = region.minR; r <= region.maxR; r++) {
            const coord = { q, r };
            if (!hasOverlap(coord, exclude)) {
                candidates.push(coord);
            }
        }
    }
    
    if (candidates.length === 0) {
        throw new Error("No available positions in zone");
    }
    
    const index = random.randomInt(0, candidates.length);
    return candidates[index];
}

/**
 * 围绕中心位置生成小怪位置
 * 确保小怪位置不重叠且距离Boss主位置合理
 */
export function selectMinionPosition(
    bossMain: HexCoord,
    radius: number,
    existingPositions: HexCoord[],
    random: { randomInt: (min: number, max: number) => number; choice: <T>(arr: T[]) => T }
): HexCoord {
    // 获取Boss周围半径内的所有坐标
    const candidates = getHexesInRange(bossMain, radius)
        .filter(coord => 
            // 排除Boss主位置
            !(coord.q === bossMain.q && coord.r === bossMain.r) &&
            // 排除已存在的位置
            !hasOverlap(coord, existingPositions) &&
            // 至少距离Boss 1格
            hexDistance(coord, bossMain) >= 1
        );
    
    if (candidates.length === 0) {
        // 如果半径内没有可用位置，扩大搜索范围
        return selectRandomPositionInZone(
            {
                minQ: bossMain.q - radius - 2,
                maxQ: bossMain.q + radius + 2,
                minR: bossMain.r - radius - 2,
                maxR: bossMain.r + radius + 2,
            },
            [bossMain, ...existingPositions],
            random
        );
    }
    
    return random.choice(candidates);
}
