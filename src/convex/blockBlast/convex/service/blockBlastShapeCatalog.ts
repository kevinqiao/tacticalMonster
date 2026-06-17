/**
 * Block Blast 块型目录（policy v3+）。
 *
 * v3 相对 v2：
 * - 同 18 种模板（I4/I5、大 L、加权 bucket）
 * - 按 shapeIndex 在「开局 / 中后期」bucket 权重间插值，越往后越大块越多
 *
 * 变更须 bump BLOCK_BLAST_POLICY_VERSION 并重生成 seed pool。
 */

export type BlockBlastShapeTemplate = {
    shape: number[][];
    cells: number;
};

/** 约 24 手 × 3 块 ≈ 72 个 shape 出完后达到满进度 */
export const BLOCK_BLAST_PROGRESS_FULL_SHAPE_INDEX = 72;

/** v3 开局：略保留小填缝块，便于上手 */
export const BLOCK_BLAST_SHAPE_CELL_WEIGHTS_EARLY: Readonly<Record<number, number>> = {
    1: 0.05,
    2: 0.12,
    3: 0.28,
    4: 0.32,
    5: 0.23,
};

/** v3 中后期：压缩 1~3 格，抬高 4~5 格直线 / 大 L */
export const BLOCK_BLAST_SHAPE_CELL_WEIGHTS_LATE: Readonly<Record<number, number>> = {
    1: 0.02,
    2: 0.06,
    3: 0.17,
    4: 0.38,
    5: 0.37,
};

/** @deprecated 仅兼容旧引用；v3 请用 resolveCellWeightsForShapeIndex */
export const BLOCK_BLAST_SHAPE_CELL_WEIGHTS = BLOCK_BLAST_SHAPE_CELL_WEIGHTS_EARLY;

function countCells(shape: number[][]): number {
    let n = 0;
    for (const row of shape) {
        for (const cell of row) {
            if (cell !== 0) n += 1;
        }
    }
    return n;
}

function define(shape: number[][]): BlockBlastShapeTemplate {
    return { shape, cells: countCells(shape) };
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

/** 开局 → 中后期线性插值，归一化后和为 1 */
export function resolveCellWeightsForShapeIndex(shapeIndex: number): Record<number, number> {
    const t = resolveProgressForShapeIndex(shapeIndex);
    const raw: Record<number, number> = {};
    for (const cells of CELL_BUCKETS) {
        const early = BLOCK_BLAST_SHAPE_CELL_WEIGHTS_EARLY[cells] ?? 0;
        const late = BLOCK_BLAST_SHAPE_CELL_WEIGHTS_LATE[cells] ?? 0;
        raw[cells] = early + (late - early) * t;
    }
    const sum = CELL_BUCKETS.reduce((acc, c) => acc + raw[c]!, 0);
    const out: Record<number, number> = {};
    for (const cells of CELL_BUCKETS) {
        out[cells] = sum > 0 ? raw[cells]! / sum : 0;
    }
    return out;
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

/** shapeIndex = 全局出块序号（与 generateShapes 的 startIndex + i 一致） */
export function pickWeightedShapeTemplate(rng: () => number, shapeIndex = 0): number[][] {
    const cellWeights = resolveCellWeightsForShapeIndex(shapeIndex);
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
