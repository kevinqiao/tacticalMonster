import { useCasualPlatform } from 'component/lobby/casual/service/useCasualPlatformManager';

import { useUserManager } from 'host/service/UserManager';

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

  type Match3WatchContext,

} from '../../../shared/casualAsyncTableSummaryUI';

import type { CasualGameScoreReportUI } from '../../../shared/casualGameScoreReportUI';

import { CasualGameScoreReportOverlay } from '../../../shared/CasualGameScoreReportOverlay';

import { CasualPostSettleSummaryOverlay } from '../../../shared/CasualPostSettleSummaryOverlay';

import { YatzGameStatus, type YatzCategory, type YatzGameState } from '../types/YatzTypes';



type YatzGameContextValue = {

  gameState: YatzGameState | null;

  loadError: string | null;

  busy: boolean;

  targetScore?: number;

  roll: () => Promise<void>;

  toggleHold: (index: number) => Promise<void>;

  pickCategory: (category: YatzCategory) => Promise<void>;

  settleManuallyAndExit: () => Promise<void>;

  settleConfirmOpen: boolean;

  cancelSettleConfirm: () => void;

  confirmSettleAndExit: () => Promise<void>;

  dismissPostCasualScoreReport: () => void;

  dismissPostCasualSummary: () => void;

  postCasualScoreReportOpen: boolean;

  postCasualScoreReport: CasualGameScoreReportUI | null;

  postCasualSummaryOpen: boolean;

  postCasualTableSummary: CasualAsyncTableSummaryUI | null;

  postCasualWaitingForPeers: boolean;

  postCasualCanReplay: boolean;

  postCasualReplayOffered: boolean;

  postCasualReplayTokenCount: number;

  postCasualReplayWindowEndsAt?: number;

  casualReplayBusy: boolean;

  replayCasualRun: () => Promise<void>;

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

  const casual = useCasualPlatform();

  const { user } = useUserManager();

  const [gameState, setGameState] = useState<YatzGameState | null>(null);

  const [loadError, setLoadError] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);

  const [targetScore, setTargetScore] = useState<number | undefined>();

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

  const [postCasualReplayWindowEndsAt, setPostCasualReplayWindowEndsAt] = useState<

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

      const res = await convex.action(api.proxy.controller.loadGame, { gameId });

      if (res?.ok && res.game) {

        setGameState(res.game as YatzGameState);

        if (typeof res.seedScoreThreshold === 'number') {

          setTargetScore(res.seedScoreThreshold);

        }

        return;

      }

      setLoadError(typeof res?.error === 'string' ? res.error : 'load_failed');

    } catch {

      setLoadError('load_exception');

    }

  }, [convex, gameId]);



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

        lines: [{ label: '本局总分', value: score }],

        totalScore: score,

      };

      if (typeof res.seedScoreThreshold === 'number') {

        report.challenge = {

          targetScore: res.seedScoreThreshold,

          achievedScore: score,

          success: Boolean(res.success),

        };

      }

      setPostCasualScoreReport(report);

      setPostCasualTableSummary(res.tableSummary ?? null);

      setPostCasualWaitingForPeers(Boolean(res.pendingOthers));

      setPostCasualReplayOffered(false);

      setPostCasualReplayTokenCount(0);

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

        });

      } else if (gameIdForSummary) {

        try {

          const summary = await casual.fetchCasualTableSummaryForGame(gameIdForSummary);

          if (summary?.rows?.length) {

            applyCasualTableSummaryFromQuery(summary, {

              setTableSummary: setPostCasualTableSummary,

              setReplayOffered: setPostCasualReplayOffered,

              setReplayTokenCount: setPostCasualReplayTokenCount,

              setCanReplay: setPostCasualCanReplay,

              setReplayWindowEndsAt: setPostCasualReplayWindowEndsAt,

            });

          }

        } catch {

          /* ignore */

        }

      }

    },

    [casual]

  );



  const completeCasualRun = useCallback(async () => {

    const gs = gameStateRef.current;

    if (!gs?.gameId?.startsWith('game_') || !user?.token || casualRunSubmittedRef.current) return;

    casualRunSubmittedRef.current = true;

    try {

      const res = (await convex.action(api.proxy.controller.submitCasualPlatformRun, {

        token: user.token,

        gameId: gs.gameId,

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

  }, [convex, user?.token, applySettleResponse]);



  const reloadCasualRun = useCallback(async (): Promise<boolean> => {

    if (!gameId || !gameId.startsWith('game_')) return false;

    try {

      const res = await convex.action(api.proxy.controller.loadGame, {

        gameId,

        resetCasualRun: true,

      });

      if (!res?.ok || !res.game) {

        console.warn('[yatz] reloadCasualRun failed', (res as { error?: string }).error);

        return false;

      }

      setGameState(res.game as YatzGameState);

      if (typeof res.seedScoreThreshold === 'number') {

        setTargetScore(res.seedScoreThreshold);

      }

      return true;

    } catch (e) {

      console.error('[yatz] reloadCasualRun', e);

      return false;

    }

  }, [convex, gameId]);



  const replayCasualRun = useCallback(async () => {

    const gs = gameStateRef.current;

    if (!gs || !user?.token || casualReplayBusy) return;

    if (typeof gs.gameId !== 'string' || !gs.gameId.startsWith('game_')) return;

    setCasualReplayBusy(true);

    try {

      const rr = (await convex.action(api.proxy.controller.replayCasualRun, {

        token: user.token,

        gameId: gs.gameId,

      })) as { ok?: boolean; error?: string };

      if (!rr?.ok) {

        console.warn('[yatz] replayCasualRun', rr?.error);

        return;

      }

      casualRunSubmittedRef.current = false;

      clearPostCasualOverlays();

      await reloadCasualRun();

    } catch (e) {

      console.error('[yatz] replayCasualRun', e);

    } finally {

      setCasualReplayBusy(false);

    }

  }, [convex, user?.token, casualReplayBusy, clearPostCasualOverlays, reloadCasualRun]);



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

          await casual.confirmCasualRunWithoutReplay(gs.gameId);

          await casual.refreshCasualPlayer();

        } catch (e) {

          console.warn('[yatz] confirmCasualRunWithoutReplay', e);

        }

      }

      clearPostCasualOverlays();

      onGameSubmit?.();

    },

    [casual, casualTournamentId, user?.uid, clearPostCasualOverlays, onGameSubmit]

  );



  const settleManuallyAndExit = useCallback(async () => {

    const gs = gameStateRef.current;

    if (!gs || casualRunSubmittedRef.current || settleInFlightRef.current) return;

    if (gs.status === YatzGameStatus.PLAYING) {

      setSettleConfirmOpen(true);

      return;

    }

    await completeCasualRun();

  }, [completeCasualRun]);



  const confirmSettleAndExit = useCallback(async () => {

    const gs = gameStateRef.current;

    if (!gs?.gameId || !user?.token || settleInFlightRef.current) return;

    setSettleConfirmOpen(false);

    settleInFlightRef.current = true;

    setBusy(true);

    try {

      await convex.mutation(api.service.gameManager.concedeGame, { gameId: gs.gameId });

      const res = (await convex.action(api.proxy.controller.forceEndCasualPlatformRun, {

        token: user.token,

        gameId: gs.gameId,

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

      if (!res?.ok) return;

      casualRunSubmittedRef.current = true;

      const score = gs.score ?? 0;

      setGameState((prev) => (prev ? { ...prev, status: YatzGameStatus.CANCELLED } : prev));

      await applySettleResponse(score, res, gs.gameId);

    } finally {

      settleInFlightRef.current = false;

      setBusy(false);

    }

  }, [convex, user?.token, applySettleResponse]);



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



  const dismissPostCasualScoreReport = useCallback(() => {

    const hadReplayOffer = postCasualReplayOffered;

    setPostCasualScoreReportOpen(false);

    setPostCasualScoreReport(null);

    if (postCasualTableSummary || postCasualWaitingForPeers) {

      setPostCasualSummaryOpen(true);

    } else {

      void exitCasualRunAfterSettle({ hadReplayOffer });

    }

  }, [

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

    if (!user?.token || typeof gs.gameId !== 'string' || !gs.gameId.startsWith('game_')) return;



    settleInFlightRef.current = true;

    setBusy(true);

    try {

      const res = (await convex.action(api.proxy.controller.forceEndCasualPlatformRun, {

        token: user.token,

        gameId: gs.gameId,

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

        console.warn('[yatz] forceEndCasualPlatformRun on timeout', res?.error);

        return;

      }

      casualRunSubmittedRef.current = true;

      const score = gs.score ?? 0;

      setGameState((prev) => (prev ? { ...prev, status: YatzGameStatus.CANCELLED } : prev));

      await applySettleResponse(score, res, gs.gameId);

    } catch (e) {

      console.error('[yatz] completeCasualRunOnTimeout', e);

    } finally {

      settleInFlightRef.current = false;

      setBusy(false);

    }

  }, [convex, user?.token, applySettleResponse]);



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

        roll,

        toggleHold,

        pickCategory,

        settleManuallyAndExit,

        settleConfirmOpen,

        cancelSettleConfirm: () => setSettleConfirmOpen(false),

        confirmSettleAndExit,

        dismissPostCasualScoreReport,

        dismissPostCasualSummary,

        postCasualScoreReportOpen,

        postCasualScoreReport,

        postCasualSummaryOpen,

        postCasualTableSummary,

        postCasualWaitingForPeers,

        postCasualCanReplay,

        postCasualReplayOffered,

        postCasualReplayTokenCount,

        postCasualReplayWindowEndsAt,

        casualReplayBusy,

        replayCasualRun,

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


