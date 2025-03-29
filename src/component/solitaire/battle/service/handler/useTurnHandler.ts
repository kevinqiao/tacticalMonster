import { useCallback } from "react";
import useTurnAnimate from "../../animation/useTurnAnimate";
import { CombatEvent } from "../../types/CombatTypes";
import { useCombatManager } from "../CombatManager";
const useTurnHandler = () => {
    const { game, eventQueue, boardDimension, direction } = useCombatManager();
    const { playTurnStart, playTurnOver } = useTurnAnimate();
    const handleEvent = useCallback((event: CombatEvent, onComplete: () => void) => {
        const { name, status, data } = event;
        if (!game) return;
        event.status = 1
        // console.log("event", event)
        switch (name) {
            case "roundStarted":
                game.currentRound = data.round;
                onComplete();
                break;
            case "turnStarted":
                game.currentTurn = data;
                playTurnStart(data, onComplete);
                // onComplete();
                break;
            case "turnOver":
                // console.log("turnOver", data)
                playTurnOver({
                    data, onComplete: () => {
                        onComplete();
                    }
                })
                break;
            default:
                onComplete();
                break;
        }


    }, [game, eventQueue, boardDimension, direction, playTurnStart, playTurnOver]);


    return { handleEvent };
};

export default useTurnHandler;


