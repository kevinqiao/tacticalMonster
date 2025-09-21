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
    getMovableSequence: (card: SoloCard) => SoloCard[];
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
    getZonesByType: () => [],
    getMovableSequence: () => []
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
        console.log("startNewGame")
        const newGame = initializeGame();
        console.log("startNewGame", newGame)
        setGameState(newGame);
        setIsGameActive(true);
        setIsPaused(false);
        setHints([]);
        startTimeRef.current = Date.now();

        // 启动游戏计时器
        if (gameTimerRef.current) {
            clearInterval(gameTimerRef.current);
        }

        // gameTimerRef.current = setInterval(() => {
        //     setGameState(prev => {
        //         if (!prev || isPaused) return prev;
        //         return {
        //             ...prev,
        //             timeElapsed: Math.floor((Date.now() - startTimeRef.current) / 1000)
        //         };
        //     });
        // }, 1000);
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

    // 基于 cards 数组的工具方法
    const getCardsByZone = useCallback((zoneId: string): SoloCard[] => {
        if (!gameState) return [];
        return gameState.cards.filter(card => card.zoneId === zoneId);
    }, [gameState]);

    const getCardsByZoneType = useCallback((zoneType: ZoneType): SoloCard[] => {
        if (!gameState) return [];
        return gameState.cards.filter(card => card.zone === zoneType);
    }, [gameState]);

    const getZone = useCallback((zoneId: string): SoloZone | undefined => {
        if (!gameState) return undefined;
        return gameState.zones.find(zone => zone.id === zoneId);
    }, [gameState]);

    const getZonesByType = useCallback((zoneType: ZoneType): SoloZone[] => {
        if (!gameState) return [];
        return gameState.zones.filter(zone => zone.type === zoneType);
    }, [gameState]);

    // 获取可移动的卡牌序列（从指定卡牌到列底部）
    const getMovableSequence = useCallback((card: SoloCard): SoloCard[] => {
        if (!gameState) return [card];

        // 只有tableau列支持序列移动
        if (!card.zoneId.startsWith('tableau-')) {
            return [card];
        }

        // 获取该列的所有卡牌，按zoneIndex排序
        const columnCards = getCardsByZone(card.zoneId)
            .sort((a, b) => a.zoneIndex - b.zoneIndex);

        // 找到起始卡牌的索引
        const startIndex = columnCards.findIndex(c => c.id === card.id);
        if (startIndex === -1) return [card];

        // 获取从起始卡牌到列底部的所有卡牌
        const sequence = columnCards.slice(startIndex);

        // 验证序列是否有效（必须是连续的红黑交替递减序列）
        for (let i = 1; i < sequence.length; i++) {
            const currentCard = sequence[i];
            const prevCard = sequence[i - 1];

            // 检查是否翻开
            if (!currentCard.isRevealed) {
                console.log(`Sequence broken: card ${currentCard.id} is not revealed`);
                return sequence.slice(0, i); // 返回到第一张隐藏卡牌为止
            }

            // 检查红黑交替和递减
            if (currentCard.isRed === prevCard.isRed || currentCard.value !== prevCard.value - 1) {
                console.log(`Sequence broken: invalid transition from ${prevCard.rank} to ${currentCard.rank}`);
                return sequence.slice(0, i); // 返回到无效位置为止
            }
        }

        console.log(`Valid sequence of ${sequence.length} cards starting from ${card.id}`);
        return sequence;
    }, [gameState, getCardsByZone]);

    const canMoveToZone = useCallback((card: SoloCard, targetZoneId: string): boolean => {
        if (!gameState) return false;

        const targetZone = getZone(targetZoneId);
        if (!targetZone) return false;

        const targetCards = getCardsByZone(targetZoneId);

        // 获取要移动的序列
        const movableSequence = getMovableSequence(card);

        switch (targetZone.type) {
            case ZoneType.FOUNDATION: {
                // Foundation只能移动单张卡牌
                if (movableSequence.length > 1) {
                    console.log('Foundation cannot accept card sequences');
                    return false;
                }

                // Foundation规则：同花色，从A开始递增
                if (targetCards.length === 0) {
                    // 空基础堆只能放A
                    return card.rank === 'A';
                }

                const topCard = targetCards[targetCards.length - 1];
                // 必须同花色，且数值比顶牌大1
                return card.suit === topCard.suit && card.value === topCard.value + 1;
            }

            case ZoneType.TABLEAU: {
                // Tableau规则：红黑交替，递减
                if (targetCards.length === 0) {
                    // 空列只能放K（序列的第一张卡牌必须是K）
                    console.log(`Empty tableau column, checking if first card is K: ${card.rank === 'K'}`);
                    return card.rank === 'K';
                }

                const topCard = targetCards[targetCards.length - 1];
                console.log(`Tableau move check: ${card.rank} of ${card.suit} (${card.isRed ? 'red' : 'black'}) -> ${topCard.rank} of ${topCard.suit} (${topCard.isRed ? 'red' : 'black'})`);
                console.log(`Top card revealed: ${topCard.isRevealed}, card values: ${card.value} vs ${topCard.value}`);
                console.log(`Moving sequence of ${movableSequence.length} cards`);

                // 顶牌必须是翻开的，且必须不同颜色，且数值比顶牌小1
                if (!topCard.isRevealed) {
                    console.log('Top card is not revealed, cannot place card on it');
                    return false;
                }

                const isValidMove = card.isRed !== topCard.isRed && card.value === topCard.value - 1;
                console.log(`Tableau move valid: ${isValidMove}`);
                return isValidMove;
            }

            case ZoneType.WASTE: {
                // Waste堆通常不能直接放置卡牌（只能从Talon抽牌）
                return false;
            }

            case ZoneType.TALON: {
                // Talon堆不能直接放置卡牌
                return false;
            }

            default:
                return false;
        }
    }, [gameState, getZone, getCardsByZone, getMovableSequence]);

    // 获取提示
    const getHints = useCallback((): SoloHint[] => {
        if (!gameState) return [];

        const hints: SoloHint[] = [];

        // 检查Waste堆的牌是否可以移动到Foundation或Tableau
        const wasteCards = getCardsByZone('waste');
        if (wasteCards.length > 0) {
            const topWasteCard = wasteCards[wasteCards.length - 1];

            // 检查是否可以移动到Foundation
            const foundationZones = getZonesByType(ZoneType.FOUNDATION);
            for (const zone of foundationZones) {
                if (zone.suit === topWasteCard.suit || !zone.suit) {
                    if (canMoveToZone(topWasteCard, zone.id)) {
                        hints.push({
                            card: topWasteCard,
                            from: 'waste',
                            to: zone.id,
                            reason: `Move ${topWasteCard.rank} of ${topWasteCard.suit} to foundation`,
                            priority: 5 // Foundation moves are high priority
                        });
                    }
                }
            }

            // 检查是否可以移动到Tableau
            const tableauZones = getZonesByType(ZoneType.TABLEAU);
            for (const zone of tableauZones) {
                if (canMoveToZone(topWasteCard, zone.id)) {
                    hints.push({
                        card: topWasteCard,
                        from: 'waste',
                        to: zone.id,
                        reason: `Move ${topWasteCard.rank} of ${topWasteCard.suit} to tableau column`,
                        priority: 3
                    });
                }
            }
        }

        // 检查Tableau列之间的移动
        const foundationZones = getZonesByType(ZoneType.FOUNDATION);
        const tableauZones = getZonesByType(ZoneType.TABLEAU);
        for (const sourceZone of tableauZones) {
            const sourceCards = getCardsByZone(sourceZone.id);
            if (sourceCards.length > 0) {
                const topCard = sourceCards[sourceCards.length - 1];
                if (topCard.isRevealed) {
                    // 检查是否可以移动到其他Tableau列
                    for (const targetZone of tableauZones) {
                        if (sourceZone.id !== targetZone.id && canMoveToZone(topCard, targetZone.id)) {
                            hints.push({
                                card: topCard,
                                from: sourceZone.id,
                                to: targetZone.id,
                                reason: `Move ${topCard.rank} of ${topCard.suit} between tableau columns`,
                                priority: 2
                            });
                        }
                    }

                    // 检查是否可以移动到Foundation
                    for (const foundationZone of foundationZones) {
                        if (foundationZone.suit === topCard.suit || !foundationZone.suit) {
                            if (canMoveToZone(topCard, foundationZone.id)) {
                                hints.push({
                                    card: topCard,
                                    from: sourceZone.id,
                                    to: foundationZone.id,
                                    reason: `Move ${topCard.rank} of ${topCard.suit} to foundation`,
                                    priority: 5
                                });
                            }
                        }
                    }
                }
            }
        }

        // 如果没有可移动的牌，建议抽牌
        if (hints.length === 0) {
            const talonCards = getCardsByZone('talon');
            if (talonCards.length > 0) {
                const topTalonCard = talonCards[0];
                hints.push({
                    card: topTalonCard,
                    from: 'talon',
                    to: 'waste',
                    reason: 'Draw a card from the talon',
                    priority: 1
                });
            }
        }

        return hints.slice(0, 3); // 最多返回3个提示
    }, [gameState, getCardsByZone, getZonesByType, canMoveToZone]);

    // 自动完成
    const autoComplete = useCallback(() => {
        if (!config.autoComplete) return;
        // 实现自动完成逻辑
        console.log('Auto completing game...');
    }, [config.autoComplete]);

    // 检查是否可以移动牌
    const canMoveCard = useCallback((card: SoloCard, to: string): boolean => {
        if (!gameState) return false;

        const targetZone = getZone(to);
        if (!targetZone) return false;

        return canMoveToZone(card, to);
    }, [gameState, getZone]);

    // 检查游戏是否胜利
    const isGameWon = useCallback((): boolean => {
        if (!gameState) return false;

        // 检查每个基础堆是否都有13张牌（A到K）
        const foundationZones = getZonesByType(ZoneType.FOUNDATION);
        for (const zone of foundationZones) {
            const cards = getCardsByZone(zone.id);
            if (cards.length !== 13) {
                return false;
            }

            // 验证基础堆的顺序是否正确（A到K）
            const sortedCards = [...cards].sort((a, b) => a.value - b.value);
            for (let i = 0; i < sortedCards.length; i++) {
                if (sortedCards[i].value !== i + 1) {
                    return false;
                }
            }
        }

        return true; // 所有基础堆都完整
    }, [gameState, getZonesByType, getCardsByZone]);

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

    const moveCardToZone = useCallback((card: SoloCard, targetZoneId: string, targetIndex?: number): boolean => {
        if (!gameState) return false;

        // 获取要移动的卡牌序列
        const movableCards = getMovableSequence(card);

        // 更新游戏状态，触发React重新渲染
        setGameState(prevState => {
            if (!prevState) return prevState;

            // 先计算目标区域的卡牌数量（排除正在移动的所有卡牌）
            const movingCardIds = new Set(movableCards.map(c => c.id));
            const targetCards = prevState.cards.filter(c =>
                c.zoneId === targetZoneId && !movingCardIds.has(c.id)
            );
            const baseZoneIndex = targetIndex !== undefined ? targetIndex : targetCards.length;

            const newCards = prevState.cards.map(c => {
                // 检查是否是要移动的卡牌
                const cardIndexInSequence = movableCards.findIndex(mc => mc.id === c.id);
                if (cardIndexInSequence !== -1) {
                    // 更新序列中卡牌的位置
                    return {
                        ...c,
                        zone: getZoneType(targetZoneId),
                        zoneId: targetZoneId,
                        zoneIndex: baseZoneIndex + cardIndexInSequence
                    };
                }
                return c;
            });

            // 检查源区域是否需要翻开新的顶牌
            const sourceZoneId = card.zoneId;
            if (sourceZoneId.startsWith('tableau-')) {
                // 获取移动后源区域的卡牌
                const sourceCards = newCards
                    .filter(c => c.zoneId === sourceZoneId)
                    .sort((a, b) => a.zoneIndex - b.zoneIndex);

                // 如果还有卡牌且顶牌是隐藏的，则翻开它
                if (sourceCards.length > 0) {
                    const newTopCard = sourceCards[sourceCards.length - 1];
                    if (!newTopCard.isRevealed) {
                        console.log(`Auto-revealing new top card: ${newTopCard.id} in ${sourceZoneId}`);
                        newTopCard.isRevealed = true;
                    }
                }
            }

            console.log(`Moving sequence of ${movableCards.length} cards to zone ${targetZoneId} starting at index ${baseZoneIndex}`);

            return {
                ...prevState,
                cards: newCards,
                moves: prevState.moves + 1
            };
        });

        return true;
    }, [gameState]);

    // 辅助函数：根据zoneId获取ZoneType
    const getZoneType = useCallback((zoneId: string): ZoneType => {
        if (zoneId === 'talon') return ZoneType.TALON;
        if (zoneId === 'waste') return ZoneType.WASTE;
        if (zoneId.startsWith('foundation-')) return ZoneType.FOUNDATION;
        if (zoneId.startsWith('tableau-')) return ZoneType.TABLEAU;
        return ZoneType.TABLEAU; // 默认值
    }, []);

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
        getZonesByType,
        getMovableSequence
    };
    useEffect(() => {
        console.log('value', value);
    }, [value]);
    return (
        <SoloGameContext.Provider value={value}>
            {children}
        </SoloGameContext.Provider>
    );
};

export default SoloGameProvider;
