/** 异步桌 bot ingest / 虚拟对手 roster 共享类型与工具（V3：bot 分由游戏服 ingest 写入）。 */

import type { CasualTournamentDefinition } from "../../../../data/casualTournamentConfigs";

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
  /** 游戏服计算的 bot 入场时刻（ms） */
  revealAt?: number;
};

export type SeedVirtualOpponentArgs = {
  templateId: string;
  runTournamentId: string;
  matchId: string;
  matchGameType: "solitaire" | "block_blast";
  /** 每个 bot 的目标名次槽与分数 */
  botFills: AsyncBotFill[];
  updatedAt: number;
  /** 默认 true：先删本 match 全部虚拟行再写入；false：仅 upsert 传入槽位（供 topUp 追加） */
  replaceAllVirtual?: boolean;
};

/** Solitaire 异步场虚拟对手 uid 前缀（DB 存量数据依赖此字符串） */
export const CASUAL_ASYNC_VIRTUAL_BOT_UID_SOLITAIRE = "__vp_solitaire:";
/** Block Blast 异步场虚拟对手 uid 前缀 */
export const CASUAL_ASYNC_VIRTUAL_BOT_UID_BLOCK_BLAST = "__vp_block_blast:";

export function isCasualAsyncVirtualOpponentUid(uid: string): boolean {
  return (
    uid.startsWith(CASUAL_ASYNC_VIRTUAL_BOT_UID_SOLITAIRE) ||
    uid.startsWith(CASUAL_ASYNC_VIRTUAL_BOT_UID_BLOCK_BLAST)
  );
}

export function casualAsyncVirtualOpponentCount(
  defMaxPlayers: number,
  matchHumanPlayerCount: number
): number {
  const humanCountPlanned = Math.max(1, matchHumanPlayerCount);
  return Math.max(0, defMaxPlayers - humanCountPlanned);
}

type AsyncMatchRosterRow = { uid: string; score?: number | null };

/** Solitaire V3：ingest 已写入 botFills 且 `botsSeeded` 时 finalize 不再平台补位。 */
export function isSolitaireIngestBotsCommitted(
  def: CasualTournamentDefinition,
  matchDoc: { botsSeeded?: boolean; humanPlayerCount?: number },
  rows: AsyncMatchRosterRow[]
): boolean {
  if (def.gameType !== "solitaire") return false;
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
