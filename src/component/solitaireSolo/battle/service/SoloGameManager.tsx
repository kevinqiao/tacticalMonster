/**
 * 单人纸牌游戏管理器
 * 基于 solitaire 的多人版本，简化为单人玩法
 */

import React, { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
    CARD_RANKS,
    CARD_SUITS,
    CARD_VALUES,
    DEFAULT_GAME_CONFIG,
    SoloBoardDimension,
    SoloCard,
    SoloGameConfig,
    SoloGameState,
    SoloGameStatus,
    SoloHint,
    SoloSessionStats,
    SoloZone,
    ZoneType
} from '../types/SoloTypes';

interface ISoloGameContext {
    gameState: SoloGameState | null;
    boardDimension: SoloBoardDimension | null;
    config: SoloGameConfig;
    stats: SoloSessionStats;
    hints: SoloHint[];
    isGameActive: boolean;
    isPaused: boolean;

    // 游戏控制
    startNewGame: () => void;
    pauseGame: () => void;
    resumeGame: () => void;
    resetGame: () => void;

    // 游戏操作
    drawCard: () => void;
    moveCard: (card: SoloCard, from: string, to: string) => boolean;
    selectCard: (card: SoloCard | null) => void;
    getHints: () => SoloHint[];
    autoComplete: () => void;

    // 游戏状态
    canMoveCard: (card: SoloCard, to: string) => boolean;
    isGameWon: () => boolean;
    isGameLost: () => boolean;

    // 界面控制
    updateBoardDimension: (dimension: SoloBoardDimension) => void;

    // 基于 cards 数组的工具方法
    getCardsByZone: (zoneId: string) => SoloCard[];
    getCardsByZoneType: (zoneType: ZoneType) => SoloCard[];
    moveCardToZone: (card: SoloCard, targetZoneId: string, targetIndex?: number) => boolean;
    canMoveToZone: (card: SoloCard, targetZoneId: string) => boolean;
    getZone: (zoneId: string) => SoloZone | undefined;
    getZonesByType: (zoneType: ZoneType) => SoloZone[];
}

const SoloGameContext = createContext<ISoloGameContext>({
    gameState: null,
    boardDimension: null,
    config: DEFAULT_GAME_CONFIG,
    stats: {
        gamesPlayed: 0,
        gamesWon: 0,
        winRate: 0,
        bestTime: 0,
        bestScore: 0,
        averageMoves: 0,
        averageTime: 0,
        currentStreak: 0,
        longestStreak: 0
    },
    hints: [],
    isGameActive: false,
    isPaused: false,
    startNewGame: () => { },
    pauseGame: () => { },
    resumeGame: () => { },
    resetGame: () => { },
    drawCard: () => { },
    moveCard: () => false,
    selectCard: () => { },
    getHints: () => [],
    autoComplete: () => { },
    canMoveCard: () => false,
    isGameWon: () => false,
    isGameLost: () => false,
    updateBoardDimension: () => { },
    getCardsByZone: () => [],
    getCardsByZoneType: () => [],
    moveCardToZone: () => false,
    canMoveToZone: () => false,
    getZone: () => undefined,
    getZonesByType: () => []
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
    config?: Partial<SoloGameConfig>;
}

export const SoloGameProvider: React.FC<SoloGameProviderProps> = ({ children, config: customConfig }) => {
    const [gameState, setGameState] = useState<SoloGameState | null>(null);
    const [boardDimension, setBoardDimension] = useState<SoloBoardDimension | null>(null);
    const [hints, setHints] = useState<SoloHint[]>([]);
    const [isGameActive, setIsGameActive] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [stats, setStats] = useState<SoloSessionStats>({
        gamesPlayed: 0,
        gamesWon: 0,
        winRate: 0,
        bestTime: 0,
        bestScore: 0,
        averageMoves: 0,
        averageTime: 0,
        currentStreak: 0,
        longestStreak: 0
    });

    const config = { ...DEFAULT_GAME_CONFIG, ...customConfig };
    const gameTimerRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<number>(0);

    // 创建一副完整的牌
    const createDeck = useCallback((): SoloCard[] => {
        const deck: SoloCard[] = [];
        CARD_SUITS.forEach(suit => {
            CARD_RANKS.forEach(rank => {
                const value = CARD_VALUES[rank];
                const isRed = suit === 'hearts' || suit === 'diamonds';
                deck.push({
                    id: `${suit}-${rank}`,
                    suit,
                    rank,
                    value,
                    isRed,
                    isRevealed: false,
                    zone: ZoneType.TALON, // 初始在牌堆
                    zoneId: 'talon',
                    zoneIndex: deck.length
                });
            });
        });
        return shuffleDeck(deck);
    }, []);

    // 洗牌算法
    const shuffleDeck = useCallback((deck: SoloCard[]): SoloCard[] => {
        const shuffled = [...deck];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }, []);

    // 创建区域定义
    const createZones = useCallback((): SoloZone[] => {
        return [
            // 牌堆
            { id: 'talon', type: ZoneType.TALON, x: 0, y: 0, width: 0, height: 0, maxCards: 52 },
            // 废牌堆
            { id: 'waste', type: ZoneType.WASTE, x: 0, y: 0, width: 0, height: 0, maxCards: 52, allowMultiple: true },
            // 基础堆
            { id: 'foundation-hearts', type: ZoneType.FOUNDATION, x: 0, y: 0, width: 0, height: 0, suit: 'hearts', maxCards: 13 },
            { id: 'foundation-diamonds', type: ZoneType.FOUNDATION, x: 0, y: 0, width: 0, height: 0, suit: 'diamonds', maxCards: 13 },
            { id: 'foundation-clubs', type: ZoneType.FOUNDATION, x: 0, y: 0, width: 0, height: 0, suit: 'clubs', maxCards: 13 },
            { id: 'foundation-spades', type: ZoneType.FOUNDATION, x: 0, y: 0, width: 0, height: 0, suit: 'spades', maxCards: 13 },
            // 牌桌
            { id: 'tableau-0', type: ZoneType.TABLEAU, x: 0, y: 0, width: 0, height: 0, maxCards: 52, allowMultiple: true },
            { id: 'tableau-1', type: ZoneType.TABLEAU, x: 0, y: 0, width: 0, height: 0, maxCards: 52, allowMultiple: true },
            { id: 'tableau-2', type: ZoneType.TABLEAU, x: 0, y: 0, width: 0, height: 0, maxCards: 52, allowMultiple: true },
            { id: 'tableau-3', type: ZoneType.TABLEAU, x: 0, y: 0, width: 0, height: 0, maxCards: 52, allowMultiple: true },
            { id: 'tableau-4', type: ZoneType.TABLEAU, x: 0, y: 0, width: 0, height: 0, maxCards: 52, allowMultiple: true },
            { id: 'tableau-5', type: ZoneType.TABLEAU, x: 0, y: 0, width: 0, height: 0, maxCards: 52, allowMultiple: true },
            { id: 'tableau-6', type: ZoneType.TABLEAU, x: 0, y: 0, width: 0, height: 0, maxCards: 52, allowMultiple: true }
        ];
    }, []);

    // 初始化游戏状态
    const initializeGame = useCallback((): SoloGameState => {
        const deck = createDeck();
        const zones = createZones();

        // 发牌到牌桌
        let cardIndex = 0;
        for (let col = 0; col < 7; col++) {
            for (let row = 0; row <= col; row++) {
                const card = deck[cardIndex++];
                if (row === col) {
                    card.isRevealed = true; // 每列最后一张牌翻开
                }
                card.zone = ZoneType.TABLEAU;
                card.zoneId = `tableau-${col}`;
                card.zoneIndex = row;
            }
        }

        // 剩余牌作为牌堆
        const remainingDeck = deck.slice(cardIndex);
        remainingDeck.forEach((card, index) => {
            card.zone = ZoneType.TALON;
            card.zoneId = 'talon';
            card.zoneIndex = index;
        });

        return {
            gameId: `solo-${Date.now()}`,
            status: SoloGameStatus.Playing,
            score: 0,
            moves: 0,
            timeElapsed: 0,
            cards: deck, // 所有卡牌
            zones, // 区域定义
            selectedCard: null,
            hintCards: [],
            isWon: false,
            isLost: false
        };
    }, [createDeck, createZones]);

    // 开始新游戏
    const startNewGame = useCallback(() => {
        const newGame = initializeGame();
        setGameState(newGame);
        setIsGameActive(true);
        setIsPaused(false);
        setHints([]);
        startTimeRef.current = Date.now();

        // 启动游戏计时器
        if (gameTimerRef.current) {
            clearInterval(gameTimerRef.current);
        }
        gameTimerRef.current = setInterval(() => {
            setGameState(prev => {
                if (!prev || isPaused) return prev;
                return {
                    ...prev,
                    timeElapsed: Math.floor((Date.now() - startTimeRef.current) / 1000)
                };
            });
        }, 1000);
    }, [initializeGame, isPaused]);

    // 暂停游戏
    const pauseGame = useCallback(() => {
        setIsPaused(true);
        if (gameTimerRef.current) {
            clearInterval(gameTimerRef.current);
        }
    }, []);

    // 恢复游戏
    const resumeGame = useCallback(() => {
        setIsPaused(false);
        startTimeRef.current = Date.now() - (gameState?.timeElapsed || 0) * 1000;
        gameTimerRef.current = setInterval(() => {
            setGameState(prev => {
                if (!prev || isPaused) return prev;
                return {
                    ...prev,
                    timeElapsed: Math.floor((Date.now() - startTimeRef.current) / 1000)
                };
            });
        }, 1000);
    }, [gameState?.timeElapsed, isPaused]);

    // 重置游戏
    const resetGame = useCallback(() => {
        if (gameTimerRef.current) {
            clearInterval(gameTimerRef.current);
        }
        setGameState(null);
        setIsGameActive(false);
        setIsPaused(false);
        setHints([]);
    }, []);

    // 抽牌
    const drawCard = useCallback(() => {
        if (!gameState) return;

        const talonCards = getCardsByZone('talon');
        if (talonCards.length === 0) return;

        const card = talonCards[0];
        card.isRevealed = true;
        card.zone = ZoneType.WASTE;
        card.zoneId = 'waste';
        card.zoneIndex = getCardsByZone('waste').length;

        setGameState(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                moves: prev.moves + 1
            };
        });
    }, [gameState]);

    // 移动牌
    const moveCard = useCallback((card: SoloCard, from: string, to: string): boolean => {
        if (!gameState) return false;

        // 更新卡牌位置
        card.zoneId = to;
        card.zoneIndex = getCardsByZone(to).length;

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

    // 获取提示
    const getHints = useCallback((): SoloHint[] => {
        // 实现提示算法
        return [];
    }, []);

    // 自动完成
    const autoComplete = useCallback(() => {
        if (!config.autoComplete) return;
        // 实现自动完成逻辑
        console.log('Auto completing game...');
    }, [config.autoComplete]);

    // 检查是否可以移动牌
    const canMoveCard = useCallback((card: SoloCard, to: string): boolean => {
        // 实现移动规则检查
        return true;
    }, []);

    // 检查游戏是否胜利
    const isGameWon = useCallback((): boolean => {
        if (!gameState) return false;
        const foundationCards = getCardsByZoneType(ZoneType.FOUNDATION);
        return foundationCards.length === 52; // 所有牌都在基础堆
    }, [gameState]);

    // 检查游戏是否失败
    const isGameLost = useCallback((): boolean => {
        if (!gameState) return false;
        // 实现失败条件检查
        return false;
    }, [gameState]);

    // 更新棋盘尺寸
    const updateBoardDimension = useCallback((dimension: SoloBoardDimension) => {
        setBoardDimension(dimension);
    }, []);

    // 基于 cards 数组的工具方法
    const getCardsByZone = useCallback((zoneId: string): SoloCard[] => {
        if (!gameState) return [];
        return gameState.cards.filter(card => card.zoneId === zoneId);
    }, [gameState]);

    const getCardsByZoneType = useCallback((zoneType: ZoneType): SoloCard[] => {
        if (!gameState) return [];
        return gameState.cards.filter(card => card.zone === zoneType);
    }, [gameState]);

    const moveCardToZone = useCallback((card: SoloCard, targetZoneId: string, targetIndex?: number): boolean => {
        if (!gameState) return false;

        // 更新卡牌位置
        card.zoneId = targetZoneId;
        if (targetIndex !== undefined) {
            card.zoneIndex = targetIndex;
        } else {
            card.zoneIndex = getCardsByZone(targetZoneId).length;
        }

        console.log(`Moving card ${card.id} to zone ${targetZoneId}`);
        return true;
    }, [gameState, getCardsByZone]);

    const canMoveToZone = useCallback((card: SoloCard, targetZoneId: string): boolean => {
        // 实现区域移动规则检查
        return true;
    }, []);

    const getZone = useCallback((zoneId: string): SoloZone | undefined => {
        if (!gameState) return undefined;
        return gameState.zones.find(zone => zone.id === zoneId);
    }, [gameState]);

    const getZonesByType = useCallback((zoneType: ZoneType): SoloZone[] => {
        if (!gameState) return [];
        return gameState.zones.filter(zone => zone.type === zoneType);
    }, [gameState]);

    // 清理定时器
    useEffect(() => {
        return () => {
            if (gameTimerRef.current) {
                clearInterval(gameTimerRef.current);
            }
        };
    }, []);

    const value: ISoloGameContext = {
        gameState,
        boardDimension,
        config,
        stats,
        hints,
        isGameActive,
        isPaused,
        startNewGame,
        pauseGame,
        resumeGame,
        resetGame,
        drawCard,
        moveCard,
        selectCard,
        getHints,
        autoComplete,
        canMoveCard,
        isGameWon,
        isGameLost,
        updateBoardDimension,
        getCardsByZone,
        getCardsByZoneType,
        moveCardToZone,
        canMoveToZone,
        getZone,
        getZonesByType
    };

    return (
        <SoloGameContext.Provider value={value}>
            {children}
        </SoloGameContext.Provider>
    );
};

export default SoloGameProvider;
