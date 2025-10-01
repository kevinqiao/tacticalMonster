/**
 * 单人纸牌游戏管理器
 * 基于 solitaire 的多人版本，简化为单人玩法
 */
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import {
    DEFAULT_GAME_CONFIG,
    GameModel,
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
    // zones: SoloZone[];
    cardsLoaded: boolean;
    // 游戏控制
    startNewGame: (gameModel: GameModel) => void;
    resetGame: () => void;
    getCoord: (card: SoloCard) => { x: number; y: number };
    moveCard: (card: SoloCard, from: string, to: string) => boolean;
    selectCard: (card: SoloCard | null) => void;
    // 界面控制
    updateBoardDimension: (dimension: SoloBoardDimension) => void;
    onCardLoad: (ele: HTMLDivElement | null) => void;

}

const SoloGameContext = createContext<ISoloGameContext>({
    gameState: null,
    boardDimension: null,
    config: DEFAULT_GAME_CONFIG,
    cardsLoaded: false,
    // zones: [],
    getCoord: (card: SoloCard) => { return { x: 0, y: 0 } },
    onCardLoad: () => { },
    startNewGame: () => { },
    resetGame: () => { },
    moveCard: () => false,
    selectCard: () => { },
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
    const [cardsLoaded, setCardsLoaded] = useState<boolean>(false);
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
    // 开始新游戏
    const startNewGame = useCallback((gameModel: GameModel) => {
        const zones = createZones();
        const newGame = {
            ...gameModel,
            zones, // 区域定义
        };
        setGameState(newGame);
    }, [createZones]);

    const initializeGame = useCallback((gameModel: GameModel) => {

        const zones = createZones();
        setGameState((prev) => {
            if (!prev) return { ...gameModel, zones };
            gameModel.cards.forEach(c => {
                const card = prev.cards.find(cc => cc.id === c.id);
                if (card) {
                    card.zone = c.zone;
                    card.zoneId = c.zoneId;
                    card.zoneIndex = c.zoneIndex;
                }
            });
            return {
                ...prev,
                gameId: gameModel.gameId,
                status: gameModel.status,
                score: gameModel.score,
                moves: gameModel.moves,
            };
        });

    }, []);

    const getCoord = useCallback((card: SoloCard) => {
        if (!boardDimension || !card.ele) return { x: 0, y: 0 };
        switch (card.zone) {
            case ZoneType.TALON:
                break;
            case ZoneType.WASTE:
                break;
            case ZoneType.TABLEAU:
                const colIndex = +card.zoneId.split('-')[1];
                const x = boardDimension.zones.tableau.x + colIndex * (boardDimension.cardWidth + boardDimension.spacing);
                const y = boardDimension.zones.tableau.y + card.zoneIndex * (boardDimension.cardHeight * 0.3);
                return { x, y };
            case ZoneType.FOUNDATION:
                return { x: 0, y: 0 };
        }
        return { x: 0, y: 0 };


    }, [gameState, boardDimension]);

    const onCardLoad = useCallback((ele: HTMLDivElement | null) => {
        if (!gameState) return;
        if (ele && gameState.cards.every(c => c.ele)) {
            // 使用 setTimeout 避免同步更新    
            console.log("card load,", cardsLoaded)
            setCardsLoaded(true);
        } else if (!ele && gameState.cards.every(c => !c.ele)) {
            console.log("card unload,", cardsLoaded)
            setCardsLoaded(false);
        }
    }, [gameState, cardsLoaded]);




    // 重置游戏
    const resetGame = useCallback(() => {

        setGameState(null);

    }, []);



    // 移动牌
    const moveCard = useCallback((card: SoloCard, from: string, to: string): boolean => {
        if (!gameState) return false;

        // 更新卡牌位置
        card.zoneId = to;
        setGameState(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                moves: prev.moves + 1,
                selectedCard: null
            };
        });

        return true;
    }, [gameState]);

    // 选择牌
    const selectCard = useCallback((card: SoloCard | null) => {
        setGameState(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                selectedCard: card
            };
        });
    }, []);

    // 更新棋盘尺寸
    const updateBoardDimension = useCallback((dimension: SoloBoardDimension) => {
        setBoardDimension(dimension);
    }, []);

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
        cardsLoaded,
        getCoord,
        onCardLoad,
        startNewGame,
        resetGame,
        moveCard,
        selectCard,
        updateBoardDimension,
    };

    return (
        <SoloGameContext.Provider value={value}>
            {children}
        </SoloGameContext.Provider>
    );
};

export default SoloGameProvider;
