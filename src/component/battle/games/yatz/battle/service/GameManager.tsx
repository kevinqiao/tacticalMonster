import { useCasualPlatform } from 'component/lobby/casual/service/useCasualPlatformManager';

import { useUserManager } from 'host/service/UserManager';

import { usePlatformAuth } from 'host/service/platformAuth/PlatformAuthProvider';

import { isPlatformAuthed } from 'host/service/platformAuth/platformAccessToken';

import { useConvex } from 'convex/react';

import React, {

  createContext,

  ReactNode,

  useCallback,

  useContext,

  useEffect,

  useRef,

  useState,

} from 'react';

import { api } from '@/convex/yatzArena/convex/_generated/api';

import {

  applyCasualTableSummaryFromQuery,

  type CasualAsyncTableSummaryUI,

  type ManualSettleConfirmExtras,

  type Match3WatchContext,

} from '../../../shared/casualAsyncTableSummaryUI';

import {
  buildCasualScoreChallengeUI,
  shouldRefreshPortalAdReplayQuota,
  getCasualMatchScoreLineLabel,
  isCasualSoloP75ChallengeTemplate,
  type CasualGameScoreReportUI,
} from '../../../shared/casualGameScoreReportUI';

import { buildCasualPlatformRunActionArgs } from '../../../shared/casualPlatformActionArgs';

import { fetchCasualAsyncTableSummaryForGame } from '../../../shared/fetchCasualAsyncTableSummary';

import { executeCasualRunReplay } from '../../../shared/executeCasualRunReplay';

import { confirmCasualRunWithoutReplayForBridge } from '../../../shared/confirmCasualRunWithoutReplay';

import { CasualGameScoreReportOverlay } from '../../../shared/CasualGameScoreReportOverlay';

import { CasualPostSettleSummaryOverlay } from '../../../shared/CasualPostSettleSummaryOverlay';

import { YatzGameStatus, type YatzCategory, type YatzGameState } from '../types/YatzTypes';



type CasualRunSubmitOutcome =

  | {

      ok: true;

      tableSummary?: CasualAsyncTableSummaryUI;

      pendingOthers?: boolean;

      seedScoreThreshold?: number;

      success?: boolean;

      replayOffered?: boolean;

      replayTokenCount?: number;

      canReplay?: boolean;

      replayWindowEndsAt?: number;

    }

  | { ok: false; error?: string };



function casualSettleErrorMessage(error?: string): string {

  switch (error) {

    case 'verify_failed':

    case 'invalid_token':

      return '登录已失效，请退出对局后重新登录再试';

    case 'forbidden':

      return '账号与对局不匹配，请从大厅重新进入本场';

    case 'no_game':

      return '对局数据不存在，请重新进入本场';

    case 'not_terminal':

      return '对局尚未结束，请稍后再试';

    case 'unknown_match_game':

      return '未找到休闲场次记录，请从大厅重新开局';

    case 'match_not_submittable':

      return '本场已不可提交成绩';

    case 'unauthorized':

    case 'casual_401':

      return '休闲平台鉴权失败，请确认部署环境配置';

    case 'casual_unreachable':

    case 'game_unreachable':

      return '休闲平台暂时不可达，请稍后重试';

    case 'missing_casual_auth':

      return '未登录，无法提交休闲场成绩';

    case 'settle_failed':

      return '终局写入失败，请重试';

    default:

      if (error?.startsWith('casual_')) {

        return `休闲平台返回错误（${error}），请稍后重试`;

      }

      return error ? `结算失败（${error}），请重试` : '结算提交失败，请重试';

  }

}



type YatzGameContextValue = {

  gameState: YatzGameState | null;

  loadError: string | null;

  busy: boolean;

  targetScore?: number;
  targetScoreP75?: number;
  targetScoreP90?: number;

  roll: () => Promise<void>;

  toggleHold: (index: number) => Promise<void>;

  pickCategory: (category: YatzCategory) => Promise<void>;

  settleManuallyAndExit: () => Promise<void>;

  settleConfirmOpen: boolean;

  cancelSettleConfirm: () => void;

  confirmSettleAndExit: () => Promise<void | ManualSettleConfirmExtras>;

  finishManualSettleSuccess: (extras?: ManualSettleConfirmExtras) => void;

  dismissPostCasualScoreReport: () => void;

  dismissPostCasualSummary: () => void;

  postCasualScoreReportOpen: boolean;

  postCasualScoreReport: CasualGameScoreReportUI | null;

  postCasualSummaryOpen: boolean;

  postCasualTableSummary: CasualAsyncTableSummaryUI | null;

  postCasualWaitingForPeers: boolean;

  postCasualCanReplay: boolean;

  postCasualReplayOffered: boolean;

  postCasualReplayMode: 'ad' | 'token';

  postCasualReplayTokenCount: number;

  postCasualReplayWindowEndsAt?: number;

  postCasualAdReplayDailyRemaining?: number;
  postCasualAdReplayDailyCap?: number;

  casualReplayBusy: boolean;

  replayCasualRun: () => Promise<void>;

  casualTournamentId?: string;

  watchTarget: Match3WatchContext | null;

  watchTargetLabel: string;

  openWatch: (ctx: Match3WatchContext, displayLabel: string) => void;

  closeWatch: () => void;

  openSelfReplay: () => void;

};



const YatzGameContext = createContext<YatzGameContextValue | null>(null);



export function useYatzGameManager() {

  const ctx = useContext(YatzGameContext);

  if (!ctx) throw new Error('useYatzGameManager must be used within YatzGameProvider');

  return ctx;

}



type Props = {

  children: ReactNode;

  gameId?: string;

  casualTournamentId?: string;

  onGameSubmit?: () => void;

};



const YatzGameProvider: React.FC<Props> = ({

  children,

  gameId,

  casualTournamentId,

  onGameSubmit,

}) => {

  const convex = useConvex();

  const { user } = useUserManager();

  const { platformReady } = usePlatformAuth();

  const casualPlatformBridge = casualTournamentId?.startsWith('portal_')
    ? ('portal' as const)
    : undefined;

  const casualPlatformAuthed =
    platformReady && isPlatformAuthed(user) && Boolean(user?.platformAccessToken);

  const casual = useCasualPlatform({ enabled: casualPlatformBridge !== 'portal' });

  const [gameState, setGameState] = useState<YatzGameState | null>(null);

  const [loadError, setLoadError] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);

  const [targetScore, setTargetScore] = useState<number | undefined>();
  const [targetScoreP75, setTargetScoreP75] = useState<number | undefined>();
  const [targetScoreP90, setTargetScoreP90] = useState<number | undefined>();

  const [postCasualScoreReportOpen, setPostCasualScoreReportOpen] = useState(false);

  const [postCasualScoreReport, setPostCasualScoreReport] = useState<CasualGameScoreReportUI | null>(

    null

  );

  const [postCasualSummaryOpen, setPostCasualSummaryOpen] = useState(false);

  const [postCasualTableSummary, setPostCasualTableSummary] = useState<CasualAsyncTableSummaryUI | null>(

    null

  );

  const [postCasualWaitingForPeers, setPostCasualWaitingForPeers] = useState(false);

  const [postCasualCanReplay, setPostCasualCanReplay] = useState(false);

  const [postCasualReplayOffered, setPostCasualReplayOffered] = useState(false);

  const [postCasualReplayTokenCount, setPostCasualReplayTokenCount] = useState(0);

  const [postCasualReplayMode, setPostCasualReplayMode] = useState<'ad' | 'token'>('token');

  const [postCasualReplayWindowEndsAt, setPostCasualReplayWindowEndsAt] = useState<

    number | undefined

  >();

  const [postCasualAdReplayDailyRemaining, setPostCasualAdReplayDailyRemaining] = useState<

    number | undefined

  >();

  const [postCasualAdReplayDailyCap, setPostCasualAdReplayDailyCap] = useState<

    number | undefined

  >();

  const [casualReplayBusy, setCasualReplayBusy] = useState(false);

  const [watchTarget, setWatchTarget] = useState<Match3WatchContext | null>(null);

  const [watchTargetLabel, setWatchTargetLabel] = useState('');

  const [settleConfirmOpen, setSettleConfirmOpen] = useState(false);

  const gameStateRef = useRef<YatzGameState | null>(null);

  const casualRunSubmittedRef = useRef(false);

  const settleInFlightRef = useRef(false);



  useEffect(() => {

    gameStateRef.current = gameState;

  }, [gameState]);



  const refreshGame = useCallback(async () => {

    if (!gameId) return null;

    const fresh = await convex.query(api.service.gameManager.getGame, { gameId });

    if (fresh) setGameState(fresh as YatzGameState);

    return fresh as YatzGameState | null;

  }, [convex, gameId]);



  const loadGame = useCallback(async () => {

    if (!gameId) return;

    setLoadError(null);

    try {

      const res = await convex.action(api.proxy.controller.loadGame, {
        gameId,
        ...(casualPlatformBridge ? { platformBridge: casualPlatformBridge } : {}),
      });

      if (res?.ok && res.game) {

        setGameState(res.game as YatzGameState);

        if (typeof res.seedScoreThreshold === 'number') {
          setTargetScore(res.seedScoreThreshold);
        }
        setTargetScoreP75(
          typeof res.seedScoreThresholdP75 === 'number' && Number.isFinite(res.seedScoreThresholdP75)
            ? Math.floor(res.seedScoreThresholdP75)
            : undefined
        );
        setTargetScoreP90(
          typeof res.seedScoreThresholdP90 === 'number' && Number.isFinite(res.seedScoreThresholdP90)
            ? Math.floor(res.seedScoreThresholdP90)
            : undefined
        );

        return;

      }

      setLoadError(typeof res?.error === 'string' ? res.error : 'load_failed');

    } catch {

      setLoadError('load_exception');

    }

  }, [convex, gameId, casualPlatformBridge]);



  useEffect(() => {

    void loadGame();

  }, [loadGame]);



  const clearPostCasualOverlays = useCallback(() => {

    setPostCasualSummaryOpen(false);

    setPostCasualTableSummary(null);

    setPostCasualWaitingForPeers(false);

    setPostCasualCanReplay(false);

    setPostCasualReplayOffered(false);

    setPostCasualReplayTokenCount(0);

    setPostCasualReplayMode('token');

    setPostCasualReplayWindowEndsAt(undefined);

    setPostCasualScoreReportOpen(false);

    setPostCasualScoreReport(null);

  }, []);



  const applySettleResponse = useCallback(

    async (

      score: number,

      res: {

        tableSummary?: CasualAsyncTableSummaryUI;

        pendingOthers?: boolean;

        seedScoreThreshold?: number;

        success?: boolean;

        replayOffered?: boolean;

        replayTokenCount?: number;

        canReplay?: boolean;

        replayWindowEndsAt?: number;

      },

      gameIdForSummary: string

    ) => {

      const report: CasualGameScoreReportUI = {

        gameLabel: 'Yatz',

        lines: [{ label: getCasualMatchScoreLineLabel(), value: score }],

        totalScore: score,

      };

      const soloChallenge = isCasualSoloP75ChallengeTemplate(casualTournamentId);
      if (soloChallenge) {
        const challenge = buildCasualScoreChallengeUI({
          achievedScore: score,
          clearThreshold:
            typeof res.seedScoreThreshold === 'number'
              ? res.seedScoreThreshold
              : targetScore,
          clearSuccess: res.success,
          p75: targetScoreP75,
          p90: targetScoreP90,
        });
        if (challenge) {
          report.challenge = challenge;
        }
      }

      setPostCasualScoreReport(report);

      setPostCasualTableSummary(res.tableSummary ?? null);

      {
        const hasRows = Boolean(res.tableSummary?.rows?.length);
        setPostCasualWaitingForPeers(
          Boolean(res.pendingOthers) || (!soloChallenge && !hasRows)
        );
      }

      setPostCasualReplayOffered(false);

      setPostCasualReplayTokenCount(0);

      setPostCasualReplayMode('token');

      setPostCasualCanReplay(false);

      setPostCasualReplayWindowEndsAt(undefined);

      setPostCasualScoreReportOpen(true);



      if (res.tableSummary) {

        applyCasualTableSummaryFromQuery(res.tableSummary, {

          setTableSummary: setPostCasualTableSummary,

          setReplayOffered: setPostCasualReplayOffered,

          setReplayTokenCount: setPostCasualReplayTokenCount,

          setCanReplay: setPostCasualCanReplay,

          setReplayWindowEndsAt: setPostCasualReplayWindowEndsAt,

          setReplayMode: setPostCasualReplayMode,

          setAdReplayDailyRemaining: setPostCasualAdReplayDailyRemaining,

          setAdReplayDailyCap: setPostCasualAdReplayDailyCap,

        });

      }

      // 多人竞技：Arena ingest 常缺 adReplayDailyCap；Portal query 带完整 N/M。
      if (
        gameIdForSummary &&
        (shouldRefreshPortalAdReplayQuota(casualTournamentId) || !res.tableSummary)
      ) {

        try {

          const summary = await fetchCasualAsyncTableSummaryForGame({
            matchGameId: gameIdForSummary,
            platformBridge: casualPlatformBridge ?? 'casual',
          });

          if (summary?.rows?.length) {

            applyCasualTableSummaryFromQuery(summary, {

              setTableSummary: setPostCasualTableSummary,

              setReplayOffered: setPostCasualReplayOffered,

              setReplayTokenCount: setPostCasualReplayTokenCount,

              setCanReplay: setPostCasualCanReplay,

              setReplayWindowEndsAt: setPostCasualReplayWindowEndsAt,

              setReplayMode: setPostCasualReplayMode,

              setAdReplayDailyRemaining: setPostCasualAdReplayDailyRemaining,

              setAdReplayDailyCap: setPostCasualAdReplayDailyCap,

            });

          }

        } catch {

          /* ignore */

        }

      }

    },

    [casualPlatformBridge, casualTournamentId, targetScore, targetScoreP75, targetScoreP90]

  );



  const completeCasualRun = useCallback(async () => {

    const gs = gameStateRef.current;

    if (!gs?.gameId?.startsWith('game_') || !casualPlatformAuthed || casualRunSubmittedRef.current) return;

    casualRunSubmittedRef.current = true;

    try {

      const res = (await convex.action(api.proxy.controller.submitCasualPlatformRun, {

        ...buildCasualPlatformRunActionArgs({
          gameId: gs.gameId,
          platformBridge: casualPlatformBridge,
        }),

      })) as {

        ok?: boolean;

        tableSummary?: CasualAsyncTableSummaryUI;

        pendingOthers?: boolean;

        seedScoreThreshold?: number;

        success?: boolean;

        replayOffered?: boolean;

        replayTokenCount?: number;

        canReplay?: boolean;

        replayWindowEndsAt?: number;

      };

      if (!res?.ok) {

        casualRunSubmittedRef.current = false;

        return;

      }

      await applySettleResponse(gs.score ?? 0, res, gs.gameId);

    } catch {

      casualRunSubmittedRef.current = false;

    }

  }, [convex, casualPlatformAuthed, applySettleResponse, casualPlatformBridge]);



  const reloadCasualRun = useCallback(async (): Promise<boolean> => {

    if (!gameId || !gameId.startsWith('game_')) return false;

    try {

      const res = await convex.action(api.proxy.controller.loadGame, {

        gameId,

        resetCasualRun: true,

        ...(casualPlatformBridge ? { platformBridge: casualPlatformBridge } : {}),

      });

      if (!res?.ok || !res.game) {

        console.warn('[yatz] reloadCasualRun failed', (res as { error?: string }).error);

        return false;

      }

      setGameState(res.game as YatzGameState);

      if (typeof res.seedScoreThreshold === 'number') {
        setTargetScore(res.seedScoreThreshold);
      }
      setTargetScoreP75(
        typeof res.seedScoreThresholdP75 === 'number' && Number.isFinite(res.seedScoreThresholdP75)
          ? Math.floor(res.seedScoreThresholdP75)
          : undefined
      );
      setTargetScoreP90(
        typeof res.seedScoreThresholdP90 === 'number' && Number.isFinite(res.seedScoreThresholdP90)
          ? Math.floor(res.seedScoreThresholdP90)
          : undefined
      );

      return true;

    } catch (e) {

      console.error('[yatz] reloadCasualRun', e);

      return false;

    }

  }, [convex, gameId, casualPlatformBridge]);



  const replayCasualRun = useCallback(async () => {
    const gs = gameStateRef.current;
    if (!gs || !casualPlatformAuthed || casualReplayBusy) return;
    if (typeof gs.gameId !== 'string' || !gs.gameId.startsWith('game_')) return;
    setCasualReplayBusy(true);
    // 点「看广告再战」后立刻收起结算层；失败再恢复。
    const restoreScoreReport = postCasualScoreReportOpen;
    const restoreSummary = postCasualSummaryOpen;
    setPostCasualScoreReportOpen(false);
    setPostCasualSummaryOpen(false);
    try {
      const rr = await executeCasualRunReplay({
        convex,
        gameId: gs.gameId,
        platformBridge: casualPlatformBridge,
        replayMode: postCasualReplayMode,
        replayAction: (actionArgs) =>
          convex.action(api.proxy.controller.replayCasualRun, actionArgs),
      });
      if (!rr.ok) {
        if (restoreScoreReport) setPostCasualScoreReportOpen(true);
        if (restoreSummary) setPostCasualSummaryOpen(true);
        console.warn('[yatz] replayCasualRun', rr.error);
        return;
      }
      casualRunSubmittedRef.current = false;
      clearPostCasualOverlays();
      await reloadCasualRun();
    } catch (e) {
      if (restoreScoreReport) setPostCasualScoreReportOpen(true);
      if (restoreSummary) setPostCasualSummaryOpen(true);
      console.error('[yatz] replayCasualRun', e);
    } finally {
      setCasualReplayBusy(false);
    }
  }, [
    convex,
    casualPlatformAuthed,
    casualReplayBusy,
    postCasualScoreReportOpen,
    postCasualSummaryOpen,
    postCasualReplayMode,
    clearPostCasualOverlays,
    reloadCasualRun,
    casualPlatformBridge,
  ]);



  const exitCasualRunAfterSettle = useCallback(

    async (opts: { hadReplayOffer: boolean }) => {

      const gs = gameStateRef.current;

      const isCasualRun =

        Boolean(casualTournamentId) &&

        gs &&

        typeof gs.gameId === 'string' &&

        gs.gameId.startsWith('game_');

      if (opts.hadReplayOffer && isCasualRun && user?.uid) {

        try {

          await confirmCasualRunWithoutReplayForBridge({

            matchGameId: gs.gameId,

            platformBridge: casualPlatformBridge,

            casualConfirm: casual.confirmCasualRunWithoutReplay,

          });

          if (casualPlatformBridge !== 'portal') {

            await casual.refreshCasualPlayer();

          }

        } catch (e) {

          console.warn('[yatz] confirmCasualRunWithoutReplay', e);

        }

      }

      clearPostCasualOverlays();

      onGameSubmit?.();

    },

    [casual, casualTournamentId, casualPlatformBridge, user?.uid, clearPostCasualOverlays, onGameSubmit]

  );



  const runForceEndCasualSettlement = useCallback(
    async (): Promise<CasualRunSubmitOutcome> => {
      const gs = gameStateRef.current;
      if (!gs || casualRunSubmittedRef.current) return { ok: false };
      if (typeof gs.gameId !== 'string' || !gs.gameId.startsWith('game_')) {
        return { ok: false, error: 'not_casual_run' };
      }
      if (!casualPlatformAuthed) {
        return { ok: false, error: 'missing_casual_auth' };
      }
      casualRunSubmittedRef.current = true;
      try {
        const res = (await convex.action(api.proxy.controller.forceEndCasualPlatformRun, {
          ...buildCasualPlatformRunActionArgs({
            gameId: gs.gameId,
            platformBridge: casualPlatformBridge,
          }),
        })) as {
          ok?: boolean;
          error?: string;
          tableSummary?: CasualAsyncTableSummaryUI;
          pendingOthers?: boolean;
          seedScoreThreshold?: number;
          success?: boolean;
          replayOffered?: boolean;
          replayTokenCount?: number;
          canReplay?: boolean;
          replayWindowEndsAt?: number;
        };
        if (!res?.ok) {
          console.warn('[yatz] forceEndCasualPlatformRun', res.error);
          casualRunSubmittedRef.current = false;
          return { ok: false, error: res.error };
        }
        setGameState((prev) => (prev ? { ...prev, status: YatzGameStatus.CANCELLED } : prev));
        return {
          ok: true,
          ...(res.tableSummary ? { tableSummary: res.tableSummary } : {}),
          ...(res.pendingOthers ? { pendingOthers: true } : {}),
          ...(typeof res.seedScoreThreshold === 'number'
            ? { seedScoreThreshold: res.seedScoreThreshold }
            : {}),
          ...(typeof res.success === 'boolean' ? { success: res.success } : {}),
          ...(res.replayOffered ? { replayOffered: true } : {}),
          ...(typeof res.replayTokenCount === 'number'
            ? { replayTokenCount: res.replayTokenCount }
            : {}),
          ...(res.canReplay ? { canReplay: true } : {}),
          ...(typeof res.replayWindowEndsAt === 'number'
            ? { replayWindowEndsAt: res.replayWindowEndsAt }
            : {}),
        };
      } catch (e) {
        console.error('[yatz] runForceEndCasualSettlement', e);
        casualRunSubmittedRef.current = false;
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes('unauthenticated')) {
          return { ok: false, error: 'missing_casual_auth' };
        }
        return { ok: false, error: 'network_error' };
      }
    },
    [convex, casualPlatformAuthed, casualPlatformBridge]
  );

  const finishManualSettleSuccess = useCallback(
    (extras?: ManualSettleConfirmExtras) => {
      setSettleConfirmOpen(false);
      // Early settle via close: leave immediately (no score-report / second dismiss).
      void exitCasualRunAfterSettle({
        hadReplayOffer: Boolean(extras?.replayOffered),
      });
    },
    [exitCasualRunAfterSettle]
  );

  const cancelSettleConfirm = useCallback(() => {
    setSettleConfirmOpen(false);
    if (!casualRunSubmittedRef.current) {
      settleInFlightRef.current = false;
    }
  }, []);

  const settleManuallyAndExit = useCallback(async () => {
    // Mirror Solitaire: second X after settle dismisses overlays + closes modal.
    if (settleConfirmOpen) {
      cancelSettleConfirm();
      return;
    }
    if (casualRunSubmittedRef.current) {
      if (postCasualSummaryOpen || postCasualScoreReportOpen) {
        void exitCasualRunAfterSettle({ hadReplayOffer: postCasualReplayOffered });
      } else {
        onGameSubmit?.();
      }
      return;
    }

    const gs = gameStateRef.current;
    if (!gs || settleInFlightRef.current) return;

    if (gs.status === YatzGameStatus.PLAYING) {
      setSettleConfirmOpen(true);
      return;
    }

    await completeCasualRun();
  }, [
    settleConfirmOpen,
    cancelSettleConfirm,
    postCasualSummaryOpen,
    postCasualScoreReportOpen,
    postCasualReplayOffered,
    exitCasualRunAfterSettle,
    onGameSubmit,
    completeCasualRun,
  ]);

  const confirmSettleAndExit = useCallback(async (): Promise<void | ManualSettleConfirmExtras> => {
    const gs = gameStateRef.current;
    if (!gs || casualRunSubmittedRef.current || settleInFlightRef.current) {
      throw new Error('当前无法结算');
    }
    if (gs.status !== YatzGameStatus.PLAYING) {
      throw new Error('当前无法结算');
    }
    settleInFlightRef.current = true;
    setBusy(true);
    try {
      const isCasualGameId = typeof gs.gameId === 'string' && gs.gameId.startsWith('game_');
      if (Boolean(casualTournamentId) && isCasualGameId && !casualPlatformAuthed) {
        throw new Error(casualSettleErrorMessage('missing_casual_auth'));
      }
      const isCasualRun = isCasualGameId && casualPlatformAuthed;
      if (isCasualRun) {
        const settled = await runForceEndCasualSettlement();
        if (!settled.ok) {
          throw new Error(casualSettleErrorMessage(settled.error));
        }
        const out: ManualSettleConfirmExtras = {};
        if (settled.tableSummary) out.tableSummary = settled.tableSummary;
        if (settled.pendingOthers) out.pendingOthers = true;
        if (typeof settled.seedScoreThreshold === 'number') {
          out.seedScoreThreshold = settled.seedScoreThreshold;
          out.success = Boolean(settled.success);
        } else if (typeof targetScore === 'number' && Number.isFinite(targetScore)) {
          const score = Math.max(0, Math.floor(gs.score ?? 0));
          out.seedScoreThreshold = targetScore;
          out.success = score >= targetScore;
        }
        if (settled.replayOffered) out.replayOffered = true;
        if (typeof settled.replayTokenCount === 'number') {
          out.replayTokenCount = settled.replayTokenCount;
        }
        if (settled.canReplay) out.canReplay = true;
        if (typeof settled.replayWindowEndsAt === 'number') {
          out.replayWindowEndsAt = settled.replayWindowEndsAt;
        }
        return out;
      }
      await convex.mutation(api.service.gameManager.concedeGame, { gameId: gs.gameId });
      setGameState((prev) => (prev ? { ...prev, status: YatzGameStatus.CANCELLED } : prev));
      onGameSubmit?.();
      return undefined;
    } catch (e) {
      console.error('[yatz] confirmSettleAndExit', e);
      if (e instanceof Error) throw e;
      throw new Error('结算失败，请稍后重试');
    } finally {
      settleInFlightRef.current = false;
      setBusy(false);
    }
  }, [
    convex,
    casualTournamentId,
    casualPlatformAuthed,
    targetScore,
    runForceEndCasualSettlement,
    onGameSubmit,
  ]);

  const maybeComplete = useCallback(

    async (status: number) => {

      if (status === YatzGameStatus.COMPLETED || status === YatzGameStatus.CANCELLED) {

        await completeCasualRun();

      }

    },

    [completeCasualRun]

  );



  const roll = useCallback(async () => {

    if (!gameId || busy) return;

    setBusy(true);

    try {

      const res = await convex.mutation(api.service.gameManager.roll, { gameId });

      if (!res?.ok) return;

      const fresh = await refreshGame();

      if (fresh) await maybeComplete(fresh.status);

    } finally {

      setBusy(false);

    }

  }, [gameId, busy, convex, refreshGame, maybeComplete]);



  const toggleHold = useCallback(

    async (index: number) => {

      if (!gameId || busy) return;

      setBusy(true);

      try {

        await convex.mutation(api.service.gameManager.toggleHold, { gameId, index });

        await refreshGame();

      } finally {

        setBusy(false);

      }

    },

    [gameId, busy, convex, refreshGame]

  );



  const pickCategory = useCallback(

    async (category: YatzCategory) => {

      if (!gameId || busy) return;

      setBusy(true);

      try {

        const res = await convex.mutation(api.service.gameManager.pickCategory, {

          gameId,

          category,

        });

        if (!res?.ok) return;

        const fresh = await refreshGame();

        if (fresh) await maybeComplete(fresh.status);

      } finally {

        setBusy(false);

      }

    },

    [gameId, busy, convex, refreshGame, maybeComplete]

  );



  const dismissPostCasualScoreReport = useCallback(async () => {
    const hadReplayOffer = postCasualReplayOffered;
    let tableSummary = postCasualTableSummary;
    let waitingForPeers = postCasualWaitingForPeers;
    const gs = gameStateRef.current;
    const matchGameId =
      typeof gs?.gameId === "string" && gs.gameId.startsWith("game_") ? gs.gameId : undefined;

    if (
      matchGameId &&
      !isCasualSoloP75ChallengeTemplate(casualTournamentId) &&
      !tableSummary?.rows?.length
    ) {
      try {
        const fetched = await fetchCasualAsyncTableSummaryForGame({
          matchGameId,
          platformBridge: casualPlatformBridge,
        });
        if (fetched?.rows?.length) {
          applyCasualTableSummaryFromQuery(fetched, {
            setTableSummary: setPostCasualTableSummary,
            setReplayOffered: setPostCasualReplayOffered,
            setReplayTokenCount: setPostCasualReplayTokenCount,
            setCanReplay: setPostCasualCanReplay,
            setReplayWindowEndsAt: setPostCasualReplayWindowEndsAt,
            setReplayMode: setPostCasualReplayMode,
            setAdReplayDailyRemaining: setPostCasualAdReplayDailyRemaining,
            setAdReplayDailyCap: setPostCasualAdReplayDailyCap,
          });
          tableSummary = fetched;
          waitingForPeers = false;
          setPostCasualWaitingForPeers(false);
        } else if (!waitingForPeers) {
          waitingForPeers = true;
          setPostCasualWaitingForPeers(true);
        }
      } catch (e) {
        console.warn("[yatz] fetch table summary on score dismiss", e);
        if (!waitingForPeers) {
          waitingForPeers = true;
          setPostCasualWaitingForPeers(true);
        }
      }
    }

    setPostCasualScoreReportOpen(false);
    setPostCasualScoreReport(null);

    if (tableSummary?.rows?.length || waitingForPeers) {
      setPostCasualSummaryOpen(true);
    } else {
      void exitCasualRunAfterSettle({ hadReplayOffer });
    }
  }, [
    casualTournamentId,
    casualPlatformBridge,
    postCasualTableSummary,
    postCasualWaitingForPeers,
    postCasualReplayOffered,
    exitCasualRunAfterSettle,
  ]);



  const dismissPostCasualSummary = useCallback(() => {

    void exitCasualRunAfterSettle({ hadReplayOffer: postCasualReplayOffered });

  }, [postCasualReplayOffered, exitCasualRunAfterSettle]);



  const openWatch = useCallback((ctx: Match3WatchContext, displayLabel: string) => {

    setWatchTarget(ctx);

    setWatchTargetLabel(displayLabel);

  }, []);



  const closeWatch = useCallback(() => {

    setWatchTarget(null);

    setWatchTargetLabel('');

  }, []);



  const openSelfReplay = useCallback(() => {

    const gs = gameStateRef.current;

    const gid = gs?.gameId;

    if (!gid) return;

    const steps = gs?.recordedOps ?? [];

    openWatch(

      {

        kind: 'recorded',

        gameId: gid,

        ...(gs?.seed ? { seedId: gs.seed } : {}),

        ...(steps.length > 0 ? { steps, opCount: steps.length } : {}),

      },

      '你'

    );

  }, [openWatch]);



  const completeCasualRunOnTimeout = useCallback(async () => {

    const gs = gameStateRef.current;

    if (!gs || casualRunSubmittedRef.current || settleInFlightRef.current) return;

    if (gs.status !== YatzGameStatus.PLAYING) return;

    if (gs.dueTime == null || Date.now() < gs.dueTime) return;

    if (!casualPlatformAuthed || typeof gs.gameId !== 'string' || !gs.gameId.startsWith('game_')) return;



    settleInFlightRef.current = true;

    setBusy(true);

    try {

      const settled = await runForceEndCasualSettlement();

      if (!settled.ok) {

        console.warn('[yatz] forceEndCasualPlatformRun on timeout', settled.error);

        return;

      }

      const score = gs.score ?? 0;

      await applySettleResponse(score, settled, gs.gameId);

    } catch (e) {

      console.error('[yatz] completeCasualRunOnTimeout', e);

    } finally {

      settleInFlightRef.current = false;

      setBusy(false);

    }

  }, [casualPlatformAuthed, runForceEndCasualSettlement, applySettleResponse]);



  useEffect(() => {

    const gs = gameState;

    if (!gs?.dueTime || gs.status !== YatzGameStatus.PLAYING) return;

    const ms = gs.dueTime - Date.now();

    if (ms <= 0) {

      void completeCasualRunOnTimeout();

      return;

    }

    const t = window.setTimeout(() => {

      void completeCasualRunOnTimeout();

    }, ms);

    return () => window.clearTimeout(t);

  }, [

    gameState?.gameId,

    gameState?.dueTime,

    gameState?.status,

    completeCasualRunOnTimeout,

  ]);



  return (

    <YatzGameContext.Provider

      value={{

        gameState,

        loadError,

        busy,

        targetScore,
        targetScoreP75,
        targetScoreP90,

        roll,

        toggleHold,

        pickCategory,

        settleManuallyAndExit,

        settleConfirmOpen,

        cancelSettleConfirm,

        confirmSettleAndExit,

        finishManualSettleSuccess,

        dismissPostCasualScoreReport,

        dismissPostCasualSummary,

        postCasualScoreReportOpen,

        postCasualScoreReport,

        postCasualSummaryOpen,

        postCasualTableSummary,

        postCasualWaitingForPeers,

        postCasualCanReplay,

        postCasualReplayOffered,

        postCasualReplayMode,

        postCasualReplayTokenCount,

        postCasualReplayWindowEndsAt,

        postCasualAdReplayDailyRemaining,
        postCasualAdReplayDailyCap,

        casualReplayBusy,

        replayCasualRun,

        casualTournamentId,

        watchTarget,

        watchTargetLabel,

        openWatch,

        closeWatch,

        openSelfReplay,

      }}

    >

      {children}

    </YatzGameContext.Provider>

  );

};



export default YatzGameProvider;


