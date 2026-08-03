import type { ScoreQuantiles } from "../../shared/scoreQuantiles";

/** 与 v3 池 burst 计分 rollout 分位对齐（easy tier，2026-06 regen） */
const CASUAL_BB_QUANTILES_A: ScoreQuantiles = {
  p10: 24,
  p25: 48,
  p30: 64,
  p33: 72,
  p50: 104,
  p66: 152,
  p70: 168,
  p75: 203,
  p90: 304,
};
/** medium tier rollout 分位 */
const CASUAL_BB_QUANTILES_B: ScoreQuantiles = {
  p10: 16,
  p25: 40,
  p30: 48,
  p33: 56,
  p50: 80,
  p66: 120,
  p70: 139,
  p75: 168,
  p90: 307,
};
/** hard tier rollout 分位 */
const CASUAL_BB_QUANTILES_C: ScoreQuantiles = {
  p10: 16,
  p25: 24,
  p30: 32,
  p33: 32,
  p50: 56,
  p66: 96,
  p70: 120,
  p75: 155,
  p90: 307,
};
/** 4 人 season / 综合池 rollout 分位 */
const CASUAL_BB_QUANTILES_SEASON_4P: ScoreQuantiles = {
  p10: 16,
  p25: 32,
  p30: 40,
  p33: 48,
  p50: 80,
  p66: 128,
  p70: 144,
  p75: 176,
  p90: 307,
};

const TEMPLATE_QUANTILES: Record<string, ScoreQuantiles> = {
  casual_async_a_bb: CASUAL_BB_QUANTILES_A,
  casual_async_b_bb: CASUAL_BB_QUANTILES_B,
  casual_async_c_bb: CASUAL_BB_QUANTILES_C,
  season_challenge_bb_1: CASUAL_BB_QUANTILES_SEASON_4P,
  /** @deprecated 日榜已下线；历史 run 回放仍用 A 档分位 */
  casual_daily_solo_challenge_block_blast: CASUAL_BB_QUANTILES_A,
};

export type CasualSeedTier = "easy" | "medium" | "hard";

export function templateSeedId(templateId: string): string {
  return `template:${templateId.trim()}`;
}

export function parseTemplateIdFromSeedId(seedId: string): string | null {
  const s = seedId.trim();
  if (!s.startsWith("template:")) return null;
  const id = s.slice("template:".length).trim();
  return id.length > 0 ? id : null;
}

export function resolveTemplateQuantiles(templateId: string): ScoreQuantiles | null {
  const key = templateId.trim();
  if (!key) return null;
  return TEMPLATE_QUANTILES[key] ?? null;
}

export function resolveTemplateTier(templateId: string): CasualSeedTier {
  if (templateId.includes("_b_bb") || templateId === "casual_async_b_bb") return "medium";
  if (templateId.includes("_c_bb") || templateId === "casual_async_c_bb") return "hard";
  return "easy";
}
