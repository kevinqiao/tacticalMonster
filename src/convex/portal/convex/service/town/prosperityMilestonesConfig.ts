import { PROSPERITY_MILESTONES as PROSPERITY_MILESTONES_GENERATED } from "../../data/townEconomyGenerated";

/** Prosperity milestones — cosmetic / display only; never gate tournaments or pay large coin. */
export type ProsperityMilestoneConfig = {
  id: string;
  threshold: number;
  title: string;
  titleZh: string;
  blurb: string;
};

/** SSOT: scripts/portal/economy/mayfield-zone-economy.json → townEconomyGenerated.ts */
export const PROSPERITY_MILESTONES: readonly ProsperityMilestoneConfig[] =
  PROSPERITY_MILESTONES_GENERATED;

export function prosperityMilestonesForScore(score: number) {
  const unlocked = PROSPERITY_MILESTONES.filter((m) => score >= m.threshold);
  const next = PROSPERITY_MILESTONES.find((m) => score < m.threshold) ?? null;
  return {
    score,
    unlockedIds: unlocked.map((m) => m.id),
    unlocked,
    next: next
      ? {
          ...next,
          remaining: Math.max(0, next.threshold - score),
        }
      : null,
    tiers: PROSPERITY_MILESTONES.map((m) => ({
      ...m,
      reached: score >= m.threshold,
    })),
  };
}

export function mergeProsperityMilestoneIds(score: number, existing: string[] | undefined): string[] {
  const view = prosperityMilestonesForScore(score);
  return [...new Set([...(existing ?? []), ...view.unlockedIds])];
}
