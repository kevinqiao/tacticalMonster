import { useCallback } from "react";
import useActionAnimate from "../../animation/useActionAnimate";
import useTurnAnimate from "../../animation/useTurnAnimate";
import { useCombatManager } from "../../service/CombatManager";
import { Card, CombatEvent } from "../../types/CombatTypes";
const useActHandler = () => {
    const { playOpenCard, playMove } = useActionAnimate();
    const { playTurnActed, playTurnActing, playTurnOver } = useTurnAnimate();
    const { game, boardDimension, direction, completeAct, askAct } = useCombatManager();
    const handleEvent = useCallback((event: CombatEvent, onComplete: () => void) => {
        const { name, data } = event;
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
                        mcard.col = card.col;
                        mcard.status = 1;
                        openCards.push(mcard);
                    }
                });
                playOpenCard({
                    data: { open: openCards }, onComplete: () => {
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
                        moveCards.push(mcard);
                    }
                });

                event.data.open?.forEach((card: Card) => {
                    const mcard = game.cards?.find((c) => c.id === card.id);
                    if (mcard) {
                        mcard.suit = card.suit;
                        mcard.rank = card.rank;
                        openCards.push(mcard);
                    }
                });
                playMove({
                    data: { move: moveCards }, onComplete: () => {
                        completeAct();
                        onComplete()
                    }
                });
                if (openCards.length > 0) {
                    playOpenCard({
                        data: { open: openCards }
                    });
                }
                break;
            }
            case "actCompleted": {
                playTurnActed({
                    data, onComplete: () => {
                        completeAct();
                        setTimeout(() => {
                            onComplete();
                        }, 500);
                    }
                })
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


