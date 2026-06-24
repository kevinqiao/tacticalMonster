/** ??? bot ingest / ???? roster ???????(V3:bot ????? ingest ??)? */

import type { PortalTournamentDefinition } from "../../../../data/portalTournamentConfigs";
import {
  CASUAL_GAME_REGISTRY,
  getPortalGameRegistration,
  usesGameIngestBotPolicy,
  usesPlatformIngestBotPolicy,
  virtualUidPrefixForGame,
} from "../../../../data/portalGameRegistry";
import { effectiveGameSequence } from "../../../../data/portalTournamentConfigs";

export type CasualSubmitMode = "daily" | "solo" | "mixed";

export function resolveCasualSubmitMode(
  maxPlayers: number,
  humanPlayerCount: number
): CasualSubmitMode {
  if (maxPlayers <= 1) return "daily";
  if (Math.max(1, humanPlayerCount) >= 2) return "mixed";
  return "solo";
}

export type AsyncBotFill = {
  rank: number;
  score: number;
  duration?: number;
  rolloutIndex?: number;
  /** ??? / ????? bot ????(ms) */
  revealAt?: number;
  /** ??:? leg ??? rollout */
  legs?: Array<{
    gameIndex: number;
    score: number;
    rolloutIndex?: number;
    duration?: number;
  }>;
};

export type SeedVirtualOpponentArgs = {
  templateId: string;
  runTournamentId: string;
  matchId: string;
  matchGameType: string;
  /** ?? bot ????????? */
  botFills: AsyncBotFill[];
  updatedAt: number;
  /** ?? true:??? match ????????;false:? upsert ????(? topUp ??) */
  replaceAllVirtual?: boolean;
};

/** @deprecated ?? `virtualUidPrefixForGame("solitaire")` */
export const CASUAL_ASYNC_VIRTUAL_BOT_UID_SOLITAIRE =
  CASUAL_GAME_REGISTRY.solitaire.virtualUidPrefix;
/** @deprecated ?? `virtualUidPrefixForGame("block_blast")` */
export const CASUAL_ASYNC_VIRTUAL_BOT_UID_BLOCK_BLAST =
  CASUAL_GAME_REGISTRY.block_blast.virtualUidPrefix;

export function isCasualAsyncVirtualOpponentUid(uid: string): boolean {
  for (const reg of Object.values(CASUAL_GAME_REGISTRY)) {
    if (uid.startsWith(reg.virtualUidPrefix)) return true;
  }
  return uid.startsWith("__vp_");
}

export function casualAsyncVirtualOpponentCount(
  defMaxPlayers: number,
  matchHumanPlayerCount: number
): number {
  const humanCountPlanned = Math.max(1, matchHumanPlayerCount);
  return Math.max(0, defMaxPlayers - humanCountPlanned);
}

type AsyncMatchRosterRow = { uid: string; score?: number | null };

/** game_ingest / platform_ingest:ingest ??? botFills ? `botsSeeded` ? finalize ??????? */
export function isGameIngestBotsCommitted(
  def: PortalTournamentDefinition,
  matchDoc: { botsSeeded?: boolean; humanPlayerCount?: number },
  rows: AsyncMatchRosterRow[]
): boolean {
  const primaryGameType = effectiveGameSequence(def).slice(-1)[0] ?? def.gameType;
  const usesIngestBots =
    usesGameIngestBotPolicy(primaryGameType) ||
    usesPlatformIngestBotPolicy(primaryGameType) ||
    (def.gameType === "triathlon" && usesPlatformIngestBotPolicy("triathlon"));
  if (!usesIngestBots) return false;
  if (!matchDoc.botsSeeded) return false;

  const humansWithScore = rows.filter(
    (r) =>
      !isCasualAsyncVirtualOpponentUid(r.uid) &&
      r.score != null &&
      Number.isFinite(r.score)
  );
  const virtualWithScore = rows.filter(
    (r) =>
      isCasualAsyncVirtualOpponentUid(r.uid) &&
      r.score != null &&
      Number.isFinite(r.score)
  );
  const humanCountPlanned = Math.max(
    1,
    matchDoc.humanPlayerCount ?? humansWithScore.length
  );
  const targetBotCount = casualAsyncVirtualOpponentCount(def.maxPlayers, humanCountPlanned);
  if (targetBotCount <= 0) return true;

  return (
    virtualWithScore.length >= targetBotCount &&
    humansWithScore.length + virtualWithScore.length >= def.maxPlayers
  );
}

/** @deprecated ?? `isGameIngestBotsCommitted` */
export function isSolitaireIngestBotsCommitted(
  def: PortalTournamentDefinition,
  matchDoc: { botsSeeded?: boolean; humanPlayerCount?: number },
  rows: AsyncMatchRosterRow[]
): boolean {
  return isGameIngestBotsCommitted(def, matchDoc, rows);
}

export function assertRegisteredMatchGameType(
  gameType: string
): { ok: true; gameType: string } | { ok: false; error: "unregistered_game_type" } {
  if (!getPortalGameRegistration(gameType)) {
    return { ok: false as const, error: "unregistered_game_type" as const };
  }
  return { ok: true as const, gameType };
}
