import {
    ActionResult,
    Card,
    CARD_RANKS,
    CARD_SUITS,
    CARD_VALUES,
    GameInteractionPhase,
    GameModel,
    SoloGameState,
    SoloGameStatus,
    SoloZone,
    ZoneType
} from '../types/SoloTypes';
import { createSeededRandom } from '../utils/seedRandom';
import { SoloRuleManager } from './SoloRuleManager';
export const createZones = () => {
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
}
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
    public static shuffleDeck = (deck: Card[], seed?: string | number) => {
        const rng = seed === undefined ? Math.random : createSeededRandom(seed);
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            // console.log("shuffleDeck", deck[i], deck[j]);
            [deck[i], deck[j]] = [deck[j], deck[i]];
            // console.log("shuffleDeck", deck[i], deck[j])
        }
        deck.forEach((card: Card, index: number) => {
            card.zoneIndex = deck.length - index;
        });
        // console.log("shuffleDeck", deck);

    };
    public static createGame(seed?: string | number): GameModel {
        const normalizedSeed = seed !== undefined ? String(seed) : undefined;
        const deck = SoloGameEngine.createDeck();
        SoloGameEngine.shuffleDeck(deck, normalizedSeed);
        return {
            gameId: `solo-${Date.now()}`,
            seed: normalizedSeed,
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
            for (let row = 0; row <= 4; row++) {
                const dealedCard = { ...deck[cardIndex++] };
                if (row === 4) {
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
    public static recycle(gameState: SoloGameState): ActionResult {
        const result: ActionResult = { ok: false, data: {} };
        if (!gameState) return result;
        const ruleManager = new SoloRuleManager(gameState, GameInteractionPhase.idle);
        if (!ruleManager.canRecycle()) return result;
        const wasteCards = gameState.cards.filter((c: Card) => c.zoneId === 'waste').sort((a: Card, b: Card) => b.zoneIndex - a.zoneIndex);
        const cards = wasteCards.map((c: Card, index: number) => {
            return { ...c, zoneIndex: wasteCards.length - index - 1, zoneId: 'talon', zone: ZoneType.TALON };
        });
        result.data!.update = cards;
        result.ok = true;
        return result;
    }
    public static moveCard(gameState: SoloGameState, card: Card, toZoneId: string): ActionResult {
        const result: ActionResult = { ok: false, data: {} };
        if (!gameState || !card) return result;
        const ruleManager = new SoloRuleManager(gameState, GameInteractionPhase.idle);
        if (!ruleManager.canMoveToZone(card, toZoneId)) return result;

        const movedCards: Card[] = [];
        console.log("engine moveCard", toZoneId, card.zoneId);
        if (toZoneId !== card.zoneId) {
            const targetZone = gameState.zones.find((z: SoloZone) => z.id === toZoneId);
            if (!targetZone) return result;
            const zoneCards = gameState.cards.filter((c: Card) => c.zoneId === toZoneId).sort((a: Card, b: Card) => a.zoneIndex - b.zoneIndex);
            const zoneIndex = zoneCards.length === 0 ? 0 : zoneCards[zoneCards.length - 1].zoneIndex + 1;
            movedCards.push({ ...card, zone: targetZone.type, zoneId: toZoneId, zoneIndex: zoneIndex });
            // 仅 tableau→tableau 允许整串跟牌；foundation / waste 等只能单张
            const includeFollowers = targetZone.type === ZoneType.TABLEAU;
            if (includeFollowers) {
                const srcCards = gameState.cards
                    .filter((c: Card) => c.zoneId === card.zoneId && c.zoneIndex > card.zoneIndex)
                    .sort((a: Card, b: Card) => a.zoneIndex - b.zoneIndex);
                srcCards.forEach((c: Card, index: number) => {
                    movedCards.push({ ...c, zone: targetZone.type, zoneId: toZoneId, zoneIndex: zoneIndex + index + 1 });
                });
            }
            if (card.zone === ZoneType.TABLEAU) {
                const scards = gameState.cards.filter((c: Card) => c.zoneId === card.zoneId && c.zoneIndex < card.zoneIndex).sort((a: Card, b: Card) => a.zoneIndex - b.zoneIndex);
                if (scards.length > 0) {
                    const flipCard = scards[scards.length - 1];
                    flipCard.isRevealed = true;
                    result.data!.flip = [{ ...flipCard, isRevealed: true }];
                }
            }

            result.data!.move = movedCards || [];
            result.ok = true;
        }
        return result;
    }
    public static drawCard(gameState: SoloGameState, cardId: string): ActionResult {

        const result: ActionResult = { ok: false, data: {} };
        if (!gameState) return result;
        const ruleManager = new SoloRuleManager(gameState, GameInteractionPhase.idle);
        const canDraw = ruleManager.canDraw(cardId);
        if (!canDraw) return result;
        const card = gameState.cards.find((c: Card) => c.id === cardId);
        // console.log('card', card);
        if (!card) return result;
        const wasteCards = gameState.cards.filter((c: Card) => c.zoneId === 'waste').sort((a: Card, b: Card) => a.zoneIndex - b.zoneIndex);
        const wasteIndex = wasteCards.length === 0 ? 0 : wasteCards[wasteCards.length - 1].zoneIndex + 1;
        result.data!.draw = [{ ...card, zone: ZoneType.WASTE, zoneId: 'waste', zoneIndex: wasteIndex, isRevealed: true }];
        result.ok = true;
        return result;
    }

    /** 非收牌区的牌是否均已翻开（含 talon / waste / tableau） */
    public static areAllNonFoundationCardsRevealed(gameState: SoloGameState): boolean {
        if (!gameState?.cards?.length) return false;
        return gameState.cards.every((c) => c.zone === ZoneType.FOUNDATION || Boolean(c.isRevealed));
    }

    /**
     * 贪心找一步：废牌顶优先，再 tableau-0..6 列顶；能进则返回目标 foundation 的 zoneId。
     * 与 canMoveToZone / canMoveToFoundation 一致。
     */
    public static findNextFoundationMove(gameState: SoloGameState): { card: Card; toZoneId: string } | null {
        if (!gameState) return null;
        const rm = new SoloRuleManager(gameState, GameInteractionPhase.idle);
        const foundationZones = gameState.zones.filter((z) => z.type === ZoneType.FOUNDATION);
        const tryCard = (card: Card | undefined): { card: Card; toZoneId: string } | null => {
            if (!card?.isRevealed || !card.rank) return null;
            for (const fz of foundationZones) {
                if (rm.canMoveToFoundation(card, fz.id)) return { card, toZoneId: fz.id };
            }
            return null;
        };
        const wasteTop = gameState.cards
            .filter((c) => c.zone === ZoneType.WASTE)
            .sort((a, b) => b.zoneIndex - a.zoneIndex)[0];
        const fromWaste = tryCard(wasteTop);
        if (fromWaste) return fromWaste;
        for (let col = 0; col < 7; col++) {
            const top = gameState.cards
                .filter((c) => c.zone === ZoneType.TABLEAU && c.zoneId === `tableau-${col}`)
                .sort((a, b) => b.zoneIndex - a.zoneIndex)[0];
            const t = tryCard(top);
            if (t) return t;
        }
        return null;
    }

    private static cloneStateForSimulation(gameState: SoloGameState): SoloGameState {
        return {
            ...gameState,
            cards: gameState.cards.map((c) => ({ ...c })),
            zones: gameState.zones.map((z) => ({ ...z }))
        };
    }

    private static applyMovedCardsToClone(sim: SoloGameState, moved: Card[]): void {
        for (const m of moved) {
            const c = sim.cards.find((x) => x.id === m.id);
            if (c) {
                c.zone = m.zone;
                c.zoneId = m.zoneId;
                c.zoneIndex = m.zoneIndex;
            }
        }
    }

    /**
     * 当前是否满足：全明牌 + 仅重复「顶牌→foundation」的贪心模拟可收齐 52 张。
     */
    public static canAutoCompleteWithFoundationOnly(gameState: SoloGameState): boolean {
        if (!gameState) return false;
        if (!SoloGameEngine.areAllNonFoundationCardsRevealed(gameState)) return false;
        const sim = SoloGameEngine.cloneStateForSimulation(gameState);
        for (let step = 0; step < 200; step++) {
            const rm = new SoloRuleManager(sim, GameInteractionPhase.idle);
            if (rm.isGameWon()) return true;
            const next = SoloGameEngine.findNextFoundationMove(sim);
            if (!next) return false;
            const res = SoloGameEngine.moveCard(sim, next.card, next.toZoneId);
            if (!res.ok || !res.data?.move?.length) return false;
            SoloGameEngine.applyMovedCardsToClone(sim, res.data.move);
        }
        return new SoloRuleManager(sim, GameInteractionPhase.idle).isGameWon();
    }
}