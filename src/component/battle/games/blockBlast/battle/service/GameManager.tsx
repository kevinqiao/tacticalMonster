/**
 * Block Blast 游戏管理器（对齐 solitaireSolo：interactionPhase、loadGame、战报与提交）
 */
import { useCasualPlatform } from 'component/lobby/casual/service/useCasualPlatformManager';
import { useUserManager } from 'host/service/UserManager';
import { usePlatformAuth } from 'host/service/platformAuth/PlatformAuthProvider';
import { isPlatformAuthed } from 'host/service/platformAuth/platformAccessToken';
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
    buildCasualScoreChallengeUI,
    getCasualMatchScoreLineLabel,
    isCasualSoloP75ChallengeTemplate,
    shouldOpenCasualTableSummaryAfterScoreReport,
    shouldRefreshPortalAdReplayQuota,
    type CasualGameScoreReportUI,
} from '../../../shared/casualGameScoreReportUI';
import {
    applyCasualTableSummaryFromQuery,
    type CasualAsyncTableSummaryUI,
    type ManualSettleConfirmExtras,
} from '../../../shared/casualAsyncTableSummaryUI';
import { casualHudTargetsFromLoadRes } from '../../../shared/casualHudTargetScores';
import type { WeeklyLeagueSettleUI } from '../../../shared/casualWeeklyLeagueScoreUI';
import {
    queueTriathlonMidSessionAdvance,
    shouldDeferTriathlonTableSummaryForLeg,
    tryAdvanceTriathlonMidSession,
    type TriathlonMidSessionAdvanceHandler,
    type TriathlonPendingAdvance,
} from '../../../shared/casualTriathlonSubmitFlow';
import type { TriathlonNextGame } from 'component/lobby/casual/service/useCasualTriathlonSession';
import { fetchCasualAsyncTableSummaryForGame } from '../../../shared/fetchCasualAsyncTableSummary';
import { executeCasualRunReplay } from '../../../shared/executeCasualRunReplay';
import { confirmCasualRunWithoutReplayForBridge } from '../../../shared/confirmCasualRunWithoutReplay';
import { buildCasualPlatformRunActionArgs } from '../../../shared/casualPlatformActionArgs';
import { useCasualTableSummaryPoll } from '../../../shared/useCasualTableSummaryPoll';

function isTerminalBlockBlastStatus(status: number | undefined): boolean {
    return status !== undefined && status !== BlockBlastGameStatus.PLAYING;
}

type CasualRunSubmitOutcome =
    | {
          ok: true;
          tableSummary?: CasualAsyncTableSummaryUI;
          pendingOthers?: boolean;
          weeklyLeagueSettle?: WeeklyLeagueSettleUI;
          seedScoreThreshold?: number;
          success?: boolean;
          triathlonScoreReportOnly?: boolean;
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

export type GridCellRefs = (HTMLDivElement | null)[][];

export type BlockBlastScoreFloat = {
    id: number;
    delta: number;
    /** 相对 player container 的坐标；缺省则棋盘中心偏上 */
    x?: number;
    y?: number;
};

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
    submitScore: (score: number) => void;
    /**
     * 触发棋盘重绘。await 后必须用 patch 写入服务器返回字段，禁止就地修改闭包捕获的旧 gameState。
     */
    commitGameState: (patch?: GameStateCommitPatch) => void;
    /** 非终局时打开局内确认层；终局则直接结算 */
    settleManuallyAndExit: () => Promise<void>;
    /** 自然终局（无步可下）或操作后服务端判定必须结束时触发休闲结算 */
    completeCasualRunIfTerminal: (opts?: {
        skipInteractionCheck?: boolean;
        terminalStatus?: number;
    }) => Promise<void>;
    /** 对局时限到期：强制结束并走休闲结算 */
    completeCasualRunOnTimeout: () => Promise<void>;
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
    postCasualReplayMode: 'ad' | 'token';
    postCasualReplayWindowEndsAt?: number;
    postCasualAdReplayDailyRemaining?: number;
    postCasualAdReplayDailyCap?: number;
    casualReplayBusy: boolean;
    replayCasualRun: () => Promise<void>;
    dismissPostCasualSummary: () => void;
    reloadCasualRun: () => Promise<boolean>;
    casualTournamentId?: string;
    /** Clear-bar 挑战分（结算 success） */
    targetScore?: number;
    /** HUD 双档：seed p75 / p90 */
    targetScoreP75?: number;
    targetScoreP90?: number;
    /** 回放/复盘模式：本地按 seed 重放，跳过 Convex 建局与结算流程 */
    replayMode: boolean;
    /** 消行得分飘字 */
    scoreFloats: BlockBlastScoreFloat[];
    pushScoreFloat: (
        delta: number,
        opts?: { x?: number; y?: number; rows?: number[]; cols?: number[] }
    ) => void;
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
    commitGameState: () => { },
    settleManuallyAndExit: async () => { },
    completeCasualRunIfTerminal: async () => { },
    completeCasualRunOnTimeout: async () => { },
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
    postCasualReplayMode: 'token',
    postCasualReplayWindowEndsAt: undefined,
    postCasualAdReplayDailyRemaining: undefined,
    postCasualAdReplayDailyCap: undefined,
    casualReplayBusy: false,
    replayCasualRun: async () => {},
    dismissPostCasualSummary: () => { },
    reloadCasualRun: async () => false,
    casualTournamentId: undefined,
    targetScore: undefined,
    targetScoreP75: undefined,
    targetScoreP90: undefined,
    replayMode: false,
    scoreFloats: [],
    pushScoreFloat: () => {},
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
    const [interactionPhase, setInteractionPhaseState] = useState<GameInteractionPhase>(
        GameInteractionPhase.idle
    );
    const setInteractionPhase = useCallback((phase: GameInteractionPhase) => {
        interactionPhaseRef.current = phase;
        setInteractionPhaseState(phase);
    }, []);
    const [targetScore, setTargetScore] = useState<number | undefined>(undefined);
    const [targetScoreP75, setTargetScoreP75] = useState<number | undefined>(undefined);
    const [targetScoreP90, setTargetScoreP90] = useState<number | undefined>(undefined);
    const [scoreFloats, setScoreFloats] = useState<BlockBlastScoreFloat[]>([]);
    const scoreFloatIdRef = useRef(0);
    const boardDimensionRef = useRef<BoardDimension | null>(null);
    const gridCellRefs = useRef<GridCellRefs | null>(null);
    if (!gridCellRefs.current) {
        gridCellRefs.current = allocateGridCellRefs(BLOCK_BLAST_DEFAULT_GRID_SIZE);
    }
    const config = { ...DEFAULT_GAME_CONFIG, ...customConfig };
    const convex = useConvex();
    const { user } = useUserManager();
    const { platformReady } = usePlatformAuth();
    const casualPlatformBridge = casualTournamentId?.startsWith("portal_")
        ? ("portal" as const)
        : undefined;
    const casualPlatformAuthed =
        platformReady && isPlatformAuthed(user) && Boolean(user?.platformAccessToken);
    const casual = useCasualPlatform({ enabled: casualPlatformBridge !== "portal" });
    const fetchTableSummaryForGame = useCallback(
        async (matchGameId: string) => {
            if (!user?.uid) return null;
            return fetchCasualAsyncTableSummaryForGame({
                matchGameId,
                platformBridge: casualPlatformBridge ?? 'casual',
            });
        },
        [user?.uid, casualPlatformBridge]
    );
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
    const [postCasualReplayMode, setPostCasualReplayMode] = useState<'ad' | 'token'>('token');
    const [postCasualReplayWindowEndsAt, setPostCasualReplayWindowEndsAt] = useState<number | undefined>(
        undefined
    );
    const [postCasualAdReplayDailyRemaining, setPostCasualAdReplayDailyRemaining] = useState<
        number | undefined
    >(undefined);
    const [postCasualAdReplayDailyCap, setPostCasualAdReplayDailyCap] = useState<
        number | undefined
    >(undefined);
    const [casualReplayBusy, setCasualReplayBusy] = useState(false);
    const [triathlonDeferTableSummary, setTriathlonDeferTableSummary] = useState(false);

    const casualRunSubmittedRef = useRef(false);
    const timeoutUiShownRef = useRef(false);
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
        fetchSummary: fetchTableSummaryForGame,
        onUpdate: (next) => {
            applyCasualTableSummaryFromQuery(next, {
                setTableSummary: setPostCasualTableSummary,
                setReplayOffered: setPostCasualReplayOffered,
                setReplayTokenCount: setPostCasualReplayTokenCount,
                setCanReplay: setPostCasualCanReplay,
                setReplayWindowEndsAt: setPostCasualReplayWindowEndsAt,
                setReplayMode: setPostCasualReplayMode,
                setAdReplayDailyRemaining: setPostCasualAdReplayDailyRemaining,
                setAdReplayDailyCap: setPostCasualAdReplayDailyCap,
            });
        },
    });

    useEffect(() => {
        gameStateRef.current = gameState ?? null;
    }, [gameState]);

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
            const next = {
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
            gameStateRef.current = next;
            return next;
        });
    }, []);

    useEffect(() => {
        interactionPhaseRef.current = interactionPhase;
    }, [interactionPhase]);

    const triathlonSessionActive = Boolean(onTriathlonNextGame);

    useEffect(() => {
        casualRunSubmittedRef.current = false;
        timeoutUiShownRef.current = false;
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

    const resetBlockBlastSessionForLoad = useCallback(() => {
        casualRunSubmittedRef.current = false;
        timeoutUiShownRef.current = false;
        pendingTriathlonAdvanceRef.current = null;
        settleInFlightRef.current = false;
        setTriathlonDeferTableSummary(false);
        setGameState(null);
        setGameReport(null);
        setInteractionPhase(GameInteractionPhase.idle);
        setTargetScore(undefined);
        setTargetScoreP75(undefined);
        setTargetScoreP90(undefined);
        setSettleConfirmOpen(false);
        setPostCasualScoreReportOpen(false);
        setPostCasualScoreReport(null);
        setPostCasualSummaryOpen(false);
        setPostCasualTableSummary(null);
        setPostCasualWeeklyLeagueSettle(null);
        setPostCasualWaitingForPeers(false);
        setPostCasualCanReplay(false);
        setPostCasualReplayOffered(false);
        setPostCasualReplayTokenCount(0);
        setPostCasualReplayWindowEndsAt(undefined);
        setCasualReplayBusy(false);
    }, []);

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
                lines: [{ label: getCasualMatchScoreLineLabel(), value: fallbackScore }],
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
            const challengeThreshold =
                typeof settle.seedScoreThreshold === 'number'
                    ? settle.seedScoreThreshold
                    : typeof targetScore === 'number'
                      ? targetScore
                      : undefined;
            const challenge = buildCasualScoreChallengeUI({
                achievedScore: report.totalScore,
                clearThreshold: challengeThreshold,
                clearSuccess: settle.success,
                p75: targetScoreP75,
                p90: targetScoreP90,
            });
            if (challenge) {
                report.challenge = challenge;
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
            {
                const hasRows = Boolean(settle.tableSummary?.rows?.length);
                const multi = !isCasualSoloP75ChallengeTemplate(casualTournamentId);
                setPostCasualWaitingForPeers(
                    deferTableSummary
                        ? false
                        : Boolean(settle.pendingOthers) || (multi && !hasRows)
                );
            }
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
                    setReplayMode: setPostCasualReplayMode,
                    setAdReplayDailyRemaining: setPostCasualAdReplayDailyRemaining,
                    setAdReplayDailyCap: setPostCasualAdReplayDailyCap,
                });
            }
            // 多人竞技：Arena ingest 常缺 adReplayDailyCap；Portal query 带完整 N/M。
            if (shouldRefreshPortalAdReplayQuota(casualTournamentId) || !settle.tableSummary) {
                try {
                    const summary = await fetchTableSummaryForGame(gameId);
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
                } catch (e) {
                    console.warn('[BlockBlast] fetchCasualTableSummaryForGame after submit', e);
                }
            }
        },
        [
            resolveBlockBlastScoreReport,
            fetchTableSummaryForGame,
            casualTournamentId,
            triathlonSessionActive,
            onTriathlonNextGame,
            targetScore,
            targetScoreP75,
            targetScoreP90,
        ]
    );

    const mapCasualPlatformRunActionResult = useCallback(
        (
            cr: {
                ok?: boolean;
                tableSummary?: CasualAsyncTableSummaryUI;
                pendingOthers?: boolean;
                weeklyLeagueSettle?: WeeklyLeagueSettleUI;
                seedScoreThreshold?: number;
                success?: boolean;
                gameComplete?: boolean;
                nextGame?: TriathlonNextGame;
            },
            deferHost: boolean,
            score: number,
            matchGameId?: string
        ): CasualRunSubmitOutcome => {
            if (!cr.ok) return { ok: false };
            if (
                triathlonSessionActive &&
                matchGameId &&
                queueTriathlonMidSessionAdvance(cr, score, pendingTriathlonAdvanceRef, {
                    templateId: casualTournamentId,
                    gameId: matchGameId,
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
        },
        [triathlonSessionActive, casualTournamentId, onGameSubmit]
    );

    const mergeCasualSettleIntoOpenOverlays = useCallback(
        (settled: Extract<CasualRunSubmitOutcome, { ok: true }>) => {
            if (settled.triathlonScoreReportOnly) return;
            if (
                typeof settled.seedScoreThreshold === 'number' ||
                targetScoreP75 != null ||
                targetScoreP90 != null
            ) {
                setPostCasualScoreReport((prev) => {
                    if (!prev) return prev;
                    const challenge = buildCasualScoreChallengeUI({
                        achievedScore: prev.totalScore,
                        clearThreshold:
                            typeof settled.seedScoreThreshold === 'number'
                                ? settled.seedScoreThreshold
                                : targetScore,
                        clearSuccess: settled.success,
                        p75: targetScoreP75,
                        p90: targetScoreP90,
                    });
                    return challenge ? { ...prev, challenge } : prev;
                });
            }
            if (settled.tableSummary) {
                applyCasualTableSummaryFromQuery(settled.tableSummary, {
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
            if (shouldRefreshPortalAdReplayQuota(casualTournamentId)) {
                const gs = gameStateRef.current;
                const matchGameId =
                    typeof gs?.gameId === 'string' && gs.gameId.startsWith('game_')
                        ? gs.gameId
                        : undefined;
                if (matchGameId) {
                    void fetchTableSummaryForGame(matchGameId)
                        .then((summary) => {
                            if (!summary?.rows?.length) return;
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
                        })
                        .catch(() => {
                            /* ignore */
                        });
                }
            }
            if (settled.pendingOthers) {
                setPostCasualWaitingForPeers(true);
            }
            if (settled.weeklyLeagueSettle) {
                setPostCasualWeeklyLeagueSettle(settled.weeklyLeagueSettle);
            }
        },
        [casualTournamentId, fetchTableSummaryForGame, targetScore, targetScoreP75, targetScoreP90]
    );

    /** 强行结束：取消 timeout scheduler、服务端终局、ingest casual/portal */
    const runForceEndCasualSettlement = useCallback(
        async (opts?: { deferHostNotify?: boolean }): Promise<CasualRunSubmitOutcome> => {
            const gs = gameStateRef.current;
            if (!gs || casualRunSubmittedRef.current) return { ok: false };
            if (typeof gs.gameId !== 'string' || !gs.gameId.startsWith('game_')) {
                return { ok: false, error: 'not_casual_run' };
            }
            if (!casualPlatformAuthed) {
                return { ok: false, error: 'missing_casual_auth' };
            }
            casualRunSubmittedRef.current = true;
            const deferHost = Boolean(opts?.deferHostNotify);
            try {
                const cr = (await convex.action(api.proxy.controller.forceEndCasualPlatformRun, {
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
                };
                if (!cr.ok) {
                    console.warn('[BlockBlast] forceEndCasualPlatformRun', cr.error);
                    casualRunSubmittedRef.current = false;
                    return { ok: false, error: cr.error };
                }
                commitGameState({ status: BlockBlastGameStatus.CANCELLED });
                const score = Math.max(0, Math.floor(gs.score ?? 0));
                return mapCasualPlatformRunActionResult(cr, deferHost, score, gs.gameId);
            } catch (e) {
                console.error('[BlockBlast] runForceEndCasualSettlement', e);
                casualRunSubmittedRef.current = false;
                const msg = e instanceof Error ? e.message : String(e);
                if (msg.includes('unauthenticated')) {
                    return { ok: false, error: 'missing_casual_auth' };
                }
                return { ok: false, error: 'network_error' };
            }
        },
        [convex, casualPlatformAuthed, casualPlatformBridge, commitGameState, mapCasualPlatformRunActionResult]
    );

    const applyCasualSettleOutcome = useCallback(
        async (gameId: string, score: number, settled: Extract<CasualRunSubmitOutcome, { ok: true }>) => {
            if (settled.triathlonScoreReportOnly) {
                await beginCasualPostSettleFlow(gameId, score, {
                    deferTriathlonTableSummary: true,
                });
                return;
            }
            await beginCasualPostSettleFlow(gameId, score, settled);
        },
        [beginCasualPostSettleFlow]
    );

    const reloadCasualRun = useCallback(async (): Promise<boolean> => {
        if (!gameId || !gameId.startsWith('game_')) return false;
        const res = await convex.action(api.proxy.controller.loadGame, {
            gameId,
            resetCasualRun: true,
            ...(casualPlatformBridge ? { platformBridge: casualPlatformBridge } : {}),
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
            const hud = casualHudTargetsFromLoadRes(
                res as {
                    seedScoreThreshold?: number;
                    seedScoreThresholdP75?: number;
                    seedScoreThresholdP90?: number;
                    game?: { targetScore?: number };
                }
            );
            if (hud.targetScore != null) {
                setTargetScore(hud.targetScore);
                game.targetScore = hud.targetScore;
            }
            setTargetScoreP75(hud.targetScoreP75);
            setTargetScoreP90(hud.targetScoreP90);
            setGameState(game);
            setInteractionPhase(GameInteractionPhase.idle);
            return true;
        }
        return false;
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
                console.warn('[BlockBlast] replayCasualRun', rr.error);
                return;
            }
            casualRunSubmittedRef.current = false;
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
            await reloadCasualRun();
        } catch (e) {
            if (restoreScoreReport) setPostCasualScoreReportOpen(true);
            if (restoreSummary) setPostCasualSummaryOpen(true);
            console.error('[BlockBlast] replayCasualRun', e);
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
        [casual, casualTournamentId, casualPlatformBridge, user?.uid, onGameSubmit]
    );

    const dismissPostCasualScoreReport = useCallback(async () => {
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
        let tableSummary = postCasualTableSummary;
        let waitingForPeers = postCasualWaitingForPeers;

        // 得分页可能早于 settle/同桌拉取；多人点确定时补拉，避免直接退出。
        if (
            matchGameId &&
            !isCasualSoloP75ChallengeTemplate(casualTournamentId) &&
            !deferTableSummary &&
            !tableSummary?.rows?.length
        ) {
            try {
                const fetched = await fetchTableSummaryForGame(matchGameId);
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
                console.warn('[blockBlast] fetch table summary on score dismiss', e);
                if (!waitingForPeers) {
                    waitingForPeers = true;
                    setPostCasualWaitingForPeers(true);
                }
            }
        }

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
                tableSummary,
                waitingForPeers,
                {
                    deferTriathlonTableSummary: deferTableSummary,
                    triathlonSessionActive,
                    triathlonGameId: matchGameId,
                    replayOffered: hadReplayOffer,
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
        fetchTableSummaryForGame,
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

    const pushScoreFloat = useCallback(
        (
            delta: number,
            opts?: { x?: number; y?: number; rows?: number[]; cols?: number[] }
        ) => {
            if (!Number.isFinite(delta) || delta === 0) return;
            let x = opts?.x;
            let y = opts?.y;
            if (x == null || y == null) {
                const refs = gridCellRefs.current;
                const rows = opts?.rows ?? [];
                const cols = opts?.cols ?? [];
                const pts: Array<{ x: number; y: number }> = [];
                if (refs) {
                    const n = refs.length;
                    for (const row of rows) {
                        for (let c = 0; c < n; c++) {
                            const el = refs[row]?.[c];
                            if (!el) continue;
                            const r = el.getBoundingClientRect();
                            pts.push({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
                        }
                    }
                    for (const col of cols) {
                        for (let r = 0; r < n; r++) {
                            const el = refs[r]?.[col];
                            if (!el) continue;
                            const box = el.getBoundingClientRect();
                            pts.push({
                                x: box.left + box.width / 2,
                                y: box.top + box.height / 2,
                            });
                        }
                    }
                }
                let root: HTMLElement | null = null;
                if (refs) {
                    outer: for (const row of refs) {
                        for (const cell of row) {
                            if (!cell) continue;
                            root = cell.closest('.blockblast-player-container');
                            if (root) break outer;
                        }
                    }
                }
                if (pts.length > 0 && root) {
                    const rr = root.getBoundingClientRect();
                    const sx = pts.reduce((a, p) => a + p.x, 0) / pts.length;
                    const sy = pts.reduce((a, p) => a + p.y, 0) / pts.length;
                    x = sx - rr.left;
                    y = sy - rr.top;
                } else {
                    const bd = boardDimensionRef.current;
                    x = bd ? bd.grid.x + bd.grid.width / 2 : undefined;
                    y = bd ? bd.grid.y + bd.grid.height * 0.4 : undefined;
                }
            }
            const id = ++scoreFloatIdRef.current;
            setScoreFloats((list) => [...list.slice(-6), { id, delta, x, y }]);
            window.setTimeout(() => {
                setScoreFloats((list) => list.filter((f) => f.id !== id));
            }, 1100);
        },
        []
    );

    const loadGame = useCallback(async () => {
        if (!gameId) return;
        const res = await convex.action(api.proxy.controller.loadGame, {
            gameId,
            ...(casualPlatformBridge ? { platformBridge: casualPlatformBridge } : {}),
        });
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
            const hud = casualHudTargetsFromLoadRes(
                res as {
                    seedScoreThreshold?: number;
                    seedScoreThresholdP75?: number;
                    seedScoreThresholdP90?: number;
                    game?: { targetScore?: number };
                }
            );
            if (hud.targetScore != null) {
                setTargetScore(hud.targetScore);
                game.targetScore = hud.targetScore;
            }
            setTargetScoreP75(hud.targetScoreP75);
            setTargetScoreP90(hud.targetScoreP90);
            setGameState(game);
            setInteractionPhase(GameInteractionPhase.idle);
            onGameLoadComplete?.();
        }
    }, [convex, gameId, onGameLoadComplete, casualPlatformBridge]);

    useEffect(() => {
        if (replayMode || !gameId) return;
        resetBlockBlastSessionForLoad();
        void loadGame();
    }, [gameId, replayMode, loadGame, resetBlockBlastSessionForLoad]);

    useLayoutEffect(() => {
        if (!gameState?.grid?.length) return;
        const n = gameState.gridSize ?? inferGridSizeFromGrid(gameState.grid);
        const cur = gridCellRefs.current;
        if (cur?.length === n && cur[0]?.length === n) return;
        gridCellRefs.current = allocateGridCellRefs(n);
    }, [gameState?.gameId, gameState?.gridSize, gameState?.grid?.length]);

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
            | { ok: false; error?: string }
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
                    casualPlatformAuthed
                ) {
                    const cr = (await convex.action(api.proxy.controller.submitCasualPlatformRun, {
                        ...buildCasualPlatformRunActionArgs({
                            gameId: gs.gameId,
                            platformBridge: casualPlatformBridge,
                        }),
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
        [convex, casualTournamentId, casualPlatformAuthed, onGameSubmit, triathlonSessionActive, casualPlatformBridge]
    );

    const finishManualSettleSuccess = useCallback(
        (extras?: ManualSettleConfirmExtras) => {
            setSettleConfirmOpen(false);
            const gs = gameStateRef.current;
            const isCasualRun =
                typeof gs?.gameId === 'string' &&
                gs.gameId.startsWith('game_');
            if (!gs || !isCasualRun) {
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
        if (!casualRunSubmittedRef.current) {
            settleInFlightRef.current = false;
        }
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
            const isCasualGameId =
                typeof gs.gameId === 'string' && gs.gameId.startsWith('game_');
            if (Boolean(casualTournamentId) && isCasualGameId && !casualPlatformAuthed) {
                throw new Error(casualSettleErrorMessage('missing_casual_auth'));
            }
            const isCasualRun = isCasualGameId && casualPlatformAuthed;

            if (isCasualRun) {
                // 等 forceEnd 落库后再返回：同桌榜里“我”应显示已结算分数而非 playing
                const settled = await runForceEndCasualSettlement({ deferHostNotify: true });
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
                if (settled.triathlonScoreReportOnly) {
                    out.triathlonScoreReportOnly = true;
                    out.deferTriathlonTableSummary = true;
                }
                return out;
            }

            const settled = await (async () => {
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
                      return runBlockBlastSettlement(res.score, { deferHostNotify: true });
                  })();

            if (!settled.ok) {
                throw new Error(casualSettleErrorMessage(settled.error));
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
    }, [
        convex,
        casualTournamentId,
        casualPlatformAuthed,
        targetScore,
        commitGameState,
        runBlockBlastSettlement,
        runForceEndCasualSettlement,
    ]);

    const openPostSettleAfterTerminalSubmit = useCallback(
        async (
            gameId: string,
            score: number,
            r: {
                ok: true;
                triathlonScoreReportOnly?: boolean;
                tableSummary?: CasualAsyncTableSummaryUI;
                pendingOthers?: boolean;
                weeklyLeagueSettle?: WeeklyLeagueSettleUI;
                seedScoreThreshold?: number;
                success?: boolean;
            }
        ) => {
            const isCasualRun = typeof gameId === 'string' && gameId.startsWith('game_');
            if (!isCasualRun) {
                onGameSubmit?.();
                return;
            }
            if (r.triathlonScoreReportOnly) {
                await beginCasualPostSettleFlow(gameId, score, {
                    deferTriathlonTableSummary: true,
                });
                return;
            }
            await beginCasualPostSettleFlow(gameId, score, r);
        },
        [casualTournamentId, onGameSubmit, beginCasualPostSettleFlow]
    );

    const ensurePostSettleUiIfSubmitted = useCallback(async () => {
        if (postCasualScoreReportOpen || postCasualSummaryOpen) return;
        const gs = gameStateRef.current;
        if (!gs || !casualRunSubmittedRef.current) return;
        const isCasualRun = typeof gs.gameId === 'string' && gs.gameId.startsWith('game_');
        if (!isCasualRun) {
            onGameSubmit?.();
            return;
        }
        const score = Math.max(0, Math.floor(gs.score ?? 0));
        await beginCasualPostSettleFlow(gs.gameId, score, {});
    }, [
        postCasualScoreReportOpen,
        postCasualSummaryOpen,
        onGameSubmit,
        beginCasualPostSettleFlow,
    ]);

    const completeCasualRunIfTerminal = useCallback(async (opts?: {
        skipInteractionCheck?: boolean;
        terminalStatus?: number;
    }) => {
        if (settleInFlightRef.current) return;
        if (
            !opts?.skipInteractionCheck &&
            interactionPhaseRef.current !== GameInteractionPhase.idle
        ) {
            return;
        }
        const gs = gameStateRef.current;
        if (!gs) return;
        const status = opts?.terminalStatus ?? gs.status;
        if (!isTerminalBlockBlastStatus(status)) return;
        if (opts?.terminalStatus !== undefined && status !== gs.status) {
            commitGameState({ status });
        }

        if (casualRunSubmittedRef.current) {
            await ensurePostSettleUiIfSubmitted();
            return;
        }

        const score = Math.max(0, Math.floor(gs.score ?? 0));
        const r = await runBlockBlastSettlement(score, { deferHostNotify: true });
        if (!r.ok) {
            console.warn('[BlockBlast] completeCasualRunIfTerminal submit failed');
            return;
        }
        await openPostSettleAfterTerminalSubmit(gs.gameId, score, r);
    }, [
        runBlockBlastSettlement,
        ensurePostSettleUiIfSubmitted,
        openPostSettleAfterTerminalSubmit,
        commitGameState,
    ]);

    const settleManuallyAndExit = useCallback(async () => {
        if (!gameState || settleInFlightRef.current) return;
        if (interactionPhase !== GameInteractionPhase.idle) return;

        if (isTerminalBlockBlastStatus(gameState.status)) {
            await completeCasualRunIfTerminal();
            return;
        }
        if (casualRunSubmittedRef.current) return;

        setSettleConfirmOpen(true);
    }, [gameState, interactionPhase, completeCasualRunIfTerminal]);

    const completeCasualRunOnTimeout = useCallback(async () => {
        const gs = gameStateRef.current;
        if (!gs || settleInFlightRef.current) return;
        if (gs.status !== BlockBlastGameStatus.PLAYING) return;
        if (gs.dueTime == null || Date.now() < gs.dueTime) return;
        if (typeof gs.gameId !== 'string' || !gs.gameId.startsWith('game_')) return;

        settleInFlightRef.current = true;
        const matchGameId = gs.gameId;
        const score = Math.max(0, Math.floor(gs.score ?? 0));
        try {
            if (!timeoutUiShownRef.current) {
                timeoutUiShownRef.current = true;
                commitGameState({ status: BlockBlastGameStatus.CANCELLED });
                await beginCasualPostSettleFlow(matchGameId, score, {});
            }

            if (!casualPlatformAuthed || casualRunSubmittedRef.current) return;

            const settled = await runForceEndCasualSettlement({ deferHostNotify: true });
            if (settled.ok) {
                mergeCasualSettleIntoOpenOverlays(settled);
                return;
            }
            console.warn('[BlockBlast] forceEnd on timeout failed', settled.error);
            const summary = await fetchTableSummaryForGame(matchGameId);
            if (summary) {
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
        } catch (e) {
            console.error('[BlockBlast] completeCasualRunOnTimeout', e);
        } finally {
            settleInFlightRef.current = false;
        }
    }, [
        casualPlatformAuthed,
        runForceEndCasualSettlement,
        fetchTableSummaryForGame,
        commitGameState,
        beginCasualPostSettleFlow,
        mergeCasualSettleIntoOpenOverlays,
    ]);

    useEffect(() => {
        if (replayMode) return;
        const gs = gameState;
        if (!gs?.dueTime || gs.status !== BlockBlastGameStatus.PLAYING) return;

        let intervalId: number | undefined;
        const fire = () => {
            void completeCasualRunOnTimeout();
        };
        const startPoll = () => {
            fire();
            intervalId = window.setInterval(fire, 1000);
        };

        const ms = gs.dueTime - Date.now();
        let timeoutId: number | undefined;
        if (ms <= 0) {
            startPoll();
        } else {
            timeoutId = window.setTimeout(startPoll, ms);
        }

        return () => {
            if (timeoutId != null) window.clearTimeout(timeoutId);
            if (intervalId != null) window.clearInterval(intervalId);
        };
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
                if (isCasualRun && casualPlatformAuthed) {
                    const cr = (await convex.action(api.proxy.controller.submitCasualPlatformRun, {
                        gameId: gameState.gameId,
                        ...(casualPlatformBridge ? { platformBridge: casualPlatformBridge } : {}),
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
        [gameState, convex, onGameSubmit, casualTournamentId, casualPlatformAuthed, beginCasualPostSettleFlow, triathlonSessionActive, casualPlatformBridge]
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
        commitGameState,
        settleManuallyAndExit,
        completeCasualRunIfTerminal,
        completeCasualRunOnTimeout,
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
        postCasualReplayMode,
        postCasualReplayWindowEndsAt,
        postCasualAdReplayDailyRemaining,
        postCasualAdReplayDailyCap,
        casualReplayBusy,
        replayCasualRun,
        dismissPostCasualSummary,
        reloadCasualRun,
        casualTournamentId,
        targetScore,
        targetScoreP75,
        targetScoreP90,
        replayMode,
        scoreFloats,
        pushScoreFloat,
    };

    return (
        <BlockBlastGameContext.Provider value={value}>{children}</BlockBlastGameContext.Provider>
    );
};

export default BlockBlastGameProvider;
