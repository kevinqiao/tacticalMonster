"use node";

import type { CasualTournamentDefinition } from "../../data/casualTournamentConfigs";
import { getCasualGameRegistration } from "../../data/casualGameRegistry";
import { resolveSeedTierForTemplate } from "../../data/casualSeedTierPolicy";
import {
  bridgePickSeed,
  type SeedPoolRuntimeCtx,
} from "../botFill/seedRolloutBridge";
import type { CasualMatchSeedBinding } from "../tournament/join/casualMatchSeedBinding";

export type PickSeedBindingArgs = {
  templateId: string;
  matchId: string;
  uids: string[];
  def: CasualTournamentDefinition;
  /** 覆盖 def.gameType（三场合战各局 pick） */
  gameType?: string;
};

/** 开桌 seed 绑定：catalog_internal 或 remote_http（legacy） */
export async function pickCasualMatchSeedBinding(
  ctx: SeedPoolRuntimeCtx,
  args: PickSeedBindingArgs
): Promise<{ ok: true; seedBinding: CasualMatchSeedBinding } | { ok: false; error: string }> {
  const { templateId, matchId, uids, def } = args;
  const gameType = args.gameType ?? def.gameType;
  const reg = getCasualGameRegistration(gameType);
  if (!reg) {
    return { ok: false as const, error: "unregistered_game_type" };
  }

  const tier = resolveSeedTierForTemplate(def);
  const picked = await bridgePickSeed(ctx, {
    gameType,
    matchId,
    templateId,
    uids,
    tier,
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
    },
  };
}
