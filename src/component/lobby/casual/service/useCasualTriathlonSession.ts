import {
  casualGameKindFromGameType,
  casualPlayModalForKind,
  type CasualPlayModalName,
} from "./casualOpenRunAssignment";

export type TriathlonNextGame = {
  gameIndex: number;
  gameId: string;
  gameType: string;
};

/** 解析 ingest 中局间推进字段（`gameComplete` + `nextGame`） */
export function parseTriathlonNextGame(response: unknown): TriathlonNextGame | null {
  if (!response || typeof response !== "object") return null;
  const next = (response as { nextGame?: TriathlonNextGame }).nextGame;
  if (!next || typeof next.gameId !== "string" || !next.gameId.trim()) return null;
  if (typeof next.gameIndex !== "number" || !Number.isFinite(next.gameIndex)) return null;
  if (typeof next.gameType !== "string" || !next.gameType.trim()) return null;
  return next;
}

export function triathlonPlayModalForNextGame(next: TriathlonNextGame): CasualPlayModalName {
  return casualPlayModalForKind(casualGameKindFromGameType(next.gameType));
}

export function triathlonModalDataForNextGame(
  templateId: string,
  next: TriathlonNextGame
): Record<string, string> {
  return {
    casualTournamentId: templateId,
    casualMatchGameId: next.gameId,
  };
}
