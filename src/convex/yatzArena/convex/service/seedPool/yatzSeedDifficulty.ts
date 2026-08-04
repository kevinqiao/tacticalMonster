/**
 * Yatz pool tiering — relative by difficultyScore (= scoreP50).
 * Higher p50 → easier tier (aligned with Solitaire / season L2).
 */
import type { SeedPoolEntry } from "./yatzSeedPoolRunner";

export type YatzSeedTier = "easy" | "medium" | "hard";

export type SeedPoolTierQuotas = {
  easy: number;
  medium: number;
};

export type YatzTierCandidate = Omit<SeedPoolEntry, "tier"> & {
  tier?: YatzSeedTier;
};

/** Sort high p50 first, then cut easy / medium / hard quotas. */
export function assignYatzTiers(
  candidates: YatzTierCandidate[],
  quotas: SeedPoolTierQuotas = { easy: 0.3, medium: 0.4 }
): SeedPoolEntry[] {
  const sorted = [...candidates].sort((a, b) => {
    if (b.difficultyScore !== a.difficultyScore) {
      return b.difficultyScore - a.difficultyScore;
    }
    return a.seedId.localeCompare(b.seedId);
  });

  const n = sorted.length;
  const easyCut = Math.floor(n * quotas.easy);
  const mediumCut = Math.floor(n * (quotas.easy + quotas.medium));

  return sorted.map((c, i) => {
    let tier: YatzSeedTier;
    if (i < easyCut) tier = "easy";
    else if (i < mediumCut) tier = "medium";
    else tier = "hard";
    return { ...c, tier };
  });
}
