import { Card, CARD_RANKS, GameModel } from "../types/CombatTypes";




const isTopCard = (cardId: string, game: GameModel): boolean => {
    const card = game.cards?.find((c) => c.id === cardId);
    if (!card) return false;
    if (card.field === 1) {
        const waste = game.cards?.filter((c) => c.status === 1 && c.field === 1).sort((a, b) => (a.col ?? 0) - (b.col ?? 0));
        const topCard = waste && waste.length > 0 ? waste[waste.length - 1] : undefined;
        if (topCard && topCard.id === cardId) return true;
        return false;
    }
    const slotCards = game.cards?.filter((c) => c.col === card.col && c.field === card.field);
    const topCard = slotCards?.sort((a, b) => (a.row ?? 0) - (b.row ?? 0))[slotCards.length - 1];
    if (topCard && topCard.id === cardId) return true;
    return false;
}
const getTopCard = (field: number, slot: number, game: GameModel): Card | undefined => {
    if (!game || !game.currentTurn) return undefined;
    const cards = game.cards?.filter((card) => card.field === field && card.col === slot).sort((a, b) => (a.row ?? 0) - (b.row ?? 0));
    if (!cards || cards.length === 0) return undefined;
    return cards[cards.length - 1];
}
const canFlip = (game: GameModel): boolean => {
    if (!game || !game.currentTurn) return false;
    const waste = game.cards?.filter((card) => card.field === 1 && card.col! > 0);
    if (waste && waste.length === 3) return false;
    return true;

}
const canAdd = (game: GameModel, cardId: string, to: { field: number, slot: number }): boolean => {
    if (!game || !game.currentTurn) return false;
    const card = game.cards?.find((c) => c.id === cardId);
    if (!card) return false;
    const topCard = getTopCard(to.field, to.slot, game);
    const isRed = (suit: string) => ['♥', '♦'].includes(suit);
    if (!topCard && ((to.field === 1 && card.rank === "K") || (to.field === 0 && card.rank === "A"))) return true;

    if (to.field === 0) {
        if (CARD_RANKS.indexOf(card.rank!) === CARD_RANKS.indexOf(topCard?.rank!) + 1 && isRed(card.suit!) === isRed(topCard?.suit!)) return true;
        return false;
    }
    if (CARD_RANKS.indexOf(card.rank!) === CARD_RANKS.indexOf(topCard?.rank!) - 1 && isRed(card.suit!) !== isRed(topCard?.suit!)) return true;
    return false;
}
const canMove = (card: Card, game: GameModel): boolean => {
    if (!game || !game.currentTurn) return false;
    const seat = game.seats?.find((seat) => seat.uid === game?.currentTurn?.uid);
    if (!seat) return false;
    if (card.status === 1 && ((card.field === 1 && isTopCard(card.id, game)) || card.field === seat.field))
        return true;
    return false;

};

export default { isTopCard, getTopCard, canFlip, canAdd, canMove }