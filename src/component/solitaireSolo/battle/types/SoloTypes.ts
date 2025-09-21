/**
 * 单人纸牌游戏类型定义
 * 基于 solitaire 的多人版本，简化为单人玩法
 */

export enum SoloGameStatus {
    Init = 0,
    Playing = 1,
    Won = 2,
    Lost = 3,
    Paused = 4
}

// 区域类型枚举
export enum ZoneType {
    TALON = 'talon',
    WASTE = 'waste',
    FOUNDATION = 'foundation',
    TABLEAU = 'tableau'
}

export interface SoloCard {
    id: string;
    suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
    rank: 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
    value: number; // A=1, 2-10=2-10, J=11, Q=12, K=13
    isRed: boolean; // 红桃和方块为红色
    isRevealed: boolean; // 是否已翻开
    x?: number;
    y?: number;
    zIndex?: number;
    ele?: HTMLDivElement | null;

    // 位置信息
    zone: ZoneType; // 所属区域类型
    zoneId: string; // 具体区域ID（如 foundation-hearts, tableau-0）
    zoneIndex: number; // 在区域中的索引
}

// 区域定义接口 - 不包含卡牌数据
export interface SoloZone {
    id: string;
    type: ZoneType;
    x: number;
    y: number;
    width: number;
    height: number;
    ele?: HTMLDivElement | null;

    // 区域特定配置
    suit?: 'hearts' | 'diamonds' | 'clubs' | 'spades'; // 基础堆花色
    maxCards?: number; // 最大卡牌数
    allowMultiple?: boolean; // 是否允许多张牌
}

// 简化的游戏状态 - 只使用统一的 cards 数组
export interface SoloGameState {
    gameId: string;
    status: SoloGameStatus;
    score: number;
    moves: number;
    timeElapsed: number;

    // 统一卡牌管理
    cards: SoloCard[];

    // 区域定义
    zones: SoloZone[];

    // 游戏状态
    selectedCard: SoloCard | null;
    hintCards: SoloCard[];
    lastMove?: SoloMove;
    isWon: boolean;
    isLost: boolean;
}

export interface SoloMove {
    id: string;
    type: 'draw' | 'move' | 'foundation' | 'waste' | 'undo';
    from: string; // 源位置
    to: string; // 目标位置
    card: SoloCard;
    cards?: SoloCard[]; // 移动的牌组
    timestamp: number;
    isValid: boolean;
    points: number; // 移动得分
}

export interface SoloHint {
    card: SoloCard;
    from: string;
    to: string;
    reason: string;
    priority: number; // 1-5，优先级越高越重要
}

export interface SoloGameConfig {
    scoring: {
        foundationMove: number; // 移到基础堆得分
        tableauMove: number; // 移到牌桌得分
        wasteMove: number; // 移到废牌堆得分
        timeBonus: number; // 时间奖励
        movePenalty: number; // 移动惩罚
    };
    timeLimit?: number; // 时间限制（秒）
    maxMoves?: number; // 最大移动次数
    hintsEnabled: boolean; // 是否启用提示
    autoComplete: boolean; // 是否自动完成
}

export interface SoloBoardDimension {
    width: number;
    height: number;
    cardWidth: number;
    cardHeight: number;
    spacing: number;
    zones: {
        foundations: { x: number; y: number; width: number; height: number };
        talon: { x: number; y: number; width: number; height: number };
        waste: { x: number; y: number; width: number; height: number };
        tableau: { x: number; y: number; width: number; height: number };
    };
}

export interface SoloDragData {
    card: SoloCard;          // 主要被拖拽的卡牌
    cards: SoloCard[];       // 序列中的所有卡牌（包括主卡牌）
    source: string;
    x: number;
    y: number;
    offsetX: number;
    offsetY: number;
}

export interface SoloAnimationConfig {
    duration: number;
    easing: string;
    delay?: number;
    onComplete?: () => void;
}

// 游戏规则相关
export interface SolitaireRule {
    canMoveToFoundation: (card: SoloCard, targetZone: SoloZone) => boolean;
    canMoveToTableau: (card: SoloCard, targetCard: SoloCard | null) => boolean;
    canMoveFromWaste: (card: SoloCard) => boolean;
    canDrawFromDeck: (gameState: SoloGameState) => boolean;
    isGameWon: (gameState: SoloGameState) => boolean;
    isGameLost: (gameState: SoloGameState) => boolean;
}

// 统计信息
export interface SoloSessionStats {
    gamesPlayed: number;
    gamesWon: number;
    winRate: number;
    bestTime: number;
    bestScore: number;
    averageMoves: number;
    averageTime: number;
    currentStreak: number;
    longestStreak: number;
}

// 常量定义
export const CARD_SUITS = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
export const CARD_RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;
export const CARD_VALUES = { 'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13 };

export const DEFAULT_GAME_CONFIG: SoloGameConfig = {
    scoring: {
        foundationMove: 10,
        tableauMove: 5,
        wasteMove: 0,
        timeBonus: 1,
        movePenalty: -1
    },
    hintsEnabled: true,
    autoComplete: false
};
