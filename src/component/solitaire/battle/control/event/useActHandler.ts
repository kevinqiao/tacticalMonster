import { useCallback } from "react";
import useActionAnimate from "../../animation/useActionAnimate";
import useTurnAnimate from "../../animation/useTurnAnimate";
import { useCombatManager } from "../../service/CombatManager";
import { Card, CombatEvent } from "../../types/CombatTypes";
const useActHandler = () => {
    const { playOpenCard, playMove } = useActionAnimate();
    const { playTurnBar } = useTurnAnimate();
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
                        openCards.push(mcard);
                    }
                });
                playOpenCard({
                    cards: openCards, onComplete: () => {
                        completeAct();
                        onComplete()
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
                        completeAct();
                        onComplete()
                    }
                });
                break;
            }
            case "actCompleted": {
                playTurnBar({
                    data, onComplete: () => {
                        completeAct();
                        onComplete();
                    }
                })
                break;
            }
            case "askAct":
                console.log("askAct", data);
                onComplete();
                // playTurnBar({
                //     data, onComplete: () => {
                //         console.log("askAct complete", data);
                //         askAct(event.data.dueTime);
                //         onComplete();
                //     }
                // })
                break;
            default:
                onComplete();
                break;
        }

    }, [game, boardDimension, direction, completeAct, askAct]);


    return { handleEvent };
};

export default useActHandler;


