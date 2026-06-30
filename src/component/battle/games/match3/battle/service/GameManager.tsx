import { useCasualPlatform } from 'component/lobby/casual/service/useCasualPlatformManager';
import { useUserManager } from 'host/service/UserManager';
import { usePlatformAuth } from 'host/service/platformAuth/PlatformAuthProvider';
import { isPlatformAuthed } from 'host/service/platformAuth/platformAccessToken';
import { useConvex } from 'convex/react';
import React, {
  createContext,
  ReactNode,
  RefObject,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { api } from '@/convex/match3Arena/convex/_generated/api';
import {
  buildMatch3ScoreReport,
  isCasualSoloP75ChallengeTemplate,
  shouldOpenCasualTableSummaryAfterScoreReport,
  type CasualGameScoreReportUI,
} from '../../../shared/casualGameScoreReportUI';
import {
  applyCasualTableSummaryFromQuery,
  type CasualAsyncTableSummaryUI,
  type ManualSettleConfirmExtras,
  type Match3WatchContext,
} from '../../../shared/casualAsyncTableSummaryUI';
import {
  queueTriathlonMidSessionAdvance,
  shouldDeferTriathlonTableSummaryForLeg,
  triathlonFirstLegGameId,
  tryAdvanceTriathlonMidSession,
  type TriathlonMidSessionAdvanceHandler,
  type TriathlonPendingAdvance,
  type TriathlonSessionReplayHandler,
} from '../../../shared/casualTriathlonSubmitFlow';
import { resetTriathlonCasualGameServers } from '../../../shared/triathlonCasualReplayReset';
import { buildCasualPlatformRunActionArgs } from '../../../shared/casualPlatformActionArgs';
import { fetchCasualAsyncTableSummaryForGame } from '../../../shared/fetchCasualAsyncTableSummary';
import type { TriathlonNextGame } from 'component/lobby/casual/service/useCasualTriathlonSession';
import { useCasualTableSummaryPoll } from '../../../shared/useCasualTableSummaryPoll';
import { allocateGridCellRefs, type GridCellRefs } from '../animation/gridCellRefs';
import {
  DEFAULT_MATCH3_BOARD_METRICS,
  type Match3BoardMetrics,
} from '../animation/boardMetrics';
import {
  GameInteractionPhase,
  GameReport,
  Match3GameState,
  Match3GameStatus,
} from '../types/Match3Types';
import { Match3RuleManager } from '@/convex/match3Arena/convex/service/Match3RuleManager';

type GameStateCommitPatch = Partial<
  Pick<Match3GameState, 'grid' | 'score' | 'moves' | 'status' | 'refillCounter'>
>;

interface IMatch3GameContext {
  gameState: Match3GameState | null;
  gridCellRefs: RefObject<GridCellRefs | null>;
  boardMetricsRef: RefObject<Match3BoardMetrics>;
  ruleManager: Match3RuleManager | null;
  interactionPhase: GameInteractionPhase;
  setInteractionPhase: (phase: GameInteractionPhase) => void;
  loadGame: () => void;
  loadError: string | null;
  commitGameState: (patch?: GameStateCommitPatch) => void;
  completeCasualRun: () => Promise<void>;
  settleManuallyAndExit: () => Promise<void>;
  settleConfirmOpen: boolean;
  cancelSettleConfirm: () => void;
  confirmSettleAndExit: () => Promise<void>;
  postCasualScoreReportOpen: boolean;
  postCasualScoreReport: CasualGameScoreReportUI | null;
  dismissPostCasualScoreReport: () => void;
  postCasualSummaryOpen: boolean;
  postCasualTableSummary: CasualAsyncTableSummaryUI | null;
  dismissPostCasualSummary: () => void;
  postCasualWaitingForPeers: boolean;
  postCasualCanReplay: boolean;
  postCasualReplayOffered: boolean;
  postCasualReplayTokenCount: number;
  postCasualReplayWindowEndsAt?: number;
  casualReplayBusy: boolean;
  replayCasualRun: () => Promise<void>;
  triathlonSessionActive: boolean;
  casualTournamentId?: string;
  /** P75 挑战等：本局 seed 分位目标分 */
  targetScore?: number;
  watchTarget: Match3WatchContext | null;
  watchTargetLabel: string;
  openWatch: (ctx: Match3WatchContext, displayLabel: string) => void;
  closeWatch: () => void;
  openSelfReplay: () => void;
}

const Match3GameContext = createContext<IMatch3GameContext | null>(null);

export const useMatch3GameManager = () => {
  const ctx = useContext(Match3GameContext);
  if (!ctx) throw new Error('useMatch3GameManager must be used within Match3GameProvider');
  return ctx;
};

interface Props {
  children: ReactNode;
  gameId?: string;
  casualTournamentId?: string;
  onGameLoadComplete?: () => void;
  onGameSubmit?: () => void;
  onTriathlonNextGame?: TriathlonMidSessionAdvanceHandler;
  onTriathlonSessionReplay?: TriathlonSessionReplayHandler;
}

export const Match3GameProvider: React.FC<Props> = ({
  children,
  gameId,
  casualTournamentId,
  onGameLoadComplete,
  onGameSubmit,
  onTriathlonNextGame,
  onTriathlonSessionReplay,
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
  const [gameState, setGameState] = useState<Match3GameState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [interactionPhase, setInteractionPhase] = useState(GameInteractionPhase.idle);
  const [targetScore, setTargetScore] = useState<number | undefined>(undefined);
  const gridCellRefs = useRef<GridCellRefs | null>(null);
  if (!gridCellRefs.current) {
    gridCellRefs.current = allocateGridCellRefs();
  }
  const boardMetricsRef = useRef<Match3BoardMetrics>(DEFAULT_MATCH3_BOARD_METRICS);
  const [settleConfirmOpen, setSettleConfirmOpen] = useState(false);
  const [postCasualScoreReportOpen, setPostCasualScoreReportOpen] = useState(false);
  const [postCasualScoreReport, setPostCasualScoreReport] = useState<CasualGameScoreReportUI | null>(null);
  const [postCasualSummaryOpen, setPostCasualSummaryOpen] = useState(false);
  const [postCasualTableSummary, setPostCasualTableSummary] = useState<CasualAsyncTableSummaryUI | null>(null);
  const [postCasualWaitingForPeers, setPostCasualWaitingForPeers] = useState(false);
  const [postCasualCanReplay, setPostCasualCanReplay] = useState(false);
  const [postCasualReplayOffered, setPostCasualReplayOffered] = useState(false);
  const [postCasualReplayTokenCount, setPostCasualReplayTokenCount] = useState(0);
  const [postCasualReplayWindowEndsAt, setPostCasualReplayWindowEndsAt] = useState<
    number | undefined
  >(undefined);
  const [casualReplayBusy, setCasualReplayBusy] = useState(false);
  const [triathlonDeferTableSummary, setTriathlonDeferTableSummary] = useState(false);
  const [watchTarget, setWatchTarget] = useState<Match3WatchContext | null>(null);
  const [watchTargetLabel, setWatchTargetLabel] = useState('');
  const casualRunSubmittedRef = useRef(false);
  const pendingTriathlonAdvanceRef = useRef<TriathlonPendingAdvance | null>(null);
  const gameStateRef = useRef<Match3GameState | null>(null);
  const triathlonSessionActive = Boolean(onTriathlonNextGame);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    casualRunSubmittedRef.current = false;
    pendingTriathlonAdvanceRef.current = null;
    setTriathlonDeferTableSummary(false);
    setPostCasualScoreReportOpen(false);
    setPostCasualScoreReport(null);
    setPostCasualSummaryOpen(false);
    setPostCasualTableSummary(null);
    setPostCasualWaitingForPeers(false);
    setPostCasualCanReplay(false);
    setPostCasualReplayOffered(false);
    setPostCasualReplayTokenCount(0);
    setPostCasualReplayWindowEndsAt(undefined);
    setCasualReplayBusy(false);
  }, [gameState?.gameId]);

  useCasualTableSummaryPoll({
    open:
      (postCasualSummaryOpen || postCasualScoreReportOpen) && !triathlonDeferTableSummary,
    summary: postCasualTableSummary,
    matchGameId: gameState?.gameId?.startsWith('game_') ? gameState.gameId : undefined,
    fetchSummary: (matchGameId) =>
      fetchCasualAsyncTableSummaryForGame({
        matchGameId,
        platformBridge: casualPlatformBridge ?? 'casual',
      }),
    onUpdate: (next) => {
      applyCasualTableSummaryFromQuery(next, {
        setTableSummary: setPostCasualTableSummary,
        setReplayOffered: setPostCasualReplayOffered,
        setReplayTokenCount: setPostCasualReplayTokenCount,
        setCanReplay: setPostCasualCanReplay,
        setReplayWindowEndsAt: setPostCasualReplayWindowEndsAt,
      });
    },
  });

  const applyLoadedTargetScore = useCallback(
    async (loadedGame: Match3GameState, res: { seedScoreThreshold?: number }) => {
      let threshold =
        typeof res.seedScoreThreshold === 'number' && Number.isFinite(res.seedScoreThreshold)
          ? res.seedScoreThreshold
          : typeof loadedGame.targetScore === 'number' && Number.isFinite(loadedGame.targetScore)
            ? loadedGame.targetScore
            : undefined;

      if (
        threshold == null &&
        isCasualSoloP75ChallengeTemplate(casualTournamentId) &&
        loadedGame.gameId.startsWith('game_')
      ) {
        try {
          const meta = (await convex.action(api.proxy.controller.fetchCasualMatchTarget, {
            gameId: loadedGame.gameId,
            ...(casualPlatformBridge ? { platformBridge: casualPlatformBridge } : {}),
          })) as { ok?: boolean; seedScoreThreshold?: number };
          if (
            meta?.ok &&
            typeof meta.seedScoreThreshold === 'number' &&
            Number.isFinite(meta.seedScoreThreshold)
          ) {
            threshold = meta.seedScoreThreshold;
          }
        } catch (e) {
          console.warn('[match3] fetchCasualMatchTarget failed', e);
        }
      }

      if (threshold != null) {
        setTargetScore(threshold);
        setGameState((prev) =>
          prev && prev.gameId === loadedGame.gameId ? { ...prev, targetScore: threshold } : prev
        );
      } else {
        setTargetScore(undefined);
      }
    },
    [casualTournamentId, convex, casualPlatformBridge]
  );

  const loadGame = useCallback(async () => {
    if (!gameId) return;
    setLoadError(null);
    setTargetScore(undefined);
    try {
      const res = await convex.action(api.proxy.controller.loadGame, {
        gameId,
        ...(casualPlatformBridge ? { platformBridge: casualPlatformBridge } : {}),
      });
      if (res?.ok && res.game) {
        const loadedGame = res.game as Match3GameState;
        setGameState(loadedGame);
        onGameLoadComplete?.();
        await applyLoadedTargetScore(loadedGame, res as { seedScoreThreshold?: number });
        return;
      }
      const msg =
        typeof res?.error === 'string' ? res.error : 'load_failed';
      setLoadError(msg);
      console.error('[match3] loadGame failed', gameId, res);
    } catch (e) {
      setLoadError('load_exception');
      console.error('[match3] loadGame threw', gameId, e);
    }
  }, [convex, gameId, onGameLoadComplete, applyLoadedTargetScore, casualPlatformBridge]);

  useEffect(() => {
    void loadGame();
  }, [loadGame]);

  const commitGameState = useCallback((patch?: GameStateCommitPatch) => {
    if (!patch) return;
    setGameState((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const beginCasualPostSettleFlow = useCallback(
    async (
      gid: string,
      fallbackScore: number,
      settle: {
        tableSummary?: CasualAsyncTableSummaryUI;
        pendingOthers?: boolean;
        seedScoreThreshold?: number;
        success?: boolean;
        deferTriathlonTableSummary?: boolean;
      }
    ) => {
      let report: CasualGameScoreReportUI = {
        gameLabel: 'Match-3',
        lines: [{ label: '本局得分', value: fallbackScore }],
        totalScore: fallbackScore,
      };
      try {
        const res = (await convex.query(api.service.gameManager.findReport, { gameId: gid })) as {
          ok?: boolean;
          data?: GameReport;
        };
        if (res?.ok && res.data) report = buildMatch3ScoreReport(res.data);
      } catch (e) {
        console.warn('[match3] findReport', e);
      }
      if (typeof settle.seedScoreThreshold === 'number') {
        report.challenge = {
          targetScore: settle.seedScoreThreshold,
          achievedScore: report.totalScore,
          success: Boolean(settle.success),
        };
      }
      const deferTableSummary =
        Boolean(settle.deferTriathlonTableSummary) ||
        shouldDeferTriathlonTableSummaryForLeg(
          casualTournamentId,
          gid,
          triathlonSessionActive
        );
      setTriathlonDeferTableSummary(deferTableSummary);

      if (
        deferTableSummary &&
        triathlonSessionActive &&
        onTriathlonNextGame &&
        tryAdvanceTriathlonMidSession({
          triathlonSessionActive,
          casualTournamentId,
          matchGameId: gid,
          legScore: report.totalScore,
          pendingTriathlon: pendingTriathlonAdvanceRef.current,
          onTriathlonNextGame,
          scoreReport: report,
        })
      ) {
        pendingTriathlonAdvanceRef.current = null;
        setTriathlonDeferTableSummary(false);
        return;
      }

      setPostCasualScoreReport(report);
      setPostCasualTableSummary(deferTableSummary ? null : settle.tableSummary ?? null);
      setPostCasualWaitingForPeers(deferTableSummary ? false : Boolean(settle.pendingOthers));
      setPostCasualScoreReportOpen(true);
      if (deferTableSummary) {
        return;
      }
      if (settle.tableSummary) {
        applyCasualTableSummaryFromQuery(settle.tableSummary, {
          setTableSummary: setPostCasualTableSummary,
          setReplayOffered: setPostCasualReplayOffered,
          setReplayTokenCount: setPostCasualReplayTokenCount,
          setCanReplay: setPostCasualCanReplay,
          setReplayWindowEndsAt: setPostCasualReplayWindowEndsAt,
        });
      } else {
        try {
          const summary = await fetchCasualAsyncTableSummaryForGame({
            matchGameId: gid,
            platformBridge: casualPlatformBridge ?? 'casual',
          });
          if (summary?.rows?.length) {
            applyCasualTableSummaryFromQuery(summary, {
              setTableSummary: setPostCasualTableSummary,
              setReplayOffered: setPostCasualReplayOffered,
              setReplayTokenCount: setPostCasualReplayTokenCount,
              setCanReplay: setPostCasualCanReplay,
              setReplayWindowEndsAt: setPostCasualReplayWindowEndsAt,
            });
          }
        } catch (e) {
          console.warn('[match3] fetchCasualTableSummaryForGame', e);
        }
      }
    },
    [convex, casualTournamentId, triathlonSessionActive, onTriathlonNextGame, casualPlatformBridge]
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
        gameComplete?: boolean;
        nextGame?: TriathlonNextGame;
      };
      if (res?.ok) {
        if (
          triathlonSessionActive &&
          queueTriathlonMidSessionAdvance(res, gs.score ?? 0, pendingTriathlonAdvanceRef, {
            templateId: casualTournamentId,
            gameId: gs.gameId,
            triathlonSessionActive,
          })
        ) {
          await beginCasualPostSettleFlow(gs.gameId, gs.score ?? 0, {
            deferTriathlonTableSummary: true,
          });
          return;
        }
        await beginCasualPostSettleFlow(gs.gameId, gs.score ?? 0, {
          tableSummary: res.tableSummary,
          pendingOthers: res.pendingOthers,
          ...(typeof res.seedScoreThreshold === 'number'
            ? { seedScoreThreshold: res.seedScoreThreshold, success: res.success }
            : {}),
        });
      }
    } catch (e) {
      console.error('[match3] submitCasualPlatformRun', e);
      casualRunSubmittedRef.current = false;
    }
  }, [convex, casualPlatformAuthed, beginCasualPostSettleFlow, triathlonSessionActive, casualTournamentId, casualPlatformBridge]);

  const settleManuallyAndExit = useCallback(async () => {
    const gs = gameStateRef.current;
    if (!gs) return;
    if (gs.status === Match3GameStatus.PLAYING) {
      setSettleConfirmOpen(true);
      return;
    }
    await completeCasualRun();
  }, [completeCasualRun]);

  const confirmSettleAndExit = useCallback(async () => {
    const gs = gameStateRef.current;
    if (!gs?.gameId || !casualPlatformAuthed) return;
    setSettleConfirmOpen(false);
    await convex.mutation(api.service.gameManager.concedeGame, { gameId: gs.gameId });
    const res = (await convex.action(api.proxy.controller.forceEndCasualPlatformRun, {
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
    };
    if (res?.ok) {
      casualRunSubmittedRef.current = true;
      setGameState((prev) => (prev ? { ...prev, status: Match3GameStatus.CANCELLED } : prev));
      if (
        triathlonSessionActive &&
        queueTriathlonMidSessionAdvance(res, gs.score ?? 0, pendingTriathlonAdvanceRef, {
          templateId: casualTournamentId,
          gameId: gs.gameId,
          triathlonSessionActive,
        })
      ) {
        await beginCasualPostSettleFlow(gs.gameId, gs.score ?? 0, {
          deferTriathlonTableSummary: true,
        });
        return;
      }
      await beginCasualPostSettleFlow(gs.gameId, gs.score ?? 0, {
        tableSummary: res.tableSummary,
        pendingOthers: res.pendingOthers,
        ...(typeof res.seedScoreThreshold === 'number'
          ? { seedScoreThreshold: res.seedScoreThreshold, success: res.success }
          : {}),
      });
    }
  }, [convex, casualPlatformAuthed, beginCasualPostSettleFlow, triathlonSessionActive, casualTournamentId, casualPlatformBridge]);

  const reloadCasualRun = useCallback(async (): Promise<boolean> => {
    if (!gameId || !gameId.startsWith('game_')) return false;
    try {
      const res = await convex.action(api.proxy.controller.loadGame, {
        gameId,
        resetCasualRun: true,
        ...(casualPlatformBridge ? { platformBridge: casualPlatformBridge } : {}),
      });
      if (!res?.ok || !res.game) {
        console.error('[match3] reloadCasualRun failed', (res as { error?: string })?.error);
        return false;
      }
      const loadedGame = res.game as Match3GameState;
      setGameState(loadedGame);
      setInteractionPhase(GameInteractionPhase.idle);
      await applyLoadedTargetScore(loadedGame, res as { seedScoreThreshold?: number });
      return true;
    } catch (e) {
      console.error('[match3] reloadCasualRun', e);
      return false;
    }
  }, [convex, gameId, applyLoadedTargetScore, casualPlatformBridge]);

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

  const replayCasualRun = useCallback(async () => {
    const gs = gameStateRef.current;
    if (!gs || !casualPlatformAuthed || casualReplayBusy) return;
    if (typeof gs.gameId !== 'string' || !gs.gameId.startsWith('game_')) return;
    setCasualReplayBusy(true);
    try {
      const rr = (await convex.action(api.proxy.controller.replayCasualRun, {
        ...buildCasualPlatformRunActionArgs({
          gameId: gs.gameId,
          platformBridge: casualPlatformBridge,
        }),
      })) as { ok?: boolean; error?: string; gameId?: string };
      if (!rr?.ok) {
        console.warn('[match3] replayCasualRun', rr?.error);
        return;
      }
      casualRunSubmittedRef.current = false;
      clearPostCasualOverlays();

      if (triathlonSessionActive && onTriathlonSessionReplay && casualTournamentId) {
        const restartGameId =
          rr.gameId ?? triathlonFirstLegGameId(casualTournamentId, gs.gameId);
        await resetTriathlonCasualGameServers(casualTournamentId, gs.gameId);
        onTriathlonSessionReplay(restartGameId);
        return;
      }

      await reloadCasualRun();
    } catch (e) {
      console.error('[match3] replayCasualRun', e);
    } finally {
      setCasualReplayBusy(false);
    }
  }, [
    convex,
    casualPlatformAuthed,
    casualReplayBusy,
    clearPostCasualOverlays,
    reloadCasualRun,
    triathlonSessionActive,
    onTriathlonSessionReplay,
    casualTournamentId,
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
          await casual.confirmCasualRunWithoutReplay(gs.gameId);
          await casual.refreshCasualPlayer();
        } catch (e) {
          console.warn('[match3] confirmCasualRunWithoutReplay', e);
        }
      }
      clearPostCasualOverlays();
      onGameSubmit?.();
    },
    [casual, casualTournamentId, user?.uid, clearPostCasualOverlays, onGameSubmit]
  );

  const dismissPostCasualScoreReport = useCallback(() => {
    const hadReplayOffer = postCasualReplayOffered;
    const pendingTriathlon = pendingTriathlonAdvanceRef.current;
    const gs = gameStateRef.current;
    const matchGameId =
      typeof gs?.gameId === 'string' && gs.gameId.startsWith('game_') ? gs.gameId : undefined;
    const deferTableSummary = shouldDeferTriathlonTableSummaryForLeg(
      casualTournamentId,
      matchGameId,
      triathlonSessionActive
    );
    const legScore =
      postCasualScoreReport?.totalScore ?? Math.max(0, Math.floor(gs?.score ?? 0));
    const scoreReportSnapshot = postCasualScoreReport;
    setPostCasualScoreReportOpen(false);
    setPostCasualScoreReport(null);
    setTriathlonDeferTableSummary(false);
    if (
      tryAdvanceTriathlonMidSession({
        triathlonSessionActive,
        casualTournamentId,
        matchGameId,
        legScore,
        pendingTriathlon,
        onTriathlonNextGame,
        scoreReport: scoreReportSnapshot ?? undefined,
      })
    ) {
      pendingTriathlonAdvanceRef.current = null;
      return;
    }
    if (
      shouldOpenCasualTableSummaryAfterScoreReport(
        casualTournamentId,
        postCasualTableSummary,
        postCasualWaitingForPeers,
        {
          deferTriathlonTableSummary: deferTableSummary,
          triathlonSessionActive,
          triathlonGameId: matchGameId,
        }
      )
    ) {
      setPostCasualSummaryOpen(true);
    } else {
      void exitCasualRunAfterSettle({ hadReplayOffer });
    }
  }, [
    casualTournamentId,
    postCasualTableSummary,
    postCasualWaitingForPeers,
    postCasualScoreReport,
    postCasualReplayOffered,
    triathlonSessionActive,
    onTriathlonNextGame,
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
    const gid = gameStateRef.current?.gameId;
    if (!gid) return;
    openWatch({ kind: 'recorded', gameId: gid }, '你');
  }, [openWatch]);

  const ruleManager = useMemo(() => {
    if (!gameState) return null;
    return new Match3RuleManager(gameState, interactionPhase);
  }, [gameState, interactionPhase]);

  const value: IMatch3GameContext = {
    gameState,
    gridCellRefs,
    boardMetricsRef,
    ruleManager,
    interactionPhase,
    setInteractionPhase,
    loadGame,
    loadError,
    commitGameState,
    completeCasualRun,
    settleManuallyAndExit,
    settleConfirmOpen,
    cancelSettleConfirm: () => setSettleConfirmOpen(false),
    confirmSettleAndExit,
    postCasualScoreReportOpen,
    postCasualScoreReport,
    dismissPostCasualScoreReport,
    postCasualSummaryOpen,
    postCasualTableSummary,
    dismissPostCasualSummary,
    postCasualWaitingForPeers,
    postCasualCanReplay,
    postCasualReplayOffered,
    postCasualReplayTokenCount,
    postCasualReplayWindowEndsAt,
    casualReplayBusy,
    replayCasualRun,
    triathlonSessionActive,
    casualTournamentId,
    targetScore,
    watchTarget,
    watchTargetLabel,
    openWatch,
    closeWatch,
    openSelfReplay,
  };

  return <Match3GameContext.Provider value={value}>{children}</Match3GameContext.Provider>;
};

export default Match3GameProvider;
