/**
 * Block Blast 块型目录（policy v4）。
 *
 * v4 相对 v3：
 * - 同 18 种模板（I4/I5、大 L、加权 bucket）
 * - 分段格数权重：开局 → 中盘 → 高潮（大块+填缝）→ 终盘高压
 * - 手内弱约束：同一手前两块均 >3 格时，第三块偏向 ≤3 格（不看盘）
 *
 * 变更须 bump BLOCK_BLAST_POLICY_VERSION 并重生成 seed pool。
 */

export type BlockBlastShapeTemplate = {
    shape: number[][];
    cells: number;
};

/** 约 24 手 × 3 块 ≈ 72 个 shape 出完后达到满进度 */
export const BLOCK_BLAST_PROGRESS_FULL_SHAPE_INDEX = 72;

/** 开局关键帧（亦作 EARLY 别名） */
export const BLOCK_BLAST_SHAPE_CELL_WEIGHTS_EARLY: Readonly<Record<number, number>> = {
    1: 0.06,
    2: 0.14,
    3: 0.3,
    4: 0.3,
    5: 0.2,
};

/** 终盘关键帧（亦作 LATE 别名） */
export const BLOCK_BLAST_SHAPE_CELL_WEIGHTS_LATE: Readonly<Record<number, number>> = {
    1: 0.03,
    2: 0.08,
    3: 0.17,
    4: 0.37,
    5: 0.35,
};

/** v4 分段关键帧：progress t ∈ [0,1] */
export const BLOCK_BLAST_WEIGHT_KEYFRAMES: ReadonlyArray<{
    t: number;
    weights: Readonly<Record<number, number>>;
}> = [
    { t: 0, weights: BLOCK_BLAST_SHAPE_CELL_WEIGHTS_EARLY },
    {
        t: 0.25,
        weights: { 1: 0.04, 2: 0.1, 3: 0.28, 4: 0.34, 5: 0.24 },
    },
    {
        t: 0.55,
        weights: { 1: 0.04, 2: 0.1, 3: 0.2, 4: 0.36, 5: 0.3 },
    },
    {
        // 高潮窗：略抬填缝，保留大块爆发机会
        t: 0.8,
        weights: { 1: 0.05, 2: 0.12, 3: 0.18, 4: 0.35, 5: 0.3 },
    },
    { t: 1, weights: BLOCK_BLAST_SHAPE_CELL_WEIGHTS_LATE },
];

/** @deprecated 仅兼容旧引用；请用 resolveCellWeightsForShapeIndex */
export const BLOCK_BLAST_SHAPE_CELL_WEIGHTS = BLOCK_BLAST_SHAPE_CELL_WEIGHTS_EARLY;

export function countShapeCells(shape: number[][]): number {
    let n = 0;
    for (const row of shape) {
        for (const cell of row) {
            if (cell !== 0) n += 1;
        }
    }
    return n;
}

function define(shape: number[][]): BlockBlastShapeTemplate {
    return { shape, cells: countShapeCells(shape) };
}

export const BLOCK_BLAST_SHAPE_TEMPLATES: BlockBlastShapeTemplate[] = [
    define([[1]]),
    define([[1, 1]]),
    define([[1], [1]]),
    define([
        [1, 0],
        [1, 1],
    ]),
    define([
        [0, 1],
        [1, 1],
    ]),
    define([[1, 1, 1]]),
    define([[1], [1], [1]]),
    define([
        [1, 1],
        [1, 1],
    ]),
    define([
        [1, 1, 1],
        [0, 1, 0],
    ]),
    define([
        [0, 1],
        [1, 1],
        [0, 1],
    ]),
    define([
        [1, 1, 0],
        [0, 1, 1],
    ]),
    define([
        [0, 1, 1],
        [1, 1, 0],
    ]),
    define([[1, 1, 1, 1]]),
    define([[1], [1], [1], [1]]),
    define([[1, 1, 1, 1, 1]]),
    define([[1], [1], [1], [1], [1]]),
    define([
        [1, 0],
        [1, 0],
        [1, 1, 1],
    ]),
    define([
        [1, 1, 1],
        [0, 0, 1],
        [0, 0, 1],
    ]),
];

/** @deprecated 别名 */
export const BLOCK_BLAST_SHAPE_TEMPLATES_V2 = BLOCK_BLAST_SHAPE_TEMPLATES;

export const SHAPE_TEMPLATES: number[][][] = BLOCK_BLAST_SHAPE_TEMPLATES.map((t) => t.shape);

type WeightedShape = { shape: number[][]; weight: number };

const CELL_BUCKETS = [1, 2, 3, 4, 5] as const;

export function resolveProgressForShapeIndex(shapeIndex: number): number {
    if (shapeIndex <= 0) return 0;
    return Math.min(1, shapeIndex / BLOCK_BLAST_PROGRESS_FULL_SHAPE_INDEX);
}

function normalizeWeights(raw: Record<number, number>): Record<number, number> {
    const sum = CELL_BUCKETS.reduce((acc, c) => acc + (raw[c] ?? 0), 0);
    const out: Record<number, number> = {};
    for (const cells of CELL_BUCKETS) {
        out[cells] = sum > 0 ? (raw[cells] ?? 0) / sum : 0;
    }
    return out;
}

/** 分段关键帧线性插值，归一化后和为 1 */
export function resolveCellWeightsForShapeIndex(shapeIndex: number): Record<number, number> {
    const t = resolveProgressForShapeIndex(shapeIndex);
    const frames = BLOCK_BLAST_WEIGHT_KEYFRAMES;
    if (t <= frames[0]!.t) {
        return normalizeWeights({ ...frames[0]!.weights });
    }
    const last = frames[frames.length - 1]!;
    if (t >= last.t) {
        return normalizeWeights({ ...last.weights });
    }
    let i = 0;
    while (i < frames.length - 1 && frames[i + 1]!.t < t) i += 1;
    const a = frames[i]!;
    const b = frames[i + 1]!;
    const span = b.t - a.t || 1;
    const u = (t - a.t) / span;
    const raw: Record<number, number> = {};
    for (const cells of CELL_BUCKETS) {
        const wa = a.weights[cells] ?? 0;
        const wb = b.weights[cells] ?? 0;
        raw[cells] = wa + (wb - wa) * u;
    }
    return normalizeWeights(raw);
}

/** 手内第三块救场：抬高 ≤3 格权重 */
export function preferSmallCellWeights(
    cellWeights: Record<number, number>,
    boost = 3
): Record<number, number> {
    const raw: Record<number, number> = {};
    for (const cells of CELL_BUCKETS) {
        const w = cellWeights[cells] ?? 0;
        raw[cells] = cells <= 3 ? w * boost : w * 0.35;
    }
    return normalizeWeights(raw);
}

function buildWeightedShapes(
    templates: BlockBlastShapeTemplate[],
    cellWeights: Record<number, number>
): WeightedShape[] {
    const byCells = new Map<number, BlockBlastShapeTemplate[]>();
    for (const t of templates) {
        const list = byCells.get(t.cells) ?? [];
        list.push(t);
        byCells.set(t.cells, list);
    }

    const weighted: WeightedShape[] = [];
    for (const cells of CELL_BUCKETS) {
        const bucketWeight = cellWeights[cells] ?? 0;
        const list = byCells.get(cells);
        if (!list?.length || bucketWeight <= 0) continue;
        const each = bucketWeight / list.length;
        for (const t of list) {
            weighted.push({ shape: t.shape, weight: each });
        }
    }
    return weighted;
}

function pickFromWeighted(rng: () => number, weighted: WeightedShape[]): number[][] {
    const r = rng();
    let acc = 0;
    for (const entry of weighted) {
        acc += entry.weight;
        if (r < acc) {
            return entry.shape.map((row) => [...row]);
        }
    }
    const fallback = weighted[weighted.length - 1]!;
    return fallback.shape.map((row) => [...row]);
}

export type PickWeightedShapeOptions = {
    /** 为 true 时抬高 ≤3 格（手内弱约束） */
    preferSmall?: boolean;
};

/** shapeIndex = 全局出块序号（与 generateShapes 的 startIndex + i 一致） */
export function pickWeightedShapeTemplate(
    rng: () => number,
    shapeIndex = 0,
    opts: PickWeightedShapeOptions = {}
): number[][] {
    let cellWeights = resolveCellWeightsForShapeIndex(shapeIndex);
    if (opts.preferSmall) {
        cellWeights = preferSmallCellWeights(cellWeights);
    }
    const weighted = buildWeightedShapes(BLOCK_BLAST_SHAPE_TEMPLATES, cellWeights);
    return pickFromWeighted(rng, weighted);
}

export function shapeTemplateWeights(
    shapeIndex = 0,
    templates: BlockBlastShapeTemplate[] = BLOCK_BLAST_SHAPE_TEMPLATES
): Map<string, number> {
    const cellWeights = resolveCellWeightsForShapeIndex(shapeIndex);
    const byCells = new Map<number, BlockBlastShapeTemplate[]>();
    for (const t of templates) {
        const list = byCells.get(t.cells) ?? [];
        list.push(t);
        byCells.set(t.cells, list);
    }
    const out = new Map<string, number>();
    for (const cells of CELL_BUCKETS) {
        const bucketWeight = cellWeights[cells] ?? 0;
        const list = byCells.get(cells);
        if (!list?.length) continue;
        const each = bucketWeight / list.length;
        for (const t of list) {
            out.set(JSON.stringify(t.shape), each);
        }
    }
    return out;
}
