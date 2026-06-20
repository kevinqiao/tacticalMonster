/**
 * Block Blast 游戏管理器（对齐 solitaireSolo：interactionPhase、loadGame、战报与提交）
 */
import { useCasualPlatform } from 'component/lobby/casual/service/useCasualPlatformManager';
import { useUserManager } from 'host/service/UserManager';
import { useConvex } from 'convex/react';
import gsap from 'gsap';
import React, {
    createContext,
    ReactNode,
    RefObject,
    useCallback,
    useContext,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { api } from '../../../../../../convex/blockBlast/convex/_generated/api';
import {
    BLOCK_BLAST_DEFAULT_GRID_SIZE,
    BlockBlastGameConfig,
    BlockBlastGameState,
    BlockBlastGameStatus,
    BlockBlastRule,
    BoardDimension,
    DEFAULT_GAME_CONFIG,
    GameInteractionPhase,
    GameReport,
    inferGridSizeFromGrid,
    Shape,
} from '../types/BlockBlastTypes';
import BlockBlastRuleManager from './BlockBlastRuleManager';
import { createRolloutReplayState } from '../replay/blockBlastRolloutReplay';
import {
    buildBlockBlastScoreReport,
    shouldOpenCasualTableSummaryAfterScoreReport,
    type CasualGameScoreReportUI,
} from '../../../shared/casualGameScoreReportUI';
import {
    applyCasualTableSummaryFromQuery,
    type CasualAsyncTableSummaryUI,
    type ManualSettleConfirmExtras,
} from '../../../shared/casualAsyncTableSummaryUI';
import type { WeeklyLeagueSettleUI } from '../../../shared/casualWeeklyLeagueScoreUI';
import {
    queueTriathlonMidSessionAdvance,
    shouldDeferTriathlonTableSummaryForLeg,
    tryAdvanceTriathlonMidSession,
    type TriathlonMidSessionAdvanceHandler,
    type TriathlonPendingAdvance,
} from '../../../shared/casualTriathlonSubmitFlow';
import type { TriathlonNextGame } from 'component/lobby/casual/service/useCasualTriathlonSession';
import { useCasualTableSummaryPoll } from '../../../shared/useCasualTableSummaryPoll';

function isTerminalBlockBlastStatus(status: number | undefined): boolean {
    return status !== undefined && status !== BlockBlastGameStatus.PLAYING;
}

export type GridCellRefs = (HTMLDivElement | null)[][];

/** placeShape 等与服务器对齐的状态补丁；勿在 await 后就地改闭包里的 gameState */
export type GameStateCommitPatch = Partial<
    Pick<
        BlockBlastGameState,
        | 'grid'
        | 'gridSize'
        | 'score'
        | 'lines'
        | 'shapes'
        | 'nextShapes'
        | 'moves'
        | 'status'
        | 'shapeCounter'
    >
>;

function allocateGridCellRefs(n: number): GridCellRefs {
    const dim = Math.max(1, Math.floor(n));
    return Array.from({ length: dim }, () => Array.from({ length: dim }, () => null));
}

interface IBlockBlastGameContext {
    gameState: BlockBlastGameState | null;
    gameReport: GameReport | null;
    boardDimension: BoardDimension | null;
    boardDimensionRef: RefObject<BoardDimension | null>;
    gridCellRefs: RefObject<GridCellRefs | null>;
    config: BlockBlastGameConfig;
    ruleManager: BlockBlastRule | null;
    interactionPhase: GameInteractionPhase;
    setInteractionPhase: (phase: GameInteractionPhase) => void;
    updateBoardDimension: (dimension: BoardDimension) => void;
    loadGame: () => void;
    onGameOver: () => void;
    submitScore: (score: number) => void;
    /**
     * 触发棋盘重绘。await 后必须用 patch 写入服务器返回字段，禁止就地修改闭包捕获的旧 gameState。
     */
    commitGameState: (patch?: GameStateCommitPatch) => void;
    /** 非终局时打开局内确认层；终局则直接结算 */
    settleManuallyAndExit: () => Promise<void>;
    settleConfirmOpen: boolean;
    cancelSettleConfirm: () => void;
    confirmSettleAndExit: () => Promise<void | ManualSettleConfirmExtras>;
    /** 局内「成功结算」确定后：进入得分明细 → 同桌榜流程 */
    finishManualSettleSuccess: (extras?: ManualSettleConfirmExtras) => void;
    postCasualScoreReportOpen: boolean;
    postCasualScoreReport: CasualGameScoreReportUI | null;
    dismissPostCasualScoreReport: () => void;
    postCasualSummaryOpen: boolean;
    postCasualTableSummary: CasualAsyncTableSummaryUI | null;
    postCasualWeeklyLeagueSettle: WeeklyLeagueSettleUI | null;
    postCasualWaitingForPeers: boolean;
    postCasualCanReplay: boolean;
    postCasualReplayOffered: boolean;
    postCasualReplayWindowEndsAt?: number;
    casualReplayBusy: boolean;
    replayCasualRun: () => Promise<void>;
    dismissPostCasualSummary: () => void;
    reloadCasualRun: () => Promise<boolean>;
    casualTournamentId?: string;
    /** P75 挑战等：本局 seed 分位目标分 */
    targetScore?: number;
    /** 回放/复盘模式：本地按 seed 重放，跳过 Convex 建局与结算流程 */
    replayMode: boolean;
}

const BlockBlastGameContext = createContext<IBlockBlastGameContext>({
    gameReport: null,
    gameState: null,
    boardDimension: null,
    boardDimensionRef: { current: null },
    gridCellRefs: { current: null },
    config: DEFAULT_GAME_CONFIG,
    ruleManager: null,
    interactionPhase: GameInteractionPhase.idle,
    setInteractionPhase: () => { },
    updateBoardDimension: () => { },
    loadGame: () => { },
    submitScore: () => { },
    onGameOver: () => { },
    commitGameState: () => { },
    settleManuallyAndExit: async () => { },
    settleConfirmOpen: false,
    cancelSettleConfirm: () => { },
    confirmSettleAndExit: async () => { },
    finishManualSettleSuccess: () => { },
    postCasualScoreReportOpen: false,
    postCasualScoreReport: null,
    dismissPostCasualScoreReport: () => { },
    postCasualSummaryOpen: false,
    postCasualTableSummary: null,
    postCasualWeeklyLeagueSettle: null,
    postCasualWaitingForPeers: false,
    postCasualCanReplay: false,
    postCasualReplayOffered: false,
    postCasualReplayWindowEndsAt: undefined,
    casualReplayBusy: false,
    replayCasualRun: async () => {},
    dismissPostCasualSummary: () => { },
    reloadCasualRun: async () => false,
    casualTournamentId: undefined,
    targetScore: undefined,
    replayMode: false,
});

export const useBlockBlastGameManager = () => {
    const context = useContext(BlockBlastGameContext);
    if (!context) {
        throw new Error('useBlockBlastGameManager must be used within a BlockBlastGameProvider');
    }
    return context;
};

interface BlockBlastGameProviderProps {
    children: ReactNode;
    gameId?: string;
    /** 回放/复盘：按 seed 本地重放，不走 Convex loadGame */
    replaySeedId?: string;
    casualTournamentId?: string;
    config?: Partial<BlockBlastGameConfig>;
    onGameLoadComplete?: () => void;
    onGameSubmit?: () => void;
    onTriathlonNextGame?: TriathlonMidSessionAdvanceHandler;
}

export const BlockBlastGameProvider: React.FC<BlockBlastGameProviderProps> = ({
    children,
    gameId,
    replaySeedId,
    casualTournamentId,
    config: customConfig,
    onGameLoadComplete,
    onGameSubmit,
    onTriathlonNextGame,
}) => {
    const replayMode = Boolean(replaySeedId && !gameId);
    const [gameState, setGameState] = useState<BlockBlastGameState | null>(() =>
        replaySeedId && !gameId ? createRolloutReplayState(replaySeedId) : null
    );
    const [gameReport, setGameReport] = useState<GameReport | null>(null);
    const [boardDimension, setBoardDimension] = useState<BoardDimension | null>(null);
    const [interactionPhase, setInteractionPhase] = useState<GameInteractionPhase>(
        GameInteractionPhase.idle
    );
    const [targetScore, setTargetScore] = useState<number | undefined>(undefined);
    const boardDimensionRef = useRef<BoardDimension | null>(null);
    const gridCellRefs = useRef<GridCellRefs | null>(null);
    if (!gridCellRefs.current) {
        gridCellRefs.current = allocateGridCellRefs(BLOCK_BLAST_DEFAULT_GRID_SIZE);
    }
    const config = { ...DEFAULT_GAME_CONFIG, ...customConfig };
    const convex = useConvex();
    const casual = useCasualPlatform();
    const { user } = useUserManager();
    const [settleConfirmOpen, setSettleConfirmOpen] = useState(false);
    const [postCasualScoreReportOpen, setPostCasualScoreReportOpen] = useState(false);
    const [postCasualScoreReport, setPostCasualScoreReport] = useState<CasualGameScoreReportUI | null>(
        null
    );
    const [postCasualSummaryOpen, setPostCasualSummaryOpen] = useState(false);
    const [postCasualTableSummary, setPostCasualTableSummary] = useState<CasualAsyncTableSummaryUI | null>(
        null
    );
    const [postCasualWeeklyLeagueSettle, setPostCasualWeeklyLeagueSettle] =
        useState<WeeklyLeagueSettleUI | null>(null);
    const [postCasualWaitingForPeers, setPostCasualWaitingForPeers] = useState(false);
    const [postCasualCanReplay, setPostCasualCanReplay] = useState(false);
    const [postCasualReplayOffered, setPostCasualReplayOffered] = useState(false);
    const [postCasualReplayTokenCount, setPostCasualReplayTokenCount] = useState(0);
    const [postCasualReplayWindowEndsAt, setPostCasualReplayWindowEndsAt] = useState<number | undefined>(
        undefined
    );
    const [casualReplayBusy, setCasualReplayBusy] = useState(false);
    const [triathlonDeferTableSummary, setTriathlonDeferTableSummary] = useState(false);

    const casualRunSubmittedRef = useRef(false);
    const pendingTriathlonAdvanceRef = useRef<TriathlonPendingAdvance | null>(null);
    const settleInFlightRef = useRef(false);
    const gameStateRef = useRef<BlockBlastGameState | null>(null);
    const interactionPhaseRef = useRef<GameInteractionPhase>(GameInteractionPhase.idle);

    useCasualTableSummaryPoll({
        open:
            (postCasualSummaryOpen || postCasualScoreReportOpen) && !triathlonDeferTableSummary,
        summary: postCasualTableSummary,
        matchGameId:
            typeof gameState?.gameId === 'string' && gameState.gameId.startsWith('game_')
                ? gameState.gameId
                : undefined,
        fetchSummary: casual.fetchCasualTableSummaryForGame,
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

    useEffect(() => {
        gameStateRef.current = gameState ?? null;
    }, [gameState]);

    useEffect(() => {
        interactionPhaseRef.current = interactionPhase;
    }, [interactionPhase]);

    const triathlonSessionActive = Boolean(onTriathlonNextGame);

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

    const resolveBlockBlastScoreReport = useCallback(
        async (gameId: string, fallbackScore: number): Promise<CasualGameScoreReportUI> => {
            if (gameReport) {
                return buildBlockBlastScoreReport(gameReport);
            }
            try {
                const res = (await convex.query(api.service.gameManager.findReport, { gameId })) as {
                    ok?: boolean;
                    data?: GameReport;
                };
                if (res?.ok && res.data) {
                    return buildBlockBlastScoreReport(res.data);
                }
            } catch (e) {
                console.warn('[BlockBlast] findReport', e);
            }
            return {
                gameLabel: 'Block Blast',
                lines: [{ label: '本局得分', value: fallbackScore }],
                totalScore: fallbackScore,
            };
        },
        [convex, gameReport]
    );

    const beginCasualPostSettleFlow = useCallback(
        async (
            gameId: string,
            fallbackScore: number,
            settle: {
                tableSummary?: CasualAsyncTableSummaryUI;
                pendingOthers?: boolean;
                weeklyLeagueSettle?: WeeklyLeagueSettleUI;
                seedScoreThreshold?: number;
                success?: boolean;
                deferTriathlonTableSummary?: boolean;
            }
        ) => {
            if (gameStateRef.current?.reportElement) {
                gsap.set(gameStateRef.current.reportElement, { autoAlpha: 0 });
            }
            const deferTableSummary =
                Boolean(settle.deferTriathlonTableSummary) ||
                shouldDeferTriathlonTableSummaryForLeg(
                    casualTournamentId,
                    gameId,
                    triathlonSessionActive
                );
            setTriathlonDeferTableSummary(deferTableSummary);
            const report = await resolveBlockBlastScoreReport(gameId, fallbackScore);
            if (typeof settle.seedScoreThreshold === 'number') {
                report.challenge = {
                    targetScore: settle.seedScoreThreshold,
                    achievedScore: report.totalScore,
                    success: Boolean(settle.success),
                };
            }

            if (
                deferTableSummary &&
                triathlonSessionActive &&
                onTriathlonNextGame &&
                tryAdvanceTriathlonMidSession({
                    triathlonSessionActive,
                    casualTournamentId,
                    matchGameId: gameId,
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
            setPostCasualWeeklyLeagueSettle(settle.weeklyLeagueSettle ?? null);
            setPostCasualWaitingForPeers(deferTableSummary ? false : Boolean(settle.pendingOthers));
            setPostCasualReplayOffered(false);
            setPostCasualReplayTokenCount(0);
            setPostCasualCanReplay(false);
            setPostCasualReplayWindowEndsAt(undefined);
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
                    const summary = await casual.fetchCasualTableSummaryForGame(gameId);
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
                    console.warn('[BlockBlast] fetchCasualTableSummaryForGame after submit', e);
                }
            }
        },
        [resolveBlockBlastScoreReport, casual.fetchCasualTableSummaryForGame, casualTournamentId, triathlonSessionActive, onTriathlonNextGame]
    );

    const reloadCasualRun = useCallback(async (): Promise<boolean> => {
        if (!gameId || !gameId.startsWith('game_')) return false;
        const res = await convex.action(api.proxy.controller.loadGame, {
            gameId,
            resetCasualRun: true,
        });
        if (!res.ok) {
            console.error('[BlockBlastGameProvider] reloadCasualRun failed', (res as { error?: string }).error);
            return false;
        }
        if (res.game) {
            const inferredSize = inferGridSizeFromGrid(res.game.grid);
            const game: BlockBlastGameState = {
                ...res.game,
                gridSize: res.game.gridSize ?? inferredSize,
                nextShapes: res.game.nextShapes ?? [],
                reportElement: null,
            };
            setGameReport(null);
            setGameState(game);
            setInteractionPhase(GameInteractionPhase.idle);
            terminalReportKeyRef.current = null;
            const threshold = (res as { seedScoreThreshold?: number }).seedScoreThreshold;
            if (typeof threshold === 'number' && Number.isFinite(threshold)) {
                setTargetScore(threshold);
            }
            return true;
        }
        return false;
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
                console.warn('[BlockBlast] replayCasualRun', rr?.error);
                return;
            }
            casualRunSubmittedRef.current = false;
            setPostCasualSummaryOpen(false);
            setPostCasualTableSummary(null);
            setPostCasualWaitingForPeers(false);
            setPostCasualCanReplay(false);
            setPostCasualReplayOffered(false);
            setPostCasualReplayTokenCount(0);
            setPostCasualReplayWindowEndsAt(undefined);
            setPostCasualScoreReportOpen(false);
            setPostCasualScoreReport(null);
            await reloadCasualRun();
        } catch (e) {
            console.error('[BlockBlast] replayCasualRun', e);
        } finally {
            setCasualReplayBusy(false);
        }
    }, [convex, user?.token, casualReplayBusy, reloadCasualRun]);

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
                    console.warn('[BlockBlast] confirmCasualRunWithoutReplay', e);
                }
            }
            setPostCasualSummaryOpen(false);
            setPostCasualTableSummary(null);
            setPostCasualWaitingForPeers(false);
            setPostCasualCanReplay(false);
            setPostCasualReplayOffered(false);
            setPostCasualReplayTokenCount(0);
            setPostCasualReplayWindowEndsAt(undefined);
            setPostCasualScoreReportOpen(false);
            setPostCasualScoreReport(null);
            onGameSubmit?.();
        },
        [casual, casualTournamentId, user?.uid, onGameSubmit]
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
            void exitCasualRunAfterSettle({ hadReplayOffer: hadReplayOffer });
        }
    }, [
        casualTournamentId,
        postCasualTableSummary,
        postCasualWaitingForPeers,
        postCasualReplayOffered,
        postCasualScoreReport,
        triathlonSessionActive,
        onTriathlonNextGame,
        exitCasualRunAfterSettle,
    ]);

    const dismissPostCasualSummary = useCallback(() => {
        void exitCasualRunAfterSettle({ hadReplayOffer: postCasualReplayOffered });
    }, [postCasualReplayOffered, exitCasualRunAfterSettle]);

    const ruleManager = useMemo(() => {
        if (!gameState) return null;
        return new BlockBlastRuleManager(gameState, interactionPhase);
    }, [gameState, interactionPhase]);

    const updateBoardDimension = useCallback((dimension: BoardDimension) => {
        boardDimensionRef.current = dimension;
        setBoardDimension(dimension);
    }, []);

    const terminalReportKeyRef = useRef<string | null>(null);

    const loadGame = useCallback(async () => {
        if (!gameId) return;
        terminalReportKeyRef.current = null;
        const res = await convex.action(api.proxy.controller.loadGame, { gameId });
        if (!res.ok) {
            console.error('[BlockBlastGameProvider] loadGame failed', (res as { error?: string }).error, res);
            return;
        }
        if (res.game) {
            const inferredSize = inferGridSizeFromGrid(res.game.grid);
            const game: BlockBlastGameState = {
                ...res.game,
                gridSize: res.game.gridSize ?? inferredSize,
                nextShapes: res.game.nextShapes ?? [],
                reportElement: null,
            };
            setGameReport(null);
            setGameState(game);
            setInteractionPhase(GameInteractionPhase.idle);
            onGameLoadComplete?.();
            const threshold = (res as { seedScoreThreshold?: number }).seedScoreThreshold;
            if (typeof threshold === 'number' && Number.isFinite(threshold)) {
                setTargetScore(threshold);
            }
        }
    }, [convex, gameId, onGameLoadComplete]);

    useEffect(() => {
        if (replayMode) return;
        void loadGame();
    }, [loadGame, replayMode]);

    useLayoutEffect(() => {
        if (!gameState?.grid?.length) return;
        const n = gameState.gridSize ?? inferGridSizeFromGrid(gameState.grid);
        const cur = gridCellRefs.current;
        if (cur?.length === n && cur[0]?.length === n) return;
        gridCellRefs.current = allocateGridCellRefs(n);
    }, [gameState?.gameId, gameState?.gridSize, gameState?.grid?.length]);

    const onGameOver = useCallback(async () => {
        if (!gameState || !convex) return;
        if (gameState.status === BlockBlastGameStatus.PLAYING) return;
        const dedupeKey = `${gameState.gameId}:${gameState.status}`;
        if (terminalReportKeyRef.current === dedupeKey) return;
        terminalReportKeyRef.current = dedupeKey;

        if (gameState.reportElement) {
            gsap.to(gameState.reportElement, {
                opacity: 1,
                visibility: 'visible',
                duration: 1,
                ease: 'power2.inOut',
            });
        }
        const res = await convex.query(api.service.gameManager.findReport, { gameId: gameState.gameId });
        if (res.ok && res.data) {
            setGameReport(res.data as GameReport);
        }
    }, [gameState, convex]);

    const commitGameState = useCallback((patch?: GameStateCommitPatch) => {
        setGameState((g) => {
            if (!g) return null;
            const dim = g.gridSize ?? inferGridSizeFromGrid(g.grid);
            const gridSrc = patch?.grid ?? g.grid;
            const gridOk =
                Array.isArray(gridSrc) &&
                gridSrc.length === dim &&
                gridSrc.every((row) => Array.isArray(row) && row.length === dim);
            const grid = gridOk ? gridSrc : g.grid;
            const outDim = inferGridSizeFromGrid(grid);
            const score = patch?.score !== undefined ? patch.score : g.score;
            const lines = patch?.lines !== undefined ? patch.lines : g.lines;
            const shapesSrc = patch?.shapes ?? g.shapes;
            const nextShapesSrc = patch?.nextShapes ?? g.nextShapes;
            const moves = patch?.moves !== undefined ? patch.moves : g.moves;
            const status = patch?.status !== undefined ? patch.status : g.status;
            const shapeCounter =
                patch?.shapeCounter !== undefined ? patch.shapeCounter : g.shapeCounter;
            const cloneShapes = (list: Shape[] | undefined | null): Shape[] => {
                if (!Array.isArray(list)) return [];
                return list.map((s) => ({
                    ...s,
                    shape: Array.isArray(s.shape)
                        ? s.shape.map((row) => (Array.isArray(row) ? [...row] : []))
                        : [],
                }));
            };
            return {
                ...g,
                gridSize: patch?.gridSize !== undefined ? patch.gridSize : outDim,
                grid: grid.map((row) =>
                    Array.isArray(row) && row.length === outDim
                        ? [...row]
                        : Array.from({ length: outDim }, () => 0)
                ),
                score,
                lines,
                shapes: cloneShapes(shapesSrc),
                nextShapes: cloneShapes(nextShapesSrc),
                moves,
                status,
                shapeCounter,
            };
        });
    }, []);

    const runBlockBlastSettlement = useCallback(
        async (
            scoreArg?: number,
            opts?: { deferHostNotify?: boolean }
        ): Promise<
            | {
                  ok: true;
                  tableSummary?: CasualAsyncTableSummaryUI;
                  pendingOthers?: boolean;
                  seedScoreThreshold?: number;
                  success?: boolean;
                  triathlonScoreReportOnly?: boolean;
              }
            | { ok: false }
        > => {
            const gs = gameStateRef.current;
            if (!gs || casualRunSubmittedRef.current) return { ok: false };
            const score = Math.max(0, Math.floor(scoreArg !== undefined ? scoreArg : (gs.score ?? 0)));
            casualRunSubmittedRef.current = true;
            const deferHost = Boolean(opts?.deferHostNotify);
            try {
                if (
                    casualTournamentId &&
                    typeof gs.gameId === 'string' &&
                    gs.gameId.startsWith('game_') &&
                    user?.token
                ) {
                    const cr = (await convex.action(api.proxy.controller.submitCasualPlatformRun, {
                        token: user.token,
                        gameId: gs.gameId,
                    })) as {
                        ok?: boolean;
                        error?: string;
                        tableSummary?: CasualAsyncTableSummaryUI;
                        pendingOthers?: boolean;
                        weeklyLeagueSettle?: WeeklyLeagueSettleUI;
                        seedScoreThreshold?: number;
                        success?: boolean;
                        gameComplete?: boolean;
                        nextGame?: TriathlonNextGame;
                    };
                    if (!cr.ok) {
                        console.warn('[BlockBlast] submitCasualPlatformRun', cr.error);
                        casualRunSubmittedRef.current = false;
                        return { ok: false };
                    }
                    if (
                        triathlonSessionActive &&
                        queueTriathlonMidSessionAdvance(cr, score, pendingTriathlonAdvanceRef, {
                            templateId: casualTournamentId,
                            gameId: gs.gameId,
                            triathlonSessionActive,
                        })
                    ) {
                        return { ok: true, triathlonScoreReportOnly: true };
                    }
                    if (!deferHost) {
                        onGameSubmit?.();
                    }
                    return {
                        ok: true,
                        ...(cr.tableSummary ? { tableSummary: cr.tableSummary } : {}),
                        ...(cr.pendingOthers ? { pendingOthers: true } : {}),
                        ...(cr.weeklyLeagueSettle ? { weeklyLeagueSettle: cr.weeklyLeagueSettle } : {}),
                        ...(typeof cr.seedScoreThreshold === 'number'
                            ? { seedScoreThreshold: cr.seedScoreThreshold }
                            : {}),
                        ...(typeof cr.success === 'boolean' ? { success: cr.success } : {}),
                    };
                }
                let proxyOk = false;
                try {
                    const sr = await convex.action(api.proxy.controller.submitScore, {
                        gameId: gs.gameId,
                        score,
                    });
                    proxyOk = Boolean((sr as { ok?: boolean })?.ok);
                    if (!proxyOk) {
                        console.warn('[BlockBlast] proxy submitScore skipped or failed', sr);
                    }
                } catch (e) {
                    console.warn('[BlockBlast] proxy submitScore error', e);
                }
                if (!proxyOk) {
                    casualRunSubmittedRef.current = false;
                    return { ok: false };
                }
                if (!deferHost) {
                    onGameSubmit?.();
                }
                return { ok: true };
            } catch (e) {
                console.error('[BlockBlast] runBlockBlastSettlement', e);
                casualRunSubmittedRef.current = false;
                return { ok: false };
            }
        },
        [convex, casualTournamentId, user?.token, onGameSubmit, triathlonSessionActive]
    );

    const finishManualSettleSuccess = useCallback(
        (extras?: ManualSettleConfirmExtras) => {
            setSettleConfirmOpen(false);
            const gs = gameStateRef.current;
            const isCasualRun =
                Boolean(casualTournamentId) &&
                gs &&
                typeof gs.gameId === 'string' &&
                gs.gameId.startsWith('game_');
            if (!isCasualRun || !gs) {
                onGameSubmit?.();
                return;
            }
            const score = Math.max(0, Math.floor(gs.score ?? 0));
            void beginCasualPostSettleFlow(gs.gameId, score, {
                tableSummary: extras?.tableSummary ?? undefined,
                pendingOthers: extras?.pendingOthers,
                ...(extras?.triathlonScoreReportOnly || extras?.deferTriathlonTableSummary
                    ? { deferTriathlonTableSummary: true }
                    : {}),
                ...(typeof extras?.seedScoreThreshold === 'number'
                    ? { seedScoreThreshold: extras.seedScoreThreshold, success: extras.success }
                    : {}),
            });
        },
        [casualTournamentId, onGameSubmit, beginCasualPostSettleFlow]
    );

    const cancelSettleConfirm = useCallback(() => {
        setSettleConfirmOpen(false);
    }, []);

    const confirmSettleAndExit = useCallback(async () => {
        const gs = gameStateRef.current;
        if (!gs || casualRunSubmittedRef.current || settleInFlightRef.current) {
            throw new Error('当前无法结算');
        }
        if (interactionPhaseRef.current !== GameInteractionPhase.idle) {
            throw new Error('当前无法结算');
        }
        settleInFlightRef.current = true;
        try {
            const res = (await convex.mutation(api.service.gameManager.concedeGame, {
                gameId: gs.gameId,
            })) as
                | { ok: true; score: number; lines: number; moves: number; gameStatus: number }
                | { ok: false };
            if (!res || !('ok' in res) || !res.ok) {
                throw new Error('认输失败，请重试');
            }
            commitGameState({
                score: res.score,
                lines: res.lines,
                moves: res.moves,
                status: res.gameStatus,
            });
            const settled = await runBlockBlastSettlement(res.score, { deferHostNotify: true });
            if (!settled.ok) {
                throw new Error('结算提交失败，请重试');
            }
            const out: ManualSettleConfirmExtras = {};
            if (settled.tableSummary) out.tableSummary = settled.tableSummary;
            if (settled.pendingOthers) out.pendingOthers = true;
            if (typeof settled.seedScoreThreshold === 'number') {
                out.seedScoreThreshold = settled.seedScoreThreshold;
                out.success = Boolean(settled.success);
            }
            if (settled.triathlonScoreReportOnly) {
                out.triathlonScoreReportOnly = true;
                out.deferTriathlonTableSummary = true;
            }
            return out;
        } catch (e) {
            console.error('[BlockBlast] confirmSettleAndExit', e);
            if (e instanceof Error) throw e;
            throw new Error('结算失败，请稍后重试');
        } finally {
            settleInFlightRef.current = false;
        }
    }, [convex, commitGameState, runBlockBlastSettlement]);

    const settleManuallyAndExit = useCallback(async () => {
        if (!gameState || casualRunSubmittedRef.current || settleInFlightRef.current) return;
        if (interactionPhase !== GameInteractionPhase.idle) return;

        if (isTerminalBlockBlastStatus(gameState.status)) {
            const score = Math.max(0, Math.floor(gameState.score ?? 0));
            const r = await runBlockBlastSettlement(score, { deferHostNotify: true });
            if (!r.ok) {
                console.warn('[BlockBlast] settleManuallyAndExit terminal submit failed');
                return;
            }
            const isCasualRun =
                Boolean(casualTournamentId) &&
                typeof gameState.gameId === 'string' &&
                gameState.gameId.startsWith('game_');
            if (isCasualRun) {
                if (r.triathlonScoreReportOnly) {
                    await beginCasualPostSettleFlow(gameState.gameId, score, {
                        deferTriathlonTableSummary: true,
                    });
                    return;
                }
                await beginCasualPostSettleFlow(gameState.gameId, score, r);
            } else {
                onGameSubmit?.();
            }
            return;
        }

        setSettleConfirmOpen(true);
    }, [
        gameState,
        interactionPhase,
        runBlockBlastSettlement,
        casualTournamentId,
        onGameSubmit,
        beginCasualPostSettleFlow,
    ]);

    const completeCasualRunOnTimeout = useCallback(async () => {
        const gs = gameStateRef.current;
        if (!gs || casualRunSubmittedRef.current || settleInFlightRef.current) return;
        if (gs.status !== BlockBlastGameStatus.PLAYING) return;
        if (gs.dueTime == null || Date.now() < gs.dueTime) return;
        if (!user?.token || typeof gs.gameId !== 'string' || !gs.gameId.startsWith('game_')) return;
        if (interactionPhaseRef.current !== GameInteractionPhase.idle) return;

        settleInFlightRef.current = true;
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
            };
            if (!res?.ok) {
                console.warn('[BlockBlast] forceEndCasualPlatformRun on timeout', res?.error);
                return;
            }
            casualRunSubmittedRef.current = true;
            commitGameState({ status: BlockBlastGameStatus.CANCELLED });
            const score = Math.max(0, Math.floor(gs.score ?? 0));
            if (
                triathlonSessionActive &&
                queueTriathlonMidSessionAdvance(res, score, pendingTriathlonAdvanceRef, {
                    templateId: casualTournamentId,
                    gameId: gs.gameId,
                    triathlonSessionActive,
                })
            ) {
                await beginCasualPostSettleFlow(gs.gameId, score, {
                    deferTriathlonTableSummary: true,
                });
                return;
            }
            await beginCasualPostSettleFlow(gs.gameId, score, {
                tableSummary: res.tableSummary,
                pendingOthers: res.pendingOthers,
                ...(typeof res.seedScoreThreshold === 'number'
                    ? { seedScoreThreshold: res.seedScoreThreshold, success: res.success }
                    : {}),
            });
        } catch (e) {
            console.error('[BlockBlast] completeCasualRunOnTimeout', e);
        } finally {
            settleInFlightRef.current = false;
        }
    }, [
        convex,
        user?.token,
        commitGameState,
        beginCasualPostSettleFlow,
        triathlonSessionActive,
        casualTournamentId,
    ]);

    useEffect(() => {
        if (replayMode) return;
        const gs = gameState;
        if (!gs?.dueTime || gs.status !== BlockBlastGameStatus.PLAYING) return;
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
        replayMode,
        gameState?.gameId,
        gameState?.dueTime,
        gameState?.status,
        completeCasualRunOnTimeout,
    ]);

    const submitScore = useCallback(
        async (score: number) => {
            if (!gameState || casualRunSubmittedRef.current) return;
            const isCasualRun =
                Boolean(casualTournamentId) &&
                typeof gameState.gameId === 'string' &&
                gameState.gameId.startsWith('game_');
            try {
                if (isCasualRun && user?.token) {
                    const cr = (await convex.action(api.proxy.controller.submitCasualPlatformRun, {
                        token: user.token,
                        gameId: gameState.gameId,
                    })) as {
                        ok?: boolean;
                        error?: string;
                        tableSummary?: CasualAsyncTableSummaryUI;
                        pendingOthers?: boolean;
                        weeklyLeagueSettle?: WeeklyLeagueSettleUI;
                        seedScoreThreshold?: number;
                        success?: boolean;
                    };
                    if (!cr.ok) {
                        console.warn('[BlockBlast] submitCasualPlatformRun', cr.error);
                        return;
                    }
                    casualRunSubmittedRef.current = true;
                    if (
                        triathlonSessionActive &&
                        queueTriathlonMidSessionAdvance(cr, score, pendingTriathlonAdvanceRef, {
                            templateId: casualTournamentId,
                            gameId: gameState.gameId,
                            triathlonSessionActive,
                        })
                    ) {
                        await beginCasualPostSettleFlow(gameState.gameId, score, {
                            deferTriathlonTableSummary: true,
                        });
                        return;
                    }
                    await beginCasualPostSettleFlow(gameState.gameId, score, {
                        tableSummary: cr.tableSummary,
                        pendingOthers: cr.pendingOthers,
                        ...(typeof cr.seedScoreThreshold === 'number'
                            ? { seedScoreThreshold: cr.seedScoreThreshold, success: cr.success }
                            : {}),
                    });
                    return;
                }
                if (gameState.reportElement) {
                    gsap.to(gameState.reportElement, {
                        onComplete: () => {
                            onGameSubmit?.();
                        },
                        autoAlpha: 0,
                        duration: 0.4,
                        ease: 'power2.inOut',
                    });
                }
                const res = await convex.action(api.proxy.controller.submitScore, {
                    gameId: gameState.gameId,
                    score,
                });
                if (res.ok) {
                    console.log('score submitted', res);
                }
            } catch (e) {
                console.error('submitScore failed', e);
            }
        },
        [gameState, convex, onGameSubmit, casualTournamentId, user?.token, beginCasualPostSettleFlow, triathlonSessionActive]
    );

    const value: IBlockBlastGameContext = {
        gameReport,
        gameState,
        boardDimension,
        boardDimensionRef,
        gridCellRefs,
        config,
        ruleManager,
        interactionPhase,
        setInteractionPhase,
        updateBoardDimension,
        loadGame,
        submitScore,
        onGameOver,
        commitGameState,
        settleManuallyAndExit,
        settleConfirmOpen,
        cancelSettleConfirm,
        confirmSettleAndExit,
        finishManualSettleSuccess,
        postCasualScoreReportOpen,
        postCasualScoreReport,
        dismissPostCasualScoreReport,
        postCasualSummaryOpen,
        postCasualTableSummary,
        postCasualWeeklyLeagueSettle,
        postCasualWaitingForPeers,
        postCasualCanReplay,
        postCasualReplayOffered,
        postCasualReplayWindowEndsAt,
        casualReplayBusy,
        replayCasualRun,
        dismissPostCasualSummary,
        reloadCasualRun,
        casualTournamentId,
        targetScore,
        replayMode,
    };

    return (
        <BlockBlastGameContext.Provider value={value}>{children}</BlockBlastGameContext.Provider>
    );
};

export default BlockBlastGameProvider;
