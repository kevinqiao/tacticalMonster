/**
 * Block Blast 游戏管理器（对齐 solitaireSolo：interactionPhase、loadGame、战报与提交）
 */
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
    BlockBlastGameConfig,
    BlockBlastGameState,
    BlockBlastGameStatus,
    BlockBlastRule,
    BoardDimension,
    DEFAULT_GAME_CONFIG,
    GameInteractionPhase,
    GameReport,
    Shape,
} from '../types/BlockBlastTypes';
import BlockBlastRuleManager from './BlockBlastRuleManager';

export type GridCellRefs = (HTMLDivElement | null)[][];

function createEmptyGridCellRefs(): GridCellRefs {
    return Array.from({ length: 10 }, () => Array.from({ length: 10 }, () => null));
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
     * 触发棋盘重绘。若在 await 之后调用，请勿依赖闭包内的 gameState 赋值（应用 patch 写入 grid/score/lines）。
     */
    commitGameState: (
        patch?: Partial<Pick<BlockBlastGameState, 'grid' | 'score' | 'lines'>>
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
    setInteractionPhase: () => {},
    updateBoardDimension: () => {},
    loadGame: () => {},
    submitScore: () => {},
    onGameOver: () => {},
    commitGameState: () => {},
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
    config?: Partial<BlockBlastGameConfig>;
    onGameLoadComplete?: () => void;
    onGameSubmit?: () => void;
}

export const BlockBlastGameProvider: React.FC<BlockBlastGameProviderProps> = ({
    children,
    gameId,
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
        gridCellRefs.current = createEmptyGridCellRefs();
    }
    const config = { ...DEFAULT_GAME_CONFIG, ...customConfig };
    const convex = useConvex();

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
        if (res.ok && res.game) {
            const game: BlockBlastGameState = {
                ...res.game,
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

    const commitGameState = useCallback(
        (patch?: Partial<Pick<BlockBlastGameState, 'grid' | 'score' | 'lines'>>) => {
            setGameState((g) => {
                if (!g) return null;
                const grid = patch?.grid ?? g.grid;
                const score = patch?.score !== undefined ? patch.score : g.score;
                const lines = patch?.lines !== undefined ? patch.lines : g.lines;
                return {
                    ...g,
                    grid: grid.map((row) => [...row]),
                    score,
                    lines,
                    shapes: [...g.shapes],
                    nextShapes: [...g.nextShapes],
                };
            });
        },
        []
    );

    const submitScore = useCallback(
        async (score: number) => {
            if (!gameState) return;
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
        [gameState, convex, onGameSubmit]
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
