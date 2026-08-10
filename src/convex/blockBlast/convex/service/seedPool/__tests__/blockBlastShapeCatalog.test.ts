import { describe, expect, it } from "vitest";
import { generateShapes } from "../../BlockBlastGameEngine";
import {
  BLOCK_BLAST_PROGRESS_FULL_SHAPE_INDEX,
  BLOCK_BLAST_SHAPE_CELL_WEIGHTS_EARLY,
  BLOCK_BLAST_SHAPE_CELL_WEIGHTS_LATE,
  BLOCK_BLAST_SHAPE_TEMPLATES,
  pickWeightedShapeTemplate,
  resolveCellWeightsForShapeIndex,
  setL1PresetOverride,
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
  it("templates cover 1–6 cells with diagonals, L/J, I5/I6 and 2×3", () => {
    const cellSets = new Set(BLOCK_BLAST_SHAPE_TEMPLATES.map((t) => t.cells));
    expect(cellSets).toEqual(new Set([1, 2, 3, 4, 5, 6]));
    expect(BLOCK_BLAST_SHAPE_TEMPLATES.some((t) => t.shape[0]?.length === 6)).toBe(true);
    expect(BLOCK_BLAST_SHAPE_TEMPLATES.filter((t) => t.cells === 4).length).toBeGreaterThanOrEqual(15);
    expect(BLOCK_BLAST_SHAPE_TEMPLATES.filter((t) => t.cells === 5).length).toBeGreaterThanOrEqual(4);
    expect(BLOCK_BLAST_SHAPE_TEMPLATES.filter((t) => t.cells === 6).length).toBeGreaterThanOrEqual(4);
    const diagonals = BLOCK_BLAST_SHAPE_TEMPLATES.filter(
      (t) =>
        t.cells === 2 &&
        t.shape.length === 2 &&
        t.shape[0]!.length === 2 &&
        t.shape[0]![0]! + t.shape[0]![1]! === 1 &&
        t.shape[1]![0]! + t.shape[1]![1]! === 1
    );
    expect(diagonals.length).toBe(2);
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
    for (const cells of [1, 2, 3, 4, 5, 6]) {
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

  it("long shape stream includes 5–6 cell blocks with limited 1-cell rate", () => {
    const shapes = generateShapes(48, "blockblast-pool:v9:shape-probe", 0);
    const cells = shapes.map((s) => countCells(s.shape));
    expect(cells.filter((c) => c >= 5).length).toBeGreaterThan(0);
    expect(cells.filter((c) => c === 1).length / cells.length).toBeLessThan(0.12);
    expect(cells.filter((c) => c >= 4).length / cells.length).toBeGreaterThan(0.4);
  });

  it("setL1PresetOverride changes cell weights used by resolve", () => {
    try {
      setL1PresetOverride({
        progressFull: 10,
        keyframes: [
          { t: 0, weights: { 1: 1, 2: 0, 3: 0, 4: 0, 5: 0 } },
          { t: 1, weights: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 1 } },
        ],
      });
      expect(resolveCellWeightsForShapeIndex(0)[1]).toBeCloseTo(1, 5);
      expect(resolveCellWeightsForShapeIndex(10)[5]).toBeCloseTo(1, 5);
    } finally {
      setL1PresetOverride(null);
    }
    expect(resolveCellWeightsForShapeIndex(0)[1]).toBeCloseTo(
      BLOCK_BLAST_SHAPE_CELL_WEIGHTS_EARLY[1]!,
      5
    );
  });

  it("v9 early hand rescue: third piece biased small after two large in opening", () => {
    let smallThird = 0;
    let largeHands = 0;
    for (let seed = 0; seed < 120; seed++) {
      const shapes = generateShapes(24, `blockblast-pool:v9:hand-${seed}`, 0);
      for (let h = 0; h < 8; h++) {
        const a = countCells(shapes[h * 3]!.shape);
        const b = countCells(shapes[h * 3 + 1]!.shape);
        const c = countCells(shapes[h * 3 + 2]!.shape);
        if (a > 4 && b > 4) {
          largeHands += 1;
          if (c <= 3) smallThird += 1;
        }
      }
    }
    expect(largeHands).toBeGreaterThan(0);
    expect(smallThird / largeHands).toBeGreaterThan(0.55);
  });
});
