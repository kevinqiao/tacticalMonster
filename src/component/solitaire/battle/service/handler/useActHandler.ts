import { useCallback } from "react";
import useActionAnimate from "../../animation/useActionAnimate";
import useTurnAnimate from "../../animation/useTurnAnimate";
import { CombatEvent } from "../../types/CombatTypes";
import { useCombatManager } from "../CombatManager";
const useActHandler = () => {
    const { playOpenCard, playMoveCard } = useActionAnimate();
    const { playTurnActing, playTurnActed } = useTurnAnimate();
    const { game, eventQueue, boardDimension, direction, completeAct, askAct } = useCombatManager();
    const handleEvent = useCallback((event: CombatEvent, onComplete: () => void) => {
        const { name, status, data } = event;
        if (!game) return;
        event.status = 1;
        switch (name) {
            case "flip":
                playOpenCard({
                    cards: event.data.open, onComplete: () => {
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
            case "move":

                playMoveCard({
                    data: event.data, onComplete: () => {
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


