import { useCallback } from "react";
import { Card, CombatEvent } from "../types/CombatTypes";
import { useCombatManager } from "./CombatManager";
import { dealData } from "./DealData";
const useCombatAct = () => {
  const { game, eventQueue, decks } = useCombatManager();

  const deal = useCallback(async () => {
    if (!game) return;
    const dealCards: Card[] = [];
    dealData.forEach((dealPos, index) => {
      const card = game.cards?.[index];
      if (card) {
        const c = { ...card, zone: 2, col: dealPos.col, row: dealPos.row };
        if (dealPos.row === 3) {
          c.suit = decks[index].suit;
          c.rank = decks[index].rank;
        }
        dealCards.push(c);
      }
    })

    const event: CombatEvent = {
      name: "deal",
      data: {
        cards: dealCards
      }
    }
    eventQueue.push(event);

  }, [game, eventQueue]);
  return { deal };
};
export default useCombatAct;

