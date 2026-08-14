/** Client mirror of prosperity milestone tiers (display-only rewards). */

export type ProsperityMilestoneTier = {
  id: string;
  threshold: number;
  title: string;
  titleZh: string;
  blurb: string;
  reached: boolean;
};

export type ProsperityMilestonesView = {
  score: number;
  unlockedIds: string[];
  unlocked: Array<{ id: string; threshold: number; title: string; titleZh: string; blurb: string }>;
  next: ({ remaining: number } & ProsperityMilestoneTier) | null;
  tiers: ProsperityMilestoneTier[];
};

export const FALLBACK_PROSPERITY_MILESTONES: ProsperityMilestonesView = {
  score: 0,
  unlockedIds: [],
  unlocked: [],
  next: {
    id: "pros_25",
    threshold: 25,
    title: "Awakening Square",
    titleZh: "苏醒广场",
    blurb: "Town plaque unlocked in Mayor's Office.",
    reached: false,
    remaining: 25,
  },
  tiers: [
    {
      id: "pros_25",
      threshold: 25,
      title: "Awakening Square",
      titleZh: "苏醒广场",
      blurb: "Town plaque unlocked in Mayor's Office.",
      reached: false,
    },
    {
      id: "pros_50",
      threshold: 50,
      title: "Growing Main Street",
      titleZh: "成长主街",
      blurb: "Prosperity banner on your Mayor profile.",
      reached: false,
    },
    {
      id: "pros_75",
      threshold: 75,
      title: "Busy Mayfield",
      titleZh: "繁忙 Mayfield",
      blurb: "Map district label flair (coming soon).",
      reached: false,
    },
    {
      id: "pros_100",
      threshold: 100,
      title: "Golden Mayfield",
      titleZh: "黄金 Mayfield",
      blurb: "Legend mayor title on Me tab.",
      reached: false,
    },
  ],
};
