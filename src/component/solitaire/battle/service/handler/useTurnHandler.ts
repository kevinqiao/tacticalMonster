import { useCallback } from "react";
import { CombatEvent } from "../../types/CombatTypes";
import { useCombatManager } from "../CombatManager";
const useTurnHandler = () => {
    const { game, eventQueue, boardDimension, direction } = useCombatManager();
    const handleEvent = useCallback((event: CombatEvent, onComplete: () => void) => {
        const { name, status, data } = event;
        if (!game) return;
        switch (name) {
            case "roundStarted":
                event.status = 1
                game.currentRound = data.round;
                console.log("roundStarted", game.currentRound)
                onComplete();
                break;
            case "turnStarted":
                event.status = 1
                game.currentTurn = data;
                onComplete();
                break;
        }


    }, [game, eventQueue, boardDimension, direction]);


    return { handleEvent };
};

export default useTurnHandler;


