/**
 * Block Blast 块型目录（policy v6）。
 *
 * v6 相对 v5：
 * - 同 18 种模板（I4/I5、大 L、加权 bucket）
 * - 开局即高压：4–5 格更高；中盘/终盘继续抬大块
 * - 高潮窗几乎不抬填缝；手内救场关闭（见 GameEngine）
 *
 * 变更须 bump BLOCK_BLAST_POLICY_VERSION 并重生成 seed pool。
 */

export type BlockBlastShapeTemplate = {
    shape: number[][];
    cells: number;
};

/** 约 24 手 × 3 块 ≈ 72 个 shape 出完后达到满进度 */
export const BLOCK_BLAST_PROGRESS_FULL_SHAPE_INDEX = 72;

/** 开局关键帧（亦作 EARLY 别名）— v6 开局即偏大块 */
export const BLOCK_BLAST_SHAPE_CELL_WEIGHTS_EARLY: Readonly<Record<number, number>> = {
    1: 0.03,
    2: 0.08,
    3: 0.22,
    4: 0.36,
    5: 0.31,
};

/** 终盘关键帧（亦作 LATE 别名） */
export const BLOCK_BLAST_SHAPE_CELL_WEIGHTS_LATE: Readonly<Record<number, number>> = {
    1: 0.015,
    2: 0.045,
    3: 0.12,
    4: 0.38,
    5: 0.44,
};

/** v6 分段关键帧：progress t ∈ [0,1] */
export const BLOCK_BLAST_WEIGHT_KEYFRAMES: ReadonlyArray<{
    t: number;
    weights: Readonly<Record<number, number>>;
}> = [
    { t: 0, weights: BLOCK_BLAST_SHAPE_CELL_WEIGHTS_EARLY },
    {
        t: 0.18,
        weights: { 1: 0.025, 2: 0.07, 3: 0.185, 4: 0.38, 5: 0.34 },
    },
    {
        t: 0.42,
        weights: { 1: 0.02, 2: 0.055, 3: 0.155, 4: 0.385, 5: 0.385 },
    },
    {
        // 高潮窗：几乎不抬填缝，持续大块压
        t: 0.72,
        weights: { 1: 0.02, 2: 0.05, 3: 0.14, 4: 0.39, 5: 0.4 },
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

/** 手内第三块救场（v6 引擎默认关闭；保留工具函数供测试/回退） */
export function preferSmallCellWeights(
    cellWeights: Record<number, number>,
    boost = 1.5
): Record<number, number> {
    const raw: Record<number, number> = {};
    for (const cells of CELL_BUCKETS) {
        const w = cellWeights[cells] ?? 0;
        raw[cells] = cells <= 3 ? w * boost : w * 0.65;
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
