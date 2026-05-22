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
import {
    buildBlockBlastScoreReport,
    shouldOpenCasualTableSummaryAfterScoreReport,
    type CasualGameScoreReportUI,
} from '../../../shared/casualGameScoreReportUI';
import type { CasualAsyncTableSummaryUI, ManualSettleConfirmExtras } from '../../../shared/casualAsyncTableSummaryUI';

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
    postCasualWaitingForPeers: boolean;
    postCasualCanReplay: boolean;
    postCasualReplayOffered: boolean;
    casualReplayBusy: boolean;
    replayCasualRun: () => Promise<void>;
    dismissPostCasualSummary: () => void;
    reloadCasualRun: () => Promise<boolean>;
    casualTournamentId?: string;
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
    postCasualWaitingForPeers: false,
    postCasualCanReplay: false,
    postCasualReplayOffered: false,
    casualReplayBusy: false,
    replayCasualRun: async () => {},
    dismissPostCasualSummary: () => { },
    reloadCasualRun: async () => false,
    casualTournamentId: undefined,
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
    casualTournamentId?: string;
    config?: Partial<BlockBlastGameConfig>;
    onGameLoadComplete?: () => void;
    onGameSubmit?: () => void;
}

export const BlockBlastGameProvider: React.FC<BlockBlastGameProviderProps> = ({
    children,
    gameId,
    casualTournamentId,
    config: customConfig,
    onGameLoadComplete,
    onGameSubmit,
}) => {
    const [gameState, setGameState] = useState<BlockBlastGameState | null>(null);
    const [gameReport, setGameReport] = useState<GameReport | null>(null);
    const [boardDimension, setBoardDimension] = useState<BoardDimension | null>(null);
    const [interactionPhase, setInteractionPhase] = useState<GameInteractionPhase>(
        GameInteractionPhase.idle
    );
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
    const [postCasualWaitingForPeers, setPostCasualWaitingForPeers] = useState(false);
    const [postCasualCanReplay, setPostCasualCanReplay] = useState(false);
    const [postCasualReplayOffered, setPostCasualReplayOffered] = useState(false);
    const [postCasualReplayTokenCount, setPostCasualReplayTokenCount] = useState(0);
    const [casualReplayBusy, setCasualReplayBusy] = useState(false);

    const casualRunSubmittedRef = useRef(false);
    const settleInFlightRef = useRef(false);
    const gameStateRef = useRef<BlockBlastGameState | null>(null);
    const interactionPhaseRef = useRef<GameInteractionPhase>(GameInteractionPhase.idle);

    useEffect(() => {
        gameStateRef.current = gameState ?? null;
    }, [gameState]);

    useEffect(() => {
        interactionPhaseRef.current = interactionPhase;
    }, [interactionPhase]);

    useEffect(() => {
        casualRunSubmittedRef.current = false;
        setPostCasualScoreReportOpen(false);
        setPostCasualScoreReport(null);
        setPostCasualSummaryOpen(false);
        setPostCasualTableSummary(null);
        setPostCasualWaitingForPeers(false);
        setPostCasualCanReplay(false);
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
                tableSummary?: CasualAsyncTableSummaryUI | null;
                pendingOthers?: boolean;
                replayOffered?: boolean;
                replayTokenCount?: number;
                canReplay?: boolean;
            }
        ) => {
            if (gameStateRef.current?.reportElement) {
                gsap.set(gameStateRef.current.reportElement, { autoAlpha: 0 });
            }
            const report = await resolveBlockBlastScoreReport(gameId, fallbackScore);
            setPostCasualScoreReport(report);
            setPostCasualTableSummary(settle.tableSummary ?? null);
            setPostCasualWaitingForPeers(Boolean(settle.pendingOthers));
            const offered = Boolean(settle.replayOffered ?? settle.canReplay);
            setPostCasualReplayOffered(offered);
            setPostCasualReplayTokenCount(
                typeof settle.replayTokenCount === 'number' ? settle.replayTokenCount : 0
            );
            setPostCasualCanReplay(Boolean(settle.canReplay));
            setPostCasualScoreReportOpen(true);
        },
        [resolveBlockBlastScoreReport]
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
            setPostCasualScoreReportOpen(false);
            setPostCasualScoreReport(null);
            onGameSubmit?.();
        },
        [casual, casualTournamentId, user?.uid, onGameSubmit]
    );

    const dismissPostCasualScoreReport = useCallback(() => {
        const hadReplayOffer = postCasualReplayOffered;
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
            void exitCasualRunAfterSettle({ hadReplayOffer: hadReplayOffer });
        }
    }, [
        casualTournamentId,
        postCasualTableSummary,
        postCasualWaitingForPeers,
        postCasualReplayOffered,
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
        }
    }, [convex, gameId, onGameLoadComplete]);

    useEffect(() => {
        void loadGame();
    }, [loadGame]);

    useEffect(() => {
        if (!gameState?.grid?.length) return;
        const n = inferGridSizeFromGrid(gameState.grid);
        gridCellRefs.current = allocateGridCellRefs(n);
    }, [gameState?.gameId, gameState?.grid]);

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
                  replayOffered?: boolean;
                  replayTokenCount?: number;
                  canReplay?: boolean;
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
                        replayOffered?: boolean;
                        replayTokenCount?: number;
                        canReplay?: boolean;
                    };
                    if (!cr.ok) {
                        console.warn('[BlockBlast] submitCasualPlatformRun', cr.error);
                        casualRunSubmittedRef.current = false;
                        return { ok: false };
                    }
                    if (!deferHost) {
                        onGameSubmit?.();
                    }
                    return {
                        ok: true,
                        ...(cr.tableSummary ? { tableSummary: cr.tableSummary } : {}),
                        ...(cr.pendingOthers ? { pendingOthers: true } : {}),
                        ...(cr.replayOffered ? { replayOffered: true } : {}),
                        ...(cr.replayTokenCount != null ? { replayTokenCount: cr.replayTokenCount } : {}),
                        ...(cr.canReplay ? { canReplay: true } : {}),
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
        [convex, casualTournamentId, user?.token, onGameSubmit]
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
                replayOffered: extras?.replayOffered,
                replayTokenCount: extras?.replayTokenCount,
                canReplay: extras?.canReplay,
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
            if (settled.replayOffered) out.replayOffered = true;
            if (settled.replayTokenCount != null) out.replayTokenCount = settled.replayTokenCount;
            if (settled.canReplay) out.canReplay = true;
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
                    };
                    if (!cr.ok) {
                        console.warn('[BlockBlast] submitCasualPlatformRun', cr.error);
                        return;
                    }
                    casualRunSubmittedRef.current = true;
                    await beginCasualPostSettleFlow(gameState.gameId, score, {
                        tableSummary: cr.tableSummary,
                        pendingOthers: cr.pendingOthers,
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
        [gameState, convex, onGameSubmit, casualTournamentId, user?.token, beginCasualPostSettleFlow]
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
        postCasualWaitingForPeers,
        postCasualCanReplay,
        postCasualReplayOffered,
        casualReplayBusy,
        replayCasualRun,
        dismissPostCasualSummary,
        reloadCasualRun,
        casualTournamentId,
    };

    return (
        <BlockBlastGameContext.Provider value={value}>{children}</BlockBlastGameContext.Provider>
    );
};

export default BlockBlastGameProvider;
