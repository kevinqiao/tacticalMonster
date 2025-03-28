import { useCallback } from "react";
import useCardAnimate from "../../animation/useCardAnimate";
import { CombatEvent } from "../../types/CombatTypes";
import { useCombatManager } from "../CombatManager";

const useGameHandler = () => {
    const { playDeal, playShuffle } = useCardAnimate();
    const { game, eventQueue, boardDimension, direction } = useCombatManager();
    const handleEvent = useCallback((event: CombatEvent, onComplete: () => void) => {
        const { name, status, data } = event;
        switch (name) {
            case "dealCompleted":
                playDeal({ data: event.data, onComplete: () => { onComplete() } });
                break;
            case "shuffleCompleted":
                console.log("shuffleCompleted", event)
                playShuffle({ data: event.data, onComplete: () => { onComplete() } });
                break;
        }

    }, [game, eventQueue, boardDimension, direction]);


    return { handleEvent };
};

export default useGameHandler;


