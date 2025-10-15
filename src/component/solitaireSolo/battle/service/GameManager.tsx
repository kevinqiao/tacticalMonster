/**
 * 单人纸牌游戏管理器
 * 基于 solitaire 的多人版本，简化为单人玩法
 */
import React, { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import {
    DEFAULT_GAME_CONFIG,
    SolitaireRule,
    SoloBoardDimension,
    SoloGameConfig,
    SoloGameState
} from '../types/SoloTypes';
import SoloRuleManager from './SoloRuleManager';

interface ISoloGameContext {
    gameState: SoloGameState | null;
    boardDimension: SoloBoardDimension | null;
    config: SoloGameConfig;
    ruleManager: SolitaireRule | null;
    updateBoardDimension: (dimension: SoloBoardDimension) => void;
    loadGame: (game: SoloGameState) => void;
}

const SoloGameContext = createContext<ISoloGameContext>({

    gameState: null,
    boardDimension: null,
    config: DEFAULT_GAME_CONFIG,
    ruleManager: null,
    updateBoardDimension: () => { },
    loadGame: () => { }
});

export const useSoloGameManager = () => {
    const context = useContext(SoloGameContext);
    if (!context) {
        throw new Error('useSoloGameManager must be used within a SoloGameProvider');
    }
    return context;
};

interface SoloGameProviderProps {
    children: ReactNode;
    gameId?: string;
    config?: Partial<SoloGameConfig>;
}

export const SoloGameProvider: React.FC<SoloGameProviderProps> = ({ children, gameId, config: customConfig }) => {
    const [gameState, setGameState] = useState<SoloGameState | null>(null);
    const [boardDimension, setBoardDimension] = useState<SoloBoardDimension | null>(null);
    const config = { ...DEFAULT_GAME_CONFIG, ...customConfig };
    const ruleManager = useMemo(() => {
        if (!gameState) return null;
        return new SoloRuleManager(gameState)
    }, [gameState])

    // 创建区域定义
    // const createZones = useCallback((): SoloZone[] => {
    //     return [
    //         // 牌堆
    //         { id: 'talon', type: ZoneType.TALON },
    //         // 废牌堆
    //         { id: 'waste', type: ZoneType.WASTE },
    //         // 基础堆
    //         { id: 'foundation-hearts', type: ZoneType.FOUNDATION },
    //         { id: 'foundation-diamonds', type: ZoneType.FOUNDATION },
    //         { id: 'foundation-clubs', type: ZoneType.FOUNDATION },
    //         { id: 'foundation-spades', type: ZoneType.FOUNDATION },
    //         // 牌桌
    //         { id: 'tableau-0', type: ZoneType.TABLEAU },
    //         { id: 'tableau-1', type: ZoneType.TABLEAU },
    //         { id: 'tableau-2', type: ZoneType.TABLEAU },
    //         { id: 'tableau-3', type: ZoneType.TABLEAU },
    //         { id: 'tableau-4', type: ZoneType.TABLEAU },
    //         { id: 'tableau-5', type: ZoneType.TABLEAU },
    //         { id: 'tableau-6', type: ZoneType.TABLEAU }
    //     ];
    // }, []);

    // 更新棋盘尺寸
    const updateBoardDimension = useCallback((dimension: SoloBoardDimension) => {
        setBoardDimension(dimension);
    }, []);

    const loadGame = useCallback((game: SoloGameState) => {
        console.log("loadGame", game);
        setGameState(game);
    }, []);

    // useEffect(() => {
    //     if (!gameState) return;
    //     const interval = setInterval(() => {
    //         const isReady = gameState.cards.every(card => card.ele);
    //         if (isReady) {
    //             clearInterval(interval);
    //             PlayEffects.initGame({ data: { cards: gameState.cards, boardDimension } });
    //         }
    //     }, 500);
    // }, [gameState]);
    console.log("gameState", gameState);


    const value: ISoloGameContext = {
        gameState,
        boardDimension,
        config,
        ruleManager,
        updateBoardDimension,
        loadGame
    };

    return (
        <SoloGameContext.Provider value={value}>
            {children}
        </SoloGameContext.Provider>
    );
};

export default SoloGameProvider;
