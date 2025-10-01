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
        const baseTime = Date.now();
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
            card.zoneIndex = index;
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
        for (let col = 0; col < 7; col++) {
            for (let row = 0; row <= col; row++) {
                const dealedCard = { ...deck[cardIndex++] };
                if (row === col) {
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
}