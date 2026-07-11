import { getTournamentDefinition } from '@/convex/casualPlatform/convex/data/casualTournamentConfigs';
import { getPortalTournamentDefinition } from '@/convex/portal/convex/data/portalTournamentConfigs';
import type { GameReport as BlockBlastGameReport } from '../blockBlast/battle/types/BlockBlastTypes';
import type { GameReport as Match3GameReport } from '../match3/battle/types/Match3Types';
import type { GameReport as SolitaireGameReport } from '../solitaireSolo/battle/types/SoloTypes';
import type { CasualAsyncTableSummaryUI } from './casualAsyncTableSummaryUI';
import { isTriathlonFinalLeg } from './casualTriathlonSubmitFlow';

/** P75 单人挑战模板：单人无同桌，结算只展示是否成功 + 目标分 + 游戏分。 */
export function isCasualSoloP75ChallengeTemplate(templateId: string | undefined): boolean {
  if (!templateId) return false;
  if (getTournamentDefinition(templateId)?.matchType === 'solo_p75_challenge') return true;
  return getPortalTournamentDefinition(templateId)?.matchType === 'solo_p75';
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
  return {
    gameLabel: 'Block Blast',
    lines: [{ label: '本局得分', value: report.totalScore }],
    totalScore: report.totalScore,
  };
}

export function buildMatch3ScoreReport(report: Match3GameReport): CasualGameScoreReportUI {
  return {
    gameLabel: 'Match-3',
    lines: [{ label: '本局得分', value: report.totalScore }],
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
    replayOffered?: boolean;
  }
): boolean {
  /** 单人 P75 挑战无同桌榜；再战走单独提示页，不展示「同桌成绩」。 */
  if (isCasualSoloP75ChallengeTemplate(templateId)) {
    return false;
  }
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

/** 单人 P75：得分明细即最终结算页，不再打开后续「本局已结算 / 同桌成绩」层。 */
export function isCasualSoloChallengeFinalScoreReport(templateId: string | undefined): boolean {
  return isCasualSoloP75ChallengeTemplate(templateId);
}

export function isCasualReplayWindowOpen(replayWindowEndsAt?: number): boolean {
  if (replayWindowEndsAt == null || !Number.isFinite(replayWindowEndsAt)) return true;
  return replayWindowEndsAt > Date.now();
}

export function formatCasualAdReplayButtonLabel(adReplayDailyRemaining?: number): string {
  if (
    typeof adReplayDailyRemaining === 'number' &&
    Number.isFinite(adReplayDailyRemaining)
  ) {
    const n = Math.max(0, Math.floor(adReplayDailyRemaining));
    return `🎬 看广告再战（今日剩 ${n} 次）`;
  }
  return '🎬 看广告再战';
}

/** 同桌结算层 / 多人竞技：与单人 P75 一致，不可战时不展示按钮。 */
export function resolveCasualPostSettleReplayPresentation(opts: {
  replayOffered: boolean;
  canReplay: boolean;
  replayMode: 'ad' | 'token';
  adReplayDailyRemaining?: number;
  replayWindowEndsAt?: number;
  customLabel?: string;
}): { showReplay: boolean; replayLabel: string } {
  const showReplay =
    opts.replayOffered &&
    opts.canReplay &&
    isCasualReplayWindowOpen(opts.replayWindowEndsAt);
  if (!showReplay) {
    return { showReplay: false, replayLabel: '' };
  }
  if (opts.customLabel) {
    return { showReplay: true, replayLabel: opts.customLabel };
  }
  if (opts.replayMode === 'ad') {
    return {
      showReplay: true,
      replayLabel: formatCasualAdReplayButtonLabel(opts.adReplayDailyRemaining),
    };
  }
  return { showReplay: true, replayLabel: '再战' };
}

export function resolveCasualScoreReportSecondaryAction(opts: {
  templateId: string | undefined;
  replayOffered: boolean;
  canReplay: boolean;
  replayMode: 'ad' | 'token';
  /** 单人 P75：true=达标，false=未达标；未设置时不展示再战 */
  challengeSuccess?: boolean;
  /** Portal 广告再战：今日剩余次数（展示在按钮文案） */
  adReplayDailyRemaining?: number;
}): {
  /** 单人挑战：得分页为最后一步 */
  soloChallengeFinalStep: boolean;
  /** 展示再战副按钮（非「复盘本局」） */
  showReplaySecondary: boolean;
  secondaryLabel?: string;
} {
  const solo = isCasualSoloP75ChallengeTemplate(opts.templateId);
  if (solo) {
    const showReplay =
      opts.replayOffered && opts.challengeSuccess === false && opts.canReplay;
    return {
      soloChallengeFinalStep: true,
      showReplaySecondary: showReplay,
      ...(showReplay
        ? {
            secondaryLabel:
              opts.replayMode === 'ad'
                ? formatCasualAdReplayButtonLabel(opts.adReplayDailyRemaining)
                : '再战',
          }
        : {}),
    };
  }
  return {
    soloChallengeFinalStep: false,
    showReplaySecondary: false,
  };
}

export function resolveCasualPostSettleSummaryPresentation(
  templateId: string | undefined,
  tableSummary: CasualAsyncTableSummaryUI | null | undefined
): { title: string; summary: CasualAsyncTableSummaryUI | null } {
  if (isCasualSoloP75ChallengeTemplate(templateId)) {
    return { title: '本局已结算', summary: null };
  }
  return { title: '同桌成绩', summary: tableSummary ?? null };
}
