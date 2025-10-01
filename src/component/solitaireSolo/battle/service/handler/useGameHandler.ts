import { useCallback } from "react";
import { PlayEffects } from "../../animation/PlayEffects";
import { MatchEvent } from "../EventProvider";
import { useSoloGameManager } from "../GameManager";

const useGameHandler = () => {

    const { startNewGame, gameState, boardDimension } = useSoloGameManager();
    const handleEvent = useCallback((event: MatchEvent) => {
        // const { removeEvent } = useEventManager();
        console.log("handleEvent", event)
        if (!gameState) return;
        const { id, name, data } = event;
        event.status = 1;
        switch (name) {
            case "shuffle":
                console.log("shuffle", event)
                PlayEffects.shuffle({ data: { cards: gameState?.cards, boardDimension } });
                break;
            case "deal":
                PlayEffects.deal({ data: { cards: event.data.cards, boardDimension } });
                console.log("deal", event)
                break;
            case "init":
                console.log("init", event)
                PlayEffects.init({ data: { cards: gameState.cards, boardDimension } });
                break;
            default:
                console.log("gameDefault", event)
                break;
        }

    }, [gameState]);


    return { handleEvent };
};

export default useGameHandler;


