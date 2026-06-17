import {
  CASUAL_DAILY_SOLO_CHALLENGE_BLOCK_BLAST_ID,
  CASUAL_DAILY_SOLO_CHALLENGE_MATCH_3_ID,
  CASUAL_DAILY_SOLO_CHALLENGE_SOLITAIRE_ID,
  getTournamentDefinition,
} from '@/convex/casualPlatform/convex/data/casualTournamentConfigs';
import type { GameReport as BlockBlastGameReport } from '../blockBlast/battle/types/BlockBlastTypes';
import type { GameReport as Match3GameReport } from '../match3/battle/types/Match3Types';
import type { GameReport as SolitaireGameReport } from '../solitaireSolo/battle/types/SoloTypes';
import type { CasualAsyncTableSummaryUI } from './casualAsyncTableSummaryUI';
import { isTriathlonFinalLeg } from './casualTriathlonSubmitFlow';

/** Play「单人挑战」日榜模板：无同桌异步榜，结算后不展示「同桌成绩」。 */
export function isCasualDailySoloChallengeTemplate(templateId: string | undefined): boolean {
  if (!templateId) return false;
  if (
    templateId === CASUAL_DAILY_SOLO_CHALLENGE_SOLITAIRE_ID ||
    templateId === CASUAL_DAILY_SOLO_CHALLENGE_BLOCK_BLAST_ID ||
    templateId === CASUAL_DAILY_SOLO_CHALLENGE_MATCH_3_ID
  ) {
    return true;
  }
  const def = getTournamentDefinition(templateId);
  return Boolean(def?.omitFromPlayLobby && def.maxPlayers <= 1);
}

/** P75 单人挑战模板：单人无同桌，结算只展示是否成功 + 目标分 + 游戏分。 */
export function isCasualSoloP75ChallengeTemplate(templateId: string | undefined): boolean {
  if (!templateId) return false;
  return getTournamentDefinition(templateId)?.matchType === 'solo_p75_challenge';
}

export type CasualGameScoreReportLine = {
  label: string;
  value: number;
};

/** P75 挑战结果（仅 solo_p75_challenge 模板）：目标分 + 玩家分 + 是否成功 */
export type CasualGameScoreChallengeUI = {
  targetScore: number;
  achievedScore: number;
  success: boolean;
};

/** 单局得分明细（非同桌榜） */
export type CasualGameScoreReportUI = {
  gameLabel: string;
  lines: CasualGameScoreReportLine[];
  totalScore: number;
  /** 存在时展示「是否成功 + 目标分（P75）+ 游戏分」结果区块 */
  challenge?: CasualGameScoreChallengeUI;
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

export function buildMatch3ScoreReport(report: Match3GameReport): CasualGameScoreReportUI {
  const lines: CasualGameScoreReportLine[] = [{ label: '基础分', value: report.baseScore }];
  if (typeof report.timeBonus === 'number' && report.timeBonus !== 0) {
    lines.push({ label: '时间奖励', value: report.timeBonus });
  }
  return {
    gameLabel: 'Match-3',
    lines,
    totalScore: report.totalScore,
  };
}

export function isTriathlonTemplateId(templateId: string | undefined): boolean {
  if (!templateId) return false;
  return getTournamentDefinition(templateId)?.gameType === "triathlon";
}

export function shouldOpenCasualTableSummaryAfterScoreReport(
  templateId: string | undefined,
  tableSummary: CasualAsyncTableSummaryUI | null | undefined,
  waitingForPeers: boolean,
  options?: {
    deferTriathlonTableSummary?: boolean;
    triathlonSessionActive?: boolean;
    triathlonGameId?: string;
  }
): boolean {
  if (isCasualDailySoloChallengeTemplate(templateId)) return false;
  if (isCasualSoloP75ChallengeTemplate(templateId)) return false;
  if (
    options?.triathlonSessionActive &&
    options.triathlonGameId &&
    isTriathlonTemplateId(templateId) &&
    !isTriathlonFinalLeg(templateId, options.triathlonGameId)
  ) {
    return false;
  }
  if (options?.deferTriathlonTableSummary) return false;
  if (isTriathlonTemplateId(templateId) && !tableSummary?.rows?.length && !waitingForPeers) {
    return false;
  }
  return Boolean(tableSummary?.rows?.length) || waitingForPeers;
}
