import { useCallback } from "react";
import useCardAnimate from "../../animation/useCardAnimate";
import useGameAnimate from "../../animation/useGameAnimate";
import { CombatEvent } from "../../types/CombatTypes";
import { useCombatManager } from "../CombatManager";
const useGameHandler = () => {
    const { playDeal, playShuffle } = useCardAnimate();
    const { playGo } = useGameAnimate();
    const { game, eventQueue, boardDimension, direction } = useCombatManager();
    const handleEvent = useCallback((event: CombatEvent, onComplete: () => void) => {
        const { name, status, data } = event;
        event.status = 1;
        switch (name) {
            case "gameStarted":
                console.log("gameStarted", event)
                playGo({ onComplete: () => { onComplete() } });
                break;
            case "dealCompleted":
                playDeal({ data: event.data, onComplete: () => { onComplete() } });
                break;
            case "shuffleCompleted":
                console.log("shuffleCompleted", event)
                playShuffle({ data: event.data, onComplete: () => { onComplete() } });
                break;
            case "gameOver":
                console.log("gameOver", event)
                onComplete();
                break;
            default:
                onComplete();
                break;
        }

    }, [game, eventQueue, boardDimension, direction]);


    return { handleEvent };
};

export default useGameHandler;


