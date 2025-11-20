/**
 * Block Blast 游戏管理器
 * 基于 solitaireSolo 的架构模式
 */
import { useConvex } from 'convex/react';
import gsap from 'gsap';
import React, { createContext, ReactNode, RefObject, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../../../../../convex/blockBlast/convex/_generated/api';
import {
    ActionStatus,
    BlockBlastGameConfig,
    BlockBlastGameState,
    BlockBlastGameStatus,
    BlockBlastRule,
    BoardDimension,
    DEFAULT_GAME_CONFIG,
    GameReport,
    Shape
} from '../types/BlockBlastTypes';
import BlockBlastRuleManager from './BlockBlastRuleManager';

interface IBlockBlastGameContext {
    timelines: { [k: string]: GSAPTimeline };
    gameState: BlockBlastGameState | null;
    gameReport: GameReport | null;
    boardDimension: BoardDimension | null;
    boardDimensionRef: RefObject<BoardDimension | null>;
    config: BlockBlastGameConfig;
    ruleManager: BlockBlastRule | null;
    updateBoardDimension: (dimension: BoardDimension) => void;
    onGameOver: () => void;
    submitScore: (score: number) => void;
    isPlaying: (shapeId: string) => boolean;
}

const BlockBlastGameContext = createContext<IBlockBlastGameContext>({
    gameReport: null,
    timelines: {},
    gameState: null,
    boardDimension: null,
    boardDimensionRef: { current: null },
    config: DEFAULT_GAME_CONFIG,
    ruleManager: null,
    updateBoardDimension: () => { },
    submitScore: () => { },
    onGameOver: () => { },
    isPlaying: () => false
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
    onGameSubmit
}) => {
    const [gameState, setGameState] = useState<BlockBlastGameState | null>(null);
    const [gameReport, setGameReport] = useState<GameReport | null>(null);
    const [boardDimension, setBoardDimension] = useState<BoardDimension | null>(null);
    const boardDimensionRef = useRef<BoardDimension | null>(null);
    const timelinesRef = useRef<{ [k: string]: GSAPTimeline }>({});
    const config = { ...DEFAULT_GAME_CONFIG, ...customConfig };
    const convex = useConvex();

    const ruleManager = useMemo(() => {
        if (!gameState) return null;
        return new BlockBlastRuleManager(gameState);
    }, [gameState]);

    // 更新棋盘尺寸
    const updateBoardDimension = useCallback((dimension: BoardDimension) => {
        Object.values(timelinesRef.current).forEach(tl => {
            if (tl.isActive()) {
                tl.invalidate();
            }
        });
        boardDimensionRef.current = dimension;
        setBoardDimension(dimension);
    }, [timelinesRef]);

    const onGameOver = useCallback(async () => {
        if (gameState?.reportElement && convex) {
            gsap.to(gameState.reportElement, {
                opacity: 1,
                visibility: 'visible',
                duration: 1,
                ease: 'power2.inOut'
            });
            const res = await convex.query(api.service.gameManager.findReport, { gameId: gameState.gameId });
            if (res.ok) {
                setGameReport(res.data as GameReport);
            }
        }
    }, [gameState, convex]);

    const submitScore = useCallback(async (score: number) => {
        if (!gameState) return;
        if (gameState.reportElement) {
            gsap.to(gameState.reportElement, {
                onComplete: () => {
                    onGameSubmit?.();
                },
                autoAlpha: 0,
                duration: 0.4,
                ease: 'power2.inOut'
            });
        }
        convex.action(api.proxy.controller.submitScore, { gameId: gameState.gameId, score }).then((res) => {
            if (res.ok) {
                console.log("score submitted", res);
            }
        });
    }, [gameState, convex]);

    useEffect(() => {
        const load = async () => {
            if (!gameId) return;
            const res = await convex.action(api.proxy.controller.loadGame, { gameId });
            if (res.ok && res.game) {
                const game: BlockBlastGameState = {
                    ...res.game,
                    actionStatus: ActionStatus.IDLE,
                    reportElement: null,
                };
                setGameState(game);
                onGameLoadComplete?.();
            }
        };
        if (gameId && convex) {
            load();
        }
    }, [convex, gameId, onGameLoadComplete]);

    const isPlaying = useCallback((shapeId: string) => {
        return Object.values(timelinesRef.current).some(tl => tl.isActive());
    }, []);

    const value: IBlockBlastGameContext = {
        timelines: timelinesRef.current,
        gameReport,
        gameState,
        boardDimension,
        boardDimensionRef,
        config,
        ruleManager,
        updateBoardDimension,
        submitScore,
        onGameOver,
        isPlaying
    };

    return (
        <BlockBlastGameContext.Provider value={value}>
            {children}
        </BlockBlastGameContext.Provider>
    );
};

export default BlockBlastGameProvider;

