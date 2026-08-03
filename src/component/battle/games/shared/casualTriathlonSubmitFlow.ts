import {
  effectiveGameSequence,
  getTournamentDefinition,
} from '@/convex/casualPlatform/convex/data/casualTournamentConfigs';

import type { CasualGameScoreReportUI } from './casualGameScoreReportUI';

import type { TriathlonNextGame } from 'component/lobby/casual/service/useCasualTriathlonSession';
import { parseTriathlonNextGame } from 'component/lobby/casual/service/useCasualTriathlonSession';

export type { TriathlonNextGame };
export type TriathlonMidSessionAdvanceHandler = (
  next: TriathlonNextGame,
  score: number,
  scoreReport?: CasualGameScoreReportUI
) => void;

export type TriathlonSessionReplayHandler = (restartGameId: string) => void;

export type CasualPlatformSubmitResponse = {
  ok?: boolean;
  error?: string;
  gameComplete?: boolean;
  nextGame?: TriathlonNextGame;
  tableSummary?: unknown;
  pendingOthers?: boolean;
  deduped?: boolean;
  finalized?: boolean;
  seedScoreThreshold?: number;
  success?: boolean;
};

export type TriathlonLegScore = {
  gameType: string;
  score: number;
};

/** 局间过渡页自动进入下一局前的等待（ms） */
export const TRIATHLON_BETWEEN_LEG_AUTO_MS = 2500;

export type TriathlonSessionProgress = {
  templateId: string;
  matchId: string;
  completedLegs: Array<{ gameIndex: number; gameType: string; score: number }>;
  openLeg: { gameId: string; gameIndex: number; gameType: string };
};

export function triathlonLegScoresFromProgress(
  progress: TriathlonSessionProgress | null | undefined
): TriathlonLegScore[] {
  if (!progress?.completedLegs?.length) return [];
  return progress.completedLegs.map((leg) => ({
    gameType: leg.gameType,
    score: leg.score,
  }));
}

export function isTriathlonTemplateId(templateId: string | undefined): boolean {
  if (!templateId) return false;
  return getTournamentDefinition(templateId)?.gameType === 'triathlon';
}

export function triathlonGameLabel(gameType: string): string {
  if (gameType === 'block_blast') return 'Block Blast';
  if (gameType === 'match_3') return 'Match-3';
  if (gameType === 'solitaire') return 'Solitaire';
  return gameType;
}

export function resolveTriathlonSessionLeg(
  templateId: string,
  gameId: string
): { gameId: string; gameIndex: number; gameType: string } {
  const def = getTournamentDefinition(templateId);
  const sequence = def ? effectiveGameSequence(def) : [];
  const match = /_g(\d+)$/.exec(gameId);
  const gameIndex = match ? Math.max(0, Number(match[1])) : 0;
  const gameType = sequence[gameIndex] ?? sequence[0] ?? 'block_blast';
  return { gameId, gameIndex, gameType };
}

/** 三场合战当前局是否为 sequence 最后一局 */
export function isTriathlonFinalLeg(templateId: string, gameId: string): boolean {
  const def = getTournamentDefinition(templateId);
  if (!def || def.gameType !== 'triathlon') return true;
  const sequence = effectiveGameSequence(def);
  const { gameIndex } = resolveTriathlonSessionLeg(templateId, gameId);
  return gameIndex >= sequence.length - 1;
}

/** 由当前 `gameId` 推算下一局（不依赖 ingest 响应） */
export function triathlonNextLegFromGameId(
  templateId: string,
  gameId: string
): TriathlonNextGame | null {
  const def = getTournamentDefinition(templateId);
  if (!def) return null;
  const sequence = effectiveGameSequence(def);
  const { gameIndex } = resolveTriathlonSessionLeg(templateId, gameId);
  if (gameIndex >= sequence.length - 1) return null;
  const nextIndex = gameIndex + 1;
  if (!/_g\d+$/.test(gameId)) return null;
  const nextGameId = gameId.replace(/_g\d+$/, `_g${nextIndex}`);
  const gameType = sequence[nextIndex];
  if (!gameType) return null;
  return { gameIndex: nextIndex, gameId: nextGameId, gameType };
}

/** 合战 session 内各局 `gameId`（按 `gameIndex` 顺序） */
export function triathlonLegGameIds(templateId: string, anyLegGameId: string): string[] {
  const def = getTournamentDefinition(templateId);
  if (!def || def.gameType !== 'triathlon') return [anyLegGameId];
  const sequence = effectiveGameSequence(def);
  if (!/_g\d+$/.test(anyLegGameId)) return [anyLegGameId];
  return sequence.map((_, index) => anyLegGameId.replace(/_g\d+$/, `_g${index}`));
}

/** 合战整场再战后的首局 `gameId` */
export function triathlonFirstLegGameId(templateId: string, anyLegGameId: string): string {
  const legs = triathlonLegGameIds(templateId, anyLegGameId);
  return legs[0] ?? anyLegGameId;
}

/** 三场合战 session 内非最后一局：仅展示本局得分，不展示同桌榜 */
export function shouldDeferTriathlonTableSummaryForLeg(
  templateId: string | undefined,
  gameId: string | undefined,
  triathlonSessionActive: boolean
): boolean {
  if (!triathlonSessionActive || !templateId || !gameId) return false;
  if (!isTriathlonTemplateId(templateId)) return false;
  return !isTriathlonFinalLeg(templateId, gameId);
}

export type TriathlonPendingAdvance = {
  next: TriathlonNextGame;
  score: number;
};

/** ingest 返回局间推进字段（`gameComplete` + `nextGame`）时解析下一局 */
export function triathlonMidSessionNext(response: unknown): TriathlonNextGame | null {
  const parsed = response as CasualPlatformSubmitResponse;
  if (parsed.gameComplete !== true) return null;
  return parseTriathlonNextGame(response);
}

/** 三场合战 session 中非最后一局：暂缓同桌榜，仅展示本局得分 */
export function shouldDeferTriathlonTableSummary(
  templateId: string | undefined,
  triathlonSessionActive: boolean,
  response: unknown
): boolean {
  if (!triathlonSessionActive || !isTriathlonTemplateId(templateId)) return false;
  return triathlonMidSessionNext(response) != null;
}

export function queueTriathlonMidSessionAdvance(
  response: unknown,
  score: number,
  pendingRef: { current: TriathlonPendingAdvance | null },
  opts?: { templateId?: string; gameId?: string; triathlonSessionActive?: boolean }
): boolean {
  const fromResponse = triathlonMidSessionNext(response);
  if (fromResponse) {
    pendingRef.current = { next: fromResponse, score };
    return true;
  }
  if (
    !opts?.triathlonSessionActive ||
    !opts.templateId ||
    !opts.gameId ||
    isTriathlonFinalLeg(opts.templateId, opts.gameId)
  ) {
    return false;
  }
  const next = triathlonNextLegFromGameId(opts.templateId, opts.gameId);
  if (!next) return false;
  pendingRef.current = { next, score };
  return true;
}

/** 合战非最后一局：跳过独立分数页，直接进入局间过渡（含得分明细）。 */
export function tryAdvanceTriathlonMidSession(args: {
  triathlonSessionActive: boolean;
  casualTournamentId?: string;
  matchGameId?: string;
  legScore: number;
  pendingTriathlon: TriathlonPendingAdvance | null;
  onTriathlonNextGame?: TriathlonMidSessionAdvanceHandler;
  scoreReport?: CasualGameScoreReportUI;
}): boolean {
  if (!args.triathlonSessionActive || !args.onTriathlonNextGame) return false;

  if (args.pendingTriathlon) {
    args.onTriathlonNextGame(
      args.pendingTriathlon.next,
      args.pendingTriathlon.score,
      args.scoreReport
    );
    return true;
  }

  const deferTableSummary = shouldDeferTriathlonTableSummaryForLeg(
    args.casualTournamentId,
    args.matchGameId,
    args.triathlonSessionActive
  );
  if (deferTableSummary && args.casualTournamentId && args.matchGameId) {
    const next = triathlonNextLegFromGameId(args.casualTournamentId, args.matchGameId);
    if (next) {
      args.onTriathlonNextGame(next, args.legScore, args.scoreReport);
      return true;
    }
  }
  return false;
}
