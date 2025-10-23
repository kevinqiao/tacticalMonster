/**
 * 单人纸牌游戏管理器
 * 基于 solitaire 的多人版本，简化为单人玩法
 */
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useUserManager } from 'service/UserManager';
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
    const { user, updateUserData } = useUserManager();
    const ruleManager = useMemo(() => {
        if (!gameState) return null;
        return new SoloRuleManager(gameState)
    }, [gameState])


    // 更新棋盘尺寸
    const updateBoardDimension = useCallback((dimension: SoloBoardDimension) => {
        setBoardDimension(dimension);
    }, []);
    console.log("GameProvider", user);
    const loadGame = useCallback(async (game: SoloGameState) => {
        setGameState(game);
    }, [user, updateUserData]);

    useEffect(() => {

        if (user && gameState) {
            console.log("GameProvider", user);
            updateUserData({ gameId: gameState.gameId });
        }
    }, [user, gameState]);

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
