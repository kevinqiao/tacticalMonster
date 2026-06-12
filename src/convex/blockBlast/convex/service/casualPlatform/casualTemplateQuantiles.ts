import type { ScoreQuantiles } from "../../shared/scoreQuantiles";

/** 与 casualPlatform `casualTournamentConfigs` Block Blast 模板 quantiles 对齐 */
const CASUAL_BB_QUANTILES_A: ScoreQuantiles = {
  p10: 3_000,
  p25: 4_500,
  p30: 5_500,
  p33: 6_000,
  p50: 7_000,
  p66: 8_500,
  p70: 9_500,
  p75: 10_500,
  p90: 12_000,
};
const CASUAL_BB_QUANTILES_B: ScoreQuantiles = {
  p10: 2_000,
  p25: 3_500,
  p30: 4_500,
  p33: 5_000,
  p50: 9_000,
  p66: 11_000,
  p70: 12_500,
  p75: 13_500,
  p90: 15_000,
};
const CASUAL_BB_QUANTILES_C: ScoreQuantiles = {
  p10: 1_000,
  p25: 2_500,
  p30: 3_500,
  p33: 4_000,
  p50: 6_500,
  p66: 9_000,
  p70: 10_000,
  p75: 11_000,
  p90: 18_000,
};
const CASUAL_BB_QUANTILES_SEASON_4P: ScoreQuantiles = {
  p10: 1_500,
  p25: 3_000,
  p30: 4_000,
  p33: 4_500,
  p50: 8_000,
  p66: 10_000,
  p70: 11_000,
  p75: 12_000,
  p90: 14_000,
};

const TEMPLATE_QUANTILES: Record<string, ScoreQuantiles> = {
  casual_async_a_bb: CASUAL_BB_QUANTILES_A,
  casual_async_b_bb: CASUAL_BB_QUANTILES_B,
  casual_async_c_bb: CASUAL_BB_QUANTILES_C,
  season_challenge_bb_1: CASUAL_BB_QUANTILES_SEASON_4P,
  /** 日榜无 reference quantiles；bot 不参与，pick 仍须返回合法 payload */
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
