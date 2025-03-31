import { useCallback } from "react";
import useActionAnimate from "../../animation/useActionAnimate";
import useTurnAnimate from "../../animation/useTurnAnimate";
import { Card, CombatEvent } from "../../types/CombatTypes";
import { useCombatManager } from "../CombatManager";
const useActHandler = () => {
    const { playOpenCard, playMove } = useActionAnimate();
    const { playTurnActing, playTurnActed } = useTurnAnimate();
    const { game, eventQueue, boardDimension, direction, completeAct, askAct } = useCombatManager();
    const handleEvent = useCallback((event: CombatEvent, onComplete: () => void) => {
        const { name, status, data } = event;
        if (!game) return;
        event.status = 1;
        switch (name) {
            case "flip": {
                const openCards: Card[] = [];
                event.data.open.forEach((card: Card) => {
                    const mcard = game.cards?.find((c) => c.id === card.id);
                    if (mcard) {
                        mcard.suit = card.suit;
                        mcard.rank = card.rank;
                        mcard.status = 1;
                        openCards.push(card);
                    }
                });
                playOpenCard({
                    cards: openCards, onComplete: () => {
                        if (game.currentTurn?.actions) {
                            game.currentTurn.actions.acted++;
                        }
                        playTurnActed({
                            data: {
                                uid: game.currentTurn?.uid,
                                acted: game.currentTurn?.actions.acted
                            }, onComplete: () => {
                                completeAct();
                                onComplete()
                            }
                        })
                    }
                });
                break;
            }
            case "move": {
                const moveCards: Card[] = [];
                const openCards: Card[] = [];
                event.data.move.forEach((card: Card) => {
                    const mcard = game.cards?.find((c) => c.id === card.id);
                    if (mcard) {
                        mcard.field = card.field;
                        mcard.col = card.col;
                        mcard.row = card.row;
                        moveCards.push(card);
                    }
                });
                event.data.open.forEach((card: Card) => {
                    const mcard = game.cards?.find((c) => c.id === card.id);
                    if (mcard) {
                        mcard.suit = card.suit;
                        mcard.rank = card.rank;
                        openCards.push(card);
                    }
                });

                playMove({
                    data: { move: moveCards, open: openCards }, onComplete: () => {
                        if (game.currentTurn?.actions) {
                            game.currentTurn.actions.acted++;
                        }
                        playTurnActed({
                            data: {
                                uid: game.currentTurn?.uid,
                                acted: game.currentTurn?.actions.acted
                            }, onComplete: () => {
                                console.log("move complete", game.currentTurn?.actions.acted);
                                completeAct();
                                onComplete()
                            }
                        })
                    }
                });
                break;
            }
            case "askAct":
                playTurnActing({
                    data, onComplete: () => {
                        console.log("askAct complete", data);
                        askAct(event.data.dueTime);
                        onComplete();
                    }
                })
                break;
            default:
                onComplete();
                break;
        }

    }, [game, boardDimension, direction, completeAct, askAct]);


    return { handleEvent };
};

export default useActHandler;


