import type { PortalTournamentDefinition } from "./portalTournamentConfigs";

export type PortalSeedTier = "easy" | "medium" | "hard";

/**
 * 多人开桌：按 sessionKey 确定性加权选首选档（空池时仍按 catalog 回退其它档）。
 * easy 压低，medium/hard 为主。
 */
export const MULTI_SEED_TIER_WEIGHTS: Readonly<Record<PortalSeedTier, number>> = {
  easy: 0.15,
  medium: 0.4,
  hard: 0.45,
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
  const u = hashUnitInterval(sessionKey);
  let acc = 0;
  for (const tier of TIER_ORDER) {
    acc += weights[tier] ?? 0;
    if (u < acc) return tier;
  }
  return "hard";
}

/**
 * Preferred seed tier for open-table pick.
 * - block_blast：solo / multi 一律 hard
 * - 其它 solo_p75：medium
 * - 其它 multi_ranked：按 sessionKey 加权 medium/hard
 */
export function resolveSeedTierForTemplate(
  def: PortalTournamentDefinition,
  sessionKey?: string
): PortalSeedTier {
  if (def.gameType === "block_blast") return "hard";
  if (def.matchType === "multi_ranked") {
    return pickWeightedSeedTier(sessionKey ?? "multi_default");
  }
  return "medium";
}
