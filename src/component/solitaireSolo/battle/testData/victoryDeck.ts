import { SoloCard, ZoneType } from "../types/SoloTypes";

/**
 * 游戏胜利状态的牌序
 * 所有52张牌都在 foundation 堆中，按花色和点数排列
 * 用于测试胜利动画效果
 */
export const victoryDeck: SoloCard[] = [
    // Foundation - Hearts (红桃) - A到K
    { id: 'hearts-A', suit: 'hearts', rank: 'A', value: 1, isRed: true, isRevealed: true, zone: ZoneType.FOUNDATION, zoneId: 'foundation-hearts', zoneIndex: 0 },
    { id: 'hearts-2', suit: 'hearts', rank: '2', value: 2, isRed: true, isRevealed: true, zone: ZoneType.FOUNDATION, zoneId: 'foundation-hearts', zoneIndex: 1 },
    { id: 'hearts-3', suit: 'hearts', rank: '3', value: 3, isRed: true, isRevealed: true, zone: ZoneType.FOUNDATION, zoneId: 'foundation-hearts', zoneIndex: 2 },
    { id: 'hearts-4', suit: 'hearts', rank: '4', value: 4, isRed: true, isRevealed: true, zone: ZoneType.FOUNDATION, zoneId: 'foundation-hearts', zoneIndex: 3 },
    { id: 'hearts-5', suit: 'hearts', rank: '5', value: 5, isRed: true, isRevealed: true, zone: ZoneType.FOUNDATION, zoneId: 'foundation-hearts', zoneIndex: 4 },
    { id: 'hearts-6', suit: 'hearts', rank: '6', value: 6, isRed: true, isRevealed: true, zone: ZoneType.FOUNDATION, zoneId: 'foundation-hearts', zoneIndex: 5 },
    { id: 'hearts-7', suit: 'hearts', rank: '7', value: 7, isRed: true, isRevealed: true, zone: ZoneType.FOUNDATION, zoneId: 'foundation-hearts', zoneIndex: 6 },
    { id: 'hearts-8', suit: 'hearts', rank: '8', value: 8, isRed: true, isRevealed: true, zone: ZoneType.FOUNDATION, zoneId: 'foundation-hearts', zoneIndex: 7 },
    { id: 'hearts-9', suit: 'hearts', rank: '9', value: 9, isRed: true, isRevealed: true, zone: ZoneType.FOUNDATION, zoneId: 'foundation-hearts', zoneIndex: 8 },
    { id: 'hearts-10', suit: 'hearts', rank: '10', value: 10, isRed: true, isRevealed: true, zone: ZoneType.FOUNDATION, zoneId: 'foundation-hearts', zoneIndex: 9 },
    { id: 'hearts-J', suit: 'hearts', rank: 'J', value: 11, isRed: true, isRevealed: true, zone: ZoneType.FOUNDATION, zoneId: 'foundation-hearts', zoneIndex: 10 },
    { id: 'hearts-Q', suit: 'hearts', rank: 'Q', value: 12, isRed: true, isRevealed: true, zone: ZoneType.FOUNDATION, zoneId: 'foundation-hearts', zoneIndex: 11 },
    { id: 'hearts-K', suit: 'hearts', rank: 'K', value: 13, isRed: true, isRevealed: true, zone: ZoneType.FOUNDATION, zoneId: 'foundation-hearts', zoneIndex: 12 },

    // Foundation - Diamonds (方块) - A到K
    { id: 'diamonds-A', suit: 'diamonds', rank: 'A', value: 1, isRed: true, isRevealed: true, zone: ZoneType.FOUNDATION, zoneId: 'foundation-diamonds', zoneIndex: 0 },
    { id: 'diamonds-2', suit: 'diamonds', rank: '2', value: 2, isRed: true, isRevealed: true, zone: ZoneType.FOUNDATION, zoneId: 'foundation-diamonds', zoneIndex: 1 },
    { id: 'diamonds-3', suit: 'diamonds', rank: '3', value: 3, isRed: true, isRevealed: true, zone: ZoneType.FOUNDATION, zoneId: 'foundation-diamonds', zoneIndex: 2 },
    { id: 'diamonds-4', suit: 'diamonds', rank: '4', value: 4, isRed: true, isRevealed: true, zone: ZoneType.FOUNDATION, zoneId: 'foundation-diamonds', zoneIndex: 3 },
    { id: 'diamonds-5', suit: 'diamonds', rank: '5', value: 5, isRed: true, isRevealed: true, zone: ZoneType.FOUNDATION, zoneId: 'foundation-diamonds', zoneIndex: 4 },
    { id: 'diamonds-6', suit: 'diamonds', rank: '6', value: 6, isRed: true, isRevealed: true, zone: ZoneType.FOUNDATION, zoneId: 'foundation-diamonds', zoneIndex: 5 },
    { id: 'diamonds-7', suit: 'diamonds', rank: '7', value: 7, isRed: true, isRevealed: true, zone: ZoneType.FOUNDATION, zoneId: 'foundation-diamonds', zoneIndex: 6 },
    { id: 'diamonds-8', suit: 'diamonds', rank: '8', value: 8, isRed: true, isRevealed: true, zone: ZoneType.FOUNDATION, zoneId: 'foundation-diamonds', zoneIndex: 7 },
    { id: 'diamonds-9', suit: 'diamonds', rank: '9', value: 9, isRed: true, isRevealed: true, zone: ZoneType.FOUNDATION, zoneId: 'foundation-diamonds', zoneIndex: 8 },
    { id: 'diamonds-10', suit: 'diamonds', rank: '10', value: 10, isRed: true, isRevealed: true, zone: ZoneType.FOUNDATION, zoneId: 'foundation-diamonds', zoneIndex: 9 },
    { id: 'diamonds-J', suit: 'diamonds', rank: 'J', value: 11, isRed: true, isRevealed: true, zone: ZoneType.FOUNDATION, zoneId: 'foundation-diamonds', zoneIndex: 10 },
    { id: 'diamonds-Q', suit: 'diamonds', rank: 'Q', value: 12, isRed: true, isRevealed: true, zone: ZoneType.FOUNDATION, zoneId: 'foundation-diamonds', zoneIndex: 11 },
    { id: 'diamonds-K', suit: 'diamonds', rank: 'K', value: 13, isRed: true, isRevealed: true, zone: ZoneType.FOUNDATION, zoneId: 'foundation-diamonds', zoneIndex: 12 },

    // Foundation - Clubs (梅花) - A到K
    { id: 'clubs-A', suit: 'clubs', rank: 'A', value: 1, isRed: false, isRevealed: true, zone: ZoneType.FOUNDATION, zoneId: 'foundation-clubs', zoneIndex: 0 },
    { id: 'clubs-2', suit: 'clubs', rank: '2', value: 2, isRed: false, isRevealed: true, zone: ZoneType.FOUNDATION, zoneId: 'foundation-clubs', zoneIndex: 1 },
    { id: 'clubs-3', suit: 'clubs', rank: '3', value: 3, isRed: false, isRevealed: true, zone: ZoneType.FOUNDATION, zoneId: 'foundation-clubs', zoneIndex: 2 },
    { id: 'clubs-4', suit: 'clubs', rank: '4', value: 4, isRed: false, isRevealed: true, zone: ZoneType.FOUNDATION, zoneId: 'foundation-clubs', zoneIndex: 3 },
    { id: 'clubs-5', suit: 'clubs', rank: '5', value: 5, isRed: false, isRevealed: true, zone: ZoneType.FOUNDATION, zoneId: 'foundation-clubs', zoneIndex: 4 },
    { id: 'clubs-6', suit: 'clubs', rank: '6', value: 6, isRed: false, isRevealed: true, zone: ZoneType.FOUNDATION, zoneId: 'foundation-clubs', zoneIndex: 5 },
    { id: 'clubs-7', suit: 'clubs', rank: '7', value: 7, isRed: false, isRevealed: true, zone: ZoneType.FOUNDATION, zoneId: 'foundation-clubs', zoneIndex: 6 },
    { id: 'clubs-8', suit: 'clubs', rank: '8', value: 8, isRed: false, isRevealed: true, zone: ZoneType.FOUNDATION, zoneId: 'foundation-clubs', zoneIndex: 7 },
    { id: 'clubs-9', suit: 'clubs', rank: '9', value: 9, isRed: false, isRevealed: true, zone: ZoneType.FOUNDATION, zoneId: 'foundation-clubs', zoneIndex: 8 },
    { id: 'clubs-10', suit: 'clubs', rank: '10', value: 10, isRed: false, isRevealed: true, zone: ZoneType.FOUNDATION, zoneId: 'foundation-clubs', zoneIndex: 9 },
    { id: 'clubs-J', suit: 'clubs', rank: 'J', value: 11, isRed: false, isRevealed: true, zone: ZoneType.FOUNDATION, zoneId: 'foundation-clubs', zoneIndex: 10 },
    { id: 'clubs-Q', suit: 'clubs', rank: 'Q', value: 12, isRed: false, isRevealed: true, zone: ZoneType.FOUNDATION, zoneId: 'foundation-clubs', zoneIndex: 11 },
    { id: 'clubs-K', suit: 'clubs', rank: 'K', value: 13, isRed: false, isRevealed: true, zone: ZoneType.FOUNDATION, zoneId: 'foundation-clubs', zoneIndex: 12 },

    // Foundation - Spades (黑桃) - A到K
    { id: 'spades-A', suit: 'spades', rank: 'A', value: 1, isRed: false, isRevealed: true, zone: ZoneType.FOUNDATION, zoneId: 'foundation-spades', zoneIndex: 0 },
    { id: 'spades-2', suit: 'spades', rank: '2', value: 2, isRed: false, isRevealed: true, zone: ZoneType.FOUNDATION, zoneId: 'foundation-spades', zoneIndex: 1 },
    { id: 'spades-3', suit: 'spades', rank: '3', value: 3, isRed: false, isRevealed: true, zone: ZoneType.FOUNDATION, zoneId: 'foundation-spades', zoneIndex: 2 },
    { id: 'spades-4', suit: 'spades', rank: '4', value: 4, isRed: false, isRevealed: true, zone: ZoneType.FOUNDATION, zoneId: 'foundation-spades', zoneIndex: 3 },
    { id: 'spades-5', suit: 'spades', rank: '5', value: 5, isRed: false, isRevealed: true, zone: ZoneType.FOUNDATION, zoneId: 'foundation-spades', zoneIndex: 4 },
    { id: 'spades-6', suit: 'spades', rank: '6', value: 6, isRed: false, isRevealed: true, zone: ZoneType.FOUNDATION, zoneId: 'foundation-spades', zoneIndex: 5 },
    { id: 'spades-7', suit: 'spades', rank: '7', value: 7, isRed: false, isRevealed: true, zone: ZoneType.FOUNDATION, zoneId: 'foundation-spades', zoneIndex: 6 },
    { id: 'spades-8', suit: 'spades', rank: '8', value: 8, isRed: false, isRevealed: true, zone: ZoneType.FOUNDATION, zoneId: 'foundation-spades', zoneIndex: 7 },
    { id: 'spades-9', suit: 'spades', rank: '9', value: 9, isRed: false, isRevealed: true, zone: ZoneType.FOUNDATION, zoneId: 'foundation-spades', zoneIndex: 8 },
    { id: 'spades-10', suit: 'spades', rank: '10', value: 10, isRed: false, isRevealed: true, zone: ZoneType.FOUNDATION, zoneId: 'foundation-spades', zoneIndex: 9 },
    { id: 'spades-J', suit: 'spades', rank: 'J', value: 11, isRed: false, isRevealed: true, zone: ZoneType.FOUNDATION, zoneId: 'foundation-spades', zoneIndex: 10 },
    { id: 'spades-Q', suit: 'spades', rank: 'Q', value: 12, isRed: false, isRevealed: true, zone: ZoneType.FOUNDATION, zoneId: 'foundation-spades', zoneIndex: 11 },
    { id: 'spades-K', suit: 'spades', rank: 'K', value: 13, isRed: false, isRevealed: true, zone: ZoneType.FOUNDATION, zoneId: 'foundation-spades', zoneIndex: 12 }
];

/**
 * 使用说明：
 * 
 * 1. 在组件中导入：
 *    import { victoryDeck } from './testData/victoryDeck';
 * 
 * 2. 测试胜利动画：
 *    // 将游戏状态设置为胜利状态
 *    gameState.cards = victoryDeck;
 *    
 *    // 触发胜利检测
 *    checkGameOver('fountain'); // 或 'simple', 'bounce', 'firework'
 * 
 * 3. 或者直接测试动画：
 *    PlayEffects.gameOver({
 *        effectType: 'fountain',
 *        data: { cards: victoryDeck, boardDimension },
 *        onComplete: () => console.log('动画完成！')
 *    });
 */

