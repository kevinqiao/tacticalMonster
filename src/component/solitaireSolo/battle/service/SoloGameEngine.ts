import {
    ActionResult,
    Card,
    CARD_RANKS,
    CARD_SUITS,
    CARD_VALUES,
    GameModel,
    SoloGameState,
    SoloGameStatus,
    SoloZone,
    ZoneType
} from '../types/SoloTypes';
import { SoloRuleManager } from './SoloRuleManager';
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
        // console.log("shuffleDeck", deck);

    };
    public static createGame(): GameModel {
        const deck = SoloGameEngine.createDeck();
        SoloGameEngine.shuffleDeck(deck);
        return {
            gameId: `solo-${Date.now()}`,
            status: SoloGameStatus.OPEN,
            score: 0,
            moves: 0,
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
    public static moveCard(gameState: SoloGameState, card: Card, toZoneId: string): ActionResult {
        const result: ActionResult = { ok: false };
        if (!gameState || !card) return result;
        const ruleManager = new SoloRuleManager(gameState);
        if (!ruleManager.canMoveToZone(card, toZoneId)) return result;
        const movedCards: Card[] = [];
        if (toZoneId !== card.zoneId) {
            const targetZone = gameState.zones.find((z: SoloZone) => z.id === toZoneId);
            if (!targetZone) return result;
            const zoneCards = gameState.cards.filter((c: Card) => c.zoneId === toZoneId).sort((a: Card, b: Card) => a.zoneIndex - b.zoneIndex);
            const zoneIndex = zoneCards.length === 0 ? 0 : zoneCards[zoneCards.length - 1].zoneIndex + 1;
            movedCards.push({ ...card, zone: targetZone.type, zoneId: toZoneId, zoneIndex: zoneIndex });
            const srcCards = gameState.cards.filter((c: Card) => c.zoneId === card.zoneId && c.zoneIndex > card.zoneIndex).sort((a: Card, b: Card) => a.zoneIndex - b.zoneIndex);
            srcCards?.forEach((c: Card, index: number) => {
                movedCards.push({ ...c, zone: targetZone.type, zoneId: toZoneId, zoneIndex: zoneIndex + index + 1 });
            });
            result.ok = true;
            result.data = { update: movedCards };
        }
        return result;
    }
}