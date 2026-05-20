import {
  CASUAL_DAILY_SOLO_CHALLENGE_BLOCK_BLAST_ID,
  CASUAL_DAILY_SOLO_CHALLENGE_SOLITAIRE_ID,
  getTournamentDefinition,
} from '@/convex/casualPlatform/convex/data/casualTournamentConfigs';
import type { GameReport as BlockBlastGameReport } from '../blockBlast/battle/types/BlockBlastTypes';
import type { GameReport as SolitaireGameReport } from '../solitaireSolo/battle/types/SoloTypes';
import type { CasualAsyncTableSummaryUI } from './casualAsyncTableSummaryUI';

/** Play「单人挑战」日榜模板：无同桌异步榜，结算后不展示「同桌成绩」。 */
export function isCasualDailySoloChallengeTemplate(templateId: string | undefined): boolean {
  if (!templateId) return false;
  if (
    templateId === CASUAL_DAILY_SOLO_CHALLENGE_SOLITAIRE_ID ||
    templateId === CASUAL_DAILY_SOLO_CHALLENGE_BLOCK_BLAST_ID
  ) {
    return true;
  }
  const def = getTournamentDefinition(templateId);
  return Boolean(def?.omitFromPlayLobby && def.maxPlayers <= 1);
}

export type CasualGameScoreReportLine = {
  label: string;
  value: number;
};

/** 单局得分明细（非同桌榜） */
export type CasualGameScoreReportUI = {
  gameLabel: string;
  lines: CasualGameScoreReportLine[];
  totalScore: number;
};

export function buildSolitaireScoreReport(report: SolitaireGameReport): CasualGameScoreReportUI {
  const lines: CasualGameScoreReportLine[] = [
    { label: '基础分', value: report.baseScore },
  ];
  if (typeof report.timeBonus === 'number' && report.timeBonus !== 0) {
    lines.push({ label: '时间奖励', value: report.timeBonus });
  }
  if (typeof report.completeBonus === 'number' && report.completeBonus !== 0) {
    lines.push({ label: '完成奖励', value: report.completeBonus });
  }
  return {
    gameLabel: 'Solitaire',
    lines,
    totalScore: report.totalScore,
  };
}

export function buildBlockBlastScoreReport(report: BlockBlastGameReport): CasualGameScoreReportUI {
  const lines: CasualGameScoreReportLine[] = [
    { label: '基础分', value: report.baseScore },
  ];
  if (typeof report.linesBonus === 'number' && report.linesBonus !== 0) {
    lines.push({ label: '消行奖励', value: report.linesBonus });
  }
  if (typeof report.movesPenalty === 'number' && report.movesPenalty !== 0) {
    lines.push({ label: '步数调整', value: report.movesPenalty });
  }
  return {
    gameLabel: 'Block Blast',
    lines,
    totalScore: report.totalScore,
  };
}

export function shouldOpenCasualTableSummaryAfterScoreReport(
  templateId: string | undefined,
  tableSummary: CasualAsyncTableSummaryUI | null | undefined,
  waitingForPeers: boolean
): boolean {
  if (isCasualDailySoloChallengeTemplate(templateId)) return false;
  return Boolean(tableSummary?.rows?.length) || waitingForPeers;
}
