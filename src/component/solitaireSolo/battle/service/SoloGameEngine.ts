import {
    Card,
    CARD_RANKS,
    CARD_SUITS,
    CARD_VALUES,
    GameModel,
    SoloGameStatus,
    ZoneType
} from '../types/SoloTypes';
export class SoloGameEngine {
    // 创建一副完整的牌
    public static createDeck = (): Card[] => {
        const deck: Card[] = [];
        CARD_SUITS.forEach(suit => {
            CARD_RANKS.forEach(rank => {
                const value = CARD_VALUES[rank];
                const isRed = suit === 'hearts' || suit === 'diamonds';

                // 使用 UUID 确保安全性和唯一性
                const cardId = crypto.randomUUID();

                deck.push({
                    id: cardId,
                    suit,
                    rank,
                    value,
                    isRed,
                    isRevealed: false,
                    zone: ZoneType.TALON,
                    zoneId: 'talon',
                    zoneIndex: deck.length
                });
            });
        });
        return deck;

    };

    // 洗牌算法
    public static shuffleDeck = (deck: Card[]) => {

        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            // console.log("shuffleDeck", deck[i], deck[j]);
            [deck[i], deck[j]] = [deck[j], deck[i]];
            // console.log("shuffleDeck", deck[i], deck[j])
        }
        deck.forEach((card: Card, index: number) => {
            card.zoneIndex = deck.length - index;
        });
        console.log("shuffleDeck", deck);

    };
    public static createGame(): GameModel {
        const deck = SoloGameEngine.createDeck();
        SoloGameEngine.shuffleDeck(deck);
        return {
            gameId: `solo-${Date.now()}`,
            status: SoloGameStatus.OPEN,
            score: 0,
            moves: 0,
            timeElapsed: 0,
            cards: deck,
        }
    }
    public static deal = (deck: Card[]): Card[] => {
        let cardIndex = 0;
        const dealedCards: Card[] = [];
        deck.sort((a, b) => b.zoneIndex - a.zoneIndex);
        for (let col = 0; col < 7; col++) {
            for (let row = 0; row <= 5; row++) {
                const dealedCard = { ...deck[cardIndex++] };
                if (row === 5) {
                    dealedCard.isRevealed = true; // 每列最后一张牌翻开
                }
                dealedCard.zone = ZoneType.TABLEAU;
                dealedCard.zoneId = `tableau-${col}`;
                dealedCard.zoneIndex = row;
                dealedCards.push(dealedCard);
            }
        }
        return dealedCards;
    }
    public static getMovableSequence = (card: Card, cards: Card[]): Card[] => {


        // 只有tableau列支持序列移动
        if (!card.zoneId.startsWith('tableau-')) {
            return [card];
        }
        const columnCards = cards.filter(card => card.zoneId === card.zoneId).sort((a, b) => a.zoneIndex - b.zoneIndex);

        // 找到起始卡牌的索引
        const startIndex = columnCards.findIndex((c: Card) => c.id === card.id);
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
            if (currentCard.isRed === prevCard.isRed || (prevCard.value !== undefined && currentCard.value !== prevCard.value - 1)) {
                console.log(`Sequence broken: invalid transition from ${prevCard.rank} to ${currentCard.rank}`);
                return sequence.slice(0, i); // 返回到无效位置为止
            }
        }

        console.log(`Valid sequence of ${sequence.length} cards starting from ${card.id}`);
        return sequence;
    }
    public static canMoveToZone = (card: Card, targetZoneId: string, cards: Card[]): boolean => {


        const targetZone = cards.find(card => card.zoneId === targetZoneId);
        if (!targetZone) return false;

        const targetCards = cards.filter(card => card.zoneId === targetZoneId);

        // 获取要移动的序列
        const movableSequence = this.getMovableSequence(card, cards);

        switch (targetZone.zone) {
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
                return card.suit === topCard.suit &&
                    (topCard.value !== undefined && card.value === topCard.value + 1);
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

                const isValidMove = card.isRed !== topCard.isRed &&
                    (topCard.value !== undefined && card.value === topCard.value - 1);
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
    }
}