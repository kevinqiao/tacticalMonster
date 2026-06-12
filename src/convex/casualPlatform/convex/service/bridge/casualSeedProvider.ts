"use node";

import type { CasualTournamentDefinition } from "../../data/casualTournamentConfigs";
import {
  getCasualGameRegistration,
  resolveSeedRemoteOrigin,
} from "../../data/casualGameRegistry";
import { resolveSeedTierForTemplate } from "../../data/casualSeedTierPolicy";
import { fetchPickCasualMatchSeed } from "./casualMatchSeedBridge";
import type { CasualMatchSeedBinding } from "../tournament/join/casualMatchSeedBinding";

export type PickSeedBindingArgs = {
  templateId: string;
  matchId: string;
  uids: string[];
  def: CasualTournamentDefinition;
};

/** 开桌 seed 绑定：统一 remote HTTP（游戏服 pick-seed） */
export async function pickCasualMatchSeedBinding(
  args: PickSeedBindingArgs
): Promise<{ ok: true; seedBinding: CasualMatchSeedBinding } | { ok: false; error: string }> {
  const { templateId, matchId, uids, def } = args;
  const reg = getCasualGameRegistration(def.gameType);
  if (!reg) {
    return { ok: false as const, error: "unregistered_game_type" };
  }

  if (reg.seedStrategy !== "remote_http") {
    return { ok: false as const, error: "unsupported_seed_strategy" };
  }

  const origin = resolveSeedRemoteOrigin(reg);
  if (!origin) {
    return { ok: false as const, error: "missing_seed_remote_origin" };
  }
  const tier = resolveSeedTierForTemplate(def);
  const picked = await fetchPickCasualMatchSeed(
    {
      matchId,
      templateId,
      sessionKey: `casual_sess:${matchId}`,
      uids,
      tier,
    },
    origin
  );
  if (!picked.ok) {
    return picked;
  }
  return {
    ok: true as const,
    seedBinding: {
      seedId: picked.seedId,
      poolVersion: picked.poolVersion,
      tier: picked.tier,
    },
  };
}
