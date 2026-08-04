import type { PortalWeeklyLeagueTierId } from "./portalWeeklyLeagueConfig";
import type { PortalTournamentDefinition } from "./portalTournamentConfigs";

export type PortalSeedTier = "easy" | "medium" | "hard";

export type PortalSuccessQuantile = "p50" | "p75" | "p90";

/**
 * 多人开桌：按 sessionKey 确定性加权选首选档（空池时仍按 catalog 回退其它档）。
 * Legacy fallback when league tier is unavailable.
 */
export const MULTI_SEED_TIER_WEIGHTS: Readonly<Record<PortalSeedTier, number>> = {
  easy: 0.15,
  medium: 0.4,
  hard: 0.45,
};

/**
 * L3 主体：周联赛段位 → scoreTier 权重（docs/portal-season-experience.md §3）。
 * 不乘 playerEase / clearEase。
 */
export const LEAGUE_SEED_TIER_WEIGHTS: Readonly<
  Record<PortalWeeklyLeagueTierId, Readonly<Record<PortalSeedTier, number>>>
> = {
  bronze: { easy: 0.45, medium: 0.4, hard: 0.15 },
  silver: { easy: 0.3, medium: 0.45, hard: 0.25 },
  gold: { easy: 0.2, medium: 0.45, hard: 0.35 },
  platinum: { easy: 0.1, medium: 0.4, hard: 0.5 },
  diamond: { easy: 0.05, medium: 0.35, hard: 0.6 },
};

const TIER_ORDER: readonly PortalSeedTier[] = ["easy", "medium", "hard"];

/** FNV-1a → [0, 1) */
export function hashUnitInterval(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 0x100000000;
}

export function pickWeightedSeedTier(
  sessionKey: string,
  weights: Readonly<Record<PortalSeedTier, number>> = MULTI_SEED_TIER_WEIGHTS
): PortalSeedTier {
  const total = TIER_ORDER.reduce((s, t) => s + (weights[t] ?? 0), 0);
  const u = hashUnitInterval(sessionKey) * (total > 0 ? total : 1);
  let acc = 0;
  for (const tier of TIER_ORDER) {
    acc += weights[tier] ?? 0;
    if (u < acc) return tier;
  }
  return "hard";
}

/** Shift weight mass one step toward easy (连败 / 回归叠加). */
export function shiftWeightsTowardEasy(
  weights: Readonly<Record<PortalSeedTier, number>>,
  steps = 1
): Record<PortalSeedTier, number> {
  let next: Record<PortalSeedTier, number> = {
    easy: weights.easy,
    medium: weights.medium,
    hard: weights.hard,
  };
  for (let s = 0; s < steps; s++) {
    const fromHard = next.hard * 0.5;
    const fromMed = next.medium * 0.35;
    next = {
      easy: next.easy + fromMed + fromHard * 0.5,
      medium: next.medium - fromMed + fromHard * 0.5,
      hard: next.hard - fromHard,
    };
  }
  return next;
}

export type SeasonSeedPickPolicyInput = {
  def: PortalTournamentDefinition;
  sessionKey: string;
  weeklyLeagueTier?: PortalWeeklyLeagueTierId;
  /** Settled Solo runs already completed for this game (0 = first Solo ever). */
  settledSoloCount?: number;
  /** Consecutive Solo challenge fails (challengeSuccess === false). */
  soloFailStreak?: number;
  daysSinceLastMatch?: number;
};

export type SeasonSeedPickPolicy = {
  tier: PortalSeedTier;
  /** Prefer top slice of tier by playerEaseScore (ritual / transition). */
  preferHighPlayerEase: boolean;
  playerEaseFraction: number;
  /** Override template success quantile (ritual → p50). */
  successQuantile?: PortalSuccessQuantile;
  segment: "ritual_a" | "transition_b" | "merged_c" | "multi" | "block_blast";
};

export function resolveNewbieSoloSegment(
  settledSoloCount: number
): "ritual_a" | "transition_b" | "merged_c" {
  if (settledSoloCount <= 0) return "ritual_a";
  if (settledSoloCount <= 2) return "transition_b";
  return "merged_c";
}

/**
 * L3 season seed pick: league weights + Solo A/B/C + loss/return easy bias.
 * block_blast stays hard (existing product lock).
 */
export function resolveSeasonSeedPickPolicy(
  input: SeasonSeedPickPolicyInput
): SeasonSeedPickPolicy {
  const { def, sessionKey } = input;

  if (def.gameType === "block_blast") {
    return {
      tier: "hard",
      preferHighPlayerEase: false,
      playerEaseFraction: 0,
      segment: "block_blast",
      successQuantile: def.seedQuantileSuccess?.quantile,
    };
  }

  const isSolo = def.matchType === "solo_p75" || def.maxPlayers <= 1;
  if (isSolo) {
    const segment = resolveNewbieSoloSegment(input.settledSoloCount ?? 0);
    if (segment === "ritual_a") {
      return {
        tier: "easy",
        preferHighPlayerEase: true,
        playerEaseFraction: 0.35,
        successQuantile: "p50",
        segment,
      };
    }
    if (segment === "transition_b") {
      return {
        tier: "easy",
        preferHighPlayerEase: true,
        playerEaseFraction: 0.5,
        successQuantile: def.seedQuantileSuccess?.quantile ?? "p75",
        segment,
      };
    }
  }

  const league = input.weeklyLeagueTier ?? "bronze";
  let weights: Record<PortalSeedTier, number> = {
    ...LEAGUE_SEED_TIER_WEIGHTS[league],
  };

  const failStreak = input.soloFailStreak ?? 0;
  const daysAway = input.daysSinceLastMatch ?? 0;
  if (failStreak >= 3 || daysAway > 14) {
    weights = shiftWeightsTowardEasy(weights, 1);
  }

  const tier = pickWeightedSeedTier(sessionKey, weights);
  return {
    tier,
    preferHighPlayerEase: false,
    playerEaseFraction: 0,
    successQuantile: isSolo
      ? def.seedQuantileSuccess?.quantile ?? "p75"
      : undefined,
    segment: isSolo ? "merged_c" : "multi",
  };
}

/**
 * Preferred seed tier for open-table pick.
 * Prefer resolveSeasonSeedPickPolicy when player signals are available.
 */
export function resolveSeedTierForTemplate(
  def: PortalTournamentDefinition,
  sessionKey?: string,
  weeklyLeagueTier?: PortalWeeklyLeagueTierId
): PortalSeedTier {
  return resolveSeasonSeedPickPolicy({
    def,
    sessionKey: sessionKey ?? "default",
    weeklyLeagueTier,
    settledSoloCount: 99,
  }).tier;
}
