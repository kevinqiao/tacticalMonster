import { describe, expect, it } from "vitest";
import { assignTiers } from "../towerSeedDifficulty";
import { processOneSeed } from "../towerSeedPoolRunner";
import type { TierCandidate } from "../towerRecordedOpTypes";

describe("tower seed pool", () => {
  it("accepts distinct procedural seeds", () => {
    const seen = new Set<string>();
    const accepted: TierCandidate[] = [];
    for (let i = 0; i < 8; i++) {
      const r = processOneSeed(i, "test-v1", { rolloutCount: 4, matchSeconds: 480 }, seen);
      if (r.kind === "accepted") accepted.push(r.candidate);
    }
    expect(accepted.length).toBeGreaterThan(0);
  });

  it("rejects duplicate map fingerprints", () => {
    const seen = new Set<string>();
    const first = processOneSeed(0, "test-v1", { rolloutCount: 4, matchSeconds: 480 }, seen);
    expect(first.kind).toBe("accepted");
    const dup = processOneSeed(0, "test-v1", { rolloutCount: 4, matchSeconds: 480 }, seen);
    expect(dup.kind).toBe("rejected");
    if (dup.kind === "rejected") expect(dup.entry.reason).toBe("duplicate_map");
  });

  it("assigns easy/medium/hard tiers from quotas", () => {
    const candidates: TierCandidate[] = Array.from({ length: 9 }, (_, i) => ({
      seedId: `tower-pool:v1:${i}`,
      poolVersion: "v1",
      difficultyScore: i * 100,
      metrics: {} as TierCandidate["metrics"],
      rolloutSummaries: [],
    }));
    const entries = assignTiers(candidates);
    expect(entries).toHaveLength(9);
    expect(new Set(entries.map((e) => e.tier))).toEqual(new Set(["easy", "medium", "hard"]));
  });
});
