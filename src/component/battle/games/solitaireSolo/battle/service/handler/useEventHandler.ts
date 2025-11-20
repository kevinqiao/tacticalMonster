import { useCallback } from "react";
import { PlayEffects } from "../../animation/PlayEffects";
import { MatchEvent } from "../EventProvider";
import { useSoloGameManager } from "../GameManager";

const useEventHandler = () => {

    const { timelines, gameState, boardDimension } = useSoloGameManager();

    const handleEvent = useCallback((event: MatchEvent, onComplete?: (eventId: string) => void) => {
        // const { removeEvent } = useEventManager();       
        if (!gameState) return;
        const { id, name, data } = event;
        event.status = 1;
        switch (name) {
            case "shuffle":
                console.log("shuffle", event)
                PlayEffects.shuffle({ timelines, data: { cards: gameState?.cards, boardDimension } });
                break;
            case "deal":
                break;
            case "init":
                PlayEffects.init({ timelines, data: { cards: gameState.cards, boardDimension } });
                break;
            case "dragCancel":
                PlayEffects.dragCancel({ timelines, data: { cards: gameState.cards, gameState, boardDimension } });
                break;
            case "drop":
                break;
            default:
                console.log("gameDefault", event)
                break;
        }

    }, [gameState, boardDimension]);


    return { handleEvent };
};

export default useEventHandler;


