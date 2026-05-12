/**
 * Block Blast 游戏管理器（对齐 solitaireSolo：interactionPhase、loadGame、战报与提交）
 */
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
    const { user } = useUserManager();

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

    const submitScore = useCallback(
        async (score: number) => {
            if (!gameState) return;
            const isCasualRun =
                Boolean(casualTournamentId) &&
                typeof gameState.gameId === 'string' &&
                gameState.gameId.startsWith('game_');
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
            try {
                if (isCasualRun && user?.token) {
                    const cr = (await convex.action(api.proxy.controller.submitCasualPlatformRun, {
                        token: user.token,
                        gameId: gameState.gameId,
                    })) as { ok?: boolean; error?: string };
                    if (!cr.ok) {
                        console.warn('[BlockBlast] submitCasualPlatformRun', cr.error);
                    }
                    return;
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
        [gameState, convex, onGameSubmit, casualTournamentId, user?.token]
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
    };

    return (
        <BlockBlastGameContext.Provider value={value}>{children}</BlockBlastGameContext.Provider>
    );
};

export default BlockBlastGameProvider;
