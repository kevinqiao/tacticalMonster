import type { PortalWeeklyLeagueTierId } from "./portalWeeklyLeagueConfig";
import type { PortalTournamentDefinition } from "./portalTournamentConfigs";

export type PortalSeedTier = "easy" | "medium" | "hard";

export type PortalSuccessQuantile = "p25" | "p50" | "p75" | "p90";

export function isPortalSuccessQuantile(q: unknown): q is PortalSuccessQuantile {
  return q === "p25" || q === "p50" || q === "p75" || q === "p90";
}

/**
 * L3 A/B 档内友好排序键（越高越友好）。
 * 段 A 统一消费 onboardingScore（各游戏 L2 写入）；缺字段时选种层回退 playerEase。
 */
export type NewbieFriendlinessMetric = "playerEase" | "onboardingScore";

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
 * L3 主体：周联赛段位 → scoreTier 权重。
 * 不乘 friendliness / clearEase / onboarding。
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

/** A 更收紧、B 略放宽：档内 top 切片比例。 */
export const NEWBIE_FRIENDLINESS_FRACTION = {
  ritual_a: 0.25,
  transition_b: 0.4,
} as const;

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
  /**
   * Solo A/B/C ladder progress: settled runs that cleared the challenge
   * (`challengeSuccess !== false`). Fails do not advance A/B.
   */
  settledSoloCount?: number;
  /** Consecutive Solo challenge fails (challengeSuccess === false). */
  soloFailStreak?: number;
  daysSinceLastMatch?: number;
};

export type SeasonSeedPickPolicy = {
  tier: PortalSeedTier;
  /** Prefer top slice within tier by friendlinessMetric. */
  preferHighFriendliness: boolean;
  friendlinessMetric: NewbieFriendlinessMetric;
  friendlinessFraction: number;
  /**
   * @deprecated Use preferHighFriendliness + friendlinessMetric.
   * Kept so older call sites that only read playerEase still compile.
   */
  preferHighPlayerEase: boolean;
  /** @deprecated Use friendlinessFraction */
  playerEaseFraction: number;
  /** Override template success quantile (BB B: p25→p50; 其它 A: p50). */
  successQuantile?: PortalSuccessQuantile;
  /** BB 段 A：成功线 = 消一行/列固定分，不走分位。 */
  ritualOneLineClear?: boolean;
  segment: "ritual_a" | "transition_b" | "merged_c" | "multi";
};

export function resolveNewbieSoloSegment(
  settledSoloCount: number
): "ritual_a" | "transition_b" | "merged_c" {
  if (settledSoloCount <= 0) return "ritual_a";
  if (settledSoloCount <= 2) return "transition_b";
  return "merged_c";
}

/**
 * 统一 A/B 消费契约（与游戏无关）：
 * - 段 A：onboardingScore（各游戏 L2 按自有公式写入）
 * - 段 B：playerEase
 * gameType 保留参数以便日后扩展，当前不分支。
 */
export function resolveNewbieFriendlinessStrategy(
  _gameType: string,
  segment: "ritual_a" | "transition_b"
): { metric: NewbieFriendlinessMetric; fraction: number } {
  const fraction = NEWBIE_FRIENDLINESS_FRACTION[segment];
  if (segment === "transition_b") {
    return { metric: "playerEase", fraction };
  }
  return { metric: "onboardingScore", fraction };
}

/**
 * L3 season seed pick: league weights + Solo A/B/C + loss/return easy bias.
 * Game-specific A/B friendliness metrics (see resolveNewbieFriendlinessStrategy).
 */
export function resolveSeasonSeedPickPolicy(
  input: SeasonSeedPickPolicyInput
): SeasonSeedPickPolicy {
  const { def, sessionKey } = input;
  const gameType = def.gameType;

  const isSolo = def.matchType === "solo_p75" || def.maxPlayers <= 1;
  if (isSolo) {
    const segment = resolveNewbieSoloSegment(input.settledSoloCount ?? 0);
    if (segment === "ritual_a" || segment === "transition_b") {
      const { metric, fraction } = resolveNewbieFriendlinessStrategy(gameType, segment);
      const settled = input.settledSoloCount ?? 0;
      const bb = gameType === "block_blast";
      const ritualOneLineClear = bb && segment === "ritual_a";
      let successQuantile: PortalSuccessQuantile | undefined;
      if (ritualOneLineClear) {
        successQuantile = undefined;
      } else if (segment === "ritual_a") {
        successQuantile = "p50";
      } else if (bb) {
        // BB 段 B：settledSoloCount=1 → p25；=2 → p50
        successQuantile = settled <= 1 ? "p25" : "p50";
      } else {
        successQuantile = def.seedQuantileSuccess?.quantile ?? "p75";
      }
      return {
        tier: "easy",
        preferHighFriendliness: true,
        friendlinessMetric: metric,
        friendlinessFraction: fraction,
        preferHighPlayerEase: true,
        playerEaseFraction: fraction,
        successQuantile,
        ...(ritualOneLineClear ? { ritualOneLineClear: true } : {}),
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
    preferHighFriendliness: false,
    friendlinessMetric: "playerEase",
    friendlinessFraction: 0,
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
