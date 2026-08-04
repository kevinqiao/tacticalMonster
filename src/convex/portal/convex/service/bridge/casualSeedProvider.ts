import { internal } from "../../_generated/api";
import type { PortalTournamentDefinition } from "../../data/portalTournamentConfigs";
import { getPartnerGameRegistration } from "../../data/partnerGameRegistry";
import { resolveSeasonSeedPickPolicy } from "../../data/portalSeedTierPolicy";
import {
  bridgePickSeed,
  type SeedPoolRuntimeCtx,
} from "../botFill/seedRolloutBridge";
import type { CasualMatchSeedBinding } from "../tournament/join/casualMatchSeedBinding";
import { loadSeasonSeedPickSignals } from "./portalSeasonSeedPickSignals";

export type PickSeedBindingArgs = {
  templateId: string;
  matchId: string;
  uids: string[];
  def: PortalTournamentDefinition;
  /** 覆盖 def.gameType（三场合战各局 pick） */
  gameType?: string;
};

/** 开桌 seed 绑定：Portal catalog_internal + L3 季节选种策略 */
export async function pickCasualMatchSeedBinding(
  ctx: SeedPoolRuntimeCtx,
  args: PickSeedBindingArgs
): Promise<{ ok: true; seedBinding: CasualMatchSeedBinding } | { ok: false; error: string }> {
  const { templateId, matchId, uids, def } = args;
  const gameType = args.gameType ?? def.gameType;
  const reg = getPartnerGameRegistration(gameType);
  if (!reg) {
    return { ok: false as const, error: "unregistered_game_type" };
  }

  const sessionKey = `casual_sess:${matchId}`;
  const primaryUid = uids.map((u) => u.trim()).find(Boolean) ?? "";

  let signals = {
    weeklyLeagueTier: "bronze" as const,
    settledSoloCount: 99,
    soloFailStreak: 0,
    daysSinceLastMatch: 0,
  };
  if (primaryUid && "db" in ctx) {
    signals = await loadSeasonSeedPickSignals(ctx, { uid: primaryUid, gameType });
  } else if (primaryUid) {
    signals = await ctx.runQuery(
      internal.service.bridge.portalSeasonSeedPickQueries.loadSignals,
      { uid: primaryUid, gameType }
    );
  }

  const policy = resolveSeasonSeedPickPolicy({
    def,
    sessionKey,
    weeklyLeagueTier: signals.weeklyLeagueTier,
    settledSoloCount: signals.settledSoloCount,
    soloFailStreak: signals.soloFailStreak,
    daysSinceLastMatch: signals.daysSinceLastMatch,
  });

  const picked = await bridgePickSeed(ctx, {
    gameType,
    matchId,
    templateId,
    uids,
    tier: policy.tier,
    highPlayerEaseFraction: policy.preferHighPlayerEase
      ? policy.playerEaseFraction
      : undefined,
  });
  if (!picked.ok) {
    return picked;
  }
  return {
    ok: true as const,
    seedBinding: {
      seedId: picked.seedBinding.seedId,
      poolVersion: picked.seedBinding.poolVersion,
      tier: picked.seedBinding.tier,
      ...(picked.seedBinding.scoreQuantiles
        ? { scoreQuantiles: picked.seedBinding.scoreQuantiles }
        : {}),
      ...(policy.successQuantile ? { successQuantile: policy.successQuantile } : {}),
    },
  };
}
