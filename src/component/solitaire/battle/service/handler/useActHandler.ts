import { useCallback } from "react";
import useActionAnimate from "../../animation/useActionAnimate";
import { CombatEvent } from "../../types/CombatTypes";
import { useCombatManager } from "../CombatManager";
const useActHandler = () => {
    const { playOpenCard, playMoveCard } = useActionAnimate();
    const { game, eventQueue, boardDimension, direction, completeAct, askAct } = useCombatManager();
    const handleEvent = useCallback((event: CombatEvent, onComplete: () => void) => {
        const { name, status, data } = event;
        if (!game) return;
        switch (name) {
            case "flip":
                event.status = 1;
                playOpenCard({
                    cards: event.data.open, onComplete: () => {
                        if (game.currentTurn?.actions) {
                            game.currentTurn.actions.acted++;
                        }
                        completeAct();
                        onComplete()
                    }
                });
                break;
            case "move":
                event.status = 1;
                console.log("move", event)
                playMoveCard({
                    data: event.data, onComplete: () => {
                        if (game.currentTurn?.actions) {
                            game.currentTurn.actions.acted++;
                        }
                        completeAct();
                        onComplete()
                    }
                });
                break;
            case "askAct":
                event.status = 1;
                console.log("askAct", event)
                askAct(event.data.dueTime);
                onComplete();
                break;
        }

    }, [game, eventQueue, boardDimension, direction, completeAct, askAct]);


    return { handleEvent };
};

export default useActHandler;


