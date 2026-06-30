import type { Card, SoloGameState } from "../types/SoloTypes";

/** 已翻开牌：完整 identity 下发给客户端 */
export function toClientRevealCard(c: Card): Card {
    return {
        id: c.id,
        suit: c.suit,
        rank: c.rank,
        value: c.value,
        isRed: c.isRed,
        isRevealed: true,
        zone: c.zone,
        zoneId: c.zoneId,
        zoneIndex: c.zoneIndex,
    };
}

/** 暗牌：仅位置 + id，不含 rank/suit */
export function toClientCard(c: Card): Card {
    if (c.isRevealed) {
        return toClientRevealCard(c);
    }
    return {
        id: c.id,
        isRevealed: false,
        zone: c.zone,
        zoneId: c.zoneId,
        zoneIndex: c.zoneIndex,
    };
}

export function toClientCards(cards: Card[]): Card[] {
    return cards.map(toClientCard);
}

export function toClientGameState(game: SoloGameState): SoloGameState {
    return {
        ...game,
        cards: toClientCards(game.cards),
    };
}

/** mutation 增量 patch：revealed 带 identity，暗牌仍 redact */
export function toClientCardPatches(cards: Card[]): Card[] {
    return cards.map((c) => (c.isRevealed ? toClientRevealCard(c) : toClientCard(c)));
}
