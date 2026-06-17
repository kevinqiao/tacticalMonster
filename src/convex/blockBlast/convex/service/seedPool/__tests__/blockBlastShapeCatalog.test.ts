import { describe, expect, it } from "vitest";
import { generateShapes } from "../../BlockBlastGameEngine";
import {
  BLOCK_BLAST_PROGRESS_FULL_SHAPE_INDEX,
  BLOCK_BLAST_SHAPE_CELL_WEIGHTS_EARLY,
  BLOCK_BLAST_SHAPE_CELL_WEIGHTS_LATE,
  BLOCK_BLAST_SHAPE_TEMPLATES,
  pickWeightedShapeTemplate,
  resolveCellWeightsForShapeIndex,
  shapeTemplateWeights,
} from "../../blockBlastShapeCatalog";

function countCells(shape: number[][]): number {
  let n = 0;
  for (const row of shape) {
    for (const cell of row) {
      if (cell !== 0) n += 1;
    }
  }
  return n;
}

function avgCellCountForShapeIndex(shapeIndex: number, samples = 400): number {
  let rng = (shapeIndex + 1) * 0.123456789;
  const next = () => {
    rng = (rng * 9301 + 49297) % 233280;
    return rng / 233280;
  };
  let sum = 0;
  for (let i = 0; i < samples; i++) {
    sum += countCells(pickWeightedShapeTemplate(next, shapeIndex));
  }
  return sum / samples;
}

describe("blockBlastShapeCatalog", () => {
  it("templates cover 1–5 cells with I4/I5 and big L", () => {
    const cellSets = new Set(BLOCK_BLAST_SHAPE_TEMPLATES.map((t) => t.cells));
    expect(cellSets).toEqual(new Set([1, 2, 3, 4, 5]));
    expect(BLOCK_BLAST_SHAPE_TEMPLATES.some((t) => t.shape[0]?.length === 5)).toBe(true);
    expect(BLOCK_BLAST_SHAPE_TEMPLATES.filter((t) => t.cells === 5).length).toBeGreaterThanOrEqual(4);
  });

  it("early weights match EARLY bucket at shapeIndex 0", () => {
    const weights = shapeTemplateWeights(0);
    let total = 0;
    const byCells: Record<number, number> = {};
    for (const t of BLOCK_BLAST_SHAPE_TEMPLATES) {
      const w = weights.get(JSON.stringify(t.shape)) ?? 0;
      total += w;
      byCells[t.cells] = (byCells[t.cells] ?? 0) + w;
    }
    expect(total).toBeCloseTo(1, 5);
    for (const [cells, target] of Object.entries(BLOCK_BLAST_SHAPE_CELL_WEIGHTS_EARLY)) {
      expect(byCells[Number(cells)]).toBeCloseTo(target, 5);
    }
  });

  it("late weights approach LATE bucket at full progress", () => {
    const cellWeights = resolveCellWeightsForShapeIndex(BLOCK_BLAST_PROGRESS_FULL_SHAPE_INDEX);
    for (const cells of [1, 2, 3, 4, 5]) {
      expect(cellWeights[cells]).toBeCloseTo(BLOCK_BLAST_SHAPE_CELL_WEIGHTS_LATE[cells]!, 5);
    }
  });

  it("progress increases expected average cell count", () => {
    const early = avgCellCountForShapeIndex(0);
    const late = avgCellCountForShapeIndex(BLOCK_BLAST_PROGRESS_FULL_SHAPE_INDEX);
    expect(late).toBeGreaterThan(early);
  });

  it("generateShapes is deterministic for same seed", () => {
    const a = generateShapes(6, "blockblast-shape-test-seed", 0);
    const b = generateShapes(6, "blockblast-shape-test-seed", 0);
    expect(a.map((s) => s.shape)).toEqual(b.map((s) => s.shape));
  });

  it("long shape stream includes 5-cell blocks with limited 1-cell rate early", () => {
    const shapes = generateShapes(48, "blockblast-pool:v3:shape-probe", 0);
    const cells = shapes.map((s) => countCells(s.shape));
    expect(cells.filter((c) => c === 5).length).toBeGreaterThan(0);
    expect(cells.filter((c) => c === 1).length / cells.length).toBeLessThan(0.1);
  });
});
