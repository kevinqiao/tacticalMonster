/**
 * Yatz (Yahtzee) shared types — Convex ↔ frontend
 *
 * 骰面由 seed manifest 展开（见 yatzSeedManifest.ts），非运行时 rngIndex 分叉。
 */

export const YATZ_DICE_COUNT = 5;
export const YATZ_ROUND_COUNT = 13;
/** Platform hard cap for casual runs (5 minutes; no time bonus in score). */
export const YATZ_MATCH_TIME_LIMIT_SEC = 300;
export const YATZ_CATEGORIES = [
  "ones",
  "twos",
  "threes",
  "fours",
  "fives",
  "sixes",
  "three_kind",
  "four_kind",
  "full_house",
  "small_straight",
  "large_straight",
  "yahtzee",
  "chance",
] as const;

export type YatzCategory = (typeof YATZ_CATEGORIES)[number];

export enum YatzGameStatus {
  PLAYING = 0,
  COMPLETED = 1,
  CANCELLED = 2,
}

export type YatzCategoryScores = Partial<Record<YatzCategory, number>>;

export type YatzGameState = {
  _id?: string;
  gameId: string;
  dice: number[];
  held: boolean[];
  rollCount: number;
  roundIndex: number;
  categoryScores: YatzCategoryScores;
  yahtzeeBonus: number;
  yahtzeeScored: boolean;
  /** 建局时写入；与 expandYatzSeedManifest 的 policy 一致，便于回放/审计 */
  manifestPolicyVersion?: string;
  score: number;
  status: YatzGameStatus;
  seed?: string;
  playStartedAt?: number;
  dueTime?: number;
  casualTimeoutScheduledId?: string;
  lastUpdate?: number;
  recordedOps?: import("../service/seedPool/yatzRecordedOpTypes").YatzRecordedStep[];
  lastOpAt?: number;
  targetScore?: number;
};

export const YATZ_CATEGORY_LABELS: Record<YatzCategory, string> = {
  ones: "Ones",
  twos: "Twos",
  threes: "Threes",
  fours: "Fours",
  fives: "Fives",
  sixes: "Sixes",
  three_kind: "3 of a Kind",
  four_kind: "4 of a Kind",
  full_house: "Full House",
  small_straight: "Sm Straight",
  large_straight: "Lg Straight",
  yahtzee: "Yatz",
  chance: "Chance",
};
