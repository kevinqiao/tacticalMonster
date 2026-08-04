/**
 * Yatz bot personas: 3 decision styles (稳健 / 标准 / 贪冲) + stochastic variance + pacing.
 * Manifest is fixed to seedId; rollout r only changes persona (r%3) and policy RNG stream.
 */

export const YATZ_DECISION_POLICY_VERSION = "yatz-decision-v2";

export type YatzDecisionStyle = "steady" | "standard" | "aggressive";

export type YatzDecisionKnobs = {
  /**
   * While rerolls remain: if best immediate score ≥ this, commit to that category
   * (hold for it). Higher → ignore small made scores and keep chasing big boxes.
   */
  bankImmediateMin: number;
  /** When building from zero: min of-a-kind count to chase yahtzee. */
  minDomForYahtzeeChase: number;
  /** When building: min unique straight faces to chase large/small straight. */
  minStraightKeepForLarge: number;
  minStraightKeepForSmall: number;
  /**
   * Final pick: among categories within `pickSlack` of the best score,
   * prefer big boxes (aggressive) or safe boxes (steady).
   */
  pickSlack: number;
  /** Final pick preference when scores are close. */
  pickPrefer: "safe" | "neutral" | "big";
};

/** Same-persona variance — seeded by `${seedId}|rollout|${r}` (Solitaire-style). */
export type YatzStochasticKnobs = {
  /** ± amplitude on bankImmediateMin each target decision. */
  bankJitterAmp: number;
  /** P(skip bank even when threshold met) → keep chasing. */
  skipBankRate: number;
  /** P(pick among top chase candidates instead of #1). */
  exploreTargetRate: number;
  /** ± amplitude on pickSlack at final pick. */
  pickSlackJitterAmp: number;
  /** P(uniform among score contenders instead of prefer/best). */
  explorePickRate: number;
  /** P(flip one random die in the hold mask). */
  holdNoiseRate: number;
};

export type YatzPersona = {
  id: YatzDecisionStyle;
  decision: YatzDecisionKnobs;
  stochastic: YatzStochasticKnobs;
  thinkTimeScale: {
    roll: number;
    toggle_hold: number;
    pick_category: number;
  };
};

/** 稳健：有分就倾向落地；少冲 Yahtzee/大顺；探索偏低 */
const STEADY: YatzPersona = {
  id: "steady",
  decision: {
    bankImmediateMin: 10,
    minDomForYahtzeeChase: 4,
    minStraightKeepForLarge: 4,
    minStraightKeepForSmall: 3,
    pickSlack: 8,
    pickPrefer: "safe",
  },
  stochastic: {
    bankJitterAmp: 3,
    skipBankRate: 0.08,
    exploreTargetRate: 0.12,
    pickSlackJitterAmp: 2,
    explorePickRate: 0.15,
    holdNoiseRate: 0.08,
  },
  thinkTimeScale: { roll: 1.05, toggle_hold: 1.05, pick_category: 1.1 },
};

/** 标准：greedy 默认气质 + 中等探索 */
const STANDARD: YatzPersona = {
  id: "standard",
  decision: {
    bankImmediateMin: 1,
    minDomForYahtzeeChase: 3,
    minStraightKeepForLarge: 3,
    minStraightKeepForSmall: 2,
    pickSlack: 0,
    pickPrefer: "neutral",
  },
  stochastic: {
    bankJitterAmp: 4,
    skipBankRate: 0.12,
    exploreTargetRate: 0.18,
    pickSlackJitterAmp: 2,
    explorePickRate: 0.2,
    holdNoiseRate: 0.1,
  },
  thinkTimeScale: { roll: 1.0, toggle_hold: 1.0, pick_category: 1.15 },
};

/** 贪冲：小分不锁死，更盯大牌；探索偏高 */
const AGGRESSIVE: YatzPersona = {
  id: "aggressive",
  decision: {
    bankImmediateMin: 25,
    minDomForYahtzeeChase: 2,
    minStraightKeepForLarge: 2,
    minStraightKeepForSmall: 2,
    pickSlack: 10,
    pickPrefer: "big",
  },
  stochastic: {
    bankJitterAmp: 6,
    skipBankRate: 0.18,
    exploreTargetRate: 0.25,
    pickSlackJitterAmp: 4,
    explorePickRate: 0.25,
    holdNoiseRate: 0.12,
  },
  thinkTimeScale: { roll: 0.95, toggle_hold: 1.0, pick_category: 1.2 },
};

export const YATZ_DECISION_PERSONAS: readonly YatzPersona[] = [STEADY, STANDARD, AGGRESSIVE];

export function personaForRollout(rolloutIndex: number): YatzPersona {
  return YATZ_DECISION_PERSONAS[Math.abs(rolloutIndex) % YATZ_DECISION_PERSONAS.length]!;
}

export function decisionStyleForRollout(rolloutIndex: number): YatzDecisionStyle {
  return personaForRollout(rolloutIndex).id;
}
