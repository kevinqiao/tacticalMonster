import { useCasualPlatform } from 'component/lobby/casual/service/useCasualPlatformManager';
import { useUserManager } from 'host/service/UserManager';
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
  shouldOpenCasualTableSummaryAfterScoreReport,
  type CasualGameScoreReportUI,
} from '../../../shared/casualGameScoreReportUI';
import {
  applyCasualTableSummaryFromQuery,
  type CasualAsyncTableSummaryUI,
  type Match3WatchContext,
} from '../../../shared/casualAsyncTableSummaryUI';
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
  casualTournamentId?: string;
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
}

export const Match3GameProvider: React.FC<Props> = ({
  children,
  gameId,
  casualTournamentId,
  onGameLoadComplete,
  onGameSubmit,
}) => {
  const convex = useConvex();
  const casual = useCasualPlatform();
  const { user } = useUserManager();
  const [gameState, setGameState] = useState<Match3GameState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [interactionPhase, setInteractionPhase] = useState(GameInteractionPhase.idle);
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
  const [watchTarget, setWatchTarget] = useState<Match3WatchContext | null>(null);
  const [watchTargetLabel, setWatchTargetLabel] = useState('');
  const casualRunSubmittedRef = useRef(false);
  const gameStateRef = useRef<Match3GameState | null>(null);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useCasualTableSummaryPoll({
    open: postCasualSummaryOpen || postCasualScoreReportOpen,
    summary: postCasualTableSummary,
    matchGameId: gameState?.gameId?.startsWith('game_') ? gameState.gameId : undefined,
    fetchSummary: casual.fetchCasualTableSummaryForGame,
    onUpdate: (next) => {
      applyCasualTableSummaryFromQuery(next, {
        setTableSummary: setPostCasualTableSummary,
        setReplayOffered: () => {},
        setReplayTokenCount: () => {},
        setCanReplay: () => {},
        setReplayWindowEndsAt: () => {},
      });
    },
  });

  const loadGame = useCallback(async () => {
    if (!gameId) return;
    setLoadError(null);
    try {
      const res = await convex.action(api.proxy.controller.loadGame, { gameId });
      if (res?.ok && res.game) {
        setGameState(res.game as Match3GameState);
        onGameLoadComplete?.();
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
  }, [convex, gameId, onGameLoadComplete]);

  useEffect(() => {
    void loadGame();
  }, [loadGame]);

  const commitGameState = useCallback((patch?: GameStateCommitPatch) => {
    if (!patch) return;
    setGameState((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const beginCasualPostSettleFlow = useCallback(
    async (gid: string, fallbackScore: number, settle: { tableSummary?: CasualAsyncTableSummaryUI; pendingOthers?: boolean }) => {
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
      setPostCasualScoreReport(report);
      setPostCasualTableSummary(settle.tableSummary ?? null);
      setPostCasualWaitingForPeers(Boolean(settle.pendingOthers));
      setPostCasualScoreReportOpen(true);
      if (!settle.tableSummary) {
        try {
          const summary = await casual.fetchCasualTableSummaryForGame(gid);
          if (summary?.rows?.length) {
            applyCasualTableSummaryFromQuery(summary, {
              setTableSummary: setPostCasualTableSummary,
              setReplayOffered: () => {},
              setReplayTokenCount: () => {},
              setCanReplay: () => {},
              setReplayWindowEndsAt: () => {},
            });
          }
        } catch (e) {
          console.warn('[match3] fetchCasualTableSummaryForGame', e);
        }
      }
    },
    [convex, casual]
  );

  const completeCasualRun = useCallback(async () => {
    const gs = gameStateRef.current;
    if (!gs?.gameId?.startsWith('game_') || !user?.token || casualRunSubmittedRef.current) return;
    casualRunSubmittedRef.current = true;
    try {
      const res = (await convex.action(api.proxy.controller.submitCasualPlatformRun, {
        token: user.token,
        gameId: gs.gameId,
      })) as { ok?: boolean; tableSummary?: CasualAsyncTableSummaryUI; pendingOthers?: boolean };
      if (res?.ok) {
        await beginCasualPostSettleFlow(gs.gameId, gs.score ?? 0, {
          tableSummary: res.tableSummary,
          pendingOthers: res.pendingOthers,
        });
      }
    } catch (e) {
      console.error('[match3] submitCasualPlatformRun', e);
      casualRunSubmittedRef.current = false;
    }
  }, [convex, user?.token, beginCasualPostSettleFlow]);

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
    if (!gs?.gameId || !user?.token) return;
    setSettleConfirmOpen(false);
    await convex.mutation(api.service.gameManager.concedeGame, { gameId: gs.gameId });
    const res = (await convex.action(api.proxy.controller.forceEndCasualPlatformRun, {
      token: user.token,
      gameId: gs.gameId,
    })) as { ok?: boolean; tableSummary?: CasualAsyncTableSummaryUI; pendingOthers?: boolean };
    if (res?.ok) {
      casualRunSubmittedRef.current = true;
      setGameState((prev) => (prev ? { ...prev, status: Match3GameStatus.CANCELLED } : prev));
      await beginCasualPostSettleFlow(gs.gameId, gs.score ?? 0, {
        tableSummary: res.tableSummary,
        pendingOthers: res.pendingOthers,
      });
    }
  }, [convex, user?.token, beginCasualPostSettleFlow]);

  const dismissPostCasualScoreReport = useCallback(() => {
    setPostCasualScoreReportOpen(false);
    setPostCasualScoreReport(null);
    if (
      shouldOpenCasualTableSummaryAfterScoreReport(
        casualTournamentId,
        postCasualTableSummary,
        postCasualWaitingForPeers
      )
    ) {
      setPostCasualSummaryOpen(true);
    } else {
      onGameSubmit?.();
    }
  }, [casualTournamentId, postCasualTableSummary, postCasualWaitingForPeers, onGameSubmit]);

  const dismissPostCasualSummary = useCallback(() => {
    setPostCasualSummaryOpen(false);
    onGameSubmit?.();
  }, [onGameSubmit]);

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
    casualTournamentId,
    watchTarget,
    watchTargetLabel,
    openWatch,
    closeWatch,
    openSelfReplay,
  };

  return <Match3GameContext.Provider value={value}>{children}</Match3GameContext.Provider>;
};

export default Match3GameProvider;
