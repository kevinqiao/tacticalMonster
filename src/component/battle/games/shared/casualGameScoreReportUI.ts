import { getTournamentDefinition } from '@/convex/casualPlatform/convex/data/casualTournamentConfigs';
import { getPortalTournamentDefinition } from '@/convex/portal/convex/data/portalTournamentConfigs';
import i18n from '@/i18n';
import type { GameReport as BlockBlastGameReport } from '../blockBlast/battle/types/BlockBlastTypes';
import type { GameReport as Match3GameReport } from '../match3/battle/types/Match3Types';
import type { GameReport as SolitaireGameReport } from '../solitaireSolo/battle/types/SoloTypes';
import type { CasualAsyncTableSummaryUI } from './casualAsyncTableSummaryUI';
import { isTriathlonFinalLeg } from './casualTriathlonSubmitFlow';

const tc = (key: string, opts?: Record<string, unknown>) =>
  i18n.t(key, { ns: 'shared.casual', ...opts });

/** P75 单人挑战模板：单人无同桌，结算只展示是否成功 + 目标分 + 游戏分。 */
export function isCasualSoloP75ChallengeTemplate(templateId: string | undefined): boolean {
  if (!templateId) return false;
  if (getTournamentDefinition(templateId)?.matchType === 'solo_p75_challenge') return true;
  return getPortalTournamentDefinition(templateId)?.matchType === 'solo_p75';
}

/**
 * Portal 模板结算后应再拉一次同桌榜/再战 offer。
 * Arena ingest 代理可能丢掉 `adReplayDailyCap`；Portal query 带完整 N/M 数据。
 */
export function shouldRefreshPortalAdReplayQuota(
  templateId: string | undefined
): boolean {
  return Boolean(templateId?.startsWith('portal_'));
}

export type CasualGameScoreReportLine = {
  label: string;
  value: number;
};

/** 单档星标达标（★ / ★★★） */
export type CasualGameScoreChallengeTierUI = {
  score: number;
  reached: boolean;
};

/**
 * Solo 挑战结果：clear 成败（广告再战等）+ 可选双星档（p75/p90）。
 * `success` 仍表示 clear 线是否达成。
 */
export type CasualGameScoreChallengeUI = {
  targetScore: number;
  achievedScore: number;
  success: boolean;
  tierP75?: CasualGameScoreChallengeTierUI;
  tierP90?: CasualGameScoreChallengeTierUI;
};

/** 单局得分明细（非同桌榜） */
export type CasualGameScoreReportUI = {
  gameLabel: string;
  lines: CasualGameScoreReportLine[];
  totalScore: number;
  /** 存在时展示挑战结果（双星 / clear） */
  challenge?: CasualGameScoreChallengeUI;
};

function finiteFloor(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? Math.floor(v) : undefined;
}

/** 组装结算弹窗挑战块；无任何门槛时返回 undefined */
export function buildCasualScoreChallengeUI(opts: {
  achievedScore: number;
  clearThreshold?: number;
  /** 服务端 clear success；缺省则用 achieved >= clear */
  clearSuccess?: boolean;
  p75?: number;
  p90?: number;
}): CasualGameScoreChallengeUI | undefined {
  const achieved = Math.max(0, Math.floor(opts.achievedScore));
  const clear = finiteFloor(opts.clearThreshold);
  const p75 = finiteFloor(opts.p75);
  const p90 = finiteFloor(opts.p90);
  if (clear == null && p75 == null && p90 == null) return undefined;

  const success =
    typeof opts.clearSuccess === 'boolean'
      ? opts.clearSuccess
      : clear != null
        ? achieved >= clear
        : p75 != null
          ? achieved >= p75
          : false;

  return {
    targetScore: clear ?? p75 ?? p90 ?? 0,
    achievedScore: achieved,
    success,
    ...(p75 != null ? { tierP75: { score: p75, reached: achieved >= p75 } } : {}),
    ...(p90 != null ? { tierP90: { score: p90, reached: achieved >= p90 } } : {}),
  };
}

/** 结算标题 i18n key（`scoreReport.*`） */
export function casualChallengeTitleKey(
  challenge: CasualGameScoreChallengeUI
):
  | 'challengeStars3Title'
  | 'challengeStars1Title'
  | 'challengeSuccessTitle'
  | 'challengeFailTitle' {
  if (challenge.tierP75 && challenge.tierP90) {
    if (challenge.tierP90.reached) return 'challengeStars3Title';
    if (challenge.tierP75.reached) return 'challengeStars1Title';
    return 'challengeFailTitle';
  }
  return challenge.success ? 'challengeSuccessTitle' : 'challengeFailTitle';
}

export function buildSolitaireScoreReport(report: SolitaireGameReport): CasualGameScoreReportUI {
  const lines: CasualGameScoreReportLine[] = [
    { label: tc('scoreReport.baseScore'), value: report.baseScore },
  ];
  if (typeof report.timeBonus === 'number' && report.timeBonus !== 0) {
    lines.push({ label: tc('scoreReport.timeBonus'), value: report.timeBonus });
  }
  if (typeof report.completeBonus === 'number' && report.completeBonus !== 0) {
    lines.push({
      label: tc('scoreReport.completeBonus'),
      value: report.completeBonus,
    });
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
    lines: [{ label: tc('scoreReport.matchScore'), value: report.totalScore }],
    totalScore: report.totalScore,
  };
}

export function buildMatch3ScoreReport(report: Match3GameReport): CasualGameScoreReportUI {
  return {
    gameLabel: 'Match-3',
    lines: [{ label: tc('scoreReport.matchScore'), value: report.totalScore }],
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

export function normalizeAdReplayDailyRemaining(
  adReplayDailyRemaining?: number
): number | undefined {
  if (
    typeof adReplayDailyRemaining !== 'number' ||
    !Number.isFinite(adReplayDailyRemaining)
  ) {
    return undefined;
  }
  return Math.max(0, Math.floor(adReplayDailyRemaining));
}

export function getCasualAdReplayButtonLabel(): string {
  return tc('postSettle.adReplay');
}

export function getCasualMatchScoreLineLabel(): string {
  return tc('scoreReport.matchScore');
}

/** @deprecated Prefer getCasualAdReplayButtonLabel(); kept for call-site equality checks. */
export const CASUAL_AD_REPLAY_BUTTON_LABEL = '看广告重玩';

/** Finite daily caps are 0–100; larger values are the unlimited sentinel. */
export function normalizeAdReplayDailyCap(
  adReplayDailyCap?: number
): number | undefined {
  if (typeof adReplayDailyCap !== 'number' || !Number.isFinite(adReplayDailyCap)) {
    return undefined;
  }
  const n = Math.floor(adReplayDailyCap);
  if (n < 0 || n > 100) return undefined;
  return n;
}

/**
 * 有限日额度时返回已用/上限 `N/M`；无限或不完整数据时返回 undefined。
 * 须单独渲染（勿塞进主文案），否则窄按钮 ellipsis /「广告加载中」会盖掉数字。
 */
export function formatCasualAdReplayQuotaBadge(
  adReplayDailyRemaining?: number,
  adReplayDailyCap?: number
): string | undefined {
  const remaining = normalizeAdReplayDailyRemaining(adReplayDailyRemaining);
  const cap = normalizeAdReplayDailyCap(adReplayDailyCap);
  if (remaining == null || cap == null) return undefined;
  const used = Math.min(cap, Math.max(0, cap - remaining));
  return `${used}/${cap}`;
}

/** 广告再战主文案（不含额度；额度见 formatCasualAdReplayQuotaBadge）。 */
export function formatCasualAdReplayButtonLabel(
  _adReplayDailyRemaining?: number,
  _adReplayDailyCap?: number
): string {
  return getCasualAdReplayButtonLabel();
}

/** 同桌结算层 / 多人竞技：与单人 P75 一致，不可战时不展示按钮。 */
export function resolveCasualPostSettleReplayPresentation(opts: {
  replayOffered: boolean;
  canReplay: boolean;
  replayMode: 'ad' | 'token';
  adReplayDailyRemaining?: number;
  adReplayDailyCap?: number;
  replayWindowEndsAt?: number;
  customLabel?: string;
}): {
  showReplay: boolean;
  replayLabel: string;
  adReplayDailyRemaining?: number;
  adReplayDailyCap?: number;
} {
  const showReplay =
    opts.replayOffered &&
    opts.canReplay &&
    isCasualReplayWindowOpen(opts.replayWindowEndsAt);
  if (!showReplay) {
    return { showReplay: false, replayLabel: '' };
  }
  const remaining =
    opts.replayMode === 'ad'
      ? normalizeAdReplayDailyRemaining(opts.adReplayDailyRemaining)
      : undefined;
  const cap =
    opts.replayMode === 'ad'
      ? normalizeAdReplayDailyCap(opts.adReplayDailyCap)
      : undefined;
  if (opts.customLabel) {
    return {
      showReplay: true,
      replayLabel: opts.customLabel,
      ...(remaining != null ? { adReplayDailyRemaining: remaining } : {}),
      ...(cap != null ? { adReplayDailyCap: cap } : {}),
    };
  }
  if (opts.replayMode === 'ad') {
    return {
      showReplay: true,
      replayLabel: formatCasualAdReplayButtonLabel(remaining, cap),
      ...(remaining != null ? { adReplayDailyRemaining: remaining } : {}),
      ...(cap != null ? { adReplayDailyCap: cap } : {}),
    };
  }
  return { showReplay: true, replayLabel: tc('postSettle.tokenReplay') };
}

export function resolveCasualScoreReportSecondaryAction(opts: {
  templateId: string | undefined;
  replayOffered: boolean;
  canReplay: boolean;
  replayMode: 'ad' | 'token';
  /** 单人 P75：true=达标，false=未达标；未设置时不展示再战 */
  challengeSuccess?: boolean;
  /** Portal 广告再战：今日剩余次数（与 cap 一起换算已用次数展示） */
  adReplayDailyRemaining?: number;
  adReplayDailyCap?: number;
}): {
  /** 单人挑战：得分页为最后一步 */
  soloChallengeFinalStep: boolean;
  /** 展示再战副按钮（非「复盘本局」） */
  showReplaySecondary: boolean;
  secondaryLabel?: string;
  adReplayDailyRemaining?: number;
  adReplayDailyCap?: number;
} {
  const solo = isCasualSoloP75ChallengeTemplate(opts.templateId);
  if (solo) {
    const showReplay =
      opts.replayOffered && opts.challengeSuccess === false && opts.canReplay;
    const remaining =
      opts.replayMode === 'ad'
        ? normalizeAdReplayDailyRemaining(opts.adReplayDailyRemaining)
        : undefined;
    const cap =
      opts.replayMode === 'ad'
        ? normalizeAdReplayDailyCap(opts.adReplayDailyCap)
        : undefined;
    return {
      soloChallengeFinalStep: true,
      showReplaySecondary: showReplay,
      ...(showReplay
        ? {
            secondaryLabel:
              opts.replayMode === 'token'
                ? tc('postSettle.tokenReplay')
                : formatCasualAdReplayButtonLabel(remaining, cap),
            ...(remaining != null ? { adReplayDailyRemaining: remaining } : {}),
            ...(cap != null ? { adReplayDailyCap: cap } : {}),
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
    return { title: tc('postSettle.titleSettled'), summary: null };
  }
  return { title: tc('postSettle.titleTable'), summary: tableSummary ?? null };
}
