/** Prosperity milestones — cosmetic / display only; never gate tournaments or pay large coin. */

export type ProsperityMilestoneConfig = {
  id: string;
  threshold: number;
  title: string;
  titleZh: string;
  blurb: string;
};

export const PROSPERITY_MILESTONES: ProsperityMilestoneConfig[] = [
  {
    id: "pros_25",
    threshold: 25,
    title: "Awakening Square",
    titleZh: "苏醒广场",
    blurb: "Town plaque unlocked in Mayor's Office.",
  },
  {
    id: "pros_50",
    threshold: 50,
    title: "Growing Main Street",
    titleZh: "成长主街",
    blurb: "Prosperity banner on your Mayor profile.",
  },
  {
    id: "pros_75",
    threshold: 75,
    title: "Busy Mayfield",
    titleZh: "繁忙 Mayfield",
    blurb: "Map district label flair (coming soon).",
  },
  {
    id: "pros_100",
    threshold: 100,
    title: "Golden Mayfield",
    titleZh: "黄金 Mayfield",
    blurb: "Legend mayor title on Me tab.",
  },
];

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
