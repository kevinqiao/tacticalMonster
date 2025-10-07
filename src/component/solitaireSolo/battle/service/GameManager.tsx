/**
 * 单人纸牌游戏管理器
 * 基于 solitaire 的多人版本，简化为单人玩法
 */
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import {
    DEFAULT_GAME_CONFIG,
    SoloBoardDimension,
    SoloCard,
    SoloGameConfig,
    SoloGameState,
    SoloZone,
    ZoneType
} from '../types/SoloTypes';
import { SoloGameEngine } from './SoloGameEngine';

interface ISoloGameContext {
    gameState: SoloGameState | null;
    boardDimension: SoloBoardDimension | null;
    config: SoloGameConfig;
    isActing: boolean;
    moveCard: (card: SoloCard, toZoneId: string) => { ok: boolean, flipCard?: SoloCard };
    updateBoardDimension: (dimension: SoloBoardDimension) => void;
}

const SoloGameContext = createContext<ISoloGameContext>({
    gameState: null,
    boardDimension: null,
    config: DEFAULT_GAME_CONFIG,
    isActing: false,
    moveCard: () => { return { ok: false, flipCard: undefined } },
    updateBoardDimension: () => { },

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
    const [isActing, setIsActing] = useState<boolean>(false);

    const config = { ...DEFAULT_GAME_CONFIG, ...customConfig };


    // 创建区域定义
    const createZones = useCallback((): SoloZone[] => {
        return [
            // 牌堆
            { id: 'talon', type: ZoneType.TALON },
            // 废牌堆
            { id: 'waste', type: ZoneType.WASTE },
            // 基础堆
            { id: 'foundation-hearts', type: ZoneType.FOUNDATION },
            { id: 'foundation-diamonds', type: ZoneType.FOUNDATION },
            { id: 'foundation-clubs', type: ZoneType.FOUNDATION },
            { id: 'foundation-spades', type: ZoneType.FOUNDATION },
            // 牌桌
            { id: 'tableau-0', type: ZoneType.TABLEAU },
            { id: 'tableau-1', type: ZoneType.TABLEAU },
            { id: 'tableau-2', type: ZoneType.TABLEAU },
            { id: 'tableau-3', type: ZoneType.TABLEAU },
            { id: 'tableau-4', type: ZoneType.TABLEAU },
            { id: 'tableau-5', type: ZoneType.TABLEAU },
            { id: 'tableau-6', type: ZoneType.TABLEAU }
        ];
    }, []);

    // 更新棋盘尺寸
    const updateBoardDimension = useCallback((dimension: SoloBoardDimension) => {
        setBoardDimension(dimension);
    }, []);
    const moveCard = useCallback((card: SoloCard, toZoneId: string) => {
        if (!gameState) return { ok: true };
        const cards = gameState.cards.filter(c => c.zoneId === card.zoneId && c.zoneIndex < card.zoneIndex);
        const flipCard = cards.length > 0 ? cards[cards.length - 1] : undefined;
        if (cards.length > 0) {
            return { ok: false, flipCard: flipCard };
        }
        return { ok: true, flipCard: undefined };
    }, [gameState]);

    useEffect(() => {
        if (gameId) {
            const game = SoloGameEngine.createGame();
            game.gameId = gameId;
            const zones = createZones();
            setGameState({ ...game, zones });
        }
    }, [gameId]);


    const value: ISoloGameContext = {
        gameState,
        boardDimension,
        config,
        isActing,
        moveCard,
        updateBoardDimension,
    };

    return (
        <SoloGameContext.Provider value={value}>
            {children}
        </SoloGameContext.Provider>
    );
};

export default SoloGameProvider;
